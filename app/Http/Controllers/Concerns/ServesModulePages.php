<?php

namespace App\Http\Controllers\Concerns;

use App\Support\AppContext;
use Illuminate\Contracts\View\View;

/**
 * Sert la page HTML d'un module métier.
 *
 * Les endpoints métier répondent en JSON sous `Accept: application/json` (appel
 * des îlots React) et en HTML pour une navigation classique. La vue partagée
 * « modules.app » monte l'îlot React à partir de `data-module`, `data-url` et du
 * contexte serveur.
 */
trait ServesModulePages
{
    protected function moduleView(string $module, string $title): View
    {
        return view('modules.app', [
            'module' => $module,
            'title' => $title,
            'dataUrl' => url()->current(),
            'context' => AppContext::for(request()->user()),
        ]);
    }
}
