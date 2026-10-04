/**
 * Soumission d'un formulaire vers Laravel.
 *
 * Deux besoins communs aux écrans React :
 *  - le jeton CSRF, lu dans la balise `meta` ;
 *  - les erreurs de validation, renvoyées en JSON par le `FormRequest`.
 */

export type FieldErrors = Record<string, string>;

export type SubmitResult = { redirect: string };

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export class FormError extends Error {
    constructor(
        message: string,
        readonly errors: FieldErrors = {},
    ) {
        super(message);
        this.name = 'FormError';
    }
}

/**
 * Envoie un formulaire et renvoie l'URL de redirection demandée par le serveur.
 *
 * @throws FormError avec le détail des champs invalides.
 */
export async function submitForm(url: string, data: Record<string, unknown>): Promise<SubmitResult> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        body: JSON.stringify(data),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        const errors = (payload?.errors ?? {}) as Record<string, string[]>;
        const flattened: FieldErrors = {};
        for (const [field, messages] of Object.entries(errors)) {
            if (messages?.length) flattened[field] = messages[0];
        }

        throw new FormError(payload?.message ?? `Erreur ${response.status}`, flattened);
    }

    return (payload ?? { redirect: url }) as SubmitResult;
}

/** Va à l'écran indiqué par le serveur, en rechargeant la page. */
export function goTo(redirect: string): void {
    window.location.assign(redirect);
}
