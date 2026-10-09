<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>Tableau de bord — {{ config('app.name', 'AgriWater') }}</title>
    <meta name="description" content="Surface, stock, consommation d’eau et flux de trésorerie de votre exploitation.">
    <meta name="robots" content="noindex">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@600..800&display=swap" rel="stylesheet">

    @include('partials.react-preamble')
    @vite(['resources/css/app.css', 'resources/js/dashboard.tsx'])
</head>
<body class="min-h-screen bg-canvas text-ink-900 antialiased">
    {{-- Îlot React : les données sont chargées depuis `data-url`, sous la même session. --}}
    <div
        id="agriwater-dashboard"
        data-url="{{ $dataUrl }}"
        data-user="{{ json_encode($user, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) }}"
    ></div>

    <noscript>
        <div class="mx-auto max-w-3xl px-6 py-24 text-center">
            <h1 class="text-3xl font-bold text-ink-900">Tableau de bord</h1>
            <p class="mt-4 text-ink-500">La page se situe dans la function laravel d'où les autres ne sont pas autorisé à y acceder</p>
        </div>
    </noscript>
</body>
</html>
