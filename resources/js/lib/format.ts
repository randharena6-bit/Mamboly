/**
 * Formatage localisé — français (fr-MG) et Ariary (MGA).
 * Préparé pour remplacer les montants d'exemple par ceux de l'API Laravel.
 */

const numberFormatter = new Intl.NumberFormat('fr-MG', { maximumFractionDigits: 1 });
const compactFormatter = new Intl.NumberFormat('fr-MG', { notation: 'compact', maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    maximumFractionDigits: 0,
});

export function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

export function formatCompact(value: number): string {
    return compactFormatter.format(value);
}

/** Montant en Ariary : 1 250 000 Ar */
export function formatCurrency(value: number): string {
    return `${currencyFormatter.format(value).replace(/ | /g, ' ')} Ar`;
}

/** Montant compact pour les tuiles : 1,3 M Ar */
export function formatCurrencyCompact(value: number): string {
    return `${compactFormatter.format(value)} Ar`;
}

export function formatPercent(value: number, fractionDigits = 1): string {
    return `${value > 0 ? '+' : ''}${value.toFixed(fractionDigits).replace('.', ',')} %`;
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat('fr-MG', options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60000);

    if (diffMinutes < 1) return "à l'instant";
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `il y a ${diffHours} h`;

    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `il y a ${diffDays} j`;

    return formatDate(date);
}

/** Première lettre d'un nom, utilisée pour les avatars sans image. */
export function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}