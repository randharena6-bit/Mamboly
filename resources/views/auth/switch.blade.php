<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $title ?? 'Authentification' }} — {{ config('app.name', 'AgriWater') }}</title>
    <meta name="description" content="Connectez-vous ou créez votre exploitation AgriWater.">
    <meta name="robots" content="noindex">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@600..800&display=swap" rel="stylesheet">

    @include('partials.react-preamble')
    @vite(['resources/css/app.css', 'resources/js/auth-switch.tsx'])
</head>
<body class="min-h-screen bg-white font-sans text-ink-900 antialiased">
    <div id="agriwater-auth" data-mode="{{ $mode ?? 'login' }}"></div>

    <noscript>
        <div class="mx-auto max-w-md px-6 py-24 text-center">
            <h1 class="font-display text-2xl font-extrabold">Authentification</h1>
            <p class="mt-3 text-ink-500">Cette page nécessite JavaScript pour continuer.</p>
        </div>
    </noscript>
</body>
</html>