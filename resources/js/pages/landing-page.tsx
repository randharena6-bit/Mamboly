import { CallToAction } from '../components/landing/call-to-action';
import { DashboardTour } from '../components/landing/dashboard-tour';
import { Features } from '../components/landing/features';
import { Hero } from '../components/landing/hero';
import { HowItWorks } from '../components/landing/how-it-works';
import { ProblemSolution } from '../components/landing/problem-solution';
import { Security } from '../components/landing/security';
import { SiteFooter } from '../components/landing/site-footer';
import { SiteHeader } from '../components/landing/site-header';
import { StatsBand } from '../components/landing/stats-band';

/**
 * Page d'accueil AgriWater.
 *
 * L'ordre des sections suit le tunnel de conversion :
 * promesse → réassurance → problème/solution → fonctionnalités →
 * sécurité → démarrage → preuve produit → action.
 */
export function LandingPage() {
    return (
        <>
            <a
                href="#contenu"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-brand-700 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
            >
                Aller au contenu principal
            </a>

            <SiteHeader />

            <main id="contenu">
                <Hero />
                <StatsBand />
                <ProblemSolution />
                <Features />
                <Security />
                <HowItWorks />
                <DashboardTour />
                <CallToAction />
            </main>

            <SiteFooter />
        </>
    );
}