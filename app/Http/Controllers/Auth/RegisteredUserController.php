<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Farm;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;

/**
 * Création de compte.
 *
 * L'inscription est atomique : l'exploitation et son responsable sont créés
 * dans une transaction, car `farms.manager_id` référence `users.id` alors que
 * `users.farm_id` référence `farms.id` — une dépendance circulaire qui
 * s'établit en deux temps.
 */
class RegisteredUserController extends Controller
{
    public function create(): View
    {
        return view('auth.switch', [
            'mode' => 'register',
            'title' => 'Créer votre exploitation',
        ]);
    }

    public function store(RegisterRequest $request): JsonResponse|RedirectResponse
    {
        $user = DB::transaction(function () use ($request): User {
            $role = Role::where('name', Role::RESPONSABLE)->firstOrFail();

            $user = User::create([
                'name' => $request->validated('name'),
                'email' => $request->validated('email'),
                'password' => $request->validated('password'),
                'phone' => $request->validated('phone'),
                'role_id' => $role->id,
            ]);

            $farm = Farm::create([
                'name' => $request->validated('farm_name'),
                'location' => $request->validated('location'),
                'manager_id' => $user->id,
            ]);

            // Rattachement du compte à son exploitation.
            $user->farm()->associate($farm)->save();

            return $user;
        });

        event(new Registered($user));

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();

        if ($request->wantsJson()) {
            return response()->json([
                'redirect' => route('dashboard'),
            ]);
        }

        return redirect()->route('dashboard');
    }
}
