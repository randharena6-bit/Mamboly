Cahier des charges — AgriWater
1. Présentation du projet
1.1 Intitulé

AgriWater — Plateforme SaaS de gestion de l’irrigation, des ressources en eau et des campagnes maraîchères.
1.2 Type de projet

    Application Web développée avec Laravel / PHP.

    Projet individuel de Licence 3 Systèmes d’Information et Organisation.

    Application de type SaaS multi-exploitations.

    Domaine agricole : maraîchage, avec possibilité d’adapter l’application à la riziculture.

    Module spécialisé : gestion de l’irrigation.

    Contrainte métier principale : la quantité d’eau disponible est limitée et ne doit jamais devenir négative.

1.3 Contexte

Dans de nombreuses exploitations maraîchères, le suivi de l’eau d’irrigation est encore réalisé sur papier, de mémoire, ou dans plusieurs cahiers. Les responsables connaissent difficilement :

    la quantité d’eau réellement disponible ;

    les parcelles qui ont déjà été irriguées ;

    les parcelles prioritaires ;

    le volume d’eau consommé par culture ;

    les coûts liés à l’irrigation ;

    les périodes où les réserves deviennent critiques ;

    les personnes ayant effectué les opérations.

Cette situation peut provoquer des erreurs de planification, le gaspillage de l’eau, des conflits entre utilisateurs, une diminution du rendement des cultures et des pertes financières.

AgriWater vise à centraliser ces informations dans une application Web sécurisée, permettant à plusieurs exploitations agricoles d’utiliser la même plateforme sans accéder aux données des autres exploitations. Cette exigence d’isolation des données, de gestion des stocks, d’activités, de finances, de sécurité, de transactions et de concurrence est cohérente avec le projet Laravel demandé.
2. Problème à résoudre
2.1 Problème principal

Les exploitations maraîchères disposent souvent de ressources en eau limitées : réservoirs, bassins, puits, citernes, canaux ou points de captage. Sans système de suivi fiable, l’eau peut être consommée sans contrôle précis.

Le responsable peut alors rencontrer les difficultés suivantes :

    une parcelle est trop arrosée alors qu’une autre est prioritaire ;

    l’eau est consommée sans enregistrement ;

    plusieurs agents utilisent simultanément la même réserve ;

    une irrigation est validée alors que l’eau est insuffisante ;

    une campagne agricole ne dispose plus d’eau avant la récolte ;

    le responsable ne connaît pas le coût total de l’irrigation ;

    les données sont dispersées ou perdues.

2.2 Besoin métier

L’exploitation a besoin d’un système permettant de :

    Gérer les exploitations, les utilisateurs et les rôles.

    Enregistrer les parcelles et les cultures.

    Créer et suivre les campagnes agricoles.

    Enregistrer les sources, réserves et mouvements d’eau.

    Planifier les irrigations.

    Enregistrer les séances d’irrigation réellement effectuées.

    Empêcher toute consommation supérieure à l’eau disponible.

    Alerter les responsables lorsque le niveau d’eau devient critique.

    Suivre les coûts, les dépenses et les recettes.

    Produire des indicateurs utiles à la décision.

3. Objectifs
3.1 Objectif général

Concevoir et développer une application Laravel sécurisée et maintenable permettant de gérer l’irrigation, les campagnes agricoles, les ressources en eau, les stocks, les activités et les données financières d’une exploitation maraîchère.
3.2 Objectifs spécifiques

L’application devra permettre de :

    centraliser les données liées aux exploitations agricoles ;

    assurer une gestion fiable de l’eau disponible ;

    réduire le risque de surconsommation ;

    tracer les irrigations réalisées ;

    améliorer la planification des opérations agricoles ;

    produire des alertes en cas de niveau d’eau critique ;

    aider le responsable à décider quelles parcelles irriguer en priorité ;

    calculer des statistiques sur l’eau consommée ;

    suivre les dépenses et recettes de chaque campagne ;

    garantir que chaque exploitation ne consulte que ses propres données ;

    démontrer l’usage des mécanismes avancés de Laravel : Services, Policies, Events, Listeners, Notifications, Jobs, Queues, Cache, API REST, transactions et tests automatisés.

4. Périmètre fonctionnel
4.1 Fonctionnalités incluses

Le périmètre fonctionnel comprend les modules suivants :
Module	Description
Authentification	Connexion, déconnexion, gestion des comptes et protection des routes
Exploitations	Création et administration des exploitations agricoles
Utilisateurs et rôles	Attribution des rôles : administrateur, responsable, agent
Parcelles	Gestion des parcelles maraîchères et de leurs caractéristiques
Cultures	Gestion des types de cultures : tomate, carotte, haricot, pomme de terre, laitue, etc.
Campagnes	Suivi des campagnes de production par parcelle et culture
Ressources en eau	Gestion des puits, citernes, bassins, réservoirs ou canaux
Stocks d’eau	Quantité disponible, seuil critique et historique des mouvements
Irrigation	Planification et validation des séances d’irrigation
Activités agricoles	Semis, fertilisation, traitement, désherbage, récolte, irrigation
Intrants et stocks	Semences, engrais, produits phytosanitaires et consommables
Finances	Dépenses, recettes et calcul de la marge simplifiée
Alertes	Alertes de niveau d’eau bas, stock critique et campagnes à risque
Tableau de bord	Statistiques, indicateurs et activités récentes
API REST	Consultation et création sécurisée de certaines ressources
Module personnel	Système de priorité d’irrigation par parcelle
4.2 Fonctionnalités hors périmètre

Les éléments suivants ne seront pas obligatoires dans la première version :

    pilotage automatique d’une pompe réelle ;

    capteurs IoT réels ;

    paiement en ligne ;

    comptabilité générale complète ;

    connexion directe à une station météo professionnelle ;

    prévision météorologique avancée avec intelligence artificielle ;

    cartographie GPS complexe ou satellite.

Ils peuvent être cités comme perspectives d’évolution.
5. Acteurs et rôles

