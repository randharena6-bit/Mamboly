<?php

namespace App\Services;

use App\Enums\AlertSeverity;
use App\Enums\AlertType;
use App\Events\AlertRaised;
use App\Models\Alert;
use App\Models\Farm;
use App\Models\InputStock;
use App\Models\WaterSource;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie des alertes métier.
 *
 * Les alertes d'eau critique peuvent être créées par le déclencheur
 * PostgreSQL (RM-08) ; ce service est idempotent : il vérifie l'absence
 * d'alerte non lue de même nature et de même cible avant d'en créer une
 * nouvelle, qu'il soit en amont (test) ou en aval du déclencheur.
 */
class AlertService
{
    /**
     * Lève une alerte si aucune alerte non lue identique n'existe déjà.
     *
     * @param  array{water_source_id?: int, input_id?: int, campaign_id?: int}  $target
     */
    public function raise(
        Farm $farm,
        AlertType $type,
        AlertSeverity $severity,
        string $title,
        string $message,
        array $target = [],
    ): ?Alert {
        if ($this->hasUnread($farm->id, $type, $target)) {
            return null;
        }

        $alert = Alert::withoutFarmScope()->create([
            'farm_id' => $farm->id,
            'water_source_id' => $target['water_source_id'] ?? null,
            'input_id' => $target['input_id'] ?? null,
            'campaign_id' => $target['campaign_id'] ?? null,
            'type' => $type->value,
            'severity' => $severity->value,
            'title' => $title,
            'message' => $message,
            'is_read' => false,
        ]);

        DB::afterCommit(fn () => event(new AlertRaised($alert)));

        return $alert;
    }

    /**
     * Alerte eau critique : le niveau franchit le seuil vers le bas (RM-08).
     */
    public function raiseWaterCriticalIfNeeded(WaterSource $source, float $before): ?Alert
    {
        if ($source->status !== 'active') {
            return null;
        }

        $after = (float) $source->available_quantity;
        $threshold = (float) $source->critical_threshold;

        if ($before <= $threshold || $after > $threshold) {
            return null;
        }

        $severity = $after <= $threshold / 2 ? AlertSeverity::Critique : AlertSeverity::Avertissement;

        return $this->raise(
            $source->farm,
            AlertType::EauCritique,
            $severity,
            sprintf('Alerte eau : niveau critique de %s', $source->name),
            sprintf(
                'Le niveau de %s est de %.2f %s pour un seuil critique de %.2f %s. '
                .'Vérifiez les irrigations prévues ou planifiez un remplissage.',
                $source->name,
                $after,
                $source->unit,
                $threshold,
                $source->unit,
            ),
            ['water_source_id' => $source->id],
        );
    }

    /**
     * Alerte stock critique : le stock franchit le seuil minimal vers le bas.
     */
    public function raiseStockCriticalIfNeeded(InputStock $input, float $before): ?Alert
    {
        $after = (float) $input->available_quantity;
        $threshold = (float) $input->minimum_threshold;

        if ($before <= $threshold || $after > $threshold) {
            return null;
        }

        $severity = $after <= 0 ? AlertSeverity::Critique : AlertSeverity::Avertissement;

        return $this->raise(
            $input->farm,
            AlertType::StockCritique,
            $severity,
            sprintf('Stock critique : %s', $input->name),
            sprintf(
                'Le stock de %s est de %.2f %s, sous le seuil minimal de %.2f %s.',
                $input->name,
                $after,
                $input->unit,
                $threshold,
                $input->unit,
            ),
            ['input_id' => $input->id],
        );
    }

    /** Marque une alerte comme lue. */
    public function markRead(Alert $alert): Alert
    {
        $alert->markAsRead();

        return $alert;
    }

    /** Marque toutes les alertes non lues d'une exploitation comme lues. */
    public function markAllRead(Farm $farm): int
    {
        $alerts = $farm->alerts()->where('is_read', false)->get();

        $alerts->each(fn (Alert $alert) => $alert->markAsRead());

        return $alerts->count();
    }

    /** Nombre d'alertes non lues d'une exploitation. */
    public function unreadCount(Farm $farm): int
    {
        return $farm->alerts()->where('is_read', false)->count();
    }

    /**
     * Alertes non lues d'abord, les plus graves et récentes ensuite.
     *
     * @return Collection<int, Alert>
     */
    public function forFarm(Farm $farm, ?bool $unreadOnly = null): Collection
    {
        return $farm->alerts()
            ->when($unreadOnly === true, fn ($query) => $query->where('is_read', false))
            ->orderBy('is_read')
            ->orderByRaw("CASE severity WHEN 'critique' THEN 0 WHEN 'avertissement' THEN 1 ELSE 2 END")
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * @param  array{water_source_id?: int, input_id?: int, campaign_id?: int}  $target
     */
    private function hasUnread(int $farmId, AlertType $type, array $target): bool
    {
        $query = Alert::withoutFarmScope()
            ->where('farm_id', $farmId)
            ->where('type', $type->value)
            ->where('is_read', false);

        if (isset($target['water_source_id'])) {
            $query->where('water_source_id', $target['water_source_id']);
        }

        if (isset($target['input_id'])) {
            $query->where('input_id', $target['input_id']);
        }

        if (isset($target['campaign_id'])) {
            $query->where('campaign_id', $target['campaign_id']);
        }

        return $query->exists();
    }
}
