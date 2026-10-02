import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { Reveal } from './reveal';

type SectionProps = {
    id: string;
    children: ReactNode;
    className?: string;
    /** Étiquette affichée au-dessus du titre (ex. « Sécurité »). */
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'left' | 'center';
    tone?: 'white' | 'sand' | 'brand' | 'none';
};

/**
 * Enveloppe de section : ancre navigable, fond, et en-tête éditorial
 * (sur-titre, titre, description) avec révélation au défilement.
 */
export function Section({
    id,
    children,
    className,
    eyebrow,
    title,
    description,
    align = 'center',
    tone = 'white',
}: SectionProps) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-titre`}
            className={cn(
                'relative scroll-mt-24 py-20 sm:py-24 lg:py-28',
                tone === 'sand' && 'bg-sand-50',
                tone === 'brand' && 'bg-brand-50',
                className,
            )}
        >
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
                {(eyebrow || title || description) && (
                    <SectionHeader
                        id={`${id}-titre`}
                        eyebrow={eyebrow}
                        title={title}
                        description={description}
                        align={align}
                    />
                )}
                {children}
            </div>
        </section>
    );
}

export function SectionHeader({
    id,
    eyebrow,
    title,
    description,
    align = 'center',
    className,
}: {
    id: string;
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    align?: 'left' | 'center';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'max-w-3xl',
                align === 'center' ? 'mx-auto text-center' : 'text-left',
                className,
            )}
        >
            {eyebrow && (
                <Reveal>
                    <Eyebrow>{eyebrow}</Eyebrow>
                </Reveal>
            )}
            <Reveal delay={80}>
                <h2
                    id={id}
                    className="font-display text-3xl font-extrabold tracking-tight text-balance text-ink-900 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
                >
                    {title}
                </h2>
            </Reveal>
            {description && (
                <Reveal delay={140}>
                    <p className="mt-4 text-base leading-relaxed text-pretty text-ink-500 sm:text-lg">
                        {description}
                    </p>
                </Reveal>
            )}
        </div>
    );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 rounded-full border border-brand-200/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 shadow-soft backdrop-blur-sm',
                className,
            )}
        >
            <span aria-hidden="true" className="size-1.5 rounded-full bg-gradient-to-br from-brand-500 to-water-600" />
            {children}
        </span>
    );
}