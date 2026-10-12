<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

/**
 * Publie l'identité de l'acteur courant dans la session PostgreSQL.
 *
 * Le déclencheur `agriwater_log_operation` lit `agriwater.user_id` pour
 * renseigner le journal d'audit, et `agriwater.manager_validation_threshold`
 * porte le seuil RM-10. Sans ce middleware, les écritures déclenchées depuis
 * l'application laisseraient `user_id` vide.
 */
class SetDatabaseActor
{
    public function handle(Request $request, Closure $next): Response
    {
        if (DB::getDriverName() === 'pgsql' && $request->user() !== null) {
            DB::select("select set_config('agriwater.user_id', ?, false)", [(string) $request->user()->id]);
            DB::select("select set_config('agriwater.manager_validation_threshold', ?, false)", [
                (string) config('agriwater.manager_validation_threshold', 2000),
            ]);
        }

        return $next($request);
    }
}
