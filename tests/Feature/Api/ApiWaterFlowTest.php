<?php

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\Plot;
use App\Models\User;
use App\Models\WaterSource;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AgriWaterSchema;
use Tests\TestCase;

/**
 * Module eau via l'API : journal des mouvements et cycle d'une irrigation.
 */
class ApiWaterFlowTest extends TestCase
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

    private function tokenFor(string $email): string
    {
        return User::where('email', $email)->firstOrFail()->createToken('phpunit')->plainTextToken;
    }

    public function test_un_remplissage_manuel_augmente_le_stock_et_cree_un_mouvement(): void
    {
        $source = WaterSource::withoutFarmScope()->findOrFail(1);
        $before = (float) $source->available_quantity;

        $this->withToken($this->tokenFor('responsable.tsinjo@agriwater.test'))
            ->postJson("/api/water-sources/{$source->id}/movements", [
                'type' => 'ajout_manuel',
                'quantity' => 100,
                'note' => 'Test API',
            ])
            ->assertCreated();

        $this->assertSame($before + 100, (float) $source->fresh()->available_quantity);

        $this->assertDatabaseHas('water_movements', [
            'water_source_id' => $source->id,
            'type' => 'ajout_manuel',
        ]);
    }

    public function test_un_agent_ne_peut_pas_depasser_la_capacite_par_lapi(): void
    {
        $source = WaterSource::withoutFarmScope()->findOrFail(1);

        $this->withToken($this->tokenFor('agent.tsinjo@agriwater.test'))
            ->postJson("/api/water-sources/{$source->id}/movements", [
                'type' => 'ajout_manuel',
                'quantity' => 999999,
            ])
            ->assertStatus(422);
    }

    public function test_une_irrigation_par_api_consomme_le_stock(): void
    {
        $campaign = Campaign::withoutFarmScope()->where('code', 'CAMP-TOM-2026-001')->firstOrFail();
        $plot = Plot::withoutFarmScope()->findOrFail($campaign->plot_id);
        $source = WaterSource::withoutFarmScope()->findOrFail($campaign->water_source_id ?? 1);
        $before = (float) $source->available_quantity;

        $response = $this->withToken($this->tokenFor('agent.tsinjo@agriwater.test'))
            ->postJson('/api/irrigations', [
                'campaign_id' => $campaign->id,
                'plot_id' => $plot->id,
                'water_source_id' => 1,
                'quantity' => 300,
                'method' => 'goutte_a_goutte',
                'unit' => 'L',
            ]);

        $response->assertCreated();

        $this->assertDatabaseHas('water_movements', [
            'irrigation_id' => $response->json('data.id'),
            'quantity_before' => $before,
            'quantity_after' => $before - 300,
        ]);
    }
}