L’application comportera au minimum trois profils, conformément au sujet fourni.
Acteur	Description	Droits principaux
Administrateur	Gère l’application et supervise les comptes	Gérer utilisateurs, rôles, exploitations, paramètres et journaux
Responsable d’exploitation	Responsable opérationnel d’une exploitation	Gérer parcelles, campagnes, ressources en eau, stocks, finances et tableau de bord
Agent agricole / technicien	Exécute les activités sur le terrain	Enregistrer activités, irrigations, observations et consommations autorisées
5.1 Administrateur

L’administrateur peut :

    créer, modifier, activer et désactiver des comptes ;

    attribuer les rôles ;

    créer ou administrer des exploitations ;

    consulter les journaux d’activité ;

    superviser les alertes ;

    paramétrer certaines valeurs globales ;

    consulter les erreurs importantes enregistrées dans les logs.

5.2 Responsable d’exploitation

Le responsable peut :

    gérer les parcelles de son exploitation ;

    gérer les cultures ;

    créer et clôturer les campagnes ;

    créer les ressources en eau ;

    définir les seuils critiques ;

    ajouter de l’eau dans une réserve ;

    consulter les stocks et mouvements d’eau ;

    planifier les irrigations ;

    valider ou annuler une séance d’irrigation selon ses droits ;

    gérer les dépenses et recettes ;

    consulter les indicateurs financiers ;

    consulter les alertes ;

    consulter les statistiques de consommation.

5.3 Agent agricole

L’agent peut, selon les permissions attribuées :

    consulter les parcelles auxquelles il a accès ;

    consulter les campagnes actives ;

    consulter le planning d’irrigation ;

    enregistrer une activité technique ;

    saisir une séance d’irrigation ;

    enregistrer une observation terrain ;

    déclarer un problème ou une anomalie ;

    consulter les ressources autorisées.

L’agent ne doit pas pouvoir modifier les données d’une autre exploitation ni effectuer des opérations réservées au responsable. La protection ne doit pas seulement reposer sur l’interface : elle doit être assurée côté serveur avec des middlewares et des Policies Laravel.
6. Exigences fonctionnelles
6.1 Gestion des exploitations

Chaque exploitation doit comporter au minimum :

    un identifiant ;

    un nom ;

    une localisation ;

    un type d’exploitation ;

    une superficie totale ;

    un responsable ;

    un statut : active, suspendue ou inactive ;

    une date de création.

Exemple :
Champ	Exemple
Nom	Green Valley Maraîchage
Localisation	Ambohitrimanjaka, Analamanga
Type	Maraîchage
Superficie	2,5 hectares
Responsable	Rakoto Jean
Statut	Active

Toutes les données métier devront être rattachées à une exploitation via farm_id ou exploitation_id.
6.2 Gestion des utilisateurs

L’application doit permettre :

    la création d’un utilisateur ;

    la modification du profil ;

    l’attribution d’un rôle ;

    l’association d’un utilisateur à une exploitation ;

    l’activation ou désactivation d’un compte ;

    la connexion sécurisée ;

    la déconnexion ;

    la réinitialisation du mot de passe si cette fonction est implémentée.

Chaque utilisateur doit appartenir à une exploitation, sauf éventuellement l’administrateur global.
6.3 Gestion des parcelles

Une parcelle représente une unité de production maraîchère.

Chaque parcelle comporte au minimum :

    code unique dans l’exploitation ;

    nom ;

    superficie ;

    unité de superficie : m² ou hectare ;

    localisation ;

    type de sol facultatif ;

    état : disponible, en culture, en repos, indisponible ;

    date de création ;

    exploitation associée.

Exemples de parcelles :
Code	Nom	Superficie	État
P-A01	Parcelle Tomates Nord	800 m²	En culture
P-A02	Parcelle Haricots Est	650 m²	En culture
P-B01	Parcelle Laitues	400 m²	Disponible
6.4 Gestion des cultures

Le responsable doit pouvoir enregistrer les cultures utilisées dans son exploitation.

Une culture contient :

    nom ;

    catégorie ;

    durée estimée de production ;

    besoin en eau estimé ;

    unité de production ;

    statut actif ou inactif.

Exemples :

    tomate ;

    carotte ;

    haricot vert ;

    laitue ;

    pomme de terre ;

    chou ;

    concombre ;

    poivron.

6.5 Gestion des campagnes agricoles

Une campagne représente une production donnée sur une parcelle, pendant une période définie.

Chaque campagne doit contenir :

    code ou référence ;

    nom ;

    parcelle ;

    culture ;

    date de début ;

    date prévisionnelle de fin ;

    date réelle de fin facultative ;

    superficie concernée ;

    statut : planifiée, active, suspendue, terminée, annulée ;

    responsable ;

    notes éventuelles.

Exemple :
Champ	Valeur
Référence	CAMP-TOM-2026-001
Nom	Tomate saison des pluies 2026
Parcelle	Parcelle Tomates Nord
Culture	Tomate
Début	10 octobre 2026
Fin prévisionnelle	10 février 2027
Statut	Active
6.6 Gestion des ressources en eau

Une ressource en eau peut être :

    un puits ;

    une citerne ;

    un bassin ;

    un réservoir ;

    un canal ;

    une rivière ;

    une réserve d’eau de pluie.

Chaque ressource doit contenir :

    nom ;

    type ;

    capacité maximale ;

    quantité disponible ;

    unité : litre ou m³ ;

    seuil critique ;

    localisation ;

    statut : active, maintenance, indisponible ;

    exploitation associée.

Exemple :
Champ	Valeur
Nom	Réservoir principal
Type	Citerne
Capacité maximale	15 000 litres
Quantité disponible	8 500 litres
Seuil critique	2 000 litres
Statut	Active
6.7 Gestion des mouvements d’eau

Chaque modification du niveau d’eau doit être tracée.

Les types de mouvements sont :

    stock initial ;

    remplissage ;

    ajout manuel ;

    consommation par irrigation ;

    perte ;

    ajustement ;

    correction ;

    vidange ;

    transfert entre réservoirs, si cette fonction est ajoutée.

Un mouvement doit contenir :

    ressource en eau concernée ;

    type de mouvement ;

    quantité ;

    quantité avant mouvement ;

    quantité après mouvement ;

    date et heure ;

    utilisateur responsable ;

    commentaire ;

    campagne liée, lorsque le mouvement provient d’une irrigation.

