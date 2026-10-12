<?php

namespace App\Policies;

use App\Models\InputStock;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class InputStockPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, InputStock $input): bool
    {
        return $this->ownsFarm($user, $input);
    }
}
