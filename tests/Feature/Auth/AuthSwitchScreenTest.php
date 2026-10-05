<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Tests\TestCase;

/**
 * Écran d'authentification unique : `/login` et `/register` servent la même
 * vue React, le mode initial étant transmis par le serveur.
 *
 * Les tests ne touchent pas la base : ils vérifient le contrat HTML livré au
 * navigateur (vue, mode initial, titre), pas la persistance.
 */
class AuthSwitchScreenTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Les assets sont compilés par Vite : hors de ce test, seul le HTML compte.
        $this->withoutVite();
    }

    public function test_login_serves_the_switch_screen_in_login_mode(): void
    {
        $response = $this->get('/login');

        $response->assertOk();
        $response->assertViewIs('auth.switch');
        $response->assertViewHas('mode', 'login');
        $response->assertSee('id="agriwater-auth" data-mode="login"', escape: false);
        $response->assertSee('<title>Connexion — AgriWater</title>', escape: false);
    }

    public function test_register_serves_the_switch_screen_in_register_mode(): void
    {
        $response = $this->get('/register');

        $response->assertOk();
        $response->assertViewIs('auth.switch');
        $response->assertViewHas('mode', 'register');
        $response->assertSee('id="agriwater-auth" data-mode="register"', escape: false);
        $response->assertSee('<title>Créer votre exploitation — AgriWater</title>', escape: false);
    }

    public function test_the_switch_screen_is_mounted_in_a_single_root(): void
    {
        // React ne monte qu'un seul îlot : le mode est un attribut, pas un
        // second conteneur. Deux racines casseraient le partage d'état.
        $html = $this->get('/login')->getContent();

        $this->assertSame(1, substr_count($html, 'id="agriwater-auth"'));
        $this->assertStringNotContainsString('agriwater-login', $html);
        $this->assertStringNotContainsString('agriwater-register', $html);
    }

    public function test_authenticated_users_are_sent_to_the_dashboard(): void
    {
        $this->actingAs(new User(['email' => 'test@example.mg']));

        $this->get('/login')->assertRedirect('/dashboard');
        $this->get('/register')->assertRedirect('/dashboard');
    }
}
