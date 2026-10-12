<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithJson;
use App\Http\Requests\UserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use RespondsWithJson;

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('role:id,name');

        // Un membre ne voit que les comptes de son exploitation ; l'administrateur
        // global peut tous les superviser via `?farm_id=`.
        if ($request->user()->farm_id !== null) {
            $query->where('farm_id', $request->user()->farm_id);
        } elseif ($request->has('farm_id')) {
            $query->where('farm_id', (int) $request->integer('farm_id'));
        }

        $users = $query->orderBy('name')->paginate($this->perPage($request));

        return $this->paginated($users);
    }

    public function store(UserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);
        $data['farm_id'] = $request->user()->farm_id ?? $data['farm_id'];

        $user = User::create($data);

        return $this->created($user, 'Compte créé.');
    }

    public function show(User $user): JsonResponse
    {
        return $this->respond($user->load('role:id,name'));
    }

    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if ($request->user()->farm_id !== null) {
            unset($data['farm_id']);
        }

        $user->update($data);

        return $this->updated($user, 'Compte mis à jour.');
    }

    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $user->update(['is_active' => false]);

        return $this->deleted('Compte désactivé.');
    }
}