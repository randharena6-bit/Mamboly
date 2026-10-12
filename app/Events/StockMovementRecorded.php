<?php

namespace App\Events;

use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Un mouvement de stock d'intrant vient d'être enregistré.
 */
class StockMovementRecorded
{
    use Dispatchable;

    public function __construct(
        public readonly StockMovement $movement,
        public readonly User $actor,
    ) {}
}
