<?php

namespace App\Policies;

use App\Enums\RoleName;
use App\Models\Expense;
use App\Models\User;
use App\Policies\Concerns\HandlesFarmScoping;

class ExpensePolicy
{
    use HandlesFarmScoping;

    public function view(User $user, Expense $expense): bool
    {
        return $this->ownsFarm($user, $expense);
    }

    /** La suppression d'une dépense est réservée au responsable. */
    public function delete(User $user, Expense $expense): bool
    {
        return $this->ownsFarm($user, $expense) && $user->role?->name === RoleName::Responsable->value;
    }
}
