<?php

namespace App\Services;

use App\Enums\CampaignStatus;
use App\Events\CampaignClosed;
use App\Exceptions\ClosedCampaignException;
use App\Models\Campaign;
use App\Models\Crop;
use App\Models\Plot;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Cycle de vie d'une campagne agricole.
 *
 * Encapsule les transitions de statut et la clôture (RM-11) : une campagne
 * terminée ou annulée n'accepte plus aucune opération.
 */
class CampaignService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $actor, array $data): Campaign
    {
        $plot = Plot::withoutFarmScope()->findOrFail($data['plot_id']);
        $crop = Crop::findOrFail($data['crop_id']);

        return Campaign::withoutFarmScope()->create([
            'farm_id' => $plot->farm_id,
            'plot_id' => $plot->id,
            'crop_id' => $crop->id,
            'manager_id' => $data['manager_id'] ?? $actor->id,
            'code' => $data['code'] ?? $this->generateCode($crop, $plot),
            'name' => $data['name'],
            'start_date' => $data['start_date'],
            'expected_end_date' => $data['expected_end_date'],
            'actual_end_date' => $data['actual_end_date'] ?? null,
            'area' => $data['area'],
            'status' => $data['status'] ?? CampaignStatus::Planifiee->value,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Campaign $campaign, array $data): Campaign
    {
        $campaign->fill($data)->save();

        return $campaign;
    }

    /** Démarre une campagne planifiée ou suspendue. */
    public function activate(Campaign $campaign): Campaign
    {
        $this->assertNotClosed($campaign);

        $campaign->forceFill(['status' => CampaignStatus::Active->value])->save();

        return $campaign;
    }

    /** Suspend temporairement une campagne active. */
    public function suspend(Campaign $campaign): Campaign
    {
        $this->assertNotClosed($campaign);

        $campaign->forceFill(['status' => CampaignStatus::Suspendue->value])->save();

        return $campaign;
    }

    /**
     * Clôt une campagne : elle n'accepte plus aucune opération (RM-11).
     */
    public function complete(Campaign $campaign, User $actor, ?string $endDate = null): Campaign
    {
        $this->assertNotClosed($campaign);

        $campaign->forceFill([
            'status' => CampaignStatus::Terminee->value,
            'actual_end_date' => $endDate ?? now()->toDateString(),
        ])->save();

        DB::afterCommit(fn () => event(new CampaignClosed($campaign, $actor)));

        return $campaign;
    }

    /** Annule une campagne. */
    public function cancel(Campaign $campaign, User $actor): Campaign
    {
        $this->assertNotClosed($campaign);

        $campaign->forceFill([
            'status' => CampaignStatus::Annulee->value,
            'actual_end_date' => $campaign->actual_end_date ?? now()->toDateString(),
        ])->save();

        DB::afterCommit(fn () => event(new CampaignClosed($campaign, $actor)));

        return $campaign;
    }

    private function assertNotClosed(Campaign $campaign): void
    {
        if (CampaignStatus::from($campaign->status)->isClosed()) {
            throw new ClosedCampaignException(sprintf(
                'La campagne %s est déjà %s.',
                $campaign->code,
                $campaign->status,
            ));
        }
    }

    private function generateCode(Crop $crop, Plot $plot): string
    {
        $prefix = 'CAMP-'.mb_strtoupper(mb_substr(preg_replace('/[^A-Za-z]/', '', $crop->name), 0, 3)).'-'.now()->year;

        $sequence = Campaign::withoutFarmScope()
            ->where('farm_id', $plot->farm_id)
            ->where('code', 'like', $prefix.'%')
            ->count() + 1;

        return sprintf('%s-%03d', $prefix, $sequence);
    }
}
