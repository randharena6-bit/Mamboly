import { Layers, MapPin, Pencil, Sprout, Trash2 } from 'lucide-react';

import type { FarmSummary } from '../../types/farm';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const statusTone: Record<string, 'brand' | 'warning' | 'outline'> = {
    active: 'brand',
    inactive: 'outline',
    pending: 'warning',
};

const statusLabel: Record<string, string> = {
    active: 'Actif',
    inactive: 'Inactif',
    pending: 'En attente',
};

/**
 * Carte d'une exploitation dans la liste.
 *
 * La ligne expose l'essentiel pour comparer deux exploitations (localisation,
 * surface, équipe, alertes) et les actions : fiche complète, modification et
 * suppression — ces deux dernières réservées à l'administrateur (`canManage`).
 */
export function FarmListCard({
    farm,
    canManage,
    onDelete,
}: {
    farm: FarmSummary;
    canManage?: boolean;
    onDelete: (farm: FarmSummary) => void;
}) {
    const status = farm.status ?? null;

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200/70 hover:shadow-card">
            <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-brand-400 to-water-500"
            />

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-water-50 text-brand-700 ring-1 ring-brand-100">
                        <Sprout aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <a
                                href={`/exploitations/${farm.id}`}
                                className="truncate font-display text-base font-bold text-ink-900 transition-colors hover:text-brand-700"
                            >
                                {farm.name}
                            </a>
                            {status && (
                                <Badge variant={statusTone[status] ?? 'outline'} size="sm">
                                    {statusLabel[status] ?? status}
                                </Badge>
                            )}
                        </div>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                            <MapPin aria-hidden="true" className="size-3.5 shrink-0 text-ink-400" />
                            <span className="truncate">
                                {farm.location ?? 'Localisation non renseignée'}
                                {farm.type ? <span className="text-ink-400"> · {farm.type}</span> : null}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                    <Button asChild variant="outline" size="sm">
                        <a href={`/exploitations/${farm.id}`}>
                            <Layers aria-hidden="true" className="size-4" />
                            <span className="hidden sm:inline">Voir</span>
                        </a>
                    </Button>
                    {canManage && (
                        <>
                            <Button asChild variant="ghost" size="iconSm" aria-label={`Modifier ${farm.name}`}>
                                <a href={`/exploitations/${farm.id}/edit`}>
                                    <Pencil aria-hidden="true" className="size-4" />
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="iconSm"
                                aria-label={`Supprimer ${farm.name}`}
                                onClick={() => onDelete(farm)}
                                className="text-harvest-700 hover:bg-harvest-50 hover:text-harvest-800"
                            >
                                <Trash2 aria-hidden="true" className="size-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-ink-100/80 bg-ink-50/40 p-3.5 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Superficie" value={farm.totalArea != null ? `${farm.totalArea} ha` : '—'} />
                <Metric label="Parcelles" value={`${farm.counts.plots} (${farm.counts.plotsInCrop} en culture)`} />
                <Metric label="Campagnes actives" value={String(farm.counts.campaignsActive)} />
                <Metric label="Équipe" value={String(farm.team.count)} />
                <Metric label="Valeur stock" value={`${farm.metrics.stockValue.toLocaleString('fr-FR')} MGA`} />
                <Metric
                    label="Alertes"
                    value={String(farm.unreadAlerts)}
                    alert={farm.unreadAlerts > 0}
                />
            </dl>
        </div>
    );
}

function Metric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
    return (
        <div>
            <dt className="text-[0.625rem] font-bold tracking-[0.08em] text-ink-400 uppercase">{label}</dt>
            <dd className={`mt-0.5 truncate font-semibold ${alert ? 'text-harvest-700' : 'text-ink-900'}`}>{value}</dd>
        </div>
    );
}