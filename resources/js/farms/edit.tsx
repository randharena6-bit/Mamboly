import { createRoot } from 'react-dom/client';

import { FarmFormPage } from '../pages/farm-form-page';
import type { FarmFormValues } from '../types/farm';

const container = document.getElementById('agriwater-farms-edit');
const backUrl = container?.getAttribute('data-url') ?? '/exploitations';

let farmId: number | undefined;
let initial: Partial<FarmFormValues> | undefined;

const raw = container?.getAttribute('data-farm');
if (raw) {
    try {
        const parsed = JSON.parse(raw) as {
            id: number;
            name: string;
            location: string | null;
            type: string | null;
            total_area: number | string | null;
            status: string | null;
        };
        farmId = parsed.id;
        initial = {
            name: parsed.name,
            location: parsed.location ?? '',
            type: parsed.type ?? '',
            total_area: parsed.total_area != null ? String(parsed.total_area) : '',
            status: parsed.status ?? 'active',
        };
    } catch (error) {
        farmId = undefined;
        initial = undefined;
    }
}

if (container && farmId !== undefined) {
    createRoot(container).render(
        <FarmFormPage mode="edit" backUrl={backUrl} farmId={farmId} initial={initial} />,
    );
}