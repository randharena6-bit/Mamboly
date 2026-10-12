import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Ban,
    CalendarCheck,
    CalendarClock,
    CalendarRange,
    CircleCheck,
    CircleX,
    CloudRain,
    Droplets,
    HandCoins,
    MapPinned,
    Package,
    Pause,
    Play,
    Sprout,
    Users,
    Wallet,
    Wheat,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { humanize, StatusBadge } from '../components/app/status-badge';
import type { Option, ResourceConfig, ResourceRow } from './types';

/* ------------------------------------------------------------------ */
/* Helpers de rendu                                                    */
/* ------------------------------------------------------------------ */

const DASH = <span className="text-ink-400">—</span>;

const text = (value: unknown): string | null =>
    value === null || value === undefined || value === '' ? null : String(value);

const raw = (value: unknown): ReactNode => text(value) ?? DASH;

const formatNumber = (value: unknown): ReactNode => {
    if (value === null || value === undefined || value === '') return DASH;

    const parsed = Number(value);

    return Number.isNaN(parsed) ? DASH : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(parsed);
};

const formatDate = (value: unknown): ReactNode => {
    const string = text(value);
    if (string === null) return DASH;

    const [year, month, day] = string.slice(0, 10).split('-');

    return day && month && year ? `${day}/${month}/${year}` : string;
};

const formatDateTime = (value: unknown): ReactNode => {
    const string = text(value);
    if (string === null) return DASH;

    return string.slice(0, 16).replace('T', ' ');
};

const relationLabel = (row: ResourceRow, relation: string, foreignKey: string): ReactNode => {
    const related = row[relation];

    if (related && typeof related === 'object') {
        const record = related as Record<string, unknown>;
        const label = text(record.name) ?? text(record.code) ?? text(record.product);
        if (label !== null) return label;
    }

    return text(row[foreignKey]) ?? DASH;
};

const quantityWithUnit = (row: ResourceRow, quantityKey: string, unitKey: string): ReactNode => {
    if (!has(row, quantityKey)) return DASH;

    const unit = text(row[unitKey]);

    return `${formatNumberToString(row[quantityKey])}${unit ? ` ${unit}` : ''}`;
};

const formatNumberToString = (value: unknown): string =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value));

const has = (row: ResourceRow, key: string): boolean =>
    row[key] !== null && row[key] !== undefined && row[key] !== '';

const statusEquals = (row: ResourceRow, ...values: string[]): boolean => values.includes(String(row.status));

/* ------------------------------------------------------------------ */
/* Énumérations (miroir des ENUM PostgreSQL)                           */
/* ------------------------------------------------------------------ */

const options = (values: string[]): Option[] => values.map((value) => ({ value, label: humanize(value) }));

const AREA_UNITS: Option[] = [
    { value: 'm2', label: 'mètres carrés (m²)' },
    { value: 'ha', label: 'hectares (ha)' },
];

const WATER_UNITS: Option[] = [
    { value: 'L', label: 'litres (L)' },
    { value: 'm3', label: 'mètres cubes (m³)' },
];

