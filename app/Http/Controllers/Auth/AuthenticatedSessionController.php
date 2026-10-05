<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

/**
 * Connexion et déconnexion par session.
 *
 * Les écrans sont rendus par React (`resources/views/auth/switch.blade.php`) :
 * le contrôleur sert donc la coquille HTML du mode demandé, et répond en JSON
 * aux requêtes `Accept: application/json` envoyées par les formulaires.
 */
class AuthenticatedSessionController extends Controller
{
    public function create(): View
    {
        return view('auth.switch', ['mode' => 'login', 'title' => 'Connexion']);
    }

    public function store(LoginRequest $request): JsonResponse|RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        $user->forceFill(['last_login_at' => now()])->save();

        if ($request->wantsJson()) {
            return response()->json([
                'redirect' => route('dashboard'),
            ]);
        }

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $request): JsonResponse|RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->wantsJson()) {
            return response()->json(['redirect' => route('login')]);
        }

        return redirect()->route('home');
    }
}