6.8 Gestion de l’irrigation

Le module d’irrigation est le cœur du projet.

L’application doit permettre :

    la planification d’une irrigation ;

    l’enregistrement d’une irrigation réalisée ;

    l’association à une campagne ;

    le choix de la parcelle concernée ;

    le choix de la ressource en eau ;

    la saisie du volume utilisé ;

    la saisie de la date et de l’heure ;

    la saisie de la durée ;

    la saisie de la méthode d’irrigation ;

    l’enregistrement de l’agent responsable ;

    l’ajout d’une observation.

Méthodes d’irrigation possibles :

    arrosage manuel ;

    goutte-à-goutte ;

    aspersion ;

    gravitaire ;

    tuyau ;

    pompe ;

    autre.

Une séance d’irrigation peut avoir les statuts :

    brouillon ;

    planifiée ;

    en attente de validation ;

    validée ;

    réalisée ;

    annulée ;

    refusée.

6.9 Planification de l’irrigation

Le responsable pourra planifier les irrigations à venir.

Un planning d’irrigation doit préciser :

    campagne ;

    parcelle ;

    date prévue ;

    heure prévue ;

    quantité estimée ;

    ressource en eau prévue ;

    agent assigné ;

    priorité ;

    statut ;

    commentaire.

Les niveaux de priorité sont :

    faible ;

    normale ;

    élevée ;

    critique.

6.10 Module personnel : score de priorité d’irrigation

Le module personnel obligatoire sera un système de calcul d’un score de priorité d’irrigation.

Chaque parcelle active obtient un score basé sur :

    nombre de jours depuis la dernière irrigation ;

    besoin en eau de la culture ;

    stade de la campagne ;

    niveau d’humidité éventuellement saisi manuellement ;

    priorité choisie par le responsable ;

    disponibilité de la ressource en eau ;

    statut de la parcelle.

Exemple de formule simplifiée :
Score=(Jours sans irrigation×4)+Besoin de la culture+Prioriteˊ manuelle
Score=(Jours sans irrigation×4)+Besoin de la culture+Prioriteˊ manuelle

Une parcelle ayant le score le plus élevé sera affichée comme prioritaire sur le tableau de bord.

Exemple de résultat :
Parcelle	Culture	Dernière irrigation	Score	Priorité proposée
P-A01	Tomate	Il y a 5 jours	32	Critique
P-A02	Haricot vert	Il y a 2 jours	16	Normale
P-B01	Laitue	Il y a 4 jours	25	Élevée

Ce module est personnel car il introduit une logique de décision réelle, au-delà d’un simple CRUD.
6.11 Gestion des activités agricoles

Les activités techniques comprennent au minimum :

    préparation du sol ;

    semis ;

    repiquage ;

    fertilisation ;

    traitement phytosanitaire ;

    désherbage ;

    irrigation ;

    entretien ;

    récolte ;

    observation ;

    nettoyage ;

    autre.

Une activité doit contenir :

    date ;

    type ;

    description ;

    coût éventuel ;

    responsable ;

    campagne ;

    parcelle ;

    exploitation.

6.12 Gestion des intrants et stocks

Les intrants gérés peuvent comprendre :

    semences ;

    engrais ;

    compost ;

    produits phytosanitaires ;

    carburant ;

    matériel consommable ;

    tuyaux ;

    pièces de pompe ;

    produits de traitement de l’eau.

Chaque intrant comprend :

    nom ;

    catégorie ;

    unité de mesure ;

    seuil minimal ;

    quantité disponible ;

    prix unitaire ;

    fournisseur facultatif ;

    statut.

Le système doit gérer :

    stock initial ;

    entrée ;

    sortie ;

    consommation ;

    ajustement ;

    historique des mouvements ;

    alerte de stock critique.

6.13 Gestion financière

Le module financier doit permettre d’enregistrer les dépenses et les recettes.
Dépenses

Les dépenses possibles comprennent :

    achat de semences ;

    achat d’engrais ;

    achat de carburant ;

    réparation de pompe ;

    achat ou entretien du matériel ;

    main-d’œuvre ;

    transport ;

    énergie électrique ;

    achat d’eau ;

    traitement phytosanitaire.

Chaque dépense contient :

    date ;

    montant ;

    catégorie ;

    description ;

    campagne liée facultative ;

    justificatif facultatif ;

    utilisateur ayant enregistré l’opération.

Recettes

Les recettes peuvent provenir de :

    vente de tomate ;

    vente de carotte ;

    vente de haricot ;

    vente de laitue ;

    vente d’autres produits agricoles ;

    autres revenus de l’exploitation.

Chaque recette contient :

    date ;

    montant ;

    produit vendu ;

    quantité ;

    unité ;

    campagne liée ;

    client facultatif ;

    commentaire.

La marge simplifiée est calculée ainsi :
Marge simplifieˊe=Total des recettes−Total des deˊpenses
Marge simplifieˊe=Total des recettes−Total des deˊpenses
6.14 Gestion des récoltes

L’application doit permettre d’enregistrer les récoltes réalisées sur une campagne.

Une récolte contient :

    campagne ;

    parcelle ;

    date de récolte ;

    produit ;

    quantité ;

    unité ;

    qualité facultative ;

    perte éventuelle ;

    responsable ;

    observation.

7. Règles métier

Les règles métier sont essentielles, car le projet ne doit pas être uniquement une succession d’écrans CRUD. Le sujet exige des règles d’intégrité, une transaction métier, une gestion de concurrence et des tests de règles critiques.
RM-01 — Isolation des exploitations

Un utilisateur appartenant à une exploitation A ne doit jamais pouvoir lire, modifier ou supprimer les données d’une exploitation B.

Cette règle s’applique notamment à :

    parcelles ;

    campagnes ;

    ressources en eau ;

    mouvements d’eau ;

    irrigations ;

    activités ;

    stocks ;

    dépenses ;

    recettes ;

    alertes ;

    utilisateurs de l’exploitation.

RM-02 — Ressource en eau obligatoire

Toute séance d’irrigation validée doit être associée à une ressource en eau active.
RM-03 — Quantité d’irrigation positive

