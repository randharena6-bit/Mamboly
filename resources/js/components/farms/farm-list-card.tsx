import { Layers, MapPin, Pencil, Trash2 } from 'lucide-react';

import type { FarmSummary } from '../../types/farm';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const statusTone: Record<string, 'brand' | 'harvest' | 'ink'> = {
    active: 'brand',
    inactive: 'ink',
    pending: 'harvest',
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
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <a
                            href={`/exploitations/${farm.id}`}
                            className="truncate font-display text-base font-bold text-ink-900 hover:text-brand-700"
                        >
                            {farm.name}
                        </a>
                        {status && (
                            <Badge variant={statusTone[status] ?? 'ink'} size="sm">
                                {statusLabel[status] ?? status}
                            </Badge>
                        )}
                    </div>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {farm.location ?? 'Localisation non renseignée'}
                        {farm.type ? <span className="text-ink-400">· {farm.type}</span> : null}
                    </p>
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

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
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
            <dt className="text-[0.6875rem] font-semibold tracking-wide text-ink-400 uppercase">{label}</dt>
            <dd className={`mt-0.5 font-semibold ${alert ? 'text-harvest-700' : 'text-ink-900'}`}>{value}</dd>
        </div>
    );
}