<?php

namespace App\Listeners;

use App\Enums\AlertSeverity;
use App\Enums\RoleName;
use App\Events\AlertRaised;
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

        $alertWeight = AlertSeverity::tryFrom($alert->severity)?->weight() ?? 0;

        $recipients = $recipients
            ->unique('id')
            ->filter(function ($user) use ($alertWeight): bool {
                $minimum = AlertSeverity::tryFrom((string) $user->preference('alert_min_severity', 'avertissement'));

                return $alertWeight >= ($minimum?->weight() ?? 0);
            })
            ->values();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new CriticalAlertNotification($alert));
    }
}
