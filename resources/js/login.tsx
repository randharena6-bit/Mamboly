import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { LoginPage } from './pages/login-page';
import './bootstrap';

/**
 * Point d'entrée de l'écran de connexion.
 *
 * Îlot React monté depuis `resources/views/auth/login.blade.php`.
 */
const container = document.getElementById('agriwater-login');

if (container) {
    createRoot(container).render(
        <StrictMode>
            <LoginPage />
        </StrictMode>,
    );
}
