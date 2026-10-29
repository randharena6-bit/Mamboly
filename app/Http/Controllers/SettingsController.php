<?php

namespace App\Http\Controllers;

use App\Enums\RoleName;
use App\Models\Farm;
use App\Models\User;
use App\Support\AppContext;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * Paramètres du compte connecté : profil, mot de passe, exploitation,
 * notifications et apparence.
 *
 * Toutes les écritures portent sur `$request->user()` : aucun identifiant
 * d'utilisateur n'est accepté depuis le client. La mise à jour de
 * l'exploitation reste soumise à `FarmPolicy`.
 */
class SettingsController extends Controller
{
    public function show(Request $request): View
    {
        return view('settings', [
            'dataUrl' => route('settings.data'),
            'context' => AppContext::for($request->user()),
        ]);
    }

    public function data(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing('role:id,name', 'farm');

        return response()->json([
            'user' => $this->userPayload($user),
            'farm' => $this->farmPayload($user, $user->farm),
            'meta' => [
                'appName' => config('app.name', 'AgriWater'),
                'locale' => app()->getLocale(),
                'timezone' => config('app.timezone'),
                'sessionDriver' => config('session.driver'),
            ],
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
        ], [], [
            'name' => 'nom',
            'email' => 'adresse e-mail',
            'phone' => 'téléphone',
        ]);

        $user->update($validated);
        $user->refresh()->load('role:id,name');

        return response()->json([
            'message' => 'Profil mis à jour.',
            'data' => ['user' => $this->userPayload($user)],
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ], [], [
            'current_password' => 'mot de passe actuel',
            'password' => 'nouveau mot de passe',
        ]);

        $user = $request->user();
        $user->forceFill(['password' => Hash::make($validated['password'])])->save();

        $closed = $this->closeOtherSessions($request);

        return response()->json([
            'message' => $closed > 0
                ? "Mot de passe mis à jour. {$closed} autre(s) session(s) ont été fermée(s)."
                : 'Mot de passe mis à jour.',
            'data' => ['closedSessions' => $closed],
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_alerts' => ['sometimes', 'boolean'],
            'alert_min_severity' => ['sometimes', 'in:info,avertissement,critique'],
            'reduce_motion' => ['sometimes', 'boolean'],
            'sidebar_collapsed' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $preferences = array_merge($user->preferencesOrDefaults(), $validated);

        $user->update(['preferences' => $preferences]);

        return response()->json([
            'message' => 'Préférences enregistrées.',
            'data' => ['preferences' => $preferences],
        ]);
    }

    public function updateFarm(Request $request): JsonResponse
    {
        $user = $request->user();
        $farm = $user->farm;

        abort_if($farm === null, 404, 'Aucune exploitation n’est associée à ce compte.');

        Gate::authorize('update', $farm);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('farms', 'name')->ignore($farm->id),
            ],
            'location' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'total_area' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'status' => ['nullable', 'in:active,suspendue,inactive'],
        ], [], [
            'name' => 'nom de l’exploitation',
            'location' => 'localisation',
            'type' => 'type d’exploitation',
            'total_area' => 'superficie',
            'status' => 'statut',
        ]);

        $farm->update($validated);
        $farm->refresh();

        return response()->json([
            'message' => 'Exploitation mise à jour.',
            'data' => ['farm' => $this->farmPayload($user, $farm)],
        ]);
    }

    public function logoutOtherSessions(Request $request): JsonResponse
    {
        if (config('session.driver') !== 'database') {
            return response()->json([
                'message' => 'La gestion des sessions nécessite le pilote de session « database ».',
            ], 422);
        }

        $closed = $this->closeOtherSessions($request);

        return response()->json([
            'message' => $closed > 0
                ? "{$closed} autre(s) session(s) ont été fermée(s)."
                : 'Aucune autre session active.',
            'data' => ['closedSessions' => $closed],
        ]);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->role?->name,
            'roleLabel' => RoleName::tryFrom((string) $user->role?->name)?->label(),
            'isActive' => $user->isActive(),
            'emailVerified' => $user->email_verified_at !== null,
            'lastLoginAt' => $user->last_login_at?->toIso8601String(),
            'createdAt' => $user->created_at?->toIso8601String(),
            'initials' => $user->initials(),
            'preferences' => $user->preferencesOrDefaults(),
        ];
    }

    /** @return array<string, mixed>|null */
    private function farmPayload(User $user, ?Farm $farm): ?array
    {
        if ($farm === null) {
            return null;
        }

        return [
            'id' => $farm->id,
            'name' => $farm->name,
            'location' => $farm->location,
            'type' => $farm->type,
            'totalArea' => (float) $farm->total_area,
            'status' => $farm->status,
            'canUpdate' => $user->can('update', $farm),
        ];
    }

    /** Ferme les sessions du compte autres que la session courante. */
    private function closeOtherSessions(Request $request): int
    {
        if (config('session.driver') !== 'database') {
            return 0;
        }

        $user = $request->user();

        if ($user === null) {
            return 0;
        }

        return DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
    }
}
