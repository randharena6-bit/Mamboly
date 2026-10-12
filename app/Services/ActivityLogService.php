<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Journal d'audit applicatif (CDC § 16).
 *
 * Complète le déclencheur `agriwater_log_operation` pour les évènements qui ne
 * sont pas des écritures de table métier : connexions, refus d'accès.
 */
class ActivityLogService
{
    public function log(
        ?User $user,
        string $action,
        string $entityType,
        int $entityId,
        ?string $description = null,
        ?Request $request = null,
        ?int $farmId = null,
    ): ActivityLog {
        return ActivityLog::withoutFarmScope()->create([
            'farm_id' => $farmId ?? $user?->farm_id,
            'user_id' => $user?->id,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'ip_address' => $request?->ip(),
            'user_agent' => $request ? mb_substr((string) $request->userAgent(), 0, 255) : null,
        ]);
    }

    public function recordLogin(User $user, ?Request $request = null): ActivityLog
    {
        return $this->log(
            $user,
            'login',
            'users',
            $user->id,
            sprintf('Connexion réussie de %s', $user->name),
            $request,
        );
    }

    public function recordLogout(User $user, ?Request $request = null): ActivityLog
    {
        return $this->log(
            $user,
            'logout',
            'users',
            $user->id,
            sprintf('Déconnexion de %s', $user->name),
            $request,
        );
    }

    public function recordAccessDenied(User $user, string $entityType, int $entityId, ?Request $request = null): ActivityLog
    {
        return $this->log(
            $user,
            'access_denied',
            $entityType,
            $entityId,
            sprintf('Accès refusé à %s (id=%s)', $entityType, $entityId),
            $request,
        );
    }
}
