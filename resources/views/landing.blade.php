<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'AgriWater') }} — Gestion agricole intelligente</title>
    <meta name="description" content="AgriWater centralise vos parcelles, stocks, activités, finances et votre consommation d'eau dans une plateforme sécurisée pour vos exploitations agricoles.">

    <meta property="og:title" content="AgriWater — Gestion agricole intelligente">
    <meta property="og:description" content="Centralisez et pilotez vos exploitations agricoles dans une plateforme unique, sécurisée et simple à utiliser.">
    <meta property="og:type" content="website">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@600..800&display=swap" rel="stylesheet">

    @include('partials.react-preamble')
    @vite(['resources/css/app.css', 'resources/js/landing.tsx'])
</head>
<body class="min-h-screen bg-white font-sans text-ink-900 antialiased">
    {{-- Îlot React : le contenu de la landing page est rendu côté client. --}}
    <div id="agriwater-landing"></div>

    {{-- Repli affiché tant que React monte, ou si le bundle est indisponible. --}}
    <noscript>
        <div class="mx-auto max-w-3xl px-6 py-24 text-center">
            <h1 class="text-3xl font-bold text-ink-900">AgriWater — Gestion agricole intelligente</h1>
            <p class="mt-4 text-ink-500">
                Cette page nécessite JavaScript. Vous pouvez directement vous connecter à votre espace :
                <a href="/login" class="font-semibold text-brand-700 underline">connexion</a>
                ou <a href="/register" class="font-semibold text-brand-700 underline">créer une exploitation</a>.
            </p>
        </div>
    </noscript>
</body>
</html>