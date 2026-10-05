import type { ReactNode } from 'react';

/** Bandeau d'erreur global, pour les échecs non rattachés à un champ. */
export function FormAlert({ children }: { children: ReactNode }) {
    if (!children) return null;

    return (
        <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
            {children}
        </div>
    );
}
