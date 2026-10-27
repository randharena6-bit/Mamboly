import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell } from '../dashboard/app-shell';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { EmptyState, ErrorState, ListSkeleton } from '../landing/states';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Select } from '../ui/select';
import { useToast } from '../ui/toast';
import { cn } from '../../lib/cn';
import { http, type Paginated } from '../../lib/http';
import { loadOptions } from '../../resources/options';
import type {
    Option,
    OptionSourceKey,
    ResourceConfig,
    ResourceRow,
    ResourceView,
    RowAction,
} from '../../resources/types';
import { ResourceForm } from './resource-form';
import { primaryLabel, ResourceTable, type SortState } from './resource-table';

export type ModuleContext = {
    user: { name: string; role: string | null; initials: string } | null;
    farm: { id: number; name: string; location: string | null; type: string | null; totalArea: number } | null;
    unreadAlerts: number;
    canManage: boolean;
};

type Props<T extends ResourceRow> = {
    config: ResourceConfig<T>;
    endpoint: string;
    context: ModuleContext;
};

type LoadState = 'loading' | 'ready' | 'error';

const PAGE_SIZES = [10, 25, 50, 100];

export function ResourcePage<T extends ResourceRow>({ config, endpoint, context }: Props<T>) {
    const toast = useToast();

    const [rows, setRows] = useState<T[]>([]);
    const [state, setState] = useState<LoadState>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sort, setSort] = useState<SortState>(null);

    const [options, setOptions] = useState<Partial<Record<OptionSourceKey, Option[]>>>({});

    const [form, setForm] = useState<{ mode: 'create' | 'edit'; row: T | null } | null>(null);
    const [deleting, setDeleting] = useState<T | null>(null);
    const [busyDelete, setBusyDelete] = useState(false);
    const [pendingAction, setPendingAction] = useState<{ action: RowAction<T>; row: T } | null>(null);
    const [dialog, setDialog] = useState<{ action: RowAction<T>; row: T } | null>(null);
    const [busyId, setBusyId] = useState<string | number | null>(null);
    const [activeView, setActiveView] = useState<string>(config.views?.[0]?.id ?? 'list');

    const load = useCallback(async () => {
        setState((current) => (current === 'ready' ? current : 'loading'));

        try {
            const page = await http.get<Paginated<T>>(`${endpoint}?per_page=200`);
            setRows(page.data);
            setState('ready');
        } catch (error) {
            setErrorMessage(
                'Impossible de charger les données. Vérifiez votre connexion, puis réessayez.',
            );
            setState('error');
        }
    }, [endpoint]);

    useEffect(() => {
        void load();
    }, [load]);

    const optionKeys = useMemo(() => {
        const keys = new Set<OptionSourceKey>();

        config.fields.forEach((field) => field.optionsFrom && keys.add(field.optionsFrom));
        config.rowActions?.forEach((action) =>
            action.dialog?.fields.forEach((field) => field.optionsFrom && keys.add(field.optionsFrom)),
        );

        return [...keys];
    }, [config]);

    useEffect(() => {
        if (optionKeys.length === 0) return;

        void loadOptions(optionKeys)
            .then((loaded) => setOptions(loaded))
            .catch(() => setOptions({}));
    }, [optionKeys]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (needle === '') return rows;

        return rows.filter((row) =>
            config.columns.some((column) => {
                const value = row[column.key];
                if (value === null || value === undefined) return false;

                const text = typeof value === 'object' ? JSON.stringify(value) : String(value);

                return text.toLowerCase().includes(needle);
            }),
        );
    }, [rows, query, config.columns]);

    const sorted = useMemo(() => {
        if (sort === null) return filtered;

        const column = config.columns.find((item) => item.key === sort.key);
        const factor = sort.direction === 'asc' ? 1 : -1;

        return [...filtered].sort((left, right) => {
            const a = column?.sortValue ? column.sortValue(left) : left[sort.key];
            const b = column?.sortValue ? column.sortValue(right) : right[sort.key];

            if (typeof a === 'number' && typeof b === 'number') return (a - b) * factor;

            return String(a ?? '').localeCompare(String(b ?? ''), 'fr') * factor;
        });
    }, [filtered, sort, config.columns]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

    useEffect(() => {
        setPage(1);
    }, [query, pageSize]);

    const toggleSort = (key: string) => {
        setSort((current) => {
            if (current?.key !== key) return { key, direction: 'asc' };

            return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
        });
    };

    const submitForm = async (payload: Record<string, unknown>) => {
        if (form === null) return;

        if (form.mode === 'create') {
            const response = await http.post<{ message: string }>(endpoint, payload);
            toast.success('Élément créé', response.message);
        } else {
            const response = await http.put<{ message: string }>(`${endpoint}/${form.row?.id}`, payload);
            toast.success('Modifications enregistrées', response.message);
        }

        setForm(null);
        await load();
    };

    const submitDialog = async (action: RowAction<T>, row: T, payload: Record<string, unknown>) => {
        const response = await http.post<{ message: string }>(action.path(row), {
            ...action.dialog?.fixed(row),
            ...payload,
        });
        toast.success('Enregistré', response.message);
        setDialog(null);
        await load();
    };

    const confirmDelete = async () => {
        if (deleting === null) return;

        setBusyDelete(true);

        try {
            const response = await http.del<{ message: string }>(`${endpoint}/${deleting.id}`);
            toast.success('Supprimé', response.message);
            setDeleting(null);
            await load();
        } catch (error) {
            toast.error('Suppression impossible', errorMessageOf(error));
        } finally {
            setBusyDelete(false);
        }
    };

    const runAction = async (action: RowAction<T>, row: T) => {
        setBusyId(rowId(row));
        setPendingAction(null);

        try {
            const response = await http.post<{ message: string }>(action.path(row), {});
            toast.success('Effectué', response.message);
            await load();
        } catch (error) {
            toast.error('Action impossible', errorMessageOf(error));
        } finally {
            setBusyId(null);
        }
    };

    const handleAction = (action: RowAction<T>, row: T) => {
        if (action.dialog) {
            setDialog({ action, row });
        } else if (action.confirmTitle) {
            setPendingAction({ action, row });
        } else {
            void runAction(action, row);
        }
    };

    const user = context.user ?? { name: 'Utilisateur', role: null, initials: '—' };
    const firstName = user.name.split(' ')[0] ?? user.name;
    const farm = context.farm
        ? {
              name: context.farm.name,
              location: context.farm.location ?? 'Localisation non renseignée',
              type: context.farm.type ?? undefined,
              totalArea: context.farm.totalArea,
          }
        : null;

    return (
        <>
            <AppShell
                variant="app"
                activeNav={config.endpoint.replace(/\/data$/, '')}
                farm={farm}
                user={{ name: user.name, role: user.role ?? 'Membre', initials: user.initials }}
                unreadAlerts={context.unreadAlerts}
                title={`Bonjour, ${firstName}`}
            >
                <div className="space-y-4">
                    <PageHeader
                        title={config.title}
                        description={config.description}
                        icon={config.icon}
                        canCreate={config.canCreate !== false}
                        search={query}
                        onSearch={setQuery}
                        onRefresh={() => void load()}
                        onCreate={() => setForm({ mode: 'create', row: null })}
                        searchPlaceholder={config.searchPlaceholder}
                        views={config.views}
                        hideToolbar={config.hideToolbar}
                        activeView={activeView}
                        onViewChange={setActiveView}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500">
                        <p aria-live="polite">
                            {state === 'ready' && (
                                <>
                                    <span className="font-semibold text-ink-800">{sorted.length}</span>{' '}
                                    {sorted.length > 1 ? 'résultats' : 'résultat'}
                                    {query.trim() !== '' && ` pour « ${query.trim()} »`}
                                </>
                            )}
                        </p>

                        {state === 'ready' && sorted.length > 0 && activeView === 'list' && (
                            <label className="flex items-center gap-2">
                                <span className="text-xs text-ink-400">Lignes par page</span>
                                <Select
                                    value={pageSize}
                                    onChange={(event) => setPageSize(Number(event.target.value))}
                                    className="h-9 w-20"
                                    aria-label="Nombre de lignes par page"
                                >
                                    {PAGE_SIZES.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </Select>
                            </label>
                        )}
                    </div>

                    {state === 'loading' && (
                        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
                            <ListSkeleton rows={6} />
                        </div>
                    )}

                    {state === 'error' && <ErrorState description={errorMessage} onRetry={() => void load()} />}

                    {state === 'ready' && sorted.length === 0 && (
                        <EmptyState
                            icon={config.icon}
                            title={query.trim() === '' ? (config.emptyTitle ?? 'Aucun élément') : 'Aucun résultat'}
                            description={
                                query.trim() === ''
                                    ? (config.emptyDescription ?? 'Commencez par créer le premier élément.')
                                    : 'Aucun élément ne correspond à votre recherche. Essayez un autre terme.'
                            }
                            action={
                                query.trim() === ''
                                    ? { label: `Ajouter ${config.singular}`, onClick: () => setForm({ mode: 'create', row: null }) }
                                    : undefined
                            }
                        />
                    )}

                    {state === 'ready' && sorted.length > 0 && activeView !== 'list' && (
                        <div>
                            {config.views?.find((view) => view.id === activeView)?.render({
                                rows: sorted,
                                context,
                            })}
                        </div>
                    )}

                    {state === 'ready' && sorted.length > 0 && activeView === 'list' && (
                        <>
                            <ResourceTable
                                config={config}
                                rows={pageRows}
                                sort={sort}
                                busyId={busyId}
                                onSort={toggleSort}
                                onEdit={(row) => setForm({ mode: 'edit', row })}
                                onDelete={(row) => setDeleting(row)}
                                onAction={handleAction}
                            />

                            {totalPages > 1 && (
                                <nav
                                    aria-label="Pagination"
                                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm shadow-soft"
                                >
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={safePage <= 1}
                                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                                    >
                                        <ChevronLeft aria-hidden="true" />
                                        Précédent
                                    </Button>
                                    <span className="text-ink-500">
                                        Page <span className="font-semibold text-ink-800">{safePage}</span> sur {totalPages}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={safePage >= totalPages}
                                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                    >
                                        Suivant
                                        <ChevronRight aria-hidden="true" />
                                    </Button>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </AppShell>

            <Modal
                open={form !== null}
                size="lg"
                title={
                    form?.mode === 'edit'
                        ? `Modifier — ${form.row ? primaryLabel(config, form.row) : config.singular}`
                        : `Ajouter — ${config.singular}`
                }
                description={
                    form?.mode === 'edit'
                        ? 'Mettez à jour les informations puis enregistrez.'
                        : 'Renseignez les informations, les champs marqués d’une étoile sont obligatoires.'
                }
                onClose={() => setForm(null)}
            >
                {form !== null && (
                    <ResourceForm
                        config={config}
                        mode={form.mode}
                        initial={form.row}
                        options={options}
                        onClose={() => setForm(null)}
                        onSubmit={submitForm}
                    />
                )}
            </Modal>

            <Modal
                open={dialog !== null}
                title={dialog?.action.dialog?.title ?? 'Mouvement'}
                description={dialog?.action.dialog?.description}
                onClose={() => setDialog(null)}
            >
                {dialog !== null && dialog.action.dialog && (
                    <ResourceForm
                        config={{ ...config, module: `${config.module}-dialog`, fields: dialog.action.dialog.fields }}
                        mode="create"
                        initial={null}
                        options={options}
                        onClose={() => setDialog(null)}
                        onSubmit={(payload) => submitDialog(dialog.action, dialog.row, payload)}
                    />
                )}
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                title={`Supprimer « ${deleting ? primaryLabel(config, deleting) : ''} » ?`}
                description={
                    config.deleteWarning ??
                    'Cet élément sera définitivement supprimé. Cette action ne peut pas être annulée.'
                }
                confirmLabel="Supprimer définitivement"
                busy={busyDelete}
                onConfirm={() => void confirmDelete()}
                onCancel={() => setDeleting(null)}
            />

            <ConfirmDialog
                open={pendingAction !== null}
                variant={pendingAction?.action.variant === 'danger' ? 'danger' : 'primary'}
                title={pendingAction?.action.confirmTitle ?? 'Confirmer l’action ?'}
                description={pendingAction?.action.confirmDescription}
                confirmLabel={pendingAction?.action.label ?? 'Confirmer'}
                onConfirm={() => pendingAction && void runAction(pendingAction.action, pendingAction.row)}
                onCancel={() => setPendingAction(null)}
            />
        </>
    );
}

function PageHeader({
    title,
    description,
    icon: Icon,
    canCreate,
    search,
    onSearch,
    onRefresh,
    onCreate,
    searchPlaceholder,
    views,
    activeView,
    onViewChange,
    hideToolbar = false,
}: {
    title: string;
    description: string;
    icon: ResourceConfig['icon'];
    canCreate: boolean;
    search: string;
    onSearch: (value: string) => void;
    onRefresh: () => void;
    onCreate: () => void;
    searchPlaceholder?: string;
    views?: ResourceView[];
    activeView?: string;
    onViewChange?: (id: string) => void;
    hideToolbar?: boolean;
}) {
    return (
        <header className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                        <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">{title}</h1>
                        <p className="mt-0.5 max-w-2xl text-sm text-ink-500">{description}</p>
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    {!hideToolbar && (
                        <label className="relative min-w-0 flex-1 sm:w-64">
                            <span className="sr-only">Rechercher</span>
                            <Search
                                aria-hidden="true"
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
                            />
                            <Input
                                type="search"
                                value={search}
                                onChange={(event) => onSearch(event.target.value)}
                                placeholder={searchPlaceholder ?? 'Rechercher…'}
                                className="pl-9"
                            />
                        </label>
                    )}

                    <Button type="button" variant="outline" size="md" onClick={onRefresh} aria-label="Actualiser les données">
                        <RefreshCw aria-hidden="true" />
                        <span className={cn('hidden', !hideToolbar && 'sm:inline')}>Actualiser</span>
                    </Button>

                    {!hideToolbar && canCreate && (
                        <Button type="button" size="md" onClick={onCreate} className={cn('flex-1 sm:flex-none')}>
                            <Plus aria-hidden="true" />
                            Ajouter
                        </Button>
                    )}
                </div>
            </div>
            {views && views.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
                    {views.map((v) => (
                        <Button
                            key={v.id}
                            type="button"
                            size="sm"
                            variant={activeView === v.id ? 'primary' : 'outline'}
                            disabled={v.disabled}
                            onClick={() => onViewChange?.(v.id)}
                        >
                            {v.label}
                        </Button>
                    ))}
                </div>
            )}
        </header>
    );
}

function rowId(row: ResourceRow): string | number {
    return typeof row.id === 'string' || typeof row.id === 'number' ? row.id : '';
}

function errorMessageOf(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'userMessage' in error) {
        return String((error as { userMessage: unknown }).userMessage);
    }

    return 'Le serveur n’a pas répondu. Vérifiez votre connexion puis réessayez.';
}
