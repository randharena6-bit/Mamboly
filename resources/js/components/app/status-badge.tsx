import { Badge, type BadgeProps } from '../ui/badge';

/**
 * Badge d'état : le libellé est toujours affiché en toutes lettres (l'état ne
 * repose jamais sur la seule couleur) et le ton reste cohérent d'une page à
 * l'autre.
 */

const VARIANTS: Record<string, BadgeProps['variant']> = {
    // États actifs / positifs
    active: 'success',
    actif: 'success',
    validee: 'success',
    realisee: 'success',
    disponible: 'success',
    normal: 'success',
    normale: 'success',
    // États d'alerte
    suspendue: 'warning',
    suspendu: 'warning',
    en_attente_validation: 'warning',
    planifiee: 'warning',
    en_repos: 'warning',
    maintenance: 'warning',
    avertissement: 'warning',
    faible: 'warning',
    reportee: 'warning',
    // États critiques / négatifs
    critique: 'danger',
    indisponible: 'danger',
    inactive: 'danger',
    inactif: 'danger',
    annulee: 'danger',
    refuse: 'danger',
    refusee: 'danger',
    // Information
    info: 'water',
    en_culture: 'brand',
    brouillon: 'outline',
    terminee: 'outline',
    elevee: 'danger',
    puits: 'water',
    citerne: 'water',
    bassin: 'water',
    reservoir: 'water',
    canal: 'water',
    riviere: 'water',
    reserve_pluie: 'water',
    // Catégories d'intrants
    semence: 'brand',
    engrais: 'success',
    carburant: 'warning',
    materiel: 'outline',
};

const LABELS: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspendue: 'Suspendue',
    actif: 'Actif',
    inactif: 'Inactif',
    disponible: 'Disponible',
    en_culture: 'En culture',
    en_repos: 'En repos',
    indisponible: 'Indisponible',
    maintenance: 'Maintenance',
    planifiee: 'Planifiée',
    en_attente_validation: 'En attente',
    validee: 'Validée',
    realisee: 'Réalisée',
    annulee: 'Annulée',
    refusee: 'Refusée',
    reportee: 'Reportée',
    terminee: 'Terminée',
    brouillon: 'Brouillon',
    faible: 'Faible',
    normale: 'Normale',
    elevee: 'Élevée',
    critique: 'Critique',
    info: 'Information',
    avertissement: 'Avertissement',
    puits: 'Puits',
    citerne: 'Citerne',
    bassin: 'Bassin',
    reservoir: 'Réservoir',
    canal: 'Canal',
    riviere: 'Rivière',
    reserve_pluie: 'Réserve de pluie',
};

export function humanize(value: string): string {
    return LABELS[value] ?? value.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
    if (value === null || value === undefined || value === '') {
        return <span className="text-ink-400">—</span>;
    }

    return <Badge variant={VARIANTS[value] ?? 'outline'}>{humanize(value)}</Badge>;
}