La quantité d’eau utilisée dans une irrigation doit être strictement supérieure à zéro.
Quantiteˊ d’irrigation>0
Quantiteˊ d’irrigation>0
RM-04 — Absence de stock d’eau négatif

Une irrigation ne doit jamais faire descendre le niveau d’eau en dessous de zéro.
Quantiteˊ demandeˊe≤Quantiteˊ disponible
Quantiteˊ demandeˊe≤Quantiteˊ disponible

Si cette condition n’est pas respectée, l’opération doit être refusée.
RM-05 — Limite de capacité du réservoir

Un ajout d’eau ne doit pas dépasser la capacité maximale de la ressource.
Quantiteˊ disponible+Quantiteˊ ajouteˊe≤Capaciteˊ maximale
Quantiteˊ disponible+Quantiteˊ ajouteˊe≤Capaciteˊ maximale
RM-06 — Campagne active obligatoire

Une irrigation ne peut être enregistrée que pour une campagne active ou autorisée à recevoir une irrigation.
RM-07 — Cohérence parcelle-campagne

La parcelle sélectionnée dans une séance d’irrigation doit correspondre à la parcelle liée à la campagne concernée.
RM-08 — Alerte de niveau critique

Une alerte doit être créée lorsque le niveau de la ressource devient inférieur ou égal au seuil critique.
Quantiteˊ disponible≤Seuil critique
Quantiteˊ disponible≤Seuil critique
RM-09 — Traçabilité obligatoire

Toute consommation d’eau validée doit automatiquement générer un mouvement d’eau traçable.
RM-10 — Validation responsable

Un agent peut saisir une irrigation, mais une séance dépassant un seuil défini, par exemple 2 000 litres, doit être validée par un responsable.
RM-11 — Campagne terminée

Une campagne terminée ne doit plus accepter de nouvelles irrigations, dépenses ou activités, sauf correction explicitement autorisée au responsable.
RM-12 — Stock d’intrant non négatif

La consommation d’un intrant ne doit jamais conduire à un stock négatif.
RM-13 — Recette et récolte

Une recette liée à une récolte ne doit pas indiquer une quantité de vente supérieure à la quantité récoltée disponible, si le suivi des ventes par récolte est implémenté.
8. Transaction et concurrence
8.1 Cas nécessitant une transaction

La validation d’une séance d’irrigation est une opération critique.

Lorsqu’un utilisateur valide une irrigation, le système doit réaliser toutes les actions suivantes dans une seule transaction :

    Vérifier que l’utilisateur a l’autorisation d’agir.

    Récupérer la ressource en eau concernée.

    Verrouiller la ligne de la ressource en eau.

    Vérifier que la quantité disponible est suffisante.

    Créer l’enregistrement de la séance d’irrigation.

    Créer le mouvement d’eau de type consommation.

    Déduire l’eau de la quantité disponible.

    Créer une activité technique de type irrigation.

    Vérifier si le niveau devient critique.

    Déclencher l’événement approprié.

    Valider la transaction.

Si une étape échoue, toutes les modifications doivent être annulées avec un rollback.
8.2 Schéma transactionnel

text
Début de transaction
        ↓
Verrouillage de la ressource en eau
        ↓
Vérification de la quantité disponible
        ↓
Création de la séance d’irrigation
        ↓
Création du mouvement d’eau
        ↓
Mise à jour du stock d’eau
        ↓
Création de l’activité technique
        ↓
Déclenchement éventuel d’une alerte
        ↓
Commit

En cas d’erreur :

text
Erreur détectée
        ↓
Rollback
        ↓
Aucune irrigation, aucun mouvement et aucune diminution du stock ne sont enregistrés

8.3 Risque de concurrence

Situation possible :

    Le réservoir contient 1 000 litres.

    Agent A tente d’irriguer 700 litres.

    Agent B tente simultanément d’irriguer 600 litres.

    Sans protection, les deux opérations peuvent être validées.

    Le système afficherait alors une quantité négative ou incohérente.

8.4 Solution technique envisagée

Utiliser :

    DB::transaction();

    lockForUpdate() sur la ligne de la ressource en eau ;

    une vérification du stock après verrouillage ;

    une exception métier si l’eau disponible est insuffisante.

Exemple de logique attendue :

php
DB::transaction(function () use ($waterSourceId, $quantity) {
    $waterSource = WaterSource::query()
        ->lockForUpdate()
        ->findOrFail($waterSourceId);

    if ($waterSource->available_quantity < $quantity) {
        throw new InsufficientWaterException();
    }

    $waterSource->decrement('available_quantity', $quantity);

    WaterMovement::create([
        'water_source_id' => $waterSource->id,
        'type' => 'consumption',
        'quantity' => $quantity,
    ]);
});

Cette solution permet de traiter explicitement l’exigence de concurrence demandée dans le projet.
9. Tableau de bord

Le tableau de bord doit fournir une information utile au responsable, et non seulement afficher des nombres. Le sujet demande notamment les campagnes actives, unités de production, états des stocks, dépenses, recettes, alertes et activités récentes.
9.1 Indicateurs obligatoires

Le tableau de bord doit afficher :

    nombre de campagnes actives ;

    nombre de parcelles ;

    superficie totale exploitée ;

    quantité totale d’eau disponible ;

    nombre de ressources en eau critiques ;

    nombre d’irrigations réalisées ce mois-ci ;

    dépenses du mois ;

    recettes du mois ;

    marge simplifiée ;

    alertes non lues ;

    dernières activités enregistrées.

9.2 Indicateurs spécifiques au projet

Au minimum deux indicateurs calculés spécifiques doivent être ajoutés.
Indicateur 1 : consommation d’eau par campagne
Consommation d’eau par campagne=∑Quantiteˊs utiliseˊes pour les irrigations de la campagne
Consommation d’eau par campagne=∑Quantiteˊs utiliseˊes pour les irrigations de la campagne

Exemple :
Campagne	Eau consommée
Tomate saison des pluies	12 500 L
Haricot vert novembre	8 200 L
Laitue octobre	4 300 L
Indicateur 2 : consommation d’eau par mètre carré
Consommation par m²=Eau consommeˊeSuperficie de la parcelle
Consommation par m²=Superficie de la parcelleEau consommeˊe​

