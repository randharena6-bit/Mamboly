import type { ComponentProps } from 'react';

import { AuthSwitcher } from '../../components/auth/auth-switcher';
import { Logo } from '../../components/landing/logo';
import { cn } from '../../lib/cn';

export function AuthPage({ mode = 'login', className }: { mode?: 'login' | 'register'; className?: string }) {
    return (
        <div className={cn('flex min-h-screen flex-col justify-between bg-canvas lg:flex-row', className)}>
            <div className="relative flex flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
                <a href="/" className="flex w-fit items-center gap-2.5">
                    <Logo />
                    <span className="font-display text-base font-bold text-ink-900 sm:text-lg">AgriWater</span>
                </a>

                <main className="mx-auto mt-10 flex w-full max-w-md flex-1 flex-col justify-center lg:mt-0">
                    <AuthSwitcher initialMode={mode} />
                </main>

                <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-400 sm:mt-12">
                    <p>© {new Date().getFullYear()} AgriWater</p>
                    <nav className="flex flex-wrap gap-3">
                        <a href="/confidentialite" className="hover:text-brand-700">
                            Politique de confidentialité
                        </a>
                        <a href="/conditions" className="hover:text-brand-700">
                            Conditions d’utilisation
                        </a>
                    </nav>
                </footer>
            </div>

            <aside className="relative hidden lg:flex lg:w-[50%] xl:w-[48%] 2xl:w-[52%]">
                <div className="auth-panel-photo absolute inset-0" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-br from-ink-900/70 via-ink-900/55 to-brand-900/70" aria-hidden="true" />
                <div className="relative z-10 mx-auto flex h-full max-w-2xl flex-col justify-end px-10 pb-14 text-white">
                    <h1 className="font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-balance">
                        Gérez votre exploitation agricole avec clarté et efficacité
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100/90">
                        AgriWater centralise activités, stocks, finances et consommation d’eau pour garantir la traçabilité
                        et l’isolation stricte des données entre exploitations.
                    </p>
                </div>
            </aside>
        </div>
    );
}
