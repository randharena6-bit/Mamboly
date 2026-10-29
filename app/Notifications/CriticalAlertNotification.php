<?php

namespace App\Notifications;

use App\Models\Alert;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification d'alerte métier (eau critique, stock critique, campagne à risque).
 *
 * Diffusée en base (cloche interne) et par courriel aux responsables de
 * l'exploitation concernée.
 */
class CriticalAlertNotification extends Notification
{
    use Queueable;

    public function __construct(public readonly Alert $alert) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        $email = method_exists($notifiable, 'preference')
            ? (bool) $notifiable->preference('email_alerts', true)
            : true;

        return $email ? ['database', 'mail'] : ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'alert_id' => $this->alert->id,
            'type' => $this->alert->type,
            'severity' => $this->alert->severity,
            'title' => $this->alert->title,
            'message' => $this->alert->message,
            'farm_id' => $this->alert->farm_id,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(sprintf('[AgriWater] %s', $this->alert->title))
            ->greeting('Bonjour,')
            ->line($this->alert->message)
            ->line(sprintf('Gravité : %s', $this->alert->severity))
            ->action('Ouvrir le tableau de bord', url('/dashboard'));
    }
}
