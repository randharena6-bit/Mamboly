import { http, type Paginated } from '../../lib/http';
import type { ResourceRow } from '../../resources/types';

/** Parcelles et campagnes nécessaires pour situer les cultures sur le terrain. */
export type CropLayers = {
    plots: ResourceRow[];
    campaigns: ResourceRow[];
};

export async function fetchCropLayers(): Promise<CropLayers> {
    const [plots, campaigns] = await Promise.all([
        http.get<Paginated<ResourceRow>>('/parcelles?per_page=200'),
        http.get<Paginated<ResourceRow>>('/campagnes?per_page=200'),
    ]);

    return {
        plots: plots.data,
        campaigns: campaigns.data,
    };
}
