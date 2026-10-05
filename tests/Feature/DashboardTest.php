<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Le tableau de bord ne doit jamais exposer les données d'une autre
 * exploitation : c'est la contrainte de cloisonnement la plus visible de
 * l'application, celle que l'utilisateur attend en se connectant.
 */
class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private const RESPONSIBLE = 'responsable.tsinjo@agriwater.test';

    private const AUTRE_EXPLOITATION = 'resp.vokatra@agriwater.test';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AgriWaterDemoSeeder::class);
    }

    public function test_la_page_du_tableau_de_bord_exige_une_session(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->getJson('/dashboard/data')->assertUnauthorized();
    }

    public function test_le_tableau_de_bord_affiche_les_donnees_de_son_exploitation(): void
    {
        $this->actingAs(User::where('email', self::RESPONSIBLE)->firstOrFail());

        $response = $this->get('/dashboard');

        $response->assertOk();
        $response->assertSee('id="agriwater-dashboard"', false);
        // L'endpoint des données est transmis à l'îlot React, pas codé en dur.
        $response->assertSee(route('dashboard.data'), false);

        $payload = $this->getJson('/dashboard/data')->assertOk()->json();

        $this->assertSame('Tsinjo Maitso', $payload['farm']['name']);
        $this->assertSame('Rakoto Jean', $payload['user']['name']);
    }

    public function test_aucune_donnee_dune_autre_exploitation_nest_divulguee(): void
    {
        $this->actingAs(User::where('email', self::AUTRE_EXPLOITATION)->firstOrFail());

        $payload = $this->getJson('/dashboard/data')->assertOk()->json();

        $this->assertSame('Vokatra Soa', $payload['farm']['name']);

        // Un nom de parcelle, de réserve en eau ou d'intrant propre à
        // l'exploitation précédente ne doit apparaître nulle part dans le corps.
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

        foreach (['P-A01', 'Bassin Sud', 'Réservoir principal'] as $marqueur) {
            $this->assertStringNotContainsString($marqueur, $body, "« {$marqueur} » fuit hors de l'exploitation");
        }
    }

    public function test_le_payload_expose_les_panneaux_du_tableau_de_bord(): void
    {
        $this->actingAs(User::where('email', self::RESPONSIBLE)->firstOrFail());

        $payload = $this->getJson('/dashboard/data')->assertOk()->json();

        foreach (['stats', 'water', 'cashflow', 'expenseBreakdown', 'stock', 'activities', 'alerts', 'waterSources'] as $cle) {
            $this->assertArrayHasKey($cle, $payload);
        }

        // Quatre tuiles d'indicateurs, les mêmes identifiants que l'aperçu.
        $this->assertSame(
            ['surface', 'stock', 'depenses', 'eau'],
            array_column($payload['stats'], 'id'),
        );

        // Les mois sans donnée ne sont pas présentés comme des zéros mesurés.
        $moisVides = array_filter(
            $payload['water'],
            fn (array $point) => $point['consumption'] === 0.0 && $point['reference'] === null,
        );
        $this->assertSame([], $moisVides);
    }
}
