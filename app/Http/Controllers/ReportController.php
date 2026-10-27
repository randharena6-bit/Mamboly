<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ServesModulePages;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ServesModulePages;

    public function __construct(private readonly ReportService $reports) {}

    public function index(Request $request)
    {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($this->reports->forUser($request->user()));
        }

        return $this->moduleView('reports', 'Rapports');
    }

    public function data(Request $request): JsonResponse
    {
        return response()->json($this->reports->forUser($request->user()));
    }
}
