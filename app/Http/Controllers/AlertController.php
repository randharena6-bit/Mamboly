<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Models\Alert;
use App\Services\AlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AlertController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly AlertService $alerts) {}

    public function index(Request $request): JsonResponse
    {
        $unreadOnly = $request->boolean('unread_only') ? true : null;

        $alerts = $this->alerts->forFarm($request->user()->farm, $unreadOnly);

        return $this->respond($alerts);
    }

    public function show(Alert $alert): JsonResponse
    {
        Gate::authorize('view', $alert);

        return $this->respond($alert);
    }

    public function markRead(Alert $alert): JsonResponse
    {
        Gate::authorize('view', $alert);

        $alert = $this->alerts->markRead($alert);

        return $this->respond([
            'id' => $alert->id,
            'isRead' => true,
            'unreadCount' => $this->alerts->unreadCount($alert->farm),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = $this->alerts->markAllRead($request->user()->farm);

        return $this->respond(['isRead' => true, 'marked' => $count, 'unreadCount' => 0]);
    }
}