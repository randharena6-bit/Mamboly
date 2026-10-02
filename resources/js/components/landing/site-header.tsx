import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

import { cn } from '../../lib/cn';
import { navigation, routes } from '../../config/site';
import { useScrolled } from '../../hooks/use-scrolled';
import { Button } from '../ui/button';
import { Logo } from './logo';

/**
 * Barre de navigation fixe : transparente en haut de page, puis blanche et
 * floutée au défilement. Le menu mobile est un panneau plein écran verrouillé
 * au défilement, avec fermeture au clavier et à la navigation.
 */
export function SiteHeader() {
    const scrolled = useScrolled(20);
    const [open, setOpen] = useState(false);
    const panelId = useId();

    // Verrouille le défilement du document quand le menu mobile est ouvert.
    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    return (
        <header
            className={cn(
                'fixed inset-x-0 top-0 z-50 transition-all duration-300',
                scrolled || open
                    ? 'border-b border-ink-100/80 bg-white/85 shadow-soft backdrop-blur-xl'
                    : 'border-b border-transparent bg-transparent',
            )}
        >
            <nav aria-label="Navigation principale" className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-5 sm:px-6 lg:px-8">
                <a
                    href={routes.home}
                    className="rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700"
                    aria-label="AgriWater, retour à l’accueil"
                >
                    <Logo />
                </a>

                <ul className="ml-4 hidden items-center gap-1 lg:flex">
                    {navigation.map((link) => (
                        <li key={link.label}>
                            <a
                                href={link.href}
                                className="group relative inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium text-ink-600 transition-colors duration-200 hover:text-brand-700"
                            >
                                {link.label}
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-x-3.5 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-brand-600 to-water-500 transition-transform duration-300 group-hover:scale-x-100"
                                />
                            </a>
                        </li>
                    ))}
                </ul>

                <div className="ml-auto hidden items-center gap-2.5 lg:flex">
                    <Button asChild variant="ghost" size="sm">
                        <a href={routes.login}>Se connecter</a>
                    </Button>
                    <Button asChild size="sm">
                        <a href={routes.register}>Commencer gratuitement</a>
                    </Button>
                </div>

                <Button
                    variant="outline"
                    size="iconSm"
                    className="ml-auto lg:hidden"
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
                    onClick={() => setOpen((value) => !value)}
                >
                    {open ? <X /> : <Menu />}
                </Button>
            </nav>

            {/* Panneau mobile */}
            <div
                id={panelId}
                hidden={!open}
                className="border-t border-ink-100 bg-white/95 backdrop-blur-xl lg:hidden"
            >
                <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-5 sm:px-6">
                    {navigation.map((link, index) => (
                        <li key={link.label} style={{ animationDelay: `${index * 45}ms` }}>
                            <a
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold text-ink-800 transition-colors hover:bg-brand-50 hover:text-brand-800"
                            >
                                {link.label}
                                <span aria-hidden="true" className="text-ink-300">
                                    →
                                </span>
                            </a>
                        </li>
                    ))}
                    <li className="mt-3 grid gap-2.5">
                        <Button asChild variant="outline" className="w-full">
                            <a href={routes.login} onClick={() => setOpen(false)}>
                                Se connecter
                            </a>
                        </Button>
                        <Button asChild className="w-full">
                            <a href={routes.register} onClick={() => setOpen(false)}>
                                Commencer gratuitement
                            </a>
                        </Button>
                    </li>
                </ul>
            </div>
        </header>
    );
}