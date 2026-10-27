import { z } from 'zod';

export const plotSchema = z.object({
    code: z.string().min(2, 'Code requis (min. 2 caractères)').max(50),
    name: z.string().min(2, 'Nom requis').max(150),
    area: z.coerce.number().positive('Surface > 0'),
    area_unit: z.enum(['m2', 'ha']),
    location: z.string().max(255).optional().or(z.literal('')),
    soil_type: z.string().max(100).optional().or(z.literal('')),
    status: z.string().optional().or(z.literal('')),
    manual_priority: z.string().optional().or(z.literal('')),
    soil_moisture: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
});

export type PlotForm = z.infer<typeof plotSchema>;

export type FieldErrors = Record<string, string>;

export class FormError extends Error {
    errors: FieldErrors;

    constructor(errors: Record<string, string[]>, message = 'Erreur de validation') {
        super(message);
        this.name = 'FormError';
        this.errors = Object.fromEntries(
            Object.entries(errors).map(([field, messages]) => [field, messages[0] ?? '']),
        );
    }
}

export function goTo(url: string) {
    window.location.assign(url);
}

export async function submitForm(endpoint: string, data: unknown) {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': token,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
    });

    if (response.ok) {
        return response.json() as Promise<{ redirect?: string }>;
    }

    if (response.status === 422) {
        const payload = await response.json().catch(() => null);
        throw new FormError(payload?.errors ?? {});
    }

    if (response.status === 401 || response.status === 403) {
        goTo('/login');
    }

    throw new Error('Erreur serveur');
}
