/**
 * Icônes de réseaux sociaux (SVG inline). Lucide ne fournit plus d'icônes
 * de marque, elles sont donc dessinées ici pour rester autonomes.
 */

const paths = {
    linkedin: (
        <>
            <path d="M6.94 5a1.94 1.94 0 1 1-3.88 0 1.94 1.94 0 0 1 3.88 0Z" />
            <path d="M4.5 8.5v11" />
            <path d="M11 19.5v-6.2a2.7 2.7 0 0 1 5.4 0v6.2" />
            <path d="M11 13.5v6" />
        </>
    ),
    x: (
        <>
            <path d="M4 4l16 16" />
            <path d="M20 4L4 20" />
        </>
    ),
    facebook: (
        <>
            <path d="M15.5 8.5h-2a1.5 1.5 0 0 0-1.5 1.5V12h3.2l-.5 3.5H12V21" />
            <path d="M12 12H9.2" />
            <path d="M10 21v-5.5H7.5" />
        </>
    ),
    youtube: (
        <>
            <rect x="3" y="6" width="18" height="12" rx="3.5" />
            <path d="M10.5 9.8l4.2 2.2-4.2 2.2V9.8Z" />
        </>
    ),
} as const;

export type SocialIconName = keyof typeof paths;

export function SocialIcon({ name, className }: { name: SocialIconName; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {paths[name]}
        </svg>
    );
}