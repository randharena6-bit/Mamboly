import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ResourceRow = Record<string, unknown>;

export type Option = { value: string | number; label: string };

export type FieldType =
    | 'text'
    | 'number'
    | 'date'
    | 'datetime'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'password'
    | 'json';

/** Source de liste déroulante chargée à l'ouverture de la page. */
export type OptionSourceKey =
    | 'plots'
    | 'crops'
    | 'campaigns'
    | 'waterSources'
    | 'users'
    | 'harvests'
    | 'inputs';

export type FieldDef = {
    name: string;
    label: string;
    type?: FieldType;
    required?: boolean;
    /** Options figées (énumérations). */
    options?: Option[];
    /** Options chargées depuis une autre ressource. */
    optionsFrom?: OptionSourceKey;
    placeholder?: string;
    hint?: string;
    step?: string;
    min?: number;
    max?: number;
    /** Champ proposé uniquement à la création (ex. quantité initiale). */
    createOnly?: boolean;
    /** Champ obligatoire seulement à la création (ex. mot de passe). */
    requiredOnCreate?: boolean;
    /** Champ proposé uniquement à la modification. */
    editOnly?: boolean;
    /** Occupe toute la largeur de la grille du formulaire. */
    full?: boolean;
    default?: string | number | boolean;
};

export type ColumnDef<T extends ResourceRow = ResourceRow> = {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
    align?: 'left' | 'right';
    sortable?: boolean;
    sortValue?: (row: T) => string | number;
    className?: string;
    /** Colonnes masquées sur mobile (la carte reprend l'essentiel). */
    hideOnMobile?: boolean;
};

/** Formulaire modal déclenché par une action de ligne (mouvement de stock/eau). */
export type RowActionDialog = {
    title: string;
    description?: string;
    fields: FieldDef[];
    /** Champs fixés à partir de la ligne (identifiant, sens du mouvement…). */
    fixed: (row: ResourceRow) => Record<string, unknown>;
};

export type RowAction<T extends ResourceRow = ResourceRow> = {
    label: string;
    icon?: LucideIcon;
    method: 'post' | 'patch';
    path: (row: T) => string;
    confirmTitle?: string;
    confirmDescription?: string;
    variant?: 'primary' | 'danger' | 'outline';
    /** N'affiche l'action que si la condition est vraie. */
    visible?: (row: T) => boolean;
    /** Ouvre un formulaire au lieu d'appeler directement l'API. */
    dialog?: RowActionDialog;
};

export type ResourceConfig<T extends ResourceRow = ResourceRow> = {
    module: string;
    title: string;
    singular: string;
    description: string;
    endpoint: string;
    icon: LucideIcon;
    columns: ColumnDef<T>[];
    fields: FieldDef[];
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    deleteLabel?: string;
    deleteWarning?: string;
    rowActions?: RowAction<T>[];
    searchPlaceholder?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    views?: ResourceView[];
};

export type ResourceView = {
    id: string;
    label: string;
    render: (props: { rows: ResourceRow[]; context: any }) => ReactNode;
    disabled?: boolean;
};
