import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { RegisterPage } from './pages/register-page';
import './bootstrap';

/**
 * Point d'entrée de l'écran d'inscription.
 *
 * Îlot React monté depuis `resources/views/auth/register.blade.php`.
 */
const container = document.getElementById('agriwater-register');

if (container) {
    createRoot(container).render(
        <StrictMode>
            <RegisterPage />
        </StrictMode>,
    );
}
