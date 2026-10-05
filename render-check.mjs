/**
 * Rend le tableau de bord dans un DOM jsdom avec les données réellement
 * servies par /dashboard/data, pour vérifier l'adaptateur et les panneaux.
 */
import { JSDOM } from 'jsdom';

const base = process.argv[2] ?? 'http://127.0.0.1:8123';
const login = process.argv[3] ?? 'responsable.tsinjo@agriwater.test';

const loginPage = await fetch(`${base}/login`);
const setCookie = loginPage.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
const token = (await loginPage.text()).match(/csrf-token" content="([^"]+)"/)[1];

const auth = await fetch(`${base}/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Cookie: setCookie, Accept: 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ _token: token, email: login, password: 'password' }),
});
const session = [setCookie, ...auth.headers.getSetCookie().map((c) => c.split(';')[0])].join('; ');

const page = await fetch(`${base}/dashboard`, { headers: { Cookie: session } });
const html = await page.text();
console.log('login status:', auth.status, '| redirect:', auth.headers.get('location'));
console.log('dashboard status:', page.status, '| location:', page.headers.get('location'));
console.log('body head:', html.slice(0, 300));
const endpoint = html.match(/data-url="([^"]+)"/)[1];
const assets = [...html.matchAll(/\/build\/assets\/[^"]+\.js/g)].map((m) => m[0]);

const payload = await (await fetch(endpoint, { headers: { Cookie: session, Accept: 'application/json' } })).json();

const dom = new JSDOM(
    `<!DOCTYPE html><html><head><meta name="csrf-token" content="${token}"></head>
     <body><div id="agriwater-dashboard" data-url="${endpoint}"></div></body></html>`,
    { url: `${base}/dashboard`, pretendToBeVisual: true },
);

const errors = [];
dom.window.addEventListener('error', (event) => errors.push(String(event.error ?? event.message)));
dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
dom.window.scrollTo ??= () => {};
for (const [name, value] of Object.entries({
    getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
    Intl, URL, Blob, TextEncoder, TextDecoder, crypto: globalThis.crypto,
})) dom.window[name] = value;

let code = 0;
for (const asset of assets) {
    try {
        const source = await (await fetch(base + asset)).text();
        code = new dom.window.Function(source)();
    } catch (error) {
        errors.push(`${asset}: ${error.message}`);
    }
}

await new Promise((resolve) => setTimeout(resolve, 2500));

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
