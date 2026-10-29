import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import type { ModuleContext } from './components/app/resource-page';
import { ToastProvider } from './components/ui/toast';
import { SettingsPage } from './pages/settings-page';
import './bootstrap';

/**
 * Point d'entrée des paramètres du compte.
 *
 * Le conteneur Blade porte l'URL de lecture et le contexte serveur (utilisateur,
 * exploitation, alertes). Les formulaires écrivent toujours sur le compte
 * connecté : aucun identifiant utilisateur n'est lu depuis le client.
 */
const container = document.getElementById('agriwater-settings');

if (container?.dataset.url) {
    createRoot(container).render(
        <StrictMode>
            <ToastProvider>
                <SettingsPage
                    endpoint={container.dataset.url}
                    context={parseContext(container.dataset.context)}
                />
            </ToastProvider>
        </StrictMode>,
    );
}

function parseContext(raw: string | undefined): ModuleContext {
    const fallback: ModuleContext = { user: null, farm: null, unreadAlerts: 0, canManage: false };

    if (raw === undefined || raw === '') return fallback;

    try {
        return { ...fallback, ...(JSON.parse(raw) as Partial<ModuleContext>) };
    } catch {
        return fallback;
    }
}
