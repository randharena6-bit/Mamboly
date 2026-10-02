<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $title ?? config('app.name', 'AgriWater') }}</title>
    <meta name="description" content="{{ $description ?? 'AgriWater, plateforme de gestion des exploitations agricoles.' }}">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Plus+Jakarta+Sans:wght@600..800&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="min-h-screen bg-sand-50 font-sans text-ink-900 antialiased">
    <main class="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <a href="{{ route('home') }}" class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
            <span aria-hidden="true">←</span> Retour à l’accueil
        </a>

        <p class="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            {{ $eyebrow ?? 'Page en préparation' }}
        </p>

        <h1 class="mt-3 text-4xl font-extrabold tracking-tight text-ink-900">{{ $title ?? 'Bientôt disponible' }}</h1>

        <p class="mt-4 text-lg leading-relaxed text-ink-500">
            {{ $description ?? 'Cette page est en cours de construction.' }}
        </p>

        <div class="mt-8 flex flex-wrap gap-3">
            <a href="{{ route('register') }}"
               class="inline-flex h-11 items-center rounded-full bg-brand-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800">
                Commencer gratuitement
            </a>
            <a href="{{ route('login') }}"
               class="inline-flex h-11 items-center rounded-full border border-ink-200 bg-white px-6 text-sm font-semibold text-ink-800 transition hover:border-brand-300 hover:bg-brand-50">
                Se connecter
            </a>
        </div>
    </main>
</body>
</html>