const PLOT_STATUS = options(['disponible', 'en_culture', 'en_repos', 'indisponible']);
const PRIORITY = options(['faible', 'normale', 'elevee', 'critique']);
const CROP_STATUS = options(['actif', 'inactif']);
const CAMPAIGN_STATUS = options(['planifiee', 'active', 'suspendue', 'terminee', 'annulee']);
const WATER_SOURCE_TYPES = options(['puits', 'citerne', 'bassin', 'reservoir', 'canal', 'riviere', 'reserve_pluie']);
const WATER_SOURCE_STATUS = options(['active', 'maintenance', 'indisponible']);
const IRRIGATION_STATUS = options([
    'brouillon',
    'planifiee',
    'en_attente_validation',
    'validee',
    'realisee',
    'annulee',
    'refusee',
]);
const IRRIGATION_METHODS = options([
    'arrosage_manuel',
    'goutte_a_goutte',
    'aspersion',
    'gravitaire',
    'tuyau',
    'pompe',
    'autre',
]);
const SCHEDULE_STATUS = options(['planifiee', 'realisee', 'reportee', 'annulee']);
const ACTIVITY_TYPES = options([
    'preparation_sol',
    'semis',
    'repiquage',
    'fertilisation',
    'traitement',
    'desherbage',
    'irrigation',
    'entretien',
    'recolte',
    'observation',
    'nettoyage',
    'autre',
]);
const INPUT_CATEGORIES = options([
    'semence',
    'engrais',
    'compost',
    'produit_phytosanitaire',
    'carburant',
    'consommable',
    'tuyau',
    'piece_pompe',
    'traitement_eau',
]);
const INPUT_STATUS = options(['actif', 'inactif']);
const EXPENSE_CATEGORIES = options([
    'semences',
    'engrais',
    'carburant',
    'reparation_pompe',
    'materiel',
    'main_oeuvre',
    'transport',
    'energie_electrique',
    'achat_eau',
    'traitement',
]);
const ROLES: Option[] = [
    { value: 1, label: 'Administrateur' },
    { value: 2, label: 'Responsable' },
    { value: 3, label: 'Agent agricole' },
];

/* ------------------------------------------------------------------ */
/* Champs réutilisables                                                */
/* ------------------------------------------------------------------ */

const quantityField = (label = 'Quantité'): ResourceConfig['fields'][number] => ({
    name: 'quantity',
    label,
    type: 'number',
    required: true,
    step: '0.01',
    min: 0,
});

const campaignField = (required = false): ResourceConfig['fields'][number] => ({
    name: 'campaign_id',
    label: 'Campagne',
    type: 'select',
    optionsFrom: 'campaigns',
    required,
});

const noteField: ResourceConfig['fields'][number] = {
    name: 'note',
    label: 'Note',
    type: 'textarea',
    full: true,
    placeholder: 'Précision facultative…',
};

/* ------------------------------------------------------------------ */
/* Ressources                                                          */
/* ------------------------------------------------------------------ */

