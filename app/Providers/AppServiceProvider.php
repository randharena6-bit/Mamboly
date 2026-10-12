<?php

namespace App\Providers;

use App\Events\AlertRaised;
use App\Jobs\SendAlertNotificationJob;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(AlertRaised::class, fn (AlertRaised $event) => SendAlertNotificationJob::dispatch($event));
    }
}
