import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import type { ColumnDef, ResourceConfig, ResourceRow, RowAction } from '../../resources/types';

export type SortState = { key: string; direction: 'asc' | 'desc' } | null;

type Props<T extends ResourceRow> = {
    config: ResourceConfig<T>;
    rows: T[];
    sort: SortState;
    busyId: string | number | null;
    onSort: (key: string) => void;
    onEdit: (row: T) => void;
    onDelete: (row: T) => void;
    onAction: (action: RowAction<T>, row: T) => void;
};

export function ResourceTable<T extends ResourceRow>({
    config,
    rows,
    sort,
    busyId,
    onSort,
    onEdit,
    onDelete,
    onAction,
}: Props<T>) {
    const hasActions = config.canEdit || config.canDelete || (config.rowActions?.length ?? 0) > 0;
    const visibleActions = (row: T) =>
        (config.rowActions ?? []).filter((action) => (action.visible ? action.visible(row) : true));

    return (
        <>
            {/* Tableau — écrans moyens et plus. */}
            <div className="hidden overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft md:block">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <caption className="sr-only">{config.title}</caption>
                        <thead>
                            <tr className="border-b border-ink-100 bg-ink-50/60 text-left">
                                {config.columns.map((column) => (
                                    <th
                                        key={column.key}
                                        scope="col"
                                        className={cn(
                                            'px-4 py-3 text-xs font-semibold tracking-wide text-ink-500 uppercase',
                                            column.align === 'right' && 'text-right',
                                        )}
                                    >
                                        {column.sortable ? (
                                            <button
                                                type="button"
                                                onClick={() => onSort(column.key)}
                                                className="inline-flex items-center gap-1.5 rounded transition-colors hover:text-ink-800"
                                            >
                                                {column.label}
                                                <SortIcon active={sort?.key === column.key} direction={sort?.direction} />
                                            </button>
                                        ) : (
                                            column.label
                                        )}
                                    </th>
                                ))}
                                {hasActions && (
                                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-ink-500 uppercase">
                                        Actions
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, index) => {
                                const id = rowId(row, index);
                                const busy = busyId === id;

                                return (
                                    <tr key={id} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/40">
                                        {config.columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={cn(
                                                    'px-4 py-3 align-middle text-ink-700',
                                                    column.align === 'right' && 'text-right',
                                                    column.className,
                                                )}
                                            >
                                                {renderCell(column, row)}
                                            </td>
                                        ))}
                                        {hasActions && (
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1">
                                                    {visibleActions(row).map((action) => (
                                                        <Button
                                                            key={action.label}
                                                            type="button"
                                                            variant="ghost"
                                                            size="iconSm"
                                                            disabled={busy}
                                                            title={action.label}
                                                            aria-label={action.label}
                                                            onClick={() => onAction(action, row)}
                                                            className={action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : undefined}
                                                        >
                                                            {action.icon ? <action.icon aria-hidden="true" /> : action.label}
                                                        </Button>
                                                    ))}
                                                    {config.canEdit && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="iconSm"
                                                            disabled={busy}
                                                            aria-label={`Modifier : ${primaryLabel(config, row)}`}
                                                            onClick={() => onEdit(row)}
                                                        >
                                                            <Pencil aria-hidden="true" />
                                                        </Button>
                                                    )}
                                                    {config.canDelete && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="iconSm"
                                                            disabled={busy}
                                                            aria-label={`Supprimer : ${primaryLabel(config, row)}`}
                                                            onClick={() => onDelete(row)}
                                                            className="text-red-600 hover:bg-red-50"
                                                        >
                                                            {busy ? (
                                                                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                                                            ) : (
                                                                <Trash2 aria-hidden="true" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Cartes — mobiles. */}
            <ul className="space-y-3 md:hidden">
                {rows.map((row, index) => {
                    const id = rowId(row, index);
                    const busy = busyId === id;

                    return (
                        <li key={id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-soft">
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold text-ink-900">{primaryLabel(config, row)}</p>
                                <div className="flex shrink-0 items-center gap-1">
                                    {visibleActions(row).map((action) => (
                                        <Button
                                            key={action.label}
                                            type="button"
                                            variant="ghost"
                                            size="iconSm"
                                            disabled={busy}
                                            aria-label={action.label}
                                            onClick={() => onAction(action, row)}
                                        >
                                            {action.icon ? <action.icon aria-hidden="true" /> : action.label}
                                        </Button>
                                    ))}
                                    {config.canEdit && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="iconSm"
                                            disabled={busy}
                                            aria-label={`Modifier : ${primaryLabel(config, row)}`}
                                            onClick={() => onEdit(row)}
                                        >
                                            <Pencil aria-hidden="true" />
                                        </Button>
                                    )}
                                    {config.canDelete && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="iconSm"
                                            disabled={busy}
                                            aria-label={`Supprimer : ${primaryLabel(config, row)}`}
                                            onClick={() => onDelete(row)}
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            {busy ? (
                                                <Loader2 aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
                                            ) : (
                                                <Trash2 aria-hidden="true" />
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm">
                                {config.columns.slice(1).filter((column) => !column.hideOnMobile).map((column) => (
                                    <div key={column.key} className="flex items-center justify-between gap-3">
                                        <dt className="text-ink-400">{column.label}</dt>
                                        <dd className="text-right text-ink-700">{renderCell(column, row)}</dd>
                                    </div>
                                ))}
                            </dl>
                        </li>
                    );
                })}
            </ul>
        </>
    );
}

function renderCell<T extends ResourceRow>(column: ColumnDef<T>, row: T): ReactNode {
    if (column.render) return column.render(row);

    return formatValue(row[column.key]);
}

export function formatValue(value: unknown): ReactNode {
    if (value === null || value === undefined || value === '') {
        return <span className="text-ink-400">—</span>;
    }

    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;

        return String(record.name ?? record.code ?? record.label ?? '—');
    }

    return String(value);
}

export function rowId(row: ResourceRow, index: number): string | number {
    const id = row.id;

    return typeof id === 'string' || typeof id === 'number' ? id : `row-${index}`;
}

export function primaryLabel<T extends ResourceRow>(config: ResourceConfig<T>, row: T): string {
    const first = config.columns[0];
    const value = first ? row[first.key] : row.id;

    if (value === null || value === undefined) return String(row.id ?? '');

    return typeof value === 'object' ? String((value as Record<string, unknown>).name ?? row.id) : String(value);
}

function SortIcon({ active, direction }: { active: boolean; direction?: 'asc' | 'desc' }) {
    if (!active) return <ArrowUpDown aria-hidden="true" className="size-3.5 text-ink-300" />;

    return direction === 'desc' ? (
        <ArrowDown aria-hidden="true" className="size-3.5 text-brand-700" />
    ) : (
        <ArrowUp aria-hidden="true" className="size-3.5 text-brand-700" />
    );
}
