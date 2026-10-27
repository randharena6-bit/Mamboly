/**
 * Rend le tableau de bord dans un DOM jsdom avec les données réellement
 * servies par /dashboard/data, pour vérifier l'adaptateur et les panneaux.
 */
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { JSDOM } from 'jsdom';

const base = process.argv[2] ?? 'http://127.0.0.1:8123';
const login = process.argv[3] ?? 'responsable.tsinjo@agriwater.test';

const loginPage = await fetch(`${base}/login`);
const token = (await loginPage.text()).match(/csrf-token" content="([^"]+)"/)[1];

// Les cookies sont fusionnés par nom (la dernière valeur gagne) : Laravel
// régénère la session à la connexion et envoyer les deux valeurs casse l'auth.
function cookieJar(...responses) {
    const jar = new Map();

    for (const response of responses) {
        for (const cookie of response.headers.getSetCookie()) {
            const pair = cookie.split(';')[0];
            const separator = pair.indexOf('=');
            jar.set(pair.slice(0, separator), pair.slice(separator + 1));
        }
    }

    return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

const auth = await fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: cookieJar(loginPage), Accept: 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ _token: token, email: login, password: 'password' }),
});
const session = cookieJar(loginPage, auth);

const page = await fetch(`${base}/dashboard`, { headers: { Cookie: session } });
const html = await page.text();
console.log('login status:', auth.status, '| redirect:', auth.headers.get('location'));
console.log('dashboard status:', page.status, '| location:', page.headers.get('location'));
console.log('body head:', html.slice(0, 300));
const endpoint = html.match(/data-url="([^"]+)"/)[1];

// En développement, Blade pointe vers le serveur Vite. On retombe alors sur
// l'entrée du dernier build pour que la vérification reste utilisable.
let entry = html.match(/<script type="module" src="([^"]*\/build\/assets\/[^"]+\.js)"/)?.[1];

if (entry === undefined) {
    const manifest = JSON.parse(await readFile('public/build/manifest.json', 'utf8'));
    const file = manifest['resources/js/dashboard.tsx']?.file;

    if (file === undefined) {
        console.error('Aucun build trouvé : lancez `npm run build` avant la vérification.');
        process.exit(1);
    }

    entry = `/build/${file}`;
    console.log('Vite est en mode développement : vérification sur le dernier build.');
}

const payload = await (await fetch(endpoint, { headers: { Cookie: session, Accept: 'application/json' } })).json();

const dom = new JSDOM(
    `<!DOCTYPE html><html><head><meta name="csrf-token" content="${token}"></head>
     <body><div id="agriwater-dashboard" data-url="${endpoint}"></div></body></html>`,
    { url: `${base}/dashboard`, pretendToBeVisual: true },
);

const errors = [];
const window = dom.window;
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.scrollTo ??= () => {};

// Les bundles sont des modules ES : on les importe dans Node avec les globals
// du DOM, plutôt que de les évaluer comme des scripts classiques.
const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    self: window,
    getComputedStyle: window.getComputedStyle.bind(window),
    matchMedia: window.matchMedia.bind(window),
    ResizeObserver: window.ResizeObserver,
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    requestAnimationFrame: window.requestAnimationFrame.bind(window),
    cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
    HTMLElement: window.HTMLElement,
    Element: window.Element,
    Node: window.Node,
    SVGElement: window.SVGElement,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    KeyboardEvent: window.KeyboardEvent,
    CustomEvent: window.CustomEvent,
    MutationObserver: window.MutationObserver,
    DOMParser: window.DOMParser,
    FormData: window.FormData,
    Blob: window.Blob,
};

for (const [name, value] of Object.entries(globals)) {
    try {
        globalThis[name] = value;
    } catch {
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
    }
}

const nodeFetch = globalThis.fetch;
globalThis.fetch = (input, init = {}) => {
    const headers = new Headers(init.headers ?? {});
    headers.set('Cookie', session);

    return nodeFetch(input, { ...init, headers });
};

process.on('uncaughtException', (error) => errors.push(`exception : ${error.message}`));
process.on('unhandledRejection', (error) => errors.push(`rejet : ${String(error)}`));

try {
    const path = process.cwd() + '/public' + new URL(entry, base).pathname;
    await import(`${pathToFileURL(path).href}?t=${Date.now()}`);
} catch (error) {
    errors.push(`${entry}: ${error.message}`);
}

await new Promise((resolve) => setTimeout(resolve, 3000));

const root = dom.window.document.getElementById('agriwater-dashboard');
const text = root.textContent.replace(/\s+/g, ' ').trim();
const checks = {
    'exploitation': text.includes(payload.farm.name),
    'utilisateur': text.includes(payload.user.name),
    'surface (tuile)': text.includes('Surface totale'),
    'valeur du stock': text.includes('Valeur du stock'),
    'graphique eau': text.includes('Consommation d’eau') && text.includes('Référence N-1'),
    'dépenses/récoltes': text.includes('Dépenses et recettes'),
    'répartition': text.includes('Répartition des dépenses'),
    'catégorie libellée': text.includes('Carburant'),
    'état des stocks': text.includes('État des stocks'),
    'points d’eau': text.includes('Points d’eau'),
    'bassin (scoping)': text.includes('Bassin Sud'),
    'activités': text.includes('Activités récentes') && text.includes('Repiquage'),
    'alertes': text.includes('Alertes intelligentes'),
    'aucune maquette': !text.includes('app.agriwater.mg'),
    'aucun squelette': !text.includes('animate-pulse'),
};

for (const [label, ok] of Object.entries(checks)) console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}`);
console.log('\nErreurs JS :', errors.length ? errors : 'aucune');
console.log('Extrait :', text.slice(0, 260));

process.exit(Object.values(checks).every(Boolean) && errors.length === 0 ? 0 : 1);
