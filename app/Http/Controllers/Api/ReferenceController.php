<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CampaignResource;
use App\Http\Resources\PlotResource;
use App\Models\Campaign;
use App\Models\Plot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * Référentiels en lecture pour les clients mobiles : parcelles et campagnes.
 */
class ReferenceController extends Controller
{
    public function plots(Request $request): JsonResponse
    {
        $plots = Plot::query()->orderBy('code')->paginate($this->perPage($request));

        return PlotResource::collection($plots)->response();
    }

    public function plot(Plot $plot): JsonResponse
    {
        Gate::authorize('view', $plot);

        return (new PlotResource($plot))->response();
    }

    public function campaigns(Request $request): JsonResponse
    {
        $campaigns = Campaign::query()
            ->with(['plot:id,code,name', 'crop:id,name'])
            ->orderByDesc('start_date')
            ->paginate($this->perPage($request));

        return CampaignResource::collection($campaigns)->response();
    }

    public function campaign(Campaign $campaign): JsonResponse
    {
        Gate::authorize('view', $campaign);

        return (new CampaignResource($campaign->load(['plot:id,code,name', 'crop:id,name'])))->response();
    }

    private function perPage(Request $request): int
    {
        return max(1, min($request->integer('per_page', 50), 200));
    }
}