import {
    Bell,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    MonitorSmartphone,
    Palette,
    ShieldCheck,
    Tractor,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

import { formatDate, formatRelativeTime } from '../../lib/format';
import { HttpError, http } from '../../lib/http';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Field } from '../ui/field';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { useToast } from '../ui/toast';
import {
    FormNotice,
    SaveButton,
    SettingsCard,
    Toggle,
    useSettingsForm,
} from './settings-shared';
import type { SettingsFarm, SettingsPreferences, SettingsUser } from './types';

const EMPTY_PASSWORDS = {
    current_password: '',
    password: '',
    password_confirmation: '',
};

export function ProfileForm({
    user,
    onSaved,
}: {
    user: SettingsUser;
    onSaved: (user: SettingsUser) => void;
}) {
    const form = useSettingsForm<Record<string, string>, { user: SettingsUser }>({
        endpoint: '/parametres/profil',
        initial: { name: user.name, email: user.email, phone: user.phone ?? '' },
        onSaved: (response) => onSaved(response.data.user),
    });

    return (
        <SettingsCard
            icon={UserRound}
            title="Informations personnelles"
            description="Ces informations identifient votre compte et apparaissent dans l’application."
        >
            <form onSubmit={form.submit} noValidate className="space-y-4">
                {form.notice && <FormNotice message={form.notice} />}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="settings-name"
                        label="Nom complet"
                        name="name"
                        value={form.values.name}
                        onChange={(event) => form.setValue('name', event.target.value)}
                        error={form.errors.name}
                        autoComplete="name"
                        required
                    />
                    <Input
                        id="settings-email"
                        label="Adresse e-mail"
                        name="email"
                        type="email"
                        value={form.values.email}
                        onChange={(event) => form.setValue('email', event.target.value)}
                        error={form.errors.email}
                        autoComplete="email"
                        required
                    />
                    <Input
                        id="settings-phone"
                        label="Téléphone"
                        name="phone"
                        type="tel"
                        value={form.values.phone}
                        onChange={(event) => form.setValue('phone', event.target.value)}
                        error={form.errors.phone}
                        hint="Format international accepté, par exemple +261 34 00 000 00."
                        autoComplete="tel"
                        containerClassName="sm:col-span-2"
                    />
                </div>

                <div className="flex justify-end border-t border-ink-100 pt-4">
                    <SaveButton busy={form.busy} />
                </div>
            </form>
        </SettingsCard>
    );
}

export function PasswordForm() {
    const [visible, setVisible] = useState(false);
    const form = useSettingsForm<Record<string, string>, { closedSessions: number }>({
        endpoint: '/parametres/mot-de-passe',
        initial: EMPTY_PASSWORDS,
        resetOnSuccess: true,
    });

    return (
        <SettingsCard
            icon={KeyRound}
            title="Mot de passe"
            description="Choisissez un mot de passe robuste, différent de celui utilisé sur d’autres services."
        >
            <form onSubmit={form.submit} noValidate className="space-y-4">
                {form.notice && <FormNotice message={form.notice} />}

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-ink-500">8 caractères minimum. Les autres sessions seront fermées.</p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setVisible((current) => !current)}
                    >
                        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                        {visible ? 'Masquer' : 'Afficher'}
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="settings-current-password"
                        label="Mot de passe actuel"
                        type={visible ? 'text' : 'password'}
                        value={form.values.current_password}
                        onChange={(event) => form.setValue('current_password', event.target.value)}
                        error={form.errors.current_password}
                        autoComplete="current-password"
                        required
                        containerClassName="sm:col-span-2"
                    />
                    <Input
                        id="settings-new-password"
                        label="Nouveau mot de passe"
                        type={visible ? 'text' : 'password'}
                        value={form.values.password}
                        onChange={(event) => form.setValue('password', event.target.value)}
                        error={form.errors.password}
                        autoComplete="new-password"
                        required
                    />
                    <Input
                        id="settings-confirm-password"
                        label="Confirmer le mot de passe"
                        type={visible ? 'text' : 'password'}
                        value={form.values.password_confirmation}
                        onChange={(event) => form.setValue('password_confirmation', event.target.value)}
                        error={form.errors.password_confirmation}
                        autoComplete="new-password"
                        required
                    />
                </div>

                <div className="flex justify-end border-t border-ink-100 pt-4">
                    <SaveButton busy={form.busy} label="Mettre à jour le mot de passe" />
                </div>
            </form>
        </SettingsCard>
    );
}

