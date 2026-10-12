<?php

namespace Tests\Feature\Business;

use App\Enums\AlertType;
use App\Enums\IrrigationStatus;
use App\Exceptions\InsufficientWaterException;
use App\Models\Alert;
use App\Models\Campaign;
use App\Models\Plot;
use App\Models\User;
use App\Models\WaterSource;
use App\Services\IrrigationService;
use App\Services\WaterStockService;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AgriWaterSchema;
use Tests\TestCase;

/**
 * Vérifie le cœur métier du module eau : consommation de stock, seuil de
 * validation responsable (RM-10), traçabilité des mouvements (RM-09) et
 * cloisonnement (RM-01).
 */
class IrrigationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function beforeRefreshingDatabase(): void
    {
        AgriWaterSchema::ensureExists();
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AgriWaterDemoSeeder::class);
    }

    private function agent(): User
    {
        return User::where('email', 'agent.tsinjo@agriwater.test')->firstOrFail();
    }

    private function responsable(): User
    {
        return User::where('email', 'responsable.tsinjo@agriwater.test')->firstOrFail();
    }

    private function campaign(): Campaign
    {
        return Campaign::withoutFarmScope()->where('code', 'CAMP-TOM-2026-001')->firstOrFail();
    }

    private function source(): WaterSource
    {
        return WaterSource::withoutFarmScope()->where('farm_id', 1)->where('name', 'Réservoir principal')->firstOrFail();
    }

    public function test_une_irrigation_consomme_le_stock_et_genere_un_mouvement_trace(): void
    {
        $source = $this->source();
        $campaign = $this->campaign();
        $plot = Plot::withoutFarmScope()->findOrFail($campaign->plot_id);
        $before = (float) $source->available_quantity;

        $irrigation = app(IrrigationService::class)->register($this->agent(), [
            'campaign_id' => $campaign->id,
            'plot_id' => $plot->id,
            'water_source_id' => $source->id,
            'quantity' => 300,
            'method' => 'goutte_a_goutte',
            'unit' => 'L',
        ]);

        $this->assertSame(IrrigationStatus::Realisee->value, $irrigation->status);
        $this->assertSame($before - 300, (float) $source->fresh()->available_quantity);

        $this->assertDatabaseHas('water_movements', [
            'irrigation_id' => $irrigation->id,
            'quantity_before' => $before,
            'quantity_after' => $before - 300,
        ]);

        $this->assertDatabaseHas('activities', [
            'campaign_id' => $campaign->id,
            'type' => 'irrigation',
        ]);
    }

    public function test_un_agent_ne_consomme_pas_au_dela_du_seuil_sans_validation(): void
    {
        $source = $this->source();
        $campaign = $this->campaign();
        $before = (float) $source->available_quantity;

        $irrigation = app(IrrigationService::class)->register($this->agent(), [
            'campaign_id' => $campaign->id,
            'plot_id' => $campaign->plot_id,
            'water_source_id' => $source->id,
            'quantity' => 2500,
            'method' => 'pompe',
            'unit' => 'L',
        ]);

        $this->assertSame(IrrigationStatus::EnAttenteValidation->value, $irrigation->status);
        $this->assertSame($before, (float) $source->fresh()->available_quantity);

        $validated = app(IrrigationService::class)->validate($irrigation->fresh(), $this->responsable());

        $this->assertSame(IrrigationStatus::Realisee->value, $validated->status);
        $this->assertSame($this->responsable()->id, $validated->validated_by);
        $this->assertSame($before - 2500, (float) $source->fresh()->available_quantity);
    }

    public function test_le_franchissement_du_seuil_critique_leve_une_alerte_eau(): void
    {
        $source = WaterSource::withoutFarmScope()->findOrFail(3); // Bassin Sud
        $this->assertTrue($source->isBelowThreshold());

        // On repart au-dessus du seuil pour observer le franchissement vers le bas.
        app(WaterStockService::class)->setQuantity($source, 5000, $this->responsable(), 'correction', 'remise à niveau test');
        Alert::withoutFarmScope()->where('water_source_id', $source->id)->delete();

        app(WaterStockService::class)->consume($source->fresh(), 3000, $this->responsable(), 'consommation');

        $this->assertDatabaseHas('alerts', [
            'water_source_id' => $source->id,
            'type' => AlertType::EauCritique->value,
            'is_read' => false,
        ]);
    }

    public function test_une_consommation_superieure_au_stock_est_refusee(): void
    {
        $source = $this->source();
        $before = (float) $source->available_quantity;

        try {
            app(WaterStockService::class)->consume($source, $before + 1, $this->responsable());
            $this->fail('Une exception aurait dû être levée.');
        } catch (InsufficientWaterException $e) {
            $this->assertSame('RM-04', $e->rule);
        }

        $this->assertSame($before, (float) $source->fresh()->available_quantity);
    }
}
