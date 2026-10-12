import { http, type Paginated } from '../../lib/http';
import type { ResourceRow } from '../../resources/types';

/** Ressources en eau et irrigations nécessaires aux couches cartographiques. */
export async function fetchMapLayers(): Promise<{
    waterSources: ResourceRow[];
    irrigations: ResourceRow[];
}> {
    const [sources, irrigations] = await Promise.all([
        http.get<Paginated<ResourceRow>>('/ressources-eau?per_page=200'),
        http.get<Paginated<ResourceRow>>('/irrigations?per_page=200'),
    ]);

    return { waterSources: sources.data, irrigations: irrigations.data };
}