export function SessionsCard({ user }: { user: SettingsUser }) {
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const closeOthers = async () => {
        setBusy(true);

        try {
            const response = await http.post<{ message: string; data: { closedSessions: number } }>(
                '/parametres/sessions/fermer',
            );
            toast.success('Sessions fermées', response.message);
        } catch (error) {
            toast.error(
                'Action impossible',
                error instanceof HttpError ? error.userMessage : 'Le serveur n’a pas répondu.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <SettingsCard
            icon={MonitorSmartphone}
            title="Sessions et connexion"
            description="Contrôlez les appareils qui peuvent rester connectés à votre compte."
        >
            <div className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3.5">
                        <dt className="text-xs font-medium text-ink-400">Dernière connexion</dt>
                        <dd className="mt-1 text-sm font-semibold text-ink-900">
                            {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Jamais'}
                        </dd>
                        {user.lastLoginAt && (
                            <dd className="text-xs text-ink-500">{formatDate(user.lastLoginAt, {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}</dd>
                        )}
                    </div>
                    <div className="rounded-xl border border-ink-100 bg-ink-50/50 p-3.5">
                        <dt className="text-xs font-medium text-ink-400">Rôle</dt>
                        <dd className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-ink-900">{user.roleLabel ?? 'Membre'}</span>
                            <Badge variant={user.isActive ? 'success' : 'danger'} size="sm">
                                {user.isActive ? 'Compte actif' : 'Compte désactivé'}
                            </Badge>
                        </dd>
                        <dd className="mt-1 text-xs text-ink-500">
                            {user.emailVerified ? 'Adresse e-mail vérifiée' : 'Adresse e-mail non vérifiée'}
                        </dd>
                    </div>
                </dl>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white p-4">
                    <div>
                        <p className="text-sm font-semibold text-ink-900">Fermer les autres sessions</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                            Déconnecte tous les autres navigateurs et appareils, sans fermer celle-ci.
                        </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void closeOthers()}>
                        <ShieldCheck aria-hidden="true" />
                        {busy ? 'Fermeture…' : 'Fermer les autres sessions'}
                    </Button>
                </div>
            </div>
        </SettingsCard>
    );
}

export function FarmForm({
    farm,
    onSaved,
}: {
    farm: SettingsFarm;
    onSaved: (farm: SettingsFarm) => void;
}) {
    const form = useSettingsForm<Record<string, string>, { farm: SettingsFarm }>({
        endpoint: '/parametres/exploitation',
        initial: {
            name: farm.name,
            location: farm.location ?? '',
            type: farm.type ?? '',
            total_area: String(farm.totalArea),
            status: farm.status,
        },
        onSaved: (response) => onSaved(response.data.farm),
    });

    const readOnly = !farm.canUpdate;

    return (
        <SettingsCard
            icon={Tractor}
            title="Exploitation"
            description="Les informations de l’exploitation à laquelle votre compte est rattaché."
        >
            <form onSubmit={form.submit} noValidate className="space-y-4">
                {form.notice && <FormNotice message={form.notice} />}

                {readOnly && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                        Seul un administrateur peut modifier les informations de l’exploitation. Vous pouvez les consulter ici.
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="settings-farm-name"
                        label="Nom de l’exploitation"
                        value={form.values.name}
                        onChange={(event) => form.setValue('name', event.target.value)}
                        error={form.errors.name}
                        disabled={readOnly}
                        required
                        containerClassName="sm:col-span-2"
                    />
                    <Input
                        id="settings-farm-location"
                        label="Localisation"
                        value={form.values.location}
                        onChange={(event) => form.setValue('location', event.target.value)}
                        error={form.errors.location}
                        placeholder="Ankatso, Analamanga"
                        disabled={readOnly}
                    />
                    <Input
                        id="settings-farm-type"
                        label="Type d’exploitation"
                        value={form.values.type}
                        onChange={(event) => form.setValue('type', event.target.value)}
                        error={form.errors.type}
                        placeholder="Maraîchage, élevage…"
                        disabled={readOnly}
                    />
                    <Input
                        id="settings-farm-area"
                        label="Superficie (ha)"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={form.values.total_area}
                        onChange={(event) => form.setValue('total_area', event.target.value)}
                        error={form.errors.total_area}
                        disabled={readOnly}
                    />
                    <Field
                        id="settings-farm-status"
                        label="Statut"
                        required
                        error={form.errors.status}
                    >
                        {(describedBy) => (
                            <Select
                                id="settings-farm-status"
                                value={form.values.status}
                                onChange={(event) => form.setValue('status', event.target.value)}
                                aria-describedby={describedBy}
                                aria-invalid={form.errors.status ? true : undefined}
                                disabled={readOnly}
                            >
                                <option value="active">Active</option>
                                <option value="suspendue">Suspendue</option>
                                <option value="inactive">Inactive</option>
                            </Select>
                        )}
                    </Field>
                </div>

                {!readOnly && (
                    <div className="flex justify-end border-t border-ink-100 pt-4">
                        <SaveButton busy={form.busy} />
                    </div>
                )}
            </form>
        </SettingsCard>
    );
}

export function NotificationsForm({
    preferences,
    onSaved,
}: {
    preferences: SettingsPreferences;
    onSaved: (preferences: SettingsPreferences) => void;
}) {
    const form = useSettingsForm<Record<string, unknown>, { preferences: SettingsPreferences }>({
        endpoint: '/parametres/preferences',
        initial: {
            email_alerts: preferences.email_alerts,
            alert_min_severity: preferences.alert_min_severity,
        },
        onSaved: (response) => onSaved(response.data.preferences),
    });

    return (
        <SettingsCard
            icon={Bell}
            title="Notifications"
            description="Choisissez les alertes que vous souhaitez recevoir par courriel."
        >
            <form onSubmit={form.submit} noValidate className="space-y-4">
                {form.notice && <FormNotice message={form.notice} />}

                <Toggle
                    checked={Boolean(form.values.email_alerts)}
                    onChange={(checked) => form.setValue('email_alerts', checked)}
                    label="Recevoir les alertes par e-mail"
                    description="Un courriel est envoyé aux responsables lorsqu’une alerte atteint la gravité choisie."
                />

                <Field
                    id="settings-alert-severity"
                    label="Gravité minimale"
                    hint="Les alertes moins graves restent visibles dans l’application mais ne sont pas envoyées par e-mail."
                    error={form.errors.alert_min_severity}
                >
                    {(describedBy) => (
                        <Select
                            id="settings-alert-severity"
                            value={String(form.values.alert_min_severity)}
                            onChange={(event) => form.setValue('alert_min_severity', event.target.value)}
                            aria-describedby={describedBy}
                            aria-invalid={form.errors.alert_min_severity ? true : undefined}
                        >
                            <option value="info">Information</option>
                            <option value="avertissement">Avertissement</option>
                            <option value="critique">Critique</option>
                        </Select>
                    )}
                </Field>

                <div className="rounded-xl border border-water-100 bg-water-50/60 p-3.5 text-xs leading-relaxed text-water-800">
                    <CheckCircle2 aria-hidden="true" className="mr-1.5 inline size-3.5" />
                    Les alertes internes restent toujours visibles dans la cloche de l’application, quel que soit ce réglage.
                </div>

                <div className="flex justify-end border-t border-ink-100 pt-4">
                    <SaveButton busy={form.busy} />
                </div>
            </form>
        </SettingsCard>
    );
}

export function AppearanceForm({
    preferences,
    onSaved,
}: {
    preferences: SettingsPreferences;
    onSaved: (preferences: SettingsPreferences) => void;
}) {
    const form = useSettingsForm<Record<string, unknown>, { preferences: SettingsPreferences }>({
        endpoint: '/parametres/preferences',
        initial: {
            reduce_motion: preferences.reduce_motion,
            sidebar_collapsed: preferences.sidebar_collapsed,
        },
        onSaved: (response) => {
            applyReduceMotion(response.data.preferences.reduce_motion);
            applySidebarCollapsed(response.data.preferences.sidebar_collapsed);
            onSaved(response.data.preferences);
        },
    });

    const setReduceMotion = (checked: boolean) => {
        form.setValue('reduce_motion', checked);
        applyReduceMotion(checked);
    };

    return (
        <SettingsCard
            icon={Palette}
            title="Apparence et confort"
            description="Adaptez l’interface à votre façon de travailler."
        >
            <form onSubmit={form.submit} noValidate className="space-y-3">
                {form.notice && <FormNotice message={form.notice} />}

                <Toggle
                    checked={Boolean(form.values.reduce_motion)}
                    onChange={setReduceMotion}
                    label="Réduire les animations"
                    description="Désactive les transitions et animations décoratives, utile sur les appareils moins puissants."
                />

                <Toggle
                    checked={Boolean(form.values.sidebar_collapsed)}
                    onChange={(checked) => form.setValue('sidebar_collapsed', checked)}
                    label="Barre latérale réduite par défaut"
                    description="La navigation s’ouvrira en mode compact à la prochaine page chargée."
                />

                <div className="flex justify-end border-t border-ink-100 pt-4">
                    <SaveButton busy={form.busy} />
                </div>
            </form>
        </SettingsCard>
    );
}

export function applyReduceMotion(value: boolean): void {
    document.documentElement.dataset.reduceMotion = value ? 'true' : 'false';

    try {
        window.localStorage.setItem('agriwater.reduce_motion', value ? '1' : '0');
    } catch {
        // Le stockage peut être indisponible en navigation privée.
    }
}

function applySidebarCollapsed(value: boolean): void {
    try {
        window.localStorage.setItem('agriwater.sidebar.collapsed', value ? '1' : '0');
    } catch {
        // Le stockage peut être indisponible en navigation privée.
    }
}
