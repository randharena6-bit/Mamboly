<?php

namespace Tests\Feature\Http;

use App\Models\Plot;
use App\Models\User;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AgriWaterSchema;
use Tests\TestCase;

/**
 * CRUD des parcelles et cloisonnement par exploitation (RM-01).
 *
 * Les écritures passent par `PlotPolicy` et la lecture est bornée par
 * `FarmScope` : un membre ne voit jamais une parcelle d'une autre exploitation.
 */
class PlotCrudTest extends TestCase
{
    use RefreshDatabase;

    private const RESPONSABLE_A = 'responsable.tsinjo@agriwater.test';

    private const AGENT_B = 'agent.vokatra@agriwater.test';

    protected function beforeRefreshingDatabase(): void
    {
        AgriWaterSchema::ensureExists();
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AgriWaterDemoSeeder::class);
    }

    private function user(string $email): User
    {
        return User::where('email', $email)->firstOrFail();
    }

    public function test_un_membre_cree_une_parcelle_dans_son_exploitation(): void
    {
        $this->actingAs($this->user(self::RESPONSABLE_A));

        $response = $this->postJson('/parcelles', [
            'code' => 'P-A99',
            'name' => 'Parcelle test',
            'area' => 500,
            'area_unit' => 'm2',
            'status' => 'en_culture',
            'manual_priority' => 'normale',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('plots', [
            'code' => 'P-A99',
            'farm_id' => 1,
        ]);
    }

    public function test_le_code_de_parcelle_est_unique_par_exploitation(): void
    {
        $this->actingAs($this->user(self::RESPONSABLE_A));

        $response = $this->postJson('/parcelles', [
            'code' => 'P-A01',
            'name' => 'Doublon',
            'area' => 100,
            'area_unit' => 'm2',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('code');
    }

    public function test_un_membre_ne_voit_pas_une_parcelle_dune_autre_exploitation(): void
    {
        $plotB = Plot::withoutFarmScope()->where('farm_id', 2)->firstOrFail();

        $this->actingAs($this->user(self::RESPONSABLE_A));

        $this->getJson("/parcelles/{$plotB->id}")->assertNotFound();
        $this->deleteJson("/parcelles/{$plotB->id}")->assertNotFound();
    }

    public function test_la_liste_ne_contient_que_les_parcelles_de_mon_exploitation(): void
    {
        $this->actingAs($this->user(self::AGENT_B));

        $payload = $this->getJson('/parcelles')->assertOk()->json();

        $farmIds = collect($payload['data'])->pluck('farm_id')->unique();

        $this->assertSame([2], $farmIds->values()->all());
    }
}
