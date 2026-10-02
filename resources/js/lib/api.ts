import type {
    Activity,
    Alert,
    Expense,
    Farm,
    InputStock,
    Plot,
    Revenue,
    User,
    WaterSource,
} from '../types/agriwater';

/**
 * Client HTTP pour l'API Laravel AgriWater.
 *
 * L'application consomme aujourd'hui des données de démonstration (`data/mock.ts`).
 * Pour brancher l'API : remplacer le contenu de `dataSource` par des appels
 * `api.get('/farms/1/...')`. Les endpoints follow REST et renvoient des
 * ressources `Http\Resources` (voir `app/Http/Resources`).
 */

const BASE_URL = '/api';

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly errors: Record<string, string[]> = {},
    ) {
        super(message);
        this.name = 'ApiError';
    }

    /** Message prêt à afficher, avec le détail de validation Laravel si présent. */
    get userMessage(): string {
        const first = Object.values(this.errors)[0]?.[0];
        return first ?? this.message;
    }
}

function csrfToken(): string {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
    return meta?.content ?? '';
}

export const api = {
    async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            signal,
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new ApiError(
                payload?.message ?? `Erreur ${response.status}`,
                response.status,
                payload?.errors ?? {},
            );
        }

        return response.json() as Promise<T>;
    },

    async post<T>(endpoint: string, body: unknown): Promise<T> {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            throw new ApiError(
                payload?.message ?? `Erreur ${response.status}`,
                response.status,
                payload?.errors ?? {},
            );
        }

        return response.json() as Promise<T>;
    },
};

/**
 * Source de données unique de l'application. Le rendu React consomme cette
 * interface : soit les fixtures de démonstration, soit l'API Laravel.
 */
export interface AgriWaterDataSource {
    farms: () => Promise<Farm[]>;
    farm: (id: number) => Promise<Farm>;
    plots: (farmId: number) => Promise<Plot[]>;
    activities: (farmId: number) => Promise<Activity[]>;
    inputs: (farmId: number) => Promise<InputStock[]>;
    expenses: (farmId: number) => Promise<Expense[]>;
    revenues: (farmId: number) => Promise<Revenue[]>;
    waterSources: (farmId: number) => Promise<WaterSource[]>;
    alerts: (farmId: number) => Promise<Alert[]>;
    users: (farmId: number) => Promise<User[]>;
}

export type { AgriWaterDataSource as DataSource };