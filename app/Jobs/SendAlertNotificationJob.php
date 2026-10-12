<?php

namespace App\Jobs;

use App\Events\AlertRaised;
use App\Listeners\SendAlertNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Diffuse les alertes en tâche de fond (priorité faible).
 */
class SendAlertNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public readonly AlertRaised $event) {}

    public function handle(): void
    {
        (new SendAlertNotification)->handle($this->event);
    }
}
