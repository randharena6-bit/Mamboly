import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Logo } from '../landing/logo';
import { routes } from '../../config/site';
import { Button } from '../ui/button';
import { cn } from '../../lib/cn';

export type AuthMode = 'login' | 'register';

export interface AuthSwitcherProps {
    login: ReactNode;
    register: ReactNode;
    defaultMode?: AuthMode;
}

/** URL et titre de chaque mode : la bascule écrit aussi dans l'historique. */
const MODE_META: Record<AuthMode, { path: string; title: string }> = {
    login: { path: routes.login, title: 'Connexion' },
    register: { path: routes.register, title: 'Créer votre exploitation' },
};

const COPY: Record<
    AuthMode,
    { eyebrow: string; title: string; subtitle: string; panelTitle: string; panelBody: string }
> = {
    login: {
        eyebrow: 'Espace membre',
        title: 'Connexion',
        subtitle: 'Renseignez les identifiants de votre exploitation.',
        panelTitle: 'Vos parcelles, vos stocks et vos finances, réunis autour de l’eau.',
        panelBody:
            'AgriWater cloisonne chaque exploitation : vos données restent les vôtres, et votre équipe ne voit que ce qui la concerne.',
    },
    register: {
        eyebrow: 'Inscription',
        title: 'Créer votre exploitation',
        subtitle: 'Quelques secondes suffisent : votre espace de gestion est prêt immédiatement.',
        panelTitle: 'Une exploitation, une équipe, un seul tableau de bord.',
        panelBody:
            'Parcelles, stocks, activités, finances et consommation d’eau : tout est centralisé dès la création du compte, sans carte bancaire.',
    },
};

/** L'URL de la barre d'adresse est la source de vérité en cas de retour arrière. */
function modeFromLocation(): AuthMode {
    return window.location.pathname.startsWith(MODE_META.register.path) ? 'register' : 'login';
}

/**
 * Écran d'authentification unique : connexion et inscription sur la même page,
 * basculées côté client.
 *
 * Le mode initial vient du serveur (`data-mode` de la vue Blade), la bascule
 * ensuite remplace l'URL par `history.pushState` — `/login` et `/register`
 * restent donc partageables, et le retour navigateur rétablit le bon mode.
 */
export function AuthSwitcher({ login, register, defaultMode = 'login' }: AuthSwitcherProps) {
    const [mode, setMode] = useState<AuthMode>(defaultMode);
    const [forward, setForward] = useState(true);

    // Le nom de l'application est le suffixe du titre rendu par Blade.
    const appName = useRef(document.title.split('—').slice(1).join('—').trim() || 'AgriWater');

    const switchTo = useCallback(
        (next: AuthMode, { push = true }: { push?: boolean } = {}) => {
            setMode((current) => {
                if (current === next) return current;
                setForward(next === 'register');
                return next;
            });

            if (!push) return;

            const meta = MODE_META[next];
            if (window.location.pathname !== meta.path) {
                window.history.pushState({ mode: next }, '', meta.path);
            }
            document.title = `${meta.title} — ${appName.current}`;
        },
        [],
    );

    // Retour / avance du navigateur : on resynchronise l'écran sur l'URL.
    useEffect(() => {
        const onPopState = () => switchTo(modeFromLocation(), { push: false });

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [switchTo]);

    const copy = COPY[mode];
    const isLogin = mode === 'login';

    return (
        <div className="grid min-h-screen bg-white lg:grid-cols-2">
            {/* Panneau de marque : la même colonne dans les deux modes, seul le
                message change — la bascule se joue sur le formulaire. */}
            <aside className="relative isolate hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden="true" className="absolute inset-0 -z-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-800 via-brand-900 to-water-900" />
                    <div className="absolute -top-24 -left-16 size-[28rem] rounded-full bg-brand-400/25 blur-3xl animate-drift" />
                    <div className="absolute -right-20 -bottom-28 size-[30rem] rounded-full bg-water-400/20 blur-3xl animate-drift [animation-delay:-8s]" />
                </div>

                <a href={routes.home} className="w-fit">
                    <Logo inverted />
                </a>

                <div
                    key={`panel-${mode}`}
                    className={cn(
                        'max-w-md animate-slide-in-right',
                        !forward && 'animate-slide-in-left',
                    )}
                >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                        Gestion agricole intelligente
                    </p>
                    <p className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-tight text-balance">
                        {copy.panelTitle}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-brand-100/85">{copy.panelBody}</p>
                </div>

                <p className="text-xs text-brand-200/70">
                    © {new Date().getFullYear()} AgriWater — Antananarivo, Madagascar
                </p>
            </aside>

            <main className="flex flex-col justify-center px-5 py-12 sm:px-8">
                <div className="mx-auto w-full max-w-md">
                    <a
                        href={routes.home}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline lg:hidden"
                    >
                        <span aria-hidden="true">←</span> Accueil
                    </a>

                    {/*
                        Une seule instance de formulaire à la fois : les deux
                        écrans partagent les mêmes `id` de champs, les monter
                        ensemble casserait le lien label ↔ input.
                    */}
                    <div key={mode}>
                        <header className="mt-8 lg:mt-0" aria-live="polite">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                                {copy.eyebrow}
                            </p>
                            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink-900">
                                {copy.title}
                            </h1>
                            <p className="mt-2 text-sm leading-relaxed text-ink-500">{copy.subtitle}</p>
                        </header>

                        <div
                            id="auth-form"
                            className={cn(
                                'mt-8 animate-slide-in-right',
                                !forward && 'animate-slide-in-left',
                            )}
                        >
                            {isLogin ? login : register}
                        </div>
                    </div>

                    <div className="mt-8 text-center text-sm text-ink-500">
                        {isLogin ? (
                            <>
                                Pas encore de compte ?{' '}
                                <button
                                    type="button"
                                    onClick={() => switchTo('register')}
                                    className="font-semibold text-brand-700 hover:underline"
                                >
                                    Créer votre exploitation
                                </button>
                            </>
                        ) : (
                            <>
                                Vous avez déjà un compte ?{' '}
                                <button
                                    type="button"
                                    onClick={() => switchTo('login')}
                                    className="font-semibold text-brand-700 hover:underline"
                                >
                                    Se connecter
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Bascule grand écran : posée sur la couture entre les deux colonnes. */}
            <Button
                type="button"
                onClick={() => switchTo(isLogin ? 'register' : 'login')}
                aria-controls="auth-form"
                className="fixed top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full px-6 shadow-float lg:inline-flex"
            >
                {isLogin ? 'S’inscrire' : 'Se connecter'}
            </Button>
        </div>
    );
}
