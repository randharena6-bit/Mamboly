/**
 * Configuration globale de la landing page : routes, navigation et liens.
 * Toutes les URL pointent vers les routes Laravel définies dans `routes/web.php`.
 */

export const routes = {
    home: '/',
    login: '/login',
    register: '/register',
    dashboard: '/dashboard',
    features: '/features',
    security: '/security',
    pricing: '/pricing',
    demo: '/register?demo=1',
} as const;

export type NavLink = {
    label: string;
    href: string;
};

export const navigation: NavLink[] = [
    { label: 'Accueil', href: '/#accueil' },
    { label: 'Fonctionnalités', href: '/#fonctionnalites' },
    { label: 'Sécurité', href: '/#securite' },
    { label: 'Tarifs', href: routes.pricing },
    { label: 'À propos', href: '/#a-propos' },
];

export const footerSections: { title: string; links: NavLink[] }[] = [
    {
        title: 'Produit',
        links: [
            { label: 'Fonctionnalités', href: '/#fonctionnalites' },
            { label: 'Sécurité', href: '/#securite' },
            { label: 'Tarifs', href: routes.pricing },
            { label: 'Documentation', href: '/documentation' },
        ],
    },
    {
        title: 'Entreprise',
        links: [
            { label: 'À propos', href: '/#a-propos' },
            { label: 'Contact', href: '/contact' },
            { label: 'Blog', href: '/blog' },
        ],
    },
    {
        title: 'Légal',
        links: [
            { label: 'Politique de confidentialité', href: '/confidentialite' },
            { label: 'Conditions d’utilisation', href: '/conditions' },
        ],
    },
];

export const socialLinks: { label: string; href: string; icon: 'linkedin' | 'x' | 'facebook' | 'youtube' }[] = [
    { label: 'AgriWater sur LinkedIn', href: 'https://www.linkedin.com', icon: 'linkedin' },
    { label: 'AgriWater sur X', href: 'https://x.com', icon: 'x' },
    { label: 'AgriWater sur Facebook', href: 'https://www.facebook.com', icon: 'facebook' },
    { label: 'AgriWater sur YouTube', href: 'https://www.youtube.com', icon: 'youtube' },
];

export const copyright = `© ${new Date().getFullYear()} AgriWater. Tous droits réservés.`;