import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthSwitcher, type AuthMode } from './components/auth/auth-switcher';
import { LoginForm } from './components/auth/login-form';
import { RegisterForm } from './components/auth/register-form';
import './bootstrap';

/**
 * Point d'entrée de l'écran d'authentification.
 *
 * Îlot React monté depuis `resources/views/auth/switch.blade.php`, servi par
 * `/login` et `/register` : le mode initial est lu sur le conteneur, la bascule
 * entre les deux se fait ensuite sans rechargement.
 */
const container = document.getElementById('agriwater-auth');

if (container) {
    const mode: AuthMode = container.dataset.mode === 'register' ? 'register' : 'login';

    createRoot(container).render(
        <StrictMode>
            <AuthSwitcher defaultMode={mode} login={<LoginForm />} register={<RegisterForm />} />
        </StrictMode>,
    );
}
