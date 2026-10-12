<?php

namespace App\Policies;

use App\Models\IrrigationSchedule;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class IrrigationSchedulePolicy
{
    use HandlesFarmScoping;

    public function view(User $user, IrrigationSchedule $schedule): bool
    {
        return $this->ownsFarm($user, $schedule);
    }
}
