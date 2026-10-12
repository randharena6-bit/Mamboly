<?php

/**
 * Paramètres métier AgriWater.
 *
 * Les seuils sont lus côté application (validation, services) et propagés à
 * PostgreSQL via `set_config('agriwater.*', …)` pour que les déclencheurs
 * partagent la même règle que le code (RM-10).
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Seuil de validation responsable (RM-10, CDC § 7)
    |--------------------------------------------------------------------------
    |
    | Toute irrigation dont la quantité dépasse ce seuil, exprimée dans
    | l'unité de la ressource (litres par défaut), doit être validée par un
    | responsable. Le déclencheur `agriwater_check_manager_validation` applique
    | la même valeur.
    |
    */
    'manager_validation_threshold' => (float) env('AGRIWATER_MANAGER_THRESHOLD', 2000),

    /*
    |--------------------------------------------------------------------------
    | Pondérations du score de priorité d'irrigation (CDC § 6.10)
    |--------------------------------------------------------------------------
    |
    | Répliquées par la vue `v_irrigation_priority`. Elles servent au calcul
    | applicatif lorsque la vue n'est pas disponible.
    |
    */
    'priority' => [
        'days_weight' => 4,
        'moisture_reference' => 30,
        'soil_moisture_risk' => 25.0,
    ],

    /*
    |--------------------------------------------------------------------------
    | Profondeur d'historique des mouvements renvoyés par l'API
    |--------------------------------------------------------------------------
    */
    'recent_movement_days' => 30,

];
