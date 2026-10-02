import { routes, copyright, footerSections, socialLinks } from '../../config/site';
import { Logo } from './logo';
import { SocialIcon } from './social-icons';

export function SiteFooter() {
    return (
        <footer className="relative overflow-hidden bg-ink-950 text-white/70">
            <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
            />
            <div
                aria-hidden="true"
                className="absolute -top-24 left-1/4 size-72 rounded-full bg-brand-700/15 blur-3xl"
            />

            <div className="relative mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
                    {/* Marque */}
                    <div className="max-w-sm">
                        <Logo inverted />
                        <p className="mt-4 text-sm leading-relaxed text-white/60">
                            AgriWater centralise la gestion de vos exploitations agricoles : parcelles, stocks,
                            activités, finances et consommation d’eau, dans une plateforme sécurisée.
                        </p>

                        <ul className="mt-5 flex items-center gap-2">
                            {socialLinks.map((social) => (
                                <li key={social.icon}>
                                    <a
                                        href={social.href}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        aria-label={social.label}
                                        className="grid size-9 place-items-center rounded-xl border border-white/12 bg-white/5 text-white/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:bg-brand-500/15 hover:text-white"
                                    >
                                        <SocialIcon name={social.icon} className="size-4" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Liens */}
                    {footerSections.map((section) => (
                        <nav key={section.title} aria-label={section.title}>
                            <h2 className="font-display text-sm font-bold tracking-wide text-white">
                                {section.title}
                            </h2>
                            <ul className="mt-4 space-y-2.5">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            className="text-sm text-white/60 transition-colors duration-200 hover:text-brand-300"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ))}
                </div>

                {/* Barre inférieure */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
                    <p className="text-xs text-white/50">{copyright}</p>

                    <div className="flex items-center gap-4">
                        <span className="rounded-full bg-white/5 px-3 py-1 text-[0.6875rem] text-white/55 ring-1 ring-white/10">
                            Hébergé à Madagascar
                        </span>
                        <a
                            href={routes.register}
                            className="text-xs font-semibold text-brand-300 transition-colors hover:text-brand-200"
                        >
                            Créer une exploitation
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}