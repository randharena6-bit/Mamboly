<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Paramètres — {{ config('app.name', 'AgriWater') }}</title>
    <meta name="description" content="Profil, sécurité, exploitation et préférences de votre compte AgriWater.">
    <meta name="robots" content="noindex">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@600..800&display=swap" rel="stylesheet">

    @include('partials.react-preamble')
    @vite(['resources/css/app.css', 'resources/js/settings.tsx'])
</head>
<body class="min-h-screen bg-canvas text-ink-900 antialiased">
    {{-- Îlot React : le contexte (utilisateur, exploitation) est décidé côté serveur. --}}
    <div
        id="agriwater-settings"
        data-url="{{ $dataUrl }}"
        data-context="{{ json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) }}"
    ></div>

    <noscript>
        <div class="mx-auto max-w-3xl px-6 py-24 text-center">
            <h1 class="text-3xl font-bold text-ink-900">Paramètres</h1>
            <p class="mt-4 text-ink-500">Cette page nécessite JavaScript pour gérer votre profil et vos préférences.</p>
        </div>
    </noscript>
</body>
</html>
