import { http, type Paginated } from '../lib/http';
import type { Option, OptionSourceKey, ResourceRow } from './types';

/**
 * Registre des listes déroulantes alimentées par une autre ressource.
 *
 * Les options sont chargées une fois par page (les formulaires sont ensuite
 * purement locaux). `per_page` élève le plafond raisonnable pour couvrir toutes
 * les lignes d'une exploitation agricole réelle.
 */

type Source = {
    endpoint: string;
    label: (row: ResourceRow) => string;
};

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value));

export const optionSources: Record<OptionSourceKey, Source> = {
    plots: { endpoint: '/parcelles', label: (row) => [text(row.code), text(row.name)].filter(Boolean).join(' · ') },
    crops: { endpoint: '/cultures', label: (row) => text(row.name) },
    campaigns: {
        endpoint: '/campagnes',
        label: (row) => [text(row.code), text(row.name)].filter(Boolean).join(' · ') || text(row.id),
    },
    waterSources: { endpoint: '/ressources-eau', label: (row) => text(row.name) },
    users: { endpoint: '/comptes', label: (row) => text(row.name) },
    harvests: {
        endpoint: '/recoltes',
        label: (row) => [text(row.product), text(row.harvest_date)].filter(Boolean).join(' · ') || text(row.id),
    },
    inputs: {
        endpoint: '/intrants',
        label: (row) => {
            const quantity = row.available_quantity === null || row.available_quantity === undefined
                ? ''
                : ` (${text(row.available_quantity)} ${text(row.unit)})`;

            return `${text(row.name)}${quantity}`;
        },
    },
};

export async function loadOptions(
    keys: OptionSourceKey[],
): Promise<Partial<Record<OptionSourceKey, Option[]>>> {
    const unique = [...new Set(keys)];

    const entries = await Promise.all(
        unique.map(async (key) => {
            const source = optionSources[key];
            const page = await http.get<Paginated<ResourceRow>>(`${source.endpoint}?per_page=200`);
            const options: Option[] = page.data.map((row) => ({
                value: typeof row.id === 'number' ? row.id : String(row.id),
                label: source.label(row),
            }));

            return [key, options] as const;
        }),
    );

    return Object.fromEntries(entries);
}
