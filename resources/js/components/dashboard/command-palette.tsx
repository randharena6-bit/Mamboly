import { ArrowUpRight, CornerDownLeft, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import type { DashboardNavItem } from './nav-items';
import { dashboardNavGroups } from './nav-items';

/**
 * Palette de commandes (⌘K / Ctrl+K) : accès clavier à tous les modules sans
 * quitter la page. Le filtrage porte sur le libellé, la description et l'URL.
 */
export function CommandPalette({
    open,
    onClose,
    activeNav,
}: {
    open: boolean;
    onClose: () => void;
    activeNav?: string;
}) {
    const [query, setQuery] = useState('');
    const [cursor, setCursor] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;

        setQuery('');
        setCursor(0);

        // Laisse le temps au dialogue d'être monté avant de donner le focus.
        const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, onClose]);

    const groups = useMemo(() => {
        const needle = query.trim().toLowerCase();

        return dashboardNavGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) => {
                    if (needle === '') return true;

                    return [item.label, item.description, item.href]
                        .filter(Boolean)
                        .some((value) => String(value).toLowerCase().includes(needle));
                }),
            }))
            .filter((group) => group.items.length > 0);
    }, [query]);

    const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);
    const safeCursor = Math.min(cursor, Math.max(flat.length - 1, 0));

    useEffect(() => {
        setCursor(0);
    }, [query]);

    const go = (item: DashboardNavItem) => {
        onClose();
        window.location.assign(item.href);
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh] sm:pt-[16vh]">
            <button
                type="button"
                aria-label="Fermer la palette de commandes"
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-ink-950/45 backdrop-blur-sm"
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Palette de commandes"
                className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-float backdrop-blur-xl animate-scale-in"
            >
                <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
                    <Search aria-hidden="true" className="size-5 shrink-0 text-brand-700" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setCursor((value) => (flat.length === 0 ? 0 : (value + 1) % flat.length));
                            } else if (event.key === 'ArrowUp') {
                                event.preventDefault();
                                setCursor((value) => (flat.length === 0 ? 0 : (value - 1 + flat.length) % flat.length));
                            } else if (event.key === 'Enter' && flat[safeCursor]) {
                                event.preventDefault();
                                go(flat[safeCursor]);
                            }
                        }}
                        placeholder="Rechercher un module, une action…"
                        aria-label="Rechercher un module"
                        className="h-8 min-w-0 flex-1 border-0 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-400"
                    />
                    <button
                        type="button"
                        onClick={onClose}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                        aria-label="Fermer"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                </div>

                <div className="max-h-[52vh] overflow-y-auto p-3">
                    {flat.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-ink-500">
                            Aucun module ne correspond à « {query.trim()} ».
                        </p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.label} className="mb-2 last:mb-0">
                                <p className="px-3 py-1.5 text-[0.6875rem] font-bold tracking-[0.12em] text-ink-400 uppercase">
                                    {group.label}
                                </p>
                                <ul className="space-y-0.5">
                                    {group.items.map((item) => {
                                        const index = flat.indexOf(item);
                                        const Icon = item.icon;

                                        return (
                                            <li key={item.href}>
                                                <a
                                                    href={item.href}
                                                    onMouseEnter={() => setCursor(index)}
                                                    onClick={(event) => {
                                                        event.preventDefault();
                                                        go(item);
                                                    }}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                                                        index === safeCursor
                                                            ? 'bg-brand-50 text-brand-900'
                                                            : 'text-ink-700 hover:bg-ink-50',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'grid size-8 shrink-0 place-items-center rounded-lg ring-1',
                                                            item.href === activeNav
                                                                ? 'bg-brand-700 text-white ring-brand-700'
                                                                : 'bg-white text-ink-500 ring-ink-200',
                                                        )}
                                                    >
                                                        <Icon className="size-4" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-semibold">{item.label}</span>
                                                        {item.description && (
                                                            <span className="block truncate text-xs text-ink-400">
                                                                {item.description}
                                                            </span>
                                                        )}
                                                    </span>
                                                    {index === safeCursor ? (
                                                        <CornerDownLeft aria-hidden="true" className="size-4 text-brand-600" />
                                                    ) : (
                                                        <ArrowUpRight aria-hidden="true" className="size-4 text-ink-300" />
                                                    )}
                                                </a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex items-center gap-4 border-t border-ink-100 bg-ink-50/60 px-5 py-2.5 text-[0.6875rem] font-medium text-ink-400">
                    <span className="flex items-center gap-1.5">
                        <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-600">
                            ↑
                        </kbd>
                        <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-600">
                            ↓
                        </kbd>
                        Naviguer
                    </span>
                    <span className="flex items-center gap-1.5">
                        <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-600">
                            ↵
                        </kbd>
                        Ouvrir
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                        <kbd className="rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[0.625rem] text-ink-600">
                            Échap
                        </kbd>
                        Fermer
                    </span>
                </div>
            </div>
        </div>
    );
}
