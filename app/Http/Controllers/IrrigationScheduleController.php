<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Controllers\Concerns\ServesModulePages;
use App\Http\Requests\IrrigationScheduleRequest;
use App\Models\IrrigationSchedule;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IrrigationScheduleController extends Controller
{
    use RespondsWithJson;
    use ServesModulePages;

    public function index(Request $request): View|JsonResponse
    {
        if (! $request->expectsJson()) {
            return $this->moduleView('schedules', 'Planifications d’irrigation');
        }

        $schedules = IrrigationSchedule::query()
            ->with(['plot:id,code,name', 'agent:id,name'])
            ->orderByRaw('scheduled_date ASC, scheduled_time ASC NULLS LAST')
            ->paginate($this->perPage($request));

        return $this->paginated($schedules);
    }

    public function store(IrrigationScheduleRequest $request): JsonResponse
    {
        $schedule = IrrigationSchedule::create(
            $request->validated() + ['farm_id' => $request->user()->farm_id],
        );

        return $this->created($schedule, 'Planification enregistrée.');
    }

    public function show(IrrigationSchedule $schedule): JsonResponse
    {
        return $this->respond($schedule);
    }

    public function update(IrrigationScheduleRequest $request, IrrigationSchedule $schedule): JsonResponse
    {
        $schedule->update($request->validated());

        return $this->updated($schedule, 'Planification mise à jour.');
    }

    public function destroy(IrrigationSchedule $schedule): JsonResponse
    {
        $schedule->delete();

        return $this->deleted('Planification supprimée.');
    }
}
