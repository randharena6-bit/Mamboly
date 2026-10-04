import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="agriwater-landing"></div></body></html>', {
    url: 'http://localhost:8000/',
    pretendToBeVisual: true,
});

const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
g.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
});
g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
};
g.IntersectionObserver = class {
    constructor(_cb: unknown, opts?: { rootMargin?: string; threshold?: number }) {
        console.log('IO opts:', JSON.stringify(opts));
    }
    observe() {}
    unobserve() {}
    disconnect() {}
};

async function main() {
    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
    };

    const { createRoot } = await import('react-dom/client');
    const { LandingPage } = await import('./pages/landing-page');
    const { TooltipProvider } = await import('./components/ui/tooltip');

    const container = dom.window.document.getElementById('agriwater-landing')!;
    const root = createRoot(container);

    root.render(
        <TooltipProvider>
            <LandingPage />
        </TooltipProvider>,
    );

    await new Promise((r) => setTimeout(r, 1500));

    const html = container.innerHTML;
    console.log('=== HTML LENGTH:', html.length);
    console.log('=== SECTIONS:', (html.match(/<section/g) || []).length);
    console.log('=== VISIBLE (opacity-100):', (html.match(/opacity-100/g) || []).length);
    console.log('=== HIDDEN (opacity-0):', (html.match(/opacity-0(?![0-9a-z-])/g) || []).length);
    console.log('=== CONSOLE ERRORS:', errors.length);
    for (const e of errors.slice(0, 4)) console.log('---\n' + e.slice(0, 1200));
    origError('done');
}

main();