export const resourceConfigs: Record<string, ResourceConfig> = {
    plots: {
        module: 'plots',
        title: 'Parcelles',
        singular: 'une parcelle',
        description: 'Le parcellaire de votre exploitation : surfaces, sols et priorités d’irrigation.',
        endpoint: '/parcelles',
        icon: MapPinned,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher par code, nom, sol…',
        deleteWarning:
            'La parcelle sera supprimée. Les campagnes et activités qui lui sont rattachées bloqueront la suppression.',
        columns: [
            { key: 'code', label: 'Code', sortable: true },
            { key: 'name', label: 'Nom', sortable: true },
            {
                key: 'area',
                label: 'Surface',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.area),
                render: (row) => `${formatNumberToString(row.area)} ${text(row.area_unit) ?? ''}`.trim(),
            },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
            {
                key: 'manual_priority',
                label: 'Priorité',
                render: (row) => <StatusBadge value={String(row.manual_priority)} />,
            },
            {
                key: 'soil_moisture',
                label: 'Humidité',
                align: 'right',
                render: (row) => (has(row, 'soil_moisture') ? `${formatNumberToString(row.soil_moisture)} %` : DASH),
            },
            { key: 'location', label: 'Localisation', hideOnMobile: true },
        ],
        fields: [
            { name: 'code', label: 'Code', required: true, placeholder: 'P-01' },
            { name: 'name', label: 'Nom', required: true, placeholder: 'Parcelle riz bas-fond' },
            { name: 'area', label: 'Surface', type: 'number', required: true, step: '0.01', min: 0 },
            { name: 'area_unit', label: 'Unité de surface', type: 'select', required: true, options: AREA_UNITS, default: 'm2' },
            { name: 'location', label: 'Localisation', placeholder: 'Village, secteur…' },
            { name: 'soil_type', label: 'Type de sol', placeholder: 'limono-argileux…' },
            { name: 'status', label: 'Statut', type: 'select', options: PLOT_STATUS, default: 'disponible' },
            { name: 'manual_priority', label: 'Priorité manuelle', type: 'select', options: PRIORITY, default: 'normale' },
            {
                name: 'soil_moisture',
                label: 'Humidité du sol (%)',
                type: 'number',
                min: 0,
                max: 100,
                step: '0.01',
                hint: 'Entre 0 et 100.',
            },
        ],
    },

    crops: {
        module: 'crops',
        title: 'Cultures',
        singular: 'une culture',
        description: 'Catalogue des cultures et de leurs besoins, partagé par toutes les exploitations.',
        endpoint: '/cultures',
        icon: Sprout,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une culture…',
        columns: [
            { key: 'name', label: 'Culture', sortable: true },
            { key: 'category', label: 'Catégorie', render: (row) => humanize(String(row.category)) },
            {
                key: 'estimated_duration_days',
                label: 'Durée',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.estimated_duration_days),
                render: (row) => `${text(row.estimated_duration_days) ?? '—'} j`,
            },
            {
                key: 'water_requirement',
                label: 'Besoin en eau',
                align: 'right',
                render: (row) => formatNumber(row.water_requirement),
            },
            { key: 'production_unit', label: 'Unité', hideOnMobile: true },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
        ],
        fields: [
            { name: 'name', label: 'Nom', required: true, placeholder: 'Riz' },
            { name: 'category', label: 'Catégorie', required: true, placeholder: 'céréale, légume…' },
            { name: 'estimated_duration_days', label: 'Durée estimée (jours)', type: 'number', required: true, min: 1 },
            {
                name: 'water_requirement',
                label: 'Besoin en eau',
                type: 'number',
                required: true,
                min: 0,
                step: '0.01',
                hint: 'Volume d’eau par unité de surface.',
            },
            { name: 'production_unit', label: 'Unité de production', required: true, default: 'kg', placeholder: 'kg, t…' },
            { name: 'status', label: 'Statut', type: 'select', options: CROP_STATUS, default: 'actif' },
        ],
    },

    campaigns: {
        module: 'campaigns',
        title: 'Campagnes',
        singular: 'une campagne',
        description: 'Campagnes agricoles : une culture conduite sur une parcelle pour une période donnée.',
        endpoint: '/campagnes',
        icon: CalendarRange,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une campagne…',
        deleteWarning:
            'La campagne sera supprimée. Les récoltes, irrigations et planifications qui y sont rattachées bloqueront l’opération.',
        rowActions: [
            {
                label: 'Activer',
                icon: Play,
                method: 'post',
                path: (row) => `/campagnes/${row.id}/activer`,
                visible: (row) => statusEquals(row, 'planifiee', 'suspendue'),
            },
            {
                label: 'Suspendre',
                icon: Pause,
                method: 'post',
                path: (row) => `/campagnes/${row.id}/suspendre`,
                visible: (row) => statusEquals(row, 'active'),
            },
            {
                label: 'Clôturer',
                icon: CircleCheck,
                method: 'post',
                path: (row) => `/campagnes/${row.id}/cloturer`,
                confirmTitle: 'Clôturer la campagne ?',
                confirmDescription: 'La campagne passera au statut « Terminée » et ne pourra plus être modifiée.',
                visible: (row) => statusEquals(row, 'active'),
            },
            {
                label: 'Annuler',
                icon: Ban,
                method: 'post',
                variant: 'danger',
                path: (row) => `/campagnes/${row.id}/annuler`,
                confirmTitle: 'Annuler la campagne ?',
                confirmDescription: 'Cette action est définitive.',
                visible: (row) => !statusEquals(row, 'terminee', 'annulee'),
            },
        ],
        columns: [
            { key: 'name', label: 'Campagne', sortable: true },
            { key: 'code', label: 'Code', hideOnMobile: true },
            { key: 'plot_id', label: 'Parcelle', render: (row) => relationLabel(row, 'plot', 'plot_id') },
            { key: 'crop_id', label: 'Culture', render: (row) => relationLabel(row, 'crop', 'crop_id') },
            { key: 'start_date', label: 'Début', render: (row) => formatDate(row.start_date) },
            { key: 'expected_end_date', label: 'Fin prévue', render: (row) => formatDate(row.expected_end_date) },
            {
                key: 'area',
                label: 'Surface',
                align: 'right',
                render: (row) => formatNumber(row.area),
            },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
        ],
        fields: [
            { name: 'plot_id', label: 'Parcelle', type: 'select', required: true, optionsFrom: 'plots' },
            { name: 'crop_id', label: 'Culture', type: 'select', required: true, optionsFrom: 'crops' },
            { name: 'manager_id', label: 'Responsable', type: 'select', optionsFrom: 'users' },
            { name: 'code', label: 'Code', placeholder: 'CMP-2026-01' },
            { name: 'name', label: 'Nom', required: true },
            { name: 'start_date', label: 'Date de début', type: 'date', required: true },
            { name: 'expected_end_date', label: 'Fin prévue', type: 'date', required: true },
            { name: 'actual_end_date', label: 'Fin réelle', type: 'date' },
            { name: 'area', label: 'Surface cultivée', type: 'number', required: true, step: '0.01', min: 0 },
            { name: 'status', label: 'Statut', type: 'select', options: CAMPAIGN_STATUS, default: 'planifiee' },
            { name: 'notes', label: 'Notes', type: 'textarea', full: true },
        ],
    },

    inputs: {
        module: 'inputs',
        title: 'Intrants & stocks',
        singular: 'un intrant',
        description: 'Semences, engrais, carburant : niveaux de stock et seuils d’alerte.',
        endpoint: '/intrants',
        icon: Package,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher un intrant…',
        deleteWarning:
            'L’intrant sera supprimé. Les mouvements de stock associés bloqueront la suppression.',
        rowActions: [
            {
                label: 'Entrée de stock',
                icon: ArrowDownToLine,
                method: 'post',
                path: () => '/mouvements-stock',
                dialog: {
                    title: 'Entrée de stock',
                    description: 'Ajouter une quantité à l’intrant sélectionné.',
                    fixed: (row) => ({ input_id: row.id, type: 'entree' }),
                    fields: [quantityField(), campaignField(), noteField],
                },
            },
            {
                label: 'Sortie de stock',
                icon: ArrowUpFromLine,
                method: 'post',
                variant: 'danger',
                path: () => '/mouvements-stock',
                dialog: {
                    title: 'Sortie de stock',
                    description: 'Retirer une quantité de l’intrant sélectionné.',
                    fixed: (row) => ({ input_id: row.id, type: 'sortie' }),
                    fields: [quantityField(), campaignField(), noteField],
                },
            },
        ],
        columns: [
            { key: 'name', label: 'Intrant', sortable: true },
            { key: 'category', label: 'Catégorie', render: (row) => <StatusBadge value={String(row.category)} /> },
            {
                key: 'available_quantity',
                label: 'Disponible',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.available_quantity),
                render: (row) => quantityWithUnit(row, 'available_quantity', 'unit'),
            },
            {
                key: 'minimum_threshold',
                label: 'Seuil',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'minimum_threshold', 'unit'),
            },
            {
                key: 'unit_price',
                label: 'Prix unitaire',
                align: 'right',
                render: (row) => formatNumber(row.unit_price),
            },
            { key: 'supplier', label: 'Fournisseur', hideOnMobile: true },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
        ],
        fields: [
            { name: 'name', label: 'Nom', required: true, placeholder: 'Engrais NPK' },
            { name: 'category', label: 'Catégorie', type: 'select', required: true, options: INPUT_CATEGORIES },
            { name: 'unit', label: 'Unité', required: true, default: 'kg', placeholder: 'kg, L, sac…' },
            {
                name: 'minimum_threshold',
                label: 'Seuil d’alerte',
                type: 'number',
                min: 0,
                step: '0.01',
                hint: 'Une alerte est levée sous ce niveau.',
            },
            { name: 'unit_price', label: 'Prix unitaire', type: 'number', min: 0, step: '0.01' },
            { name: 'supplier', label: 'Fournisseur' },
            { name: 'status', label: 'Statut', type: 'select', options: INPUT_STATUS, default: 'actif' },
            {
                name: 'initial_quantity',
                label: 'Stock initial',
                type: 'number',
                min: 0,
                step: '0.01',
                createOnly: true,
                hint: 'Enregistré comme une entrée de stock traçable.',
            },
        ],
    },

    activities: {
        module: 'activities',
        title: 'Activités',
        singular: 'une activité',
        description: 'Journal des travaux réalisés sur vos parcelles.',
        endpoint: '/activites',
        icon: CalendarCheck,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une activité…',
        columns: [
            { key: 'type', label: 'Type', render: (row) => humanize(String(row.type)) },
            { key: 'activity_date', label: 'Date', sortable: true, render: (row) => formatDate(row.activity_date) },
            { key: 'plot_id', label: 'Parcelle', render: (row) => relationLabel(row, 'plot', 'plot_id') },
            { key: 'campaign_id', label: 'Campagne', render: (row) => relationLabel(row, 'campaign', 'campaign_id') },
            {
                key: 'cost',
                label: 'Coût',
                align: 'right',
                render: (row) => formatNumber(row.cost),
            },
            { key: 'description', label: 'Description', hideOnMobile: true },
        ],
        fields: [
            { name: 'plot_id', label: 'Parcelle', type: 'select', required: true, optionsFrom: 'plots' },
            campaignField(),
            { name: 'type', label: 'Type', type: 'select', required: true, options: ACTIVITY_TYPES },
            { name: 'activity_date', label: 'Date', type: 'date', required: true },
            { name: 'cost', label: 'Coût', type: 'number', min: 0, step: '0.01' },
            { name: 'description', label: 'Description', type: 'textarea', full: true },
        ],
    },

    harvests: {
        module: 'harvests',
        title: 'Récoltes',
        singular: 'une récolte',
        description: 'Récoltes enregistrées par campagne, avec pertes et qualité.',
        endpoint: '/recoltes',
        icon: Wheat,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher par produit…',
        columns: [
            { key: 'product', label: 'Produit', sortable: true },
            { key: 'harvest_date', label: 'Date', sortable: true, render: (row) => formatDate(row.harvest_date) },
            { key: 'campaign_id', label: 'Campagne', render: (row) => relationLabel(row, 'campaign', 'campaign_id') },
            { key: 'plot_id', label: 'Parcelle', render: (row) => relationLabel(row, 'plot', 'plot_id') },
            {
                key: 'quantity',
                label: 'Quantité',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'quantity', 'unit'),
            },
            { key: 'quality', label: 'Qualité', hideOnMobile: true },
            {
                key: 'loss_quantity',
                label: 'Pertes',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'loss_quantity', 'unit'),
            },
        ],
        fields: [
            { name: 'campaign_id', label: 'Campagne', type: 'select', required: true, optionsFrom: 'campaigns' },
            { name: 'plot_id', label: 'Parcelle', type: 'select', required: true, optionsFrom: 'plots' },
            { name: 'product', label: 'Produit', required: true, placeholder: 'Riz blanc' },
            { name: 'harvest_date', label: 'Date de récolte', type: 'date', required: true },
            { name: 'quantity', label: 'Quantité récoltée', type: 'number', required: true, step: '0.01', min: 0 },
            { name: 'unit', label: 'Unité', required: true, default: 'kg' },
            { name: 'quality', label: 'Qualité', placeholder: 'extra, première…' },
            { name: 'loss_quantity', label: 'Pertes', type: 'number', min: 0, step: '0.01', hint: 'Inférieur à la quantité récoltée.' },
            { name: 'observation', label: 'Observation', type: 'textarea', full: true },
        ],
    },

    expenses: {
        module: 'expenses',
        title: 'Dépenses',
        singular: 'une dépense',
        description: 'Dépenses de l’exploitation, éventuellement rattachées à une campagne.',
        endpoint: '/depenses',
        icon: Wallet,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une dépense…',
        columns: [
            { key: 'category', label: 'Catégorie', render: (row) => humanize(String(row.category)) },
            { key: 'expense_date', label: 'Date', sortable: true, render: (row) => formatDate(row.expense_date) },
            {
                key: 'amount',
                label: 'Montant',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.amount),
                render: (row) => formatNumber(row.amount),
            },
            { key: 'campaign_id', label: 'Campagne', render: (row) => relationLabel(row, 'campaign', 'campaign_id') },
            { key: 'description', label: 'Description', hideOnMobile: true },
        ],
        fields: [
            campaignField(),
            { name: 'expense_date', label: 'Date', type: 'date', required: true },
            { name: 'amount', label: 'Montant', type: 'number', required: true, min: 0, step: '0.01' },
            { name: 'category', label: 'Catégorie', type: 'select', required: true, options: EXPENSE_CATEGORIES },
            { name: 'description', label: 'Description', type: 'textarea', full: true },
            { name: 'receipt_path', label: 'Référence du justificatif', placeholder: 'N° de reçu, chemin…' },
        ],
    },

    revenues: {
        module: 'revenues',
        title: 'Recettes',
        singular: 'une recette',
        description: 'Ventes et entrées d’argent, rattachées si possible à une récolte.',
        endpoint: '/recettes',
        icon: HandCoins,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une recette…',
        columns: [
            { key: 'product', label: 'Produit', render: (row) => raw(row.product) },
            { key: 'revenue_date', label: 'Date', sortable: true, render: (row) => formatDate(row.revenue_date) },
            {
                key: 'amount',
                label: 'Montant',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.amount),
                render: (row) => formatNumber(row.amount),
            },
            {
                key: 'quantity',
                label: 'Quantité',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'quantity', 'unit'),
            },
            { key: 'client', label: 'Client', hideOnMobile: true },
            { key: 'campaign_id', label: 'Campagne', render: (row) => relationLabel(row, 'campaign', 'campaign_id') },
        ],
        fields: [
            campaignField(),
            { name: 'harvest_id', label: 'Récolte', type: 'select', optionsFrom: 'harvests' },
            { name: 'revenue_date', label: 'Date', type: 'date', required: true },
            { name: 'amount', label: 'Montant', type: 'number', required: true, min: 0, step: '0.01' },
            { name: 'product', label: 'Produit' },
            { name: 'quantity', label: 'Quantité vendue', type: 'number', min: 0, step: '0.01' },
            { name: 'unit', label: 'Unité' },
            { name: 'client', label: 'Client' },
            { name: 'comment', label: 'Commentaire', type: 'textarea', full: true },
        ],
    },

    'water-sources': {
        module: 'water-sources',
        title: 'Ressources en eau',
        singular: 'une ressource en eau',
        description: 'Puits, citernes et bassins : capacité et niveau d’eau disponible.',
        endpoint: '/ressources-eau',
        icon: Droplets,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une ressource…',
        deleteWarning:
            'La ressource sera supprimée. Les irrigations et planifications qui l’utilisent bloqueront l’opération.',
        rowActions: [
            {
                label: 'Remplir',
                icon: ArrowDownToLine,
                method: 'post',
                path: () => '/mouvements-eau',
                dialog: {
                    title: 'Remplissage',
                    description: 'Ajouter de l’eau à la ressource sélectionnée.',
                    fixed: (row) => ({ water_source_id: row.id, type: 'remplissage' }),
                    fields: [quantityField('Quantité à ajouter'), noteField],
                },
            },
            {
                label: 'Retirer',
                icon: ArrowUpFromLine,
                method: 'post',
                variant: 'danger',
                path: () => '/mouvements-eau',
                dialog: {
                    title: 'Retrait d’eau',
                    description: 'Enregistrer une perte ou un retrait manuel.',
                    fixed: (row) => ({ water_source_id: row.id, type: 'perte' }),
                    fields: [quantityField('Quantité à retirer'), noteField],
                },
            },
        ],
        columns: [
            { key: 'name', label: 'Ressource', sortable: true },
            { key: 'type', label: 'Type', render: (row) => humanize(String(row.type)) },
            {
                key: 'available_quantity',
                label: 'Disponible',
                align: 'right',
                sortable: true,
                sortValue: (row) => Number(row.available_quantity),
                render: (row) =>
                    `${formatNumberToString(row.available_quantity)} / ${formatNumberToString(row.capacity)} ${
                        text(row.unit) ?? ''
                    }`.trim(),
            },
            {
                key: 'critical_threshold',
                label: 'Seuil critique',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'critical_threshold', 'unit'),
            },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
            { key: 'location', label: 'Localisation', hideOnMobile: true },
        ],
        fields: [
            { name: 'name', label: 'Nom', required: true, placeholder: 'Citerne principale' },
            { name: 'type', label: 'Type', type: 'select', required: true, options: WATER_SOURCE_TYPES },
            { name: 'capacity', label: 'Capacité', type: 'number', required: true, min: 0, step: '0.01' },
            { name: 'unit', label: 'Unité', type: 'select', options: WATER_UNITS, default: 'L' },
            {
                name: 'critical_threshold',
                label: 'Seuil critique',
                type: 'number',
                min: 0,
                step: '0.01',
                hint: 'Une alerte est levée sous ce niveau.',
            },
            { name: 'location', label: 'Localisation' },
            { name: 'status', label: 'Statut', type: 'select', options: WATER_SOURCE_STATUS, default: 'active' },
        ],
    },

    irrigations: {
        module: 'irrigations',
        title: 'Irrigations',
        singular: 'une irrigation',
        description: 'Séances d’irrigation réalisées et leur consommation d’eau.',
        endpoint: '/irrigations',
        icon: CloudRain,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une irrigation…',
        deleteWarning:
            'L’irrigation sera supprimée et l’eau consommée sera restituée au stock de la ressource.',
        rowActions: [
            {
                label: 'Valider',
                icon: CircleCheck,
                method: 'post',
                path: (row) => `/irrigations/${row.id}/valider`,
                confirmTitle: 'Valider cette irrigation ?',
                visible: (row) => statusEquals(row, 'en_attente_validation'),
            },
            {
                label: 'Refuser',
                icon: CircleX,
                method: 'post',
                variant: 'danger',
                path: (row) => `/irrigations/${row.id}/refuser`,
                confirmTitle: 'Refuser cette irrigation ?',
                visible: (row) => statusEquals(row, 'en_attente_validation'),
            },
            {
                label: 'Annuler',
                icon: Ban,
                method: 'post',
                variant: 'danger',
                path: (row) => `/irrigations/${row.id}/annuler`,
                confirmTitle: 'Annuler cette irrigation ?',
                visible: (row) => statusEquals(row, 'brouillon', 'planifiee', 'en_attente_validation'),
            },
        ],
        columns: [
            { key: 'performed_at', label: 'Réalisée le', sortable: true, render: (row) => formatDateTime(row.performed_at) },
            { key: 'campaign_id', label: 'Campagne', render: (row) => relationLabel(row, 'campaign', 'campaign_id') },
            { key: 'plot_id', label: 'Parcelle', render: (row) => relationLabel(row, 'plot', 'plot_id') },
            {
                key: 'water_source_id',
                label: 'Ressource',
                render: (row) => relationLabel(row, 'waterSource', 'water_source_id'),
            },
            {
                key: 'quantity',
                label: 'Quantité',
                align: 'right',
                render: (row) => quantityWithUnit(row, 'quantity', 'unit'),
            },
            { key: 'method', label: 'Méthode', hideOnMobile: true, render: (row) => humanize(String(row.method)) },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
        ],
        fields: [
            { name: 'campaign_id', label: 'Campagne', type: 'select', required: true, optionsFrom: 'campaigns' },
            { name: 'plot_id', label: 'Parcelle', type: 'select', required: true, optionsFrom: 'plots' },
            { name: 'water_source_id', label: 'Ressource en eau', type: 'select', required: true, optionsFrom: 'waterSources' },
            { name: 'quantity', label: 'Quantité d’eau', type: 'number', required: true, step: '0.01', min: 0 },
            { name: 'unit', label: 'Unité', type: 'select', options: WATER_UNITS, default: 'L' },
            { name: 'method', label: 'Méthode', type: 'select', required: true, options: IRRIGATION_METHODS },
            { name: 'duration_minutes', label: 'Durée (minutes)', type: 'number', min: 1 },
            { name: 'status', label: 'Statut', type: 'select', options: IRRIGATION_STATUS, default: 'brouillon' },
            { name: 'performed_at', label: 'Réalisée le', type: 'datetime' },
            { name: 'scheduled_at', label: 'Prévue le', type: 'datetime' },
            { name: 'observation', label: 'Observation', type: 'textarea', full: true },
        ],
    },

    schedules: {
        module: 'schedules',
        title: 'Planifications',
        singular: 'une planification',
        description: 'Intentions d’irrigation à venir, sans effet sur le stock d’eau tant qu’elles ne sont pas réalisées.',
        endpoint: '/planifications',
        icon: CalendarClock,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher une planification…',
        columns: [
            { key: 'scheduled_date', label: 'Date', sortable: true, render: (row) => formatDate(row.scheduled_date) },
            { key: 'scheduled_time', label: 'Heure', render: (row) => raw(row.scheduled_time) },
            { key: 'plot_id', label: 'Parcelle', render: (row) => relationLabel(row, 'plot', 'plot_id') },
            { key: 'agent_id', label: 'Agent', render: (row) => relationLabel(row, 'agent', 'agent_id') },
            {
                key: 'estimated_quantity',
                label: 'Quantité prévue',
                align: 'right',
                render: (row) => formatNumber(row.estimated_quantity),
            },
            { key: 'priority', label: 'Priorité', render: (row) => <StatusBadge value={String(row.priority)} /> },
            { key: 'status', label: 'Statut', render: (row) => <StatusBadge value={String(row.status)} /> },
        ],
        fields: [
            { name: 'campaign_id', label: 'Campagne', type: 'select', required: true, optionsFrom: 'campaigns' },
            { name: 'plot_id', label: 'Parcelle', type: 'select', required: true, optionsFrom: 'plots' },
            { name: 'water_source_id', label: 'Ressource en eau', type: 'select', required: true, optionsFrom: 'waterSources' },
            { name: 'agent_id', label: 'Agent', type: 'select', required: true, optionsFrom: 'users' },
            { name: 'scheduled_date', label: 'Date prévue', type: 'date', required: true },
            {
                name: 'scheduled_time',
                label: 'Heure prévue',
                placeholder: '06:30',
                hint: 'Format 24 h, ex. 06:30.',
            },
            { name: 'estimated_quantity', label: 'Quantité estimée', type: 'number', required: true, step: '0.01', min: 0 },
            { name: 'priority', label: 'Priorité', type: 'select', options: PRIORITY, default: 'normale' },
            { name: 'status', label: 'Statut', type: 'select', options: SCHEDULE_STATUS, default: 'planifiee' },
            { name: 'comment', label: 'Commentaire', type: 'textarea', full: true },
        ],
    },

    users: {
        module: 'users',
        title: 'Comptes',
        singular: 'un compte',
        description: 'Comptes rattachés à l’exploitation et leurs rôles.',
        endpoint: '/comptes',
        icon: Users,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        searchPlaceholder: 'Rechercher un compte…',
        deleteWarning: 'Le compte sera désactivé (il ne pourra plus se connecter), pas supprimé.',
        columns: [
            { key: 'name', label: 'Nom', sortable: true },
            { key: 'email', label: 'E-mail' },
            { key: 'phone', label: 'Téléphone', hideOnMobile: true },
            { key: 'role_id', label: 'Rôle', render: (row) => relationLabel(row, 'role', 'role_id') },
            {
                key: 'is_active',
                label: 'Statut',
                render: (row) => <StatusBadge value={row.is_active ? 'active' : 'inactive'} />,
            },
        ],
        fields: [
            { name: 'name', label: 'Nom complet', required: true },
            { name: 'email', label: 'E-mail', type: 'text', required: true, placeholder: 'nom@exemple.mg' },
            {
                name: 'password',
                label: 'Mot de passe',
                type: 'password',
                requiredOnCreate: true,
                hint: '8 caractères minimum. Laisser vide pour ne pas modifier.',
            },
            { name: 'phone', label: 'Téléphone', placeholder: '+261 …' },
            { name: 'role_id', label: 'Rôle', type: 'select', required: true, options: ROLES },
            { name: 'is_active', label: 'Compte actif', type: 'checkbox', default: true },
        ],
    },
};
