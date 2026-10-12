<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\CampaignRequest;
use App\Models\Campaign;
use App\Services\CampaignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class CampaignController extends Controller
{
    use RespondsWithJson;

    public function __construct(private readonly CampaignService $campaigns) {}

    public function index(Request $request): JsonResponse
    {
        $campaigns = Campaign::query()
            ->with(['plot:id,code,name', 'crop:id,name'])
            ->orderByDesc('start_date')
            ->paginate($this->perPage($request));

        return $this->paginated($campaigns);
    }

    public function store(CampaignRequest $request): JsonResponse
    {
        $campaign = $this->campaigns->create($request->user(), $request->validated());

        return $this->created($campaign, 'Campagne créée.');
    }

    public function show(Campaign $campaign): JsonResponse
    {
        return $this->respond($campaign->load(['plot:id,code,name', 'crop:id,name', 'manager:id,name']));
    }

    public function update(CampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $campaign = $this->campaigns->update($campaign, $request->validated());

        return $this->updated($campaign, 'Campagne mise à jour.');
    }

    public function destroy(Campaign $campaign): JsonResponse
    {
        $campaign->delete();

        return $this->deleted('Campagne supprimée.');
    }

    public function activate(Campaign $campaign): JsonResponse
    {
        Gate::authorize('update', $campaign);

        return $this->updated($this->campaigns->activate($campaign), 'Campagne activée.');
    }

    public function suspend(Campaign $campaign): JsonResponse
    {
        Gate::authorize('update', $campaign);

        return $this->updated($this->campaigns->suspend($campaign), 'Campagne suspendue.');
    }

    public function complete(Request $request, Campaign $campaign): JsonResponse
    {
        Gate::authorize('close', $campaign);

        $campaign = $this->campaigns->complete($campaign, $request->user(), $request->input('actual_end_date'));

        return $this->updated($campaign, 'Campagne clôturée.');
    }

    public function cancel(Request $request, Campaign $campaign): JsonResponse
    {
        Gate::authorize('close', $campaign);

        $campaign = $this->campaigns->cancel($campaign, $request->user());

        return $this->updated($campaign, 'Campagne annulée.');
    }
}
