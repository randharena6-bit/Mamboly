import { Eye, Layers, LockKeyhole, RefreshCw } from 'lucide-react';

import { Reveal } from './reveal';

const stats = [
    {
        icon: LockKeyhole,
        value: '100 %',
        label: 'des données isolées par exploitation',
        tone: 'bg-brand-50 text-brand-700 ring-brand-100',
    },
    {
        icon: Layers,
        value: '1 seule',
        label: 'plateforme pour centraliser toute votre activité',
        tone: 'bg-water-50 text-water-700 ring-water-100',
    },
    {
        icon: RefreshCw,
        value: 'Temps réel',
        label: 'des stocks, activités et finances à jour',
        tone: 'bg-harvest-50 text-harvest-700 ring-harvest-100',
    },
    {
        icon: Eye,
        value: 'Accès sécurisé',
        label: 'par rôles, traçable et contrôlé',
        tone: 'bg-ink-50 text-ink-600 ring-ink-100',
    },
] as const;

export function StatsBand() {
    return (
        <section aria-label="Chiffres clés d’AgriWater" className="relative py-14 sm:py-16">
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
                <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white p-2 shadow-soft">
                    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;

                            return (
                                <Reveal
                                    key={stat.value}
                                    delay={index * 90}
                                    className="group rounded-2xl transition-colors duration-300 hover:bg-sand-50"
                                >
                                    <div className="flex h-full items-start gap-3.5 p-5">
                                        <span
                                            className={`grid size-11 shrink-0 place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105 ${stat.tone}`}
                                        >
                                            <Icon aria-hidden="true" className="size-5" />
                                        </span>

                                        <div className="min-w-0">
                                            <dt className="sr-only">{stat.label}</dt>
                                            <dd>
                                                <span className="block font-display text-lg font-extrabold tracking-tight text-ink-900">
                                                    {stat.value}
                                                </span>
                                                <span className="mt-1 block text-sm leading-snug text-ink-500">
                                                    {stat.label}
                                                </span>
                                            </dd>
                                        </div>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </dl>
                </div>
            </div>
        </section>
    );
}