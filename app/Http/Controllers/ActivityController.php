<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Concerns\ServesModulePages;
use App\Http\Requests\ActivityRequest;
use App\Models\Activity;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    use RespondsWithJson;
    use ServesModulePages;

    public function index(Request $request): View|JsonResponse
    {
        if (! $request->expectsJson()) {
            return $this->moduleView('activities', 'Activités');
        }

        $activities = Activity::query()
            ->with(['plot:id,code,name', 'campaign:id,code,name'])
            ->orderByDesc('activity_date')
            ->paginate($this->perPage($request));

        return $this->paginated($activities);
    }

    public function store(ActivityRequest $request): JsonResponse
    {
        $activity = Activity::create($request->validated() + [
            'farm_id' => $request->user()->farm_id,
            'user_id' => $request->user()->id,
        ]);

        return $this->created($activity, 'Activité enregistrée.');
    }

    public function show(Activity $activity): JsonResponse
    {
        return $this->respond($activity);
    }

    public function update(ActivityRequest $request, Activity $activity): JsonResponse
    {
        $activity->update($request->validated());

        return $this->updated($activity, 'Activité mise à jour.');
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $activity->delete();

        return $this->deleted('Activité supprimée.');
    }
}
