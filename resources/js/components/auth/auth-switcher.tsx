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

const COPY: Record<AuthMode, { eyebrow: string; title: string; subtitle: string }> = {
    login: {
        eyebrow: 'Espace membre',
        title: 'Connexion',
        subtitle: 'Renseignez les identifiants de votre exploitation.',
    },
    register: {
        eyebrow: 'Inscription',
        title: 'Créer votre exploitation',
        subtitle: 'Quelques secondes suffisent : votre espace de gestion est prêt immédiatement.',
    },
};

/**
 * Messages du panneau de marque (le côté opposé au formulaire) : ils
 * défilent automatiquement toutes les 5 secondes avec un fondu en montant.
 */
const PANEL_MESSAGES: Record<AuthMode, { title: string; body: string }[]> = {
    login: [
        {
            title: 'Vos parcelles, vos stocks et vos finances, réunis autour de l’eau.',
            body: 'AgriWater cloisonne chaque exploitation : vos données restent les vôtres, et votre équipe ne voit que ce qui la concerne.',
        },
        {
            title: 'Arrosez au juste moment, jamais au hasard.',
            body: 'Historique, alertes et recommandations par parcelle : vous consommez l’eau utile, sans gaspiller une goutte.',
        },
        {
            title: 'Des chiffres clairs, mis à jour à chaque saisie.',
            body: 'Rendements, charges et trésorerie sont recalculés automatiquement pour que vous gardiez le cap toute la saison.',
        },
        {
            title: 'Votre équipe travaille au même endroit.',
            body: 'Invitations, rôles et suivis des tâches : plus de fichiers dispersés, plus d’informations perdue dans les messages.',
        },
    ],
    register: [
        {
            title: 'Une exploitation, une équipe, un seul tableau de bord.',
            body: 'Parcelles, stocks, activités, finances et eau : tout est centralisé dès la création du compte, sans carte bancaire.',
        },
        {
            title: 'Votre espace est prêt en quelques secondes.',
            body: 'Renseignez votre exploitation, invitez vos collaborateurs : vous pouvez commencer à saisir dès maintenant.',
        },
        {
            title: 'Chaque donnée reste chez son propriétaire.',
            body: 'Les exploitations sont strictement cloisonnées : aucun voisin ni tiers n’accède à vos parcelles ou à vos résultats.',
        },
        {
            title: 'Commencez simple, évoluez quand vous voulez.',
            body: 'Commencez par les parcelles et l’eau, ajoutez la finance et les stocks ensuite : le suivi s’adapte à votre organisation.',
        },
    ],
};

/** Durée du fondu lorsqu'un message du panneau est remplacé. */
const PANEL_FADE_MS = 320;

/** Intervalle entre deux messages du panneau de marque. */
const PANEL_INTERVAL_MS = 5000;

/** L'URL de la barre d'adresse fait foi lors d'un retour navigateur. */
function modeFromLocation(): AuthMode {
    return window.location.pathname.startsWith(MODE_META.register.path) ? 'register' : 'login';
}

/**
 * Écran d'authentification unique : connexion et inscription sur la même page,
 * basculées côté client.
 *
 * Le mode initial vient du serveur (`data-mode` de la vue Blade) ; la bascule
 * remplace ensuite l'URL par `history.pushState`. `/login` et `/register`
 * restent partageables, et le retour navigateur rétablit le bon mode.
 */
