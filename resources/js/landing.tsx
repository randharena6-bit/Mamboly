import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { LandingPage } from './pages/landing-page';
import { TooltipProvider } from './components/ui/tooltip';
import './bootstrap';

/**
 * Point d'entrée de la landing page AgriWater.
 *
 * La page est montée en îlot React depuis la vue Blade `resources/views/landing.blade.php`.
 * Aucun rendu serveur n'est nécessaire : le conteneur est vide dans le HTML.
 */
const container = document.getElementById('agriwater-landing');

if (container) {
    createRoot(container).render(
        <StrictMode>
            <TooltipProvider>
                <LandingPage />
            </TooltipProvider>
        </StrictMode>,
    );
}