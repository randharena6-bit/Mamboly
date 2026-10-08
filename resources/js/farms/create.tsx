import { createRoot } from 'react-dom/client';

import { FarmFormPage } from '../pages/farm-form-page';

const container = document.getElementById('agriwater-farms-create');
const dataUrl = container?.getAttribute('data-url') ?? '';

if (container) {
    const root = createRoot(container);
    root.render(<FarmFormPage mode="create" backUrl={dataUrl} />);
}
