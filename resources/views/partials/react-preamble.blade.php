{{--
    Preamble React Fast Refresh.

    @vitejs/plugin-react injecte dans chaque module JSX une vérification de
    `window.$RefreshReg$`. Ce symbole est posé par un script que le plugin
    ajoute normalement via le hook `transformIndexHtml` — hook que
    laravel-vite-plugin n'implémente pas. Sans ce script, le chargement du
    moindre composant échoue avec « can't detect preamble » et la page reste
    blanche.

    Ce partial le reproduit en mode développement uniquement. En production,
    les bundles sont minifiés et le code Fast Refresh est absent : rien à
    faire. Le script doit précéder les `@vite` car deux scripts `type="module"`
    s'exécutent dans l'ordre de leur apparition dans le document.
--}}
@if (file_exists(public_path('hot')))
    @php($viteDevServerUrl = rtrim(trim(file_get_contents(public_path('hot'))), '/'))
    <script type="module">
        import RefreshRuntime from '{{ $viteDevServerUrl }}/@react-refresh';

        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        window.__vite_plugin_react_preamble_installed__ = true;
    </script>
@endif
