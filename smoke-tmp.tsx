/**
 * Smoke test : rend la landing page en string pour détecter les erreurs
 * d'exécution (composants manquants, props invalides, hooks cassés).
 * Exécution : node /tmp/opencode/smoke.mjs
 */
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { LandingPage } from '/home/eric-dev/Documents/Mamboly/resources/js/pages/landing-page.tsx';
import { TooltipProvider } from '/home/eric-dev/Documents/Mamboly/resources/js/components/ui/tooltip.tsx';

// Recharts et Radix attending un DOM, on fournit les quelques globals manquants.
globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const html = renderToString(createElement(TooltipProvider, null, createElement(LandingPage)));

console.log('RENDER OK — longueur HTML :', html.length);

const checks = {
    'titre hero': 'Gérez votre',
    'nom AgriWater': 'AgriWater',
    'section fonctionnalités': 'Tout ce qu’il faut pour mieux gérer votre exploitation',
    'section sécurité': 'Chaque exploitation garde le contrôle de ses données',
    'CTA': 'Prenez le contrôle de votre exploitation',
    'copyright': 'Tous droits réservés',
    'lien /login': '/login',
    'lien /register': '/register',
    'lien /dashboard': '/dashboard',
    'skip link': 'Aller au contenu principal',
};

let failed = 0;
for (const [label, needle] of Object.entries(checks)) {
    const ok = html.includes(needle);
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
}

const unknown = [...html.matchAll(/class="[^"]*\b([a-z]+)-\d{2,3}\b/g)].slice(0, 5);
console.log('\nSuspicious class names:', unknown.length ? unknown.map((m) => m[0]) : 'aucune');

process.exit(failed > 0 ? 1 : 0);