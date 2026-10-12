<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\AgriWaterSchema;
use Tests\TestCase;

/**
 * Authentification de l'API par jetons Sanctum.
 */
class ApiAuthTest extends TestCase
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

    public function test_un_jeton_est_emis_avec_des_identifiants_valides(): void
    {
        $response = $this->postJson('/api/login', [
            'email' => 'responsable.tsinjo@agriwater.test',
            'password' => 'password',
            'device_name' => 'phpunit',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['token', 'tokenType', 'user' => ['id', 'email']]);

        $this->assertDatabaseHas('personal_access_tokens', [
            'name' => 'phpunit',
        ]);
    }

    public function test_des_identifiants_invalides_sont_refuses(): void
    {
        $this->postJson('/api/login', [
            'email' => 'responsable.tsinjo@agriwater.test',
            'password' => 'mauvais',
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_une_route_protegee_exige_un_jeton(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }

    public function test_me_renvoie_lutilisateur_du_jeton_et_logout_le_revoque(): void
    {
        $user = User::where('email', 'agent.tsinjo@agriwater.test')->firstOrFail();
        $token = $user->createToken('phpunit')->plainTextToken;

        $this->withToken($token)->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'agent.tsinjo@agriwater.test');

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['name' => 'phpunit']);
    }
}
