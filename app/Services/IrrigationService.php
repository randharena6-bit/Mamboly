<?php

namespace App\Services;

use App\Enums\CampaignStatus;
use App\Enums\IrrigationStatus;
use App\Enums\RoleName;
use App\Enums\WaterSourceStatus;
use App\Events\IrrigationRecorded;
use App\Exceptions\BusinessRuleException;
use App\Exceptions\ClosedCampaignException;
use App\Models\Campaign;
use App\Models\Farm;
use App\Models\Irrigation;
use App\Models\Plot;
use App\Models\User;
use App\Models\WaterSource;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie d'une irrigation — cœur du module eau (CDC § 8).
 *
 * Une irrigation « validée » ou « réalisée » consomme le stock de sa ressource,
 * génère l'activité technique correspondante et applique les règles RM-02
 * (ressource active), RM-06 (campagne ouverte), RM-07 (parcelle cohérente) et
 * RM-10 (validation d'un dépassement de seuil par un responsable).
 */
class IrrigationService
{
    public function __construct(
        private readonly WaterStockService $water,
        private readonly ActivityService $activities,
    ) {}

    /**
     * Enregistre une irrigation.
     *
     * @param  array<string, mixed>  $data
     */
    public function register(User $actor, array $data): Irrigation
    {
        $status = IrrigationStatus::from($data['status'] ?? IrrigationStatus::Realisee->value);
        $campaign = Campaign::withoutFarmScope()->findOrFail($data['campaign_id']);
        $plot = Plot::withoutFarmScope()->findOrFail($data['plot_id']);
        $source = WaterSource::withoutFarmScope()->findOrFail($data['water_source_id']);
        $quantity = (float) $data['quantity'];

        $this->assertCoherence($campaign, $plot, $source);

        // RM-11 : aucune insertion possible dans une campagne close, quel que
        // soit le statut (le déclencheur PostgreSQL le refuse également).
        if (CampaignStatus::from($campaign->status)->isClosed()) {
            throw new ClosedCampaignException(sprintf(
                'La campagne %s est %s : aucune irrigation ne peut y être ajoutée.',
                $campaign->code,
                $campaign->status,
            ));
        }

        $validatedBy = $data['validated_by'] ?? null;

        if ($status->consumesStock()) {
            $this->assertCanConsume($campaign, $source);

            if ($this->exceedsThreshold($quantity, $source) && $validatedBy === null) {
                // Un responsable (ou l'administrateur) valide d'emblée ; un
                // agent place la séance en attente de validation (RM-10).
                if ($this->canValidate($actor, $campaign->farm)) {
                    $validatedBy = $actor->id;
                } else {
                    $status = IrrigationStatus::EnAttenteValidation;
                }
            }
        }

        $irrigation = DB::transaction(function () use ($actor, $data, $campaign, $plot, $source, $status, $validatedBy, $quantity): Irrigation {
            $irrigation = Irrigation::withoutFarmScope()->create([
                'farm_id' => $campaign->farm_id,
                'campaign_id' => $campaign->id,
                'plot_id' => $plot->id,
                'water_source_id' => $source->id,
                'performed_by' => $data['performed_by'] ?? $actor->id,
                'validated_by' => $validatedBy,
                'scheduled_at' => $data['scheduled_at'] ?? null,
                'performed_at' => $data['performed_at'] ?? now(),
                'quantity' => $quantity,
                'unit' => $data['unit'] ?? $source->unit,
                'duration_minutes' => $data['duration_minutes'] ?? null,
                'method' => $data['method'],
                'status' => $status->value,
                'observation' => $data['observation'] ?? null,
            ]);

            if ($status->consumesStock()) {
                $this->consume($irrigation, $source, $campaign, $plot, $actor);
            }

            return $irrigation;
        });

        if ($status->consumesStock()) {
            DB::afterCommit(fn () => event(new IrrigationRecorded($irrigation, $actor)));
        }

        return $irrigation;
    }

    /**
     * Valide une irrigation en attente : elle consomme alors son stock (RM-10).
     */
    public function validate(Irrigation $irrigation, User $validator): Irrigation
    {
        return DB::transaction(function () use ($irrigation, $validator): Irrigation {
            $locked = Irrigation::withoutFarmScope()->lockForUpdate()->findOrFail($irrigation->getKey());

            if (in_array($locked->status, [IrrigationStatus::Validee->value, IrrigationStatus::Realisee->value], true)) {
                throw new BusinessRuleException('Cette irrigation est déjà validée.');
            }

            if (in_array($locked->status, [IrrigationStatus::Annulee->value, IrrigationStatus::Refusee->value], true)) {
                throw new BusinessRuleException('Cette irrigation a été annulée ou refusée.');
            }

            $campaign = Campaign::withoutFarmScope()->findOrFail($locked->campaign_id);
            $plot = Plot::withoutFarmScope()->findOrFail($locked->plot_id);
            $source = WaterSource::withoutFarmScope()->findOrFail($locked->water_source_id);

            $this->assertCanConsume($campaign, $source);

            if (CampaignStatus::from($campaign->status)->isClosed()) {
                throw new ClosedCampaignException(sprintf('La campagne %s est close.', $campaign->code));
            }

            $locked->forceFill([
                'status' => IrrigationStatus::Realisee->value,
                'validated_by' => $validator->id,
                'performed_at' => $locked->performed_at ?? now(),
            ])->save();

            $this->consume($locked, $source, $campaign, $plot, $validator);

            DB::afterCommit(fn () => event(new IrrigationRecorded($locked, $validator)));

            return $locked;
        });
    }

    /** Refuse une irrigation en attente. */
    public function reject(Irrigation $irrigation, User $actor): Irrigation
    {
        $this->assertPending($irrigation);

        $irrigation->forceFill(['status' => IrrigationStatus::Refusee->value])->save();

        return $irrigation;
    }

    /**
     * Annule une irrigation qui n'a pas encore consommé de stock.
     *
     * Une irrigation déjà réalisée ne peut pas être annulée : le stock a été
     * consommé et le journal d'eau est append-only (RM-09).
     */
    public function cancel(Irrigation $irrigation, User $actor): Irrigation
    {
        if (IrrigationStatus::from($irrigation->status)->consumesStock()) {
            throw new BusinessRuleException('Une irrigation déjà réalisée ne peut pas être annulée.');
        }

        $irrigation->forceFill(['status' => IrrigationStatus::Annulee->value])->save();

        return $irrigation;
    }

    /** Consomme le stock d'eau et génère l'activité technique associée (CDC § 8.1). */
    private function consume(Irrigation $irrigation, WaterSource $source, Campaign $campaign, Plot $plot, User $actor): void
    {
        $this->water->consume(
            $source,
            (float) $irrigation->quantity,
            $actor,
            'consommation',
            $campaign,
            $irrigation,
            sprintf('Consommation irrigation #%d', $irrigation->id),
        );

        $this->activities->record(
            $actor,
            $plot,
            'irrigation',
            ($irrigation->performed_at ?? now())->toDateString(),
            sprintf('Irrigation de %.2f %s (%s)', $irrigation->quantity, $irrigation->unit, $irrigation->method),
            null,
            $campaign,
        );
    }

    private function assertCoherence(Campaign $campaign, Plot $plot, WaterSource $source): void
    {
        if ($plot->farm_id !== $campaign->farm_id || $source->farm_id !== $campaign->farm_id) {
            throw new BusinessRuleException('RM-01 : campagne, parcelle et ressource doivent relever de la même exploitation.', 'RM-01');
        }

        if ($plot->id !== $campaign->plot_id) {
            throw new BusinessRuleException('RM-07 : la parcelle ne correspond pas à celle de la campagne.', 'RM-07');
        }
    }

    private function assertCanConsume(Campaign $campaign, WaterSource $source): void
    {
        if (! CampaignStatus::from($campaign->status)->acceptsIrrigation()) {
            throw new ClosedCampaignException(sprintf(
                'RM-06 : la campagne %s (%s) n\'accepte plus d\'irrigation.',
                $campaign->code,
                $campaign->status,
            ), 'RM-06');
        }

        if (! WaterSourceStatus::from($source->status)->canIrrigate()) {
            throw new BusinessRuleException(sprintf(
                'RM-02 : la ressource « %s » n\'est pas active (statut : %s).',
                $source->name,
                $source->status,
            ), 'RM-02');
        }
    }

    private function assertPending(Irrigation $irrigation): void
    {
        if ($irrigation->status !== IrrigationStatus::EnAttenteValidation->value) {
            throw new BusinessRuleException('Seule une irrigation en attente de validation peut être traitée.');
        }
    }

    private function exceedsThreshold(float $quantity, WaterSource $source): bool
    {
        return $quantity > (float) config('agriwater.manager_validation_threshold', 2000);
    }

    /** Un responsable de l'exploitation ou un administrateur global valide (RM-10). */
    private function canValidate(User $actor, Farm $farm): bool
    {
        if ($actor->isAdministrator() || $actor->id === $farm->manager_id) {
            return true;
        }

        return $actor->farm_id === $farm->id && $actor->role?->name === RoleName::Responsable->value;
    }
}
