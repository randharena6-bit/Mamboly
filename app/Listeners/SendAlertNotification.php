<?php

namespace App\Listeners;

use App\Enums\RoleName;
use App\Events\AlertRaised;
use App\Models\User;
use App\Notifications\CriticalAlertNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Diffuse une alerte métier aux responsables de l'exploitation.
 *
 * Les destinataires sont les comptes « responsable »/« administrateur » de
 * l'exploitation, plus son responsable désigné s'il n'a pas ce rôle.
 */
class SendAlertNotification
{
    public function handle(AlertRaised $event): void
    {
        $alert = $event->alert;
        $farm = $alert->farm;

        if ($farm === null) {
            return;
        }

        $recipients = $farm->users()
            ->where('is_active', true)
            ->whereHas('role', fn ($query) => $query->whereIn('name', [
                RoleName::Responsable->value,
                RoleName::Administrateur->value,
            ]))
            ->get();

        if ($farm->manager !== null && ! $recipients->contains('id', $farm->manager_id)) {
            $recipients->push($farm->manager);
        }

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients->unique('id')->values(), new CriticalAlertNotification($alert));
    }
}
