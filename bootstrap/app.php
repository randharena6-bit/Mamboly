<?php

use App\Exceptions\BusinessRuleException;
use App\Http\Middleware\SetDatabaseActor;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'db.actor' => SetDatabaseActor::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Violations de règles métier (RM-xx) : renvoyées en 422 avec le code
        // de la règle pour que le client affiche un message contextualisé.
        $exceptions->render(function (BusinessRuleException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'rule' => $e->rule,
                ], $e->status());
            }

            return back()->withErrors(['metier' => $e->getMessage()]);
        });
    })->create();
