<?php

namespace App\Policies;

use App\Models\Plot;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class PlotPolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Plot $plot): bool
    {
        return $this->ownsFarm($user, $plot);
    }
}
