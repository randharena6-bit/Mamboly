import { createRoot } from 'react-dom/client';

import { FarmFormPage } from '../pages/farm-form-page';

const container = document.getElementById('agriwater-farms-edit');
const dataUrl = container?.getAttribute('data-url') ?? '';
const farmData = container?.getAttribute('data-farm');

let farm: any = null;
if (farmData) {
    try {
        farm = JSON.parse(farmData);
    } catch (e) {
        farm = null;
    }
}

if (container) {
    const root = createRoot(container);
    root.render(<FarmFormPage mode="edit" backUrl={dataUrl} farm={farm} />);
}
