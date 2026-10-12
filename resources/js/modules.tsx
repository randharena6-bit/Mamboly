import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ResourcePage, type ModuleContext } from './components/app/resource-page';
import { ToastProvider } from './components/ui/toast';
import { TooltipProvider } from './components/ui/tooltip';
import { resourceConfigs } from './resources/config';
import './bootstrap';

/**
 * Point d'entrée des modules métier.
 *
 * Chaque page Blade monte un conteneur `#agriwater-module` décrivant le module
 * (`data-module`), l'endpoint JSON (`data-url`) et le contexte serveur
 * (`data-context`). L'îlot choisit sa configuration dans `resourceConfigs` et
 * délègue le rendu à `ResourcePage`.
 */
const container = document.getElementById('agriwater-module');

if (container) {
    const moduleName = container.dataset.module ?? '';
    const config = resourceConfigs[moduleName];

    if (config === undefined) {
        renderMissingModule(container, moduleName);
    } else {
        const endpoint = container.dataset.url ?? config.endpoint;
        const context = parseContext(container.dataset.context);

        createRoot(container).render(
            <StrictMode>
                <TooltipProvider>
                    <ToastProvider>
                        <ResourcePage config={config} endpoint={endpoint} context={context} />
                    </ToastProvider>
                </TooltipProvider>
            </StrictMode>,
        );
    }
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

function renderMissingModule(root: HTMLElement, moduleName: string): void {
    root.innerHTML = `
        <div class="mx-auto max-w-xl px-6 py-24 text-center">
            <h1 class="font-display text-2xl font-bold text-ink-900">Module indisponible</h1>
            <p class="mt-3 text-sm text-ink-500">
                Le module « ${moduleName} » n’est pas encore pris en charge par cette interface.
            </p>
        </div>
    `;
}
