import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from './components/ui/tooltip';
import { DashboardPage } from './pages/dashboard-page';
import './bootstrap';

/**
 * Point d'entrée du tableau de bord connecté.
 *
 * Îlot React monté depuis `resources/views/dashboard.blade.php`. L'URL des
 * données est lue sur le conteneur plutôt que codée en dur : la vue Blade reste
 * la source de vérité des routes.
 */
const container = document.getElementById('agriwater-dashboard');

if (container?.dataset.url) {
    createRoot(container).render(
        <StrictMode>
            {/* Les infobulles des tuiles et de l'en-tête l'exigent. */}
            <TooltipProvider>
                <DashboardPage endpoint={container.dataset.url} />
            </TooltipProvider>
        </StrictMode>,
    );
}
