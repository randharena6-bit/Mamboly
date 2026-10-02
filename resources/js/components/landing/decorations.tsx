import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';

/** Cercles flous et halos qui habillent les arrière-plans. */
export function Blobs({ className }: { className?: string }) {
    return (
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
            <div className="absolute -top-32 -left-24 size-[26rem] rounded-full bg-brand-200/35 blur-3xl animate-drift" />
            <div className="absolute -bottom-40 -right-16 size-[30rem] rounded-full bg-water-200/30 blur-3xl animate-drift [animation-delay:-6s]" />
            <div className="absolute top-1/3 left-1/2 size-[18rem] rounded-full bg-harvest-100/40 blur-3xl animate-drift [animation-delay:-12s]" />
        </div>
    );
}

/** Trame de points discrète, pour structurer les aplats. */
export function GridPattern({ className, id = 'agri-grid' }: { className?: string; id?: string }) {
    return (
        <svg aria-hidden="true" className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}>
            <defs>
                <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.1" fill="currentColor" className="text-brand-700/12" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    );
}

/** Petit bouquet de feuilles décoratif. */
export function LeafCluster({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            fill="none"
            className={cn('pointer-events-none', className)}
        >
            <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M28 96C28 66 44 40 74 24" className="text-brand-400/40" />
                <path d="M40 74c-8-10-8-22 2-30 8 10 8 22-2 30Z" fill="currentColor" fillOpacity="0.07" className="text-brand-500/35" />
                <path d="M56 56c-6-11-4-23 7-29 6 11 4 23-7 29Z" fill="currentColor" fillOpacity="0.08" className="text-brand-500/35" />
                <path d="M38 86c-10-4-16-13-13-24 10 4 16 13 13 24Z" fill="currentColor" fillOpacity="0.07" className="text-brand-500/30" />
                <circle cx="27" cy="97" r="4" fill="currentColor" fillOpacity="0.16" className="text-brand-600/40" />
            </g>
        </svg>
    );
}

/** Champ de gouttes d'eau en arrière-plan. */
export function DropletField({ className }: { className?: string }) {
    const droplets = [
        { left: '6%', top: '18%', size: 10, delay: '0s' },
        { left: '88%', top: '12%', size: 14, delay: '-2s' },
        { left: '14%', top: '74%', size: 8, delay: '-4s' },
        { left: '82%', top: '68%', size: 12, delay: '-1s' },
        { left: '48%', top: '6%', size: 7, delay: '-3s' },
        { left: '68%', top: '88%', size: 9, delay: '-5s' },
    ];

    return (
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', className)}>
            {droplets.map((drop) => (
                <svg
                    key={`${drop.left}-${drop.top}`}
                    viewBox="0 0 24 24"
                    style={{ left: drop.left, top: drop.top, width: drop.size, height: drop.size, animationDelay: drop.delay }}
                    className="absolute animate-float text-water-400/45 motion-reduce:animate-none"
                    fill="currentColor"
                >
                    <path d="M12 2.6c0 0-9.2 9.9-9.2 15.6a9.2 9.2 0 1 0 18.4 0C21.2 12.5 12 2.6 12 2.6Z" />
                </svg>
            ))}
        </div>
    );
}

/** Séparateur « goutte » réutilisé entre deux sections. */
export function DropletDivider({ className }: { className?: string }) {
    return (
        <div aria-hidden="true" className={cn('flex items-center justify-center gap-2', className)}>
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-brand-300/60" />
            <svg viewBox="0 0 24 24" className="size-3.5 text-brand-400" fill="currentColor" aria-hidden="true">
                <path d="M12 2.6c0 0-9.2 9.9-9.2 15.6a9.2 9.2 0 1 0 18.4 0C21.2 12.5 12 2.6 12 2.6Z" />
            </svg>
            <span className="h-px w-16 bg-gradient-to-l from-transparent to-brand-300/60" />
        </div>
    );
}

/** Bloc décoratif réutilisable : contenu + motif d'arrière-plan. */
export function Decorated({
    children,
    decoration = 'blobs',
    className,
    innerClassName,
}: {
    children: ReactNode;
    decoration?: 'blobs' | 'grid' | 'droplets' | 'none';
    className?: string;
    innerClassName?: string;
}) {
    return (
        <div className={cn('relative isolate overflow-hidden', className)}>
            {decoration === 'blobs' && <Blobs />}
            {decoration === 'grid' && <GridPattern />}
            {decoration === 'droplets' && <DropletField />}
            <div className={cn('relative', innerClassName)}>{children}</div>
        </div>
    );
}