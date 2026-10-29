<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AgriWaterDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\AgriWaterSchema;
use Tests\TestCase;

/**
 * Paramètres du compte : lecture du profil, mise à jour des préférences et
 * isolation des écritures. Aucun formulaire n'accepte l'identifiant d'un autre
 * utilisateur ; la mise à jour de l'exploitation reste réservée à
 * l'administrateur par `FarmPolicy`.
 */
class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private const RESPONSABLE = 'responsable.tsinjo@agriwater.test';

    protected function beforeRefreshingDatabase(): void
    {
        AgriWaterSchema::ensureExists();
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();

        $this->seed(AgriWaterDemoSeeder::class);
    }

    public function test_la_page_des_parametres_exige_une_session(): void
    {
        $this->get('/parametres')->assertRedirect('/login');
        $this->getJson('/parametres/data')->assertUnauthorized();
    }

    public function test_les_parametres_exposent_le_profil_et_les_preferences_par_defaut(): void
    {
        $user = User::where('email', self::RESPONSABLE)->firstOrFail();

        $this->actingAs($user);

        $page = $this->get('/parametres');
        $page->assertOk();
        $page->assertSee('id="agriwater-settings"', false);
        $page->assertSee(route('settings.data'), false);

        $payload = $this->getJson('/parametres/data')->assertOk()->json();

        $this->assertSame($user->name, $payload['user']['name']);
        $this->assertSame($user->email, $payload['user']['email']);
        $this->assertSame($user->farm->name, $payload['farm']['name']);
        $this->assertFalse($payload['farm']['canUpdate']);
        $this->assertSame(User::DEFAULT_PREFERENCES, $payload['user']['preferences']);
    }

    public function test_le_profil_est_modifie_sur_le_compte_connecte(): void
    {
        $user = User::where('email', self::RESPONSABLE)->firstOrFail();

        $response = $this->actingAs($user)->patchJson('/parametres/profil', [
            'name' => 'Rakoto Jean Claude',
            'email' => 'jean.claude@agriwater.test',
            'phone' => '+261 34 00 000 02',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.user.name', 'Rakoto Jean Claude');

        $user->refresh();

        $this->assertSame('Rakoto Jean Claude', $user->name);
        $this->assertSame('jean.claude@agriwater.test', $user->email);
        $this->assertSame('+261 34 00 000 02', $user->phone);
    }

    public function test_les_preferences_sont_fusionnees_et_persistees(): void
    {
        $user = User::where('email', self::RESPONSABLE)->firstOrFail();

        $this->actingAs($user)
            ->patchJson('/parametres/preferences', [
                'email_alerts' => false,
                'alert_min_severity' => 'critique',
            ])
            ->assertOk()
            ->assertJsonPath('data.preferences.email_alerts', false)
            ->assertJsonPath('data.preferences.alert_min_severity', 'critique')
            ->assertJsonPath('data.preferences.reduce_motion', false);

        $this->patchJson('/parametres/preferences', [
            'reduce_motion' => true,
            'sidebar_collapsed' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.preferences.email_alerts', false)
            ->assertJsonPath('data.preferences.reduce_motion', true)
            ->assertJsonPath('data.preferences.sidebar_collapsed', true);

        $user->refresh();

        $this->assertFalse($user->preference('email_alerts'));
        $this->assertSame('critique', $user->preference('alert_min_severity'));
        $this->assertTrue($user->preference('reduce_motion'));
        $this->assertTrue($user->preference('sidebar_collapsed'));
    }

    public function test_le_mot_de_passe_est_verifie_avant_modification(): void
    {
        $user = User::where('email', self::RESPONSABLE)->firstOrFail();

        $this->actingAs($user)
            ->patchJson('/parametres/mot-de-passe', [
                'current_password' => 'mauvais-mot-de-passe',
                'password' => 'nouveau-mot-de-passe',
                'password_confirmation' => 'nouveau-mot-de-passe',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('current_password');

        $this->patchJson('/parametres/mot-de-passe', [
            'current_password' => 'password',
            'password' => 'nouveau-mot-de-passe',
            'password_confirmation' => 'nouveau-mot-de-passe',
        ])->assertOk();

        $this->assertTrue(Hash::check('nouveau-mot-de-passe', $user->refresh()->password));
    }

    public function test_un_membre_ne_peut_pas_modifier_son_exploitation_depuis_les_parametres(): void
    {
        $user = User::where('email', self::RESPONSABLE)->firstOrFail();

        $this->actingAs($user)
            ->patchJson('/parametres/exploitation', [
                'name' => 'Exploitation détournée',
                'status' => 'active',
            ])
            ->assertForbidden();

        $this->assertNotSame('Exploitation détournée', $user->farm->refresh()->name);
    }
}
