/**
 * Client HTTP des modules métier.
 *
 * Chaque appel porte `Accept: application/json` et `X-Requested-With`, ce qui
 * demande au contrôleur Laravel la branche JSON plutôt que la page HTML. Les
 * erreurs de validation (422) conservent le détail champ par champ fourni par
 * Laravel, réutilisé sous les champs du formulaire.
 */

/** Enveloppe de pagination Laravel (`LengthAwarePaginator`). */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type Wrapped<T> = {
    message: string;
    data: T;
};

export type Deleted = {
    message: string;
};

export class HttpError extends Error {
    status: number;
    errors: Record<string, string[]>;

    constructor(message: string, status: number, errors: Record<string, string[]> = {}) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
        this.errors = errors;
    }

    /** Premier message utile, priorité au détail de validation Laravel. */
    get userMessage(): string {
        const first = Object.values(this.errors)[0]?.[0];

        return first ?? this.message;
    }
}

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(method === 'GET' ? {} : { 'X-CSRF-TOKEN': csrfToken() }),
        },
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    // Session expirée : la connexion reprend la main plutôt qu'un message d'erreur.
    if (response.status === 401) {
        window.location.assign('/login');
        throw new HttpError('Session expirée', 401);
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new HttpError(
            payload?.message ?? `Erreur ${response.status}`,
            response.status,
            payload?.errors ?? {},
        );
    }

    return payload as T;
}

export const http = {
    get: <T>(url: string) => request<T>('GET', url),
    post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
    put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
    patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
    del: <T>(url: string) => request<T>('DELETE', url),
};
