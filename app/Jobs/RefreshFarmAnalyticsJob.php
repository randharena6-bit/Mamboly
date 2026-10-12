<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

/**
 * Rafraîchit les vues matérialisées analytiques (si le pack d'optimisation est présent).
 */
class RefreshFarmAnalyticsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        $fn = DB::selectOne("SELECT to_regprocedure('agriwater_refresh_analytics()') AS p");

        if ($fn !== null && $fn->p !== null) {
            DB::statement('SELECT agriwater_refresh_analytics()');
        }
    }
}