Exemple :
Parcelle	Eau consommée	Superficie	Consommation/m²
Parcelle Tomates Nord	10 000 L	800 m²	12,5 L/m²
Parcelle Haricots Est	6 500 L	650 m²	10 L/m²
Indicateur 3 : autonomie estimée de la réserve
Autonomie estimeˊe=Quantiteˊ d’eau disponibleConsommation moyenne journalieˋre
Autonomie estimeˊe=Consommation moyenne journalieˋreQuantiteˊ d’eau disponible​

Exemple : si le réservoir contient 8 000 litres et que la consommation moyenne est de 1 000 litres par jour, l’autonomie estimée est de 8 jours.
Indicateur 4 : taux de réalisation des irrigations planifiées
Taux de reˊalisation=Nombre d’irrigations reˊaliseˊesNombre d’irrigations planifieˊes×100
Taux de reˊalisation=Nombre d’irrigations planifieˊesNombre d’irrigations reˊaliseˊes​×100
10. Recherche, filtres et pagination

Les pages suivantes doivent proposer recherche, filtres, tri et pagination.
10.1 Liste des séances d’irrigation

Filtres :

    période ;

    parcelle ;

    campagne ;

    ressource en eau ;

    agent ;

    statut ;

    méthode d’irrigation ;

    niveau de priorité.

Tris :

    date la plus récente ;

    date la plus ancienne ;

    quantité la plus élevée ;

    quantité la plus faible ;

    parcelle ;

    statut.

10.2 Liste des mouvements d’eau

Filtres :

    ressource en eau ;

    type de mouvement ;

    période ;

    utilisateur ;

    campagne liée.

10.3 Liste des campagnes

Filtres :

    statut ;

    culture ;

    parcelle ;

    période ;

    responsable.

11. Architecture technique Laravel
11.1 Technologies
Élément	Technologie proposée
Framework back-end	Laravel
Langage	PHP
Base de données	MySQL ou PostgreSQL
Front-end	Blade, Tailwind CSS ou Bootstrap
Authentification Web	Laravel Breeze ou Laravel UI
API	Laravel Sanctum
Queue	Database Queue ou Redis
Cache	File Cache, Database Cache ou Redis
Tests	PHPUnit ou Pest
Versionnement	Git et GitHub/GitLab
11.2 Organisation recommandée

text
app/
 ├── Models/
 ├── Http/
 │   ├── Controllers/
 │   ├── Requests/
 │   ├── Resources/
 │   └── Middleware/
 ├── Services/
 ├── Policies/
 ├── Events/
 ├── Listeners/
 ├── Notifications/
 ├── Jobs/
 ├── Exceptions/
 └── Actions/

11.3 Services métier

Les contrôleurs doivent rester légers. La logique métier doit être placée dans des services Laravel, conformément au cahier des charges.

Services recommandés :
Service	Responsabilité
IrrigationService	Validation et enregistrement complet d’une irrigation
WaterStockService	Gestion des niveaux d’eau et des mouvements
CampaignService	Création, activation, clôture et suivi des campagnes
DashboardService	Calcul des statistiques et indicateurs
FinanceService	Calcul dépenses, recettes et marge
PriorityIrrigationService	Calcul du score de priorité des parcelles
AlertService	Création et gestion des alertes
11.4 Contrôleurs possibles

    DashboardController

    FarmController

    UserController

    PlotController

    CropController

    CampaignController

    WaterSourceController

    WaterMovementController

    IrrigationController

    IrrigationScheduleController

    ActivityController

    InputController

    StockMovementController

    ExpenseController

    RevenueController

    HarvestController

    AlertController

    Api/IrrigationController

    Api/WaterSourceController

12. Modèle de données

Le sujet recommande environ 8 à 15 tables métier pertinentes. Le modèle ci-dessous comprend 15 tables principales, sans ajout artificiel.
Table	Rôle
farms	Exploitations agricoles
users	Comptes utilisateurs
roles	Rôles et permissions
plots	Parcelles agricoles
crops	Cultures disponibles
campaigns	Cycles de production
water_sources	Réservoirs, puits, bassins, citernes
water_movements	Historique des mouvements d’eau
irrigation_schedules	Planification des irrigations
irrigations	Séances d’irrigation réalisées
activities	Activités agricoles
inputs	Intrants agricoles
stock_movements	Mouvements des intrants
expenses	Dépenses
revenues	Recettes
harvests	Récoltes
alerts	Alertes système ou métier
notifications	Notifications Laravel
activity_logs	Journalisation des opérations sensibles
12.1 Table farms
Champ	Type	Description
id	bigint	Identifiant
name	string	Nom de l’exploitation
location	string	Localisation
type	string	Type d’exploitation
total_area	decimal	Superficie totale
manager_id	foreignId	Responsable
status	string	Statut
created_at	timestamp	Création
updated_at	timestamp	Mise à jour
12.2 Table plots
Champ	Type	Description
id	bigint	Identifiant
farm_id	foreignId	Exploitation propriétaire
code	string	Code de la parcelle
name	string	Nom
area	decimal	Superficie
area_unit	string	m² ou hectare
location	string	Localisation
soil_type	string nullable	Type de sol
status	string	État de la parcelle
created_at	timestamp	Création
updated_at	timestamp	Mise à jour
12.3 Table campaigns
Champ	Type	Description
id	bigint	Identifiant
farm_id	foreignId	Exploitation
plot_id	foreignId	Parcelle
crop_id	foreignId	Culture
code	string	Référence
name	string	Nom
start_date	date	Date de début
expected_end_date	date	Fin prévisionnelle
actual_end_date	date nullable	Fin réelle
status	string	Statut
manager_id	foreignId	Responsable
notes	text nullable	Notes
12.4 Table water_sources
Champ	Type	Description
id	bigint	Identifiant
farm_id	foreignId	Exploitation
name	string	Nom de la ressource
type	string	Puits, citerne, bassin, etc.
capacity	decimal	Capacité maximale
available_quantity	decimal	Quantité actuellement disponible
unit	string	Litre ou m³
critical_threshold	decimal	Seuil critique
location	string nullable	Localisation
status	string	Active, maintenance, inactive
12.5 Table water_movements
Champ	Type	Description
id	bigint	Identifiant
farm_id	foreignId	Exploitation
water_source_id	foreignId	Ressource concernée
campaign_id	foreignId nullable	Campagne concernée
irrigation_id	foreignId nullable	Irrigation associée
user_id	foreignId	Utilisateur responsable
type	string	Entrée, consommation, perte, ajustement
quantity	decimal	Quantité déplacée
quantity_before	decimal	Quantité avant opération
quantity_after	decimal	Quantité après opération
movement_date	datetime	Date du mouvement
note	text nullable	Commentaire
12.6 Table irrigations
Champ	Type	Description
id	bigint	Identifiant
farm_id	foreignId	Exploitation
campaign_id	foreignId	Campagne
plot_id	foreignId	Parcelle
water_source_id	foreignId	Ressource en eau
performed_by	foreignId	Agent ou responsable
validated_by	foreignId nullable	Responsable validateur
scheduled_at	datetime nullable	Date planifiée
performed_at	datetime	Date réelle
quantity	decimal	Quantité utilisée
unit	string	Litre ou m³
duration_minutes	integer nullable	Durée
method	string	Méthode d’irrigation
status	string	Brouillon, planifiée, validée, réalisée, annulée
observation	text nullable	Observation
12.7 Relations Eloquent principales

