<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Authentification de l'API par jetons Sanctum.
 *
 * Le front web utilise la session ; cette façade sert les clients mobiles et
 * les intégrations. Un jeton est émis après vérification du mot de passe et de
 * l'état actif du compte, et révoqué à la déconnexion.
 */
class AuthController extends Controller
{
    public function __construct(private readonly ActivityLogService $logs) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->validated('email'))->first();

        if ($user === null || ! Hash::check($request->validated('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        if (! $user->isActive()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte est désactivé.'],
            ]);
        }

        $token = $user->createToken($request->validated('device_name') ?? 'api')->plainTextToken;

        $this->logs->recordLogin($user, $request);

        return response()->json([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => new UserResource($user->load('role:id,name', 'farm:id,name')),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()->load('role:id,name', 'farm:id,name')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        $this->logs->recordLogout($user, $request);

        $user->currentAccessToken()?->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
