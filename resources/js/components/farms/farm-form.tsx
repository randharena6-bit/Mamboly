import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';

import { goTo } from '../../lib/forms';
import type { FarmFormValues } from '../../types/farm';
import { Button } from '../ui/button';
import { CardFooter } from '../ui/card';
import { Input } from '../ui/input';

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

/** Erreurs de validation serveur, champ par champ. */
type FieldErrors = Record<string, string>;

function flatten(payload: { errors?: Record<string, string[]> } | null): FieldErrors {
    const flattened: FieldErrors = {};
    for (const [field, messages] of Object.entries(payload?.errors ?? {})) {
        if (messages?.length) flattened[field] = messages[0];
    }
    return flattened;
}

/**
 * Formulaire de création ou de modification d'une exploitation.
 *
 * Soumis en JSON (POST pour la création, PATCH pour l'édition) avec jeton CSRF ;
 * le serveur répond par l'URL de redirection ou les erreurs de validation,
 * affichées sous chaque champ. En édition, l'identifiant est fourni par la page.
 */
export function FarmForm({
    mode,
    backUrl,
    farmId,
    initial,
}: {
    mode: 'create' | 'edit';
    backUrl: string;
    farmId?: number;
    initial?: Partial<FarmFormValues>;
}) {
    const isEdit = mode === 'edit';
    const [values, setValues] = useState<FarmFormValues>({
        name: initial?.name ?? '',
        location: initial?.location ?? '',
        type: initial?.type ?? '',
        total_area: initial?.total_area ?? '',
        status: initial?.status ?? 'active',
    });
    const [errors, setErrors] = useState<FieldErrors>({});
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    const actionUrl = isEdit ? `/exploitations/${farmId}` : '/exploitations';

    const update = (field: keyof FarmFormValues, value: string) => {
        setValues((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setErrors({});
        setNotice('');

        try {
            const response = await fetch(actionUrl, {
                method: isEdit ? 'PATCH' : 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(values),
            });

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const fieldErrors = flatten(payload);
                if (Object.keys(fieldErrors).length > 0) {
                    setErrors(fieldErrors);
                } else {
                    setNotice(payload?.message ?? `Erreur ${response.status}`);
                }
                setBusy(false);
                return;
            }

            goTo(payload?.redirect ?? backUrl);
        } catch (error) {
            setNotice('Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.');
            setBusy(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} noValidate>
            {notice && (
                <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {notice}
                </div>
            )}

            <div className="space-y-4">
                <Input
                    id="farm-name"
                    label="Nom de l'exploitation"
                    name="name"
                    value={values.name}
                    onChange={(e) => update('name', e.target.value)}
                    required
                    autoFocus
                    error={errors.name}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="farm-location"
                        label="Localisation"
                        name="location"
                        value={values.location}
                        onChange={(e) => update('location', e.target.value)}
                        placeholder="Ankatso, Analamanga"
                        error={errors.location}
                    />
                    <Input
                        id="farm-type"
                        label="Type d'exploitation"
                        name="type"
                        value={values.type}
                        onChange={(e) => update('type', e.target.value)}
                        placeholder="Maraîchage, élevage…"
                        error={errors.type}
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="farm-area"
                        label="Superficie (ha)"
                        name="total_area"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={values.total_area}
                        onChange={(e) => update('total_area', e.target.value)}
                        placeholder="0.00"
                        error={errors.total_area}
                    />
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="farm-status" className="text-sm font-semibold text-ink-800">
                            Statut
                        </label>
                        <select
                            id="farm-status"
                            name="status"
                            value={values.status}
                            onChange={(e) => update('status', e.target.value)}
                            className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-900 shadow-xs transition-colors focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none"
                        >
                            <option value="active">Actif</option>
                            <option value="inactive">Inactif</option>
                            <option value="pending">En attente</option>
                        </select>
                    </div>
                </div>
            </div>

            <CardFooter className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink-100 px-0 pt-5">
                <Button type="submit" disabled={busy}>
                    <Save aria-hidden="true" className="size-4" />
                    {busy ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer l'exploitation'}
                </Button>
                <Button asChild type="button" variant="outline">
                    <a href={backUrl}>
                        <ArrowLeft aria-hidden="true" className="size-4" />
                        Annuler
                    </a>
                </Button>
            </CardFooter>
        </form>
    );
}