text
Farm 1 ──── N User
Farm 1 ──── N Plot
Farm 1 ──── N Campaign
Farm 1 ──── N WaterSource
Farm 1 ──── N WaterMovement
Farm 1 ──── N Irrigation
Farm 1 ──── N Expense
Farm 1 ──── N Revenue

Plot 1 ──── N Campaign
Crop 1 ──── N Campaign
Campaign 1 ──── N Irrigation
Campaign 1 ──── N Activity
Campaign 1 ──── N Harvest
Campaign 1 ──── N Expense
Campaign 1 ──── N Revenue

WaterSource 1 ──── N WaterMovement
WaterSource 1 ──── N Irrigation
Irrigation 1 ──── 1 WaterMovement

13. Sécurité et isolation SaaS
13.1 Authentification

L’application doit proposer :

    connexion ;

    déconnexion ;

    gestion des mots de passe ;

    protection des routes ;

    authentification API via Laravel Sanctum ;

    gestion des sessions sécurisées.

13.2 Autorisation

Les opérations sensibles doivent être protégées par :

    middleware auth;

    middleware de rôle ;

    Policies Laravel ;

    éventuellement Gates.

Exemples de Policies :

    FarmPolicy

    PlotPolicy

    CampaignPolicy

    WaterSourcePolicy

    IrrigationPolicy

    ExpensePolicy

    RevenuePolicy

13.3 Isolation des données

La sécurité ne doit pas dépendre uniquement d’un filtre envoyé par le navigateur.

Exemple dangereux à éviter :

php
Irrigation::findOrFail($id);

Exemple plus sécurisé :

php
Irrigation::query()
    ->where('farm_id', auth()->user()->farm_id)
    ->findOrFail($id);

Ou via Policy :

php
$this->authorize('view', $irrigation);

13.4 Validation

Toutes les données reçues devront être validées par des Form Requests :

    StoreIrrigationRequest

    UpdateIrrigationRequest

    StoreWaterSourceRequest

    StoreCampaignRequest

    StoreExpenseRequest

    StoreRevenueRequest

Exemples de validations pour une irrigation :

php
return [
    'campaign_id' => ['required', 'exists:campaigns,id'],
    'water_source_id' => ['required', 'exists:water_sources,id'],
    'quantity' => ['required', 'numeric', 'gt:0'],
    'performed_at' => ['required', 'date'],
    'method' => ['required', 'string', 'max:100'],
    'observation' => ['nullable', 'string', 'max:2000'],
];

13.5 Mesures de sécurité attendues

    Protection CSRF pour les formulaires Web.

    Échappement Blade pour limiter les risques XSS.

    Validation des entrées utilisateur.

    Protection contre le mass assignment avec $fillable ou $guarded.

    Vérification des permissions côté serveur.

    Hashage des mots de passe.

    Gestion sécurisée des fichiers si des justificatifs ou photos sont ajoutés.

    Journalisation des accès interdits.

    Utilisation de variables d’environnement dans .env.

    Ne jamais versionner .env dans Git.

14. Events, Listeners et notifications
14.1 Événement principal

Créer l’événement :

text
WaterLevelCritical

Cet événement est déclenché lorsque :
Quantiteˊ disponible≤Seuil critique
Quantiteˊ disponible≤Seuil critique
14.2 Listeners proposés
Listener	Action
CreateWaterAlertListener	Crée une alerte métier dans la base de données
NotifyFarmManagerListener	Envoie une notification au responsable
LogCriticalWaterLevelListener	Enregistre l’événement dans les logs
14.3 Notification

La notification doit informer le responsable d’exploitation qu’une ressource devient critique.

Exemple :

    Alerte eau : le niveau du Réservoir principal est de 1 800 litres. Le seuil critique est fixé à 2 000 litres. Vérifiez les irrigations prévues ou planifiez un remplissage.

Canaux possibles :

    database : obligatoire et simple à démontrer ;

    mail : facultatif si la configuration e-mail est disponible ;

    broadcast : facultatif pour une alerte en temps réel.

14.4 Autres événements possibles

    IrrigationRecorded

    IrrigationValidated

    CampaignCompleted

    StockCritical

    ExpenseCreated

    WaterSourceRefilled

15. Jobs, queues et cache
15.1 Job asynchrone

Créer un Job nommé :

text
GenerateWaterConsumptionReportJob

Son rôle :

    calculer les consommations d’eau par campagne ;

    générer un rapport mensuel ;

    calculer les parcelles les plus consommatrices ;

    enregistrer ou envoyer un résumé au responsable.

Ce Job peut être exécuté via une queue Laravel.

Exemple de lancement :

bash
php artisan queue:work

15.2 Alternative de Job

Si la génération de rapport paraît trop importante, utiliser un Job pour :

    envoyer une notification d’alerte de niveau critique ;

    recalculer les scores de priorité d’irrigation ;

    recalculer les statistiques du tableau de bord.

15.3 Cache

Les données suivantes peuvent être mises en cache :

    statistiques du tableau de bord ;

    consommation totale d’eau du mois ;

    nombre de campagnes actives ;

    dépenses et recettes mensuelles ;

    parcelles prioritaires ;

    liste des ressources critiques.

Exemple :

php
Cache::remember(
    "farm:{$farmId}:dashboard",
    now()->addMinutes(15),
    fn () => $dashboardService->getStatistics($farmId)
);

15.4 Invalidation du cache

Le cache doit être oublié lorsqu’une donnée susceptible de modifier les statistiques est créée, modifiée ou supprimée :

    création ou modification d’une irrigation ;

    ajout d’eau ;

    modification d’une campagne ;

    création d’une dépense ;

    création d’une recette ;

    clôture d’une campagne.

Exemple :

php
Cache::forget("farm:{$farmId}:dashboard");

16. API REST

L’application doit fournir une partie de ses fonctionnalités via une API REST protégée, avec des réponses JSON structurées, validation et codes HTTP appropriés.
16.1 Authentification API

Utilisation de Laravel Sanctum.

text
POST /api/login
POST /api/logout

16.2 Endpoints proposés
Méthode	Route	Description
GET	/api/water-sources	Liste des ressources en eau de l’utilisateur connecté
GET	/api/water-sources/{id}	Détail d’une ressource en eau
POST	/api/water-sources	Créer une ressource en eau
PATCH	/api/water-sources/{id}	Modifier une ressource
GET	/api/irrigations	Liste des irrigations avec filtres
POST	/api/irrigations	Enregistrer une irrigation
GET	/api/campaigns	Liste des campagnes
GET	/api/dashboard	Statistiques du tableau de bord
GET	/api/priority-irrigations	Parcelles classées par priorité d’irrigation
16.3 Codes HTTP attendus
Situation	Code
Ressource obtenue	200
Ressource créée	201
Requête invalide	422
Non authentifié	401
Non autorisé	403
Ressource introuvable	404
Conflit de stock ou eau insuffisante	409
Erreur serveur	500
16.4 Exemple de réponse JSON

json
{
  "success": true,
  "message": "Irrigation enregistrée avec succès.",
  "data": {
    "id": 15,
    "campaign_id": 4,
    "water_source_id": 2,
    "quantity": 750,
    "unit": "L",
    "performed_at": "2026-10-01 06:30:00",
    "status": "realisee"
  }
}

16.5 Exemple d’erreur eau insuffisante

json
{
  "success": false,
  "message": "Quantité d’eau insuffisante dans la ressource sélectionnée.",
  "errors": {
    "quantity": [
      "La quantité demandée dépasse le stock disponible."
    ]
  }
}

Code HTTP : 409 Conflict.
17. Tests automatisés

Le projet doit comporter plusieurs tests automatisés, notamment un test métier, un test d’autorisation, un test d’API ou route et un test de règle critique.
17.1 Test métier

Nom : it_records_irrigation_and_decreases_water_stock

Vérifier qu’une irrigation valide :

    crée une séance d’irrigation ;

    crée un mouvement d’eau ;

    diminue la quantité disponible ;

    crée une activité ;

    conserve la cohérence des données.

17.2 Test de règle critique

Nom : it_prevents_irrigation_when_water_quantity_is_insufficient

Scénario :

    ressource disponible : 500 litres ;

    demande d’irrigation : 700 litres ;

    résultat attendu : opération refusée ;

    aucun mouvement d’eau créé ;

    aucun stock modifié ;

    aucune irrigation validée.

17.3 Test de concurrence

Nom : it_prevents_two_simultaneous_irrigations_from_overusing_water

Objectif :

    vérifier que deux tentatives ne peuvent pas consommer une quantité supérieure au stock ;

    prouver l’usage de transaction et verrouillage logique.

Selon la complexité de ton environnement de test, ce test peut être présenté en démonstration manuelle et accompagné d’un test métier robuste.
17.4 Test d’autorisation

Nom : user_cannot_access_another_farm_irrigations

Scénario :

    un utilisateur appartient à l’exploitation A ;

    une irrigation appartient à l’exploitation B ;

    l’utilisateur A tente d’accéder à l’irrigation B ;

    résultat attendu : 403 Forbidden ou 404 Not Found.

17.5 Test de route API

Nom : authenticated_user_can_create_irrigation_via_api

Vérifier :

    authentification Sanctum ;

    réponse HTTP 201 Created ;

    validation des données ;

    présence des données JSON attendues.

17.6 Test de notification

Nom : manager_is_notified_when_water_is_critical

Scénario :

    une irrigation fait descendre un réservoir sous son seuil critique ;

    l’événement est déclenché ;

    une notification est envoyée au responsable.

18. Journalisation et traçabilité

Les opérations importantes doivent être journalisées.

Les actions à tracer comprennent :

    tentative d’accès à une autre exploitation ;

    création, modification ou suppression d’une ressource en eau ;

    irrigation validée ;

    irrigation refusée pour eau insuffisante ;

    ajustement manuel de stock d’eau ;

    alerte de niveau critique ;

    erreur de traitement asynchrone ;

    connexion ou déconnexion si nécessaire.

Exemple de log :

text
[2026-10-01 06:35:12] production.WARNING:
Tentative d'irrigation refusée.
Utilisateur: 8
Exploitation: 2
Ressource: Réservoir principal
Quantité demandée: 1200 L
Quantité disponible: 850 L

19. Jeu de données de démonstration

Le projet doit fournir des factories et seeders permettant de reconstruire rapidement une base de démonstration.
19.1 Données proposées

Créer au minimum :

    3 exploitations ;

    10 utilisateurs ;

    12 parcelles ;

    8 cultures ;

    15 campagnes ;

    8 ressources en eau ;

    40 séances d’irrigation ;

    50 mouvements d’eau ;

    30 activités agricoles ;

    20 dépenses ;

    15 recettes ;

    plusieurs alertes critiques.

