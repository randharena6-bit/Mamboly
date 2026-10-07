import { createRoot } from 'react-dom/client';

import { FarmsPage } from '../pages/farms-page';

const container = document.getElementById('agriwater-farms');
const dataUrl = container?.getAttribute('data-url') ?? '';

if (container) {
    const root = createRoot(container);
    root.render(<FarmsPage endpoint={dataUrl} />);
}
