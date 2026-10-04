import { renderToString } from 'react-dom/server';
import { LandingPage } from './pages/landing-page';
import { TooltipProvider } from './components/ui/tooltip';

const html = renderToString(
    <TooltipProvider>
        <LandingPage />
    </TooltipProvider>,
);
console.log('LENGTH=' + html.length);
console.log('SECTIONS=' + (html.match(/<section/g) || []).length);