19.2 Exploitations fictives

Exemples de données originales :
Exploitation	Localisation	Type
Tsinjo Maitso	Ambohidratrimo	Maraîchage
Vokatra Soa	Ankazobe	Maraîchage
Tanimbary Miray	Betafo	Riziculture et maraîchage
19.3 Comptes de démonstration
Rôle	E-mail	Mot de passe
Administrateur	admin@agriwater.test	password
Responsable exploitation A	responsable.tsinjo@agriwater.test	password
Agent exploitation A	agent.tsinjo@agriwater.test	password
Responsable exploitation B	responsable.vokatra@agriwater.test	password
Agent exploitation B	agent.vokatra@agriwater.test	password

Les données doivent être personnelles et différentes de celles des autres étudiants, comme l’exige le sujet.
20. Livrables attendus
20.1 Code source

Le dépôt doit contenir :

    code Laravel complet ;

    migrations ;

    modèles ;

    contrôleurs ;

    Form Requests ;

    Policies ;

    Services ;

    Events ;

    Listeners ;

    Notifications ;

    Jobs ;

    API Resources ;

    tests ;

    seeders et factories ;

    vues Blade ou front-end associé.

20.2 README.md

Le fichier README.md doit indiquer :

    prérequis ;

    version PHP ;

    installation des dépendances ;

    configuration de .env ;

    création de la base de données ;

    lancement des migrations ;

    lancement des seeders ;

    commandes pour lancer l’application ;

    commande pour lancer le worker de queue ;

    commandes de test ;

    comptes de démonstration ;

    documentation des principales routes API.

Exemple de commandes :

bash
git clone <repository-url>
cd agriwater

composer install
cp .env.example .env
php artisan key:generate

php artisan migrate:fresh --seed

php artisan serve
php artisan queue:work

php artisan test

20.3 Rapport technique

Le rapport technique peut être structuré ainsi :

    Page de garde.

    Remerciements facultatifs.

    Résumé du projet.

    Introduction générale.

    Contexte et problématique.

    Analyse des besoins.

    Présentation des acteurs.

    Cas d’utilisation.

    Règles métier.

    Choix technologiques.

    Modélisation des données.

    MCD ou diagramme entité-relation.

    Architecture Laravel.

    Présentation des fonctionnalités.

    Gestion de l’irrigation.

    Transactions et intégrité des données.

    Gestion de la concurrence.

    Sécurité et isolation SaaS.

    API REST.

    Events, Listeners et Notifications.

    Jobs, Queues et Cache.

    Tests automatisés.

    Difficultés rencontrées.

    Solutions retenues.

    Limites actuelles.

    Perspectives.

    Conclusion.

    Annexes.

Le rapport demandé doit généralement faire environ 15 à 25 pages hors annexes.
20.4 Diagrammes à fournir

    MCD ou diagramme Entité-Relation.

    Diagramme de cas d’utilisation.

    Diagramme de séquence de validation d’une irrigation.

    Diagramme d’architecture Laravel facultatif mais recommandé.

    Diagramme de flux de transaction irrigation recommandé.

21. Critères d’acceptation

L’application AgriWater sera considérée comme fonctionnelle si les critères suivants sont satisfaits.
N°	Critère
1	Un administrateur peut gérer les utilisateurs et leurs rôles
2	Un responsable peut gérer les parcelles, cultures et campagnes de son exploitation
3	Une ressource en eau possède une capacité, une quantité disponible et un seuil critique
4	Une séance d’irrigation diminue le niveau d’eau disponible
5	Toute irrigation validée crée un mouvement d’eau traçable
6	Une irrigation est refusée si la quantité demandée est supérieure au stock disponible
7	Deux utilisateurs ne peuvent pas provoquer un stock négatif en travaillant simultanément
8	Une alerte est générée si le niveau d’eau atteint le seuil critique
9	Un utilisateur ne peut pas consulter les données d’une autre exploitation
10	Le tableau de bord affiche les indicateurs principaux
11	Les listes d’irrigations permettent recherche, filtres, tri et pagination
12	Une partie de l’application est accessible via une API REST protégée
13	Les opérations critiques sont couvertes par des tests automatisés
14	Le projet possède des seeders et des données de démonstration originales
15	Le système de priorité d’irrigation fonctionne et classe les parcelles
22. Évolutions possibles

Après la première version, AgriWater pourrait évoluer avec :

    intégration de prévisions météorologiques ;

    mode hors-ligne / PWA pour les zones à faible connexion ;

    traduction de l’interface en malagasy et français ;

    système de conseils agricoles ;

    intégration de capteurs IoT pour mesurer le niveau réel des réservoirs ;

    connexion à un capteur d’humidité du sol ;

    géolocalisation des parcelles ;

    export PDF ou Excel des rapports ;

    envoi d’alertes SMS ;

    gestion des pompes et de leur consommation électrique ;

    prédiction de la consommation future d’eau ;

    chatbot vocal en malagasy pour assister les agriculteurs peu à l’aise avec l’écrit.

23. Résumé de l’affectation individuelle
Élément	Choix pour le projet
Nom du projet	AgriWater
Domaine	Maraîchage
Type d’exploitation	Exploitation maraîchère
Module spécialisé	Gestion de l’irrigation
Problème concret	Manque de suivi et gaspillage de l’eau
Contrainte métier	Ressource en eau limitée, sans quantité négative
Fonction métier critique	Validation transactionnelle d’une irrigation
Risque de concurrence	Deux agents consomment la même réserve simultanément
Événement	WaterLevelCritical
Notification	Alerte au responsable quand le seuil d’eau est atteint
Job asynchrone	Génération de rapport de consommation d’eau
Cache	Statistiques du tableau de bord
API REST	Consultation et création d’irrigations / ressources
Module personnel	Score de priorité d’irrigation
Tests critiques	Isolation SaaS, eau insuffisante, API, notification

Ce cahier des charges donne à ton projet une base professionnelle, suffisamment complète pour démontrer les fonctionnalités Laravel avancées attendues : architecture, rôles, isolation SaaS, transactions, verrouillage concurrentiel, événements, notifications, jobs, cache, API, sécurité et tests.