export function AuthSwitcher({ login, register, defaultMode = 'login' }: AuthSwitcherProps) {
    const [mode, setMode] = useState<AuthMode>(defaultMode);

    // Sens de la bascule : le formulaire entre par le côté opposé à sa source.
    const [forward, setForward] = useState(true);

    // Suffixe du titre rendu par Blade (« Connexion — AgriWater »).
    const appName = useRef(document.title.split('—').slice(1).join('—').trim() || 'AgriWater');

    const switchTo = useCallback(
        (next: AuthMode, { push = true }: { push?: boolean } = {}) => {
            if (next === mode) return;

            setForward(next === 'register');
            setMode(next);

            if (!push) return;

            const meta = MODE_META[next];
            if (window.location.pathname !== meta.path) {
                window.history.pushState({ mode: next }, '', meta.path);
            }
            document.title = `${meta.title} — ${appName.current}`;
        },
        [mode],
    );

    // Retour / avance du navigateur : on resynchronise l'écran sur l'URL.
    useEffect(() => {
        const onPopState = () => switchTo(modeFromLocation(), { push: false });

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [switchTo]);

    // Messages du panneau : fondu sortant, remplacement, fondu entrant, toutes les 5 s.
    const [messageIndex, setMessageIndex] = useState(0);
    const [panelShown, setPanelShown] = useState(true);

    useEffect(() => {
        const messages = PANEL_MESSAGES[mode];

        // Un changement de mode repart sur le premier message.
        setMessageIndex(0);
        setPanelShown(true);

        if (messages.length < 2) return;

        let swap: number | undefined;

        const interval = window.setInterval(() => {
            setPanelShown(false);
            swap = window.setTimeout(() => {
                setMessageIndex((current) => (current + 1) % messages.length);
                setPanelShown(true);
            }, PANEL_FADE_MS);
        }, PANEL_INTERVAL_MS);

        return () => {
            window.clearInterval(interval);
            if (swap !== undefined) window.clearTimeout(swap);
        };
    }, [mode]);

    const copy = COPY[mode];
    const panelMessage = PANEL_MESSAGES[mode][messageIndex] ?? PANEL_MESSAGES[mode][0];
    const isLogin = mode === 'login';
    const enter = forward ? 'animate-slide-in-right' : 'animate-slide-in-left';

    return (
        <div className="grid min-h-screen bg-white lg:grid-cols-2">
            {/*
                Panneau de marque : la colonne ne bouge pas d'un mode à l'autre,
                seul son message change — la bascule se joue sur le formulaire.
            */}
            <aside className="relative isolate hidden overflow-hidden bg-brand-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
                    {/* Photo de fond + voile pour garder les textes lisibles. */}
                    <div className="absolute inset-0 animate-drift auth-panel-photo" />
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-900/85 via-brand-900/70 to-water-900/85" />
                    <div className="absolute -top-24 -left-16 size-[28rem] rounded-full bg-brand-400/25 blur-3xl animate-drift" />
                    <div className="absolute -right-20 -bottom-28 size-[30rem] rounded-full bg-water-400/20 blur-3xl animate-drift [animation-delay:-8s]" />
                </div>

                <a href={routes.home} className="w-fit">
                    <Logo inverted />
                </a>

                {/* La clé force le remontage : l'animation rejoue à chaque bascule. */}
                <div key={`panel-${mode}`} className={cn('mx-auto w-full max-w-xl text-center', enter)}>
                    <p className="text-base font-semibold uppercase tracking-[0.18em] text-brand-200 animate-fade-in-up [animation-delay:80ms]">
                        Gestion agricole intelligente
                    </p>

                    {/*
                        Le message défile toutes les 5 s : le texte sort vers le
                        haut, est remplacé pendant le fondu, puis se pose à nouveau.
                    */}
                    <div
                        className={cn(
                            'mt-6 transition-[opacity,transform] duration-[320ms] ease-out',
                            panelShown
                                ? 'translate-y-0 opacity-100'
                                : '-translate-y-2 opacity-0',
                        )}
                    >
                        <p className="font-display text-4xl leading-[1.12] font-extrabold tracking-tight text-balance sm:text-5xl animate-fade-in-up [animation-delay:180ms]">
                            {panelMessage.title}
                        </p>
                        <p className="mt-6 text-lg leading-relaxed text-brand-100/85 animate-fade-in-up [animation-delay:300ms]">
                            {panelMessage.body}
                        </p>
                    </div>

                    {/* Repères du défilé : le point actif se remplit en 5 s. */}
                    <div className="mt-7 flex justify-center gap-1.5" aria-hidden="true">
                        {PANEL_MESSAGES[mode].map((_, index) => (
                            <span
                                key={index}
                                className={cn(
                                    'h-1 rounded-full transition-[width,background-color] duration-300',
                                    index === messageIndex
                                        ? 'w-6 bg-brand-300 animate-dot-progress'
                                        : 'w-2 bg-white/25',
                                )}
                            />
                        ))}
                    </div>
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

                    {/* La clé rejoue l'entrée en cascade des textes à chaque bascule. */}
                    <header key={`head-${mode}`} className="mt-8 lg:mt-0" aria-live="polite">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700 animate-fade-in-up [animation-delay:60ms]">
                            {copy.eyebrow}
                        </p>
                        <h1 className="mt-3 font-display text-4xl leading-[1.1] font-extrabold tracking-tight text-ink-900 sm:text-5xl animate-fade-in-up [animation-delay:160ms]">
                            {copy.title}
                        </h1>
                        <p className="mt-4 text-base leading-relaxed text-ink-500 sm:text-lg animate-fade-in-up [animation-delay:280ms]">
                            {copy.subtitle}
                        </p>
                    </header>

                    {/*
                        Une seule instance de formulaire à la fois : les deux
                        écrans partagent les mêmes `id` de champs, les monter
                        ensemble casserait le lien label ↔ input.
                    */}
                    <div key={mode} id="auth-form" className={cn('mt-8', enter)}>
                        {isLogin ? login : register}
                    </div>

                    <div
                        key={`switch-${mode}`}
                        className="mt-8 text-center text-base text-ink-500 animate-fade-in-up [animation-delay:560ms]"
                    >
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
                key={`toggle-${mode}`}
                type="button"
                onClick={() => switchTo(isLogin ? 'register' : 'login')}
                aria-controls="auth-form"
                className="fixed top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full px-7 text-base shadow-float lg:inline-flex animate-pop-in"
            >
                {isLogin ? 'S’inscrire' : 'Se connecter'}
            </Button>
        </div>
    );
}
