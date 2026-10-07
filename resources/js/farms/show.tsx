import { createRoot } from 'react-dom/client';

import { FarmShowPage } from '../pages/farm-show-page';

const container = document.getElementById('agriwater-farm-show');
const dataUrl = container?.getAttribute('data-url') ?? '';
const farmName = container?.getAttribute('data-farm-name') ?? undefined;

if (container) {
    const root = createRoot(container);
    root.render(<FarmShowPage endpoint={dataUrl} farmName={farmName} />);
}
