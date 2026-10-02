Tu es un expert senior en UI/UX, conception d’interfaces homme-machine, accessibilité web et développement frontend moderne.

Ta mission est de concevoir et développer une interface web professionnelle, intuitive, responsive, accessible et cohérente pour le projet suivant :

NOM DU PROJET :
AgriWater

TYPE D’APPLICATION :
Plateforme SaaS de gestion agricole multi-exploitations.

CONTEXTE :
AgriWater permet à plusieurs exploitations agricoles d’utiliser une même plateforme tout en garantissant l’isolation stricte des données.

Chaque exploitation peut gérer :
- ses utilisateurs ;
- ses rôles et permissions ;
- ses parcelles ;
- ses cultures ;
- ses activités agricoles ;
- ses stocks ;
- ses dépenses ;
- ses recettes ;
- ses transactions ;
- sa consommation d’eau ;
- ses rapports ;
- ses alertes ;
- ses paramètres.

Une exploitation ne doit jamais voir, modifier ou supprimer les données d’une autre exploitation.

OBJECTIF :
Créer un frontend moderne, professionnel et agréable à utiliser, destiné aux agriculteurs, gestionnaires d’exploitations, responsables financiers et administrateurs.

Le résultat doit ressembler à un véritable produit SaaS commercialisable, et non à une simple maquette générique.

==================================================
1. TECHNOLOGIES OBLIGATOIRES
==================================================

Utiliser :

- React ;
- TypeScript ;
- Tailwind CSS ;
- shadcn/ui ;
- Lucide React pour les icônes ;
- Recharts pour les graphiques ;
- React Hook Form pour les formulaires ;
- Zod pour la validation ;
- TanStack Table pour les tableaux ;
- une architecture compatible avec Laravel API ou Laravel Inertia ;
- composants réutilisables et fortement typés.

Le code doit être :
- propre ;
- modulaire ;
- lisible ;
- maintenable ;
- organisé par fonctionnalités ;
- facilement connectable à une API Laravel ;
- sans duplication inutile ;
- sans logique métier importante directement dans les composants visuels.

Ne pas utiliser de données ou de composants fictifs non expliqués.
Créer des données mockées clairement séparées afin de pouvoir les remplacer par des appels API.

==================================================
2. PRINCIPES IHM À RESPECTER
==================================================

Respecter strictement les principes suivants :

A. Visibilité de l’état du système
Après chaque action, informer clairement l’utilisateur :
- chargement ;
- succès ;
- erreur ;
- sauvegarde en cours ;
- suppression en cours ;
- absence de données ;
- synchronisation ;
- modification non enregistrée.

Utiliser :
- loaders ;
- skeletons ;
- toasts ;
- alertes ;
- indicateurs de progression ;
- états disabled ;
- messages explicites.

B. Correspondance avec le monde réel
Utiliser un vocabulaire simple et adapté au domaine agricole.

Éviter les termes techniques inutiles comme :
- tenant ;
- entity ;
- resource ;
- payload ;
- query ;
- backend error.

Utiliser plutôt :
- exploitation ;
- parcelle ;
- activité ;
- stock ;
- dépense ;
- recette ;
- utilisateur ;
- responsable ;
- quantité ;
- consommation d’eau.

C. Contrôle utilisateur
L’utilisateur doit pouvoir :
- annuler une action ;
- revenir en arrière ;
- fermer une fenêtre ;
- modifier une donnée ;
- réessayer après une erreur ;
- annuler une suppression avant confirmation ;
- quitter un formulaire sans perdre accidentellement ses données.

Ajouter :
- bouton Annuler ;
- bouton Retour ;
- confirmation avant suppression ;
- avertissement en cas de formulaire modifié ;
- possibilité de fermer les modales avec Échap ;
- retour visuel après chaque action.

D. Cohérence et standards
Utiliser les mêmes règles partout :
- mêmes boutons ;
- mêmes couleurs d’état ;
- mêmes espacements ;
- mêmes titres ;
- mêmes icônes ;
- mêmes noms d’actions ;
- mêmes formats de dates ;
- mêmes formats monétaires ;
- même comportement pour les formulaires et tableaux.

E. Prévention des erreurs
Prévenir les erreurs avant qu’elles ne surviennent.

Prévoir :
- validation en temps réel ;
- champs obligatoires clairement indiqués ;
- messages d’erreur sous les champs ;
- confirmation pour les actions destructives ;
- désactivation du bouton pendant l’envoi ;
- prévention des doubles soumissions ;
- limites de saisie ;
- formats acceptés clairement indiqués.

F. Reconnaissance plutôt que mémorisation
Ne jamais obliger l’utilisateur à retenir une information affichée précédemment.

Afficher directement :
- le nom de l’exploitation active ;
- les filtres actifs ;
- les valeurs précédentes ;
- les unités ;
- les permissions ;
- le contexte de la page ;
- les actions disponibles.

G. Design minimaliste
Ne pas surcharger l’interface.

Chaque page doit avoir :
- une action principale clairement visible ;
- une hiérarchie visuelle évidente ;
- des informations regroupées logiquement ;
- des espaces suffisants ;
- un nombre limité de couleurs ;
- des textes courts et précis.

H. Aide et documentation
Ajouter :
- tooltips pour les icônes non évidentes ;
- textes d’aide pour les champs complexes ;
- empty states pédagogiques ;
- liens vers la documentation si nécessaire ;
- messages expliquant comment résoudre une erreur.

==================================================
3. ACCESSIBILITÉ
==================================================

Concevoir l’interface selon les principes WCAG 2.2 niveau AA.

Respecter les règles suivantes :

- utiliser du HTML sémantique ;
- utiliser les balises header, nav, main, aside, section et footer ;
- fournir un label à chaque champ ;
- associer correctement les messages d’erreur aux champs ;
- rendre toute l’application utilisable au clavier ;
- afficher un focus visible ;
- conserver un ordre de tabulation logique ;
- ne pas supprimer l’outline sans alternative ;
- utiliser aria-label lorsque nécessaire ;
- utiliser aria-live pour les notifications importantes ;
- fournir un texte alternatif pertinent aux images ;
- ne jamais transmettre une information uniquement par la couleur ;
- ajouter une icône ou un texte pour les états ;
- garantir un contraste suffisant ;
- éviter les textes trop petits ;
- rendre les tableaux compréhensibles avec des en-têtes ;
- rendre les modales accessibles ;
- permettre la fermeture avec Échap ;
- empêcher le focus de sortir d’une modale ouverte ;
- respecter les préférences de réduction des animations ;
- ne pas utiliser d’animation excessive ou clignotante ;
- ne pas lancer automatiquement de contenu audio ou vidéo.

Les boutons et zones tactiles mobiles doivent être suffisamment grands.
Prévoir idéalement une zone tactile minimale d’environ 44 à 48 pixels.

==================================================
4. DESIGN SYSTEM
==================================================

Créer un design system centralisé avec des tokens.

Couleurs :

- primary : #2E7D32 ;
- primary-hover : #256628 ;
- primary-light : #E8F5E9 ;
- secondary : #0288D1 ;
- secondary-light : #E1F5FE ;
- warning : #ED6C02 ;
- warning-light : #FFF4E5 ;
- danger : #D32F2F ;
- danger-light : #FDECEC ;
- success : #2E7D32 ;
- background : #F8FAF8 ;
- surface : #FFFFFF ;
- text-primary : #17201A ;
- text-secondary : #667085 ;
- border : #DDE5DE.

Typographie :
- police moderne et lisible ;
- Inter, Geist ou une police sans-serif équivalente ;
- titres avec une hiérarchie nette ;
- texte courant minimum confortable à lire ;
- line-height généreux ;
- titres courts et explicites.

Rayons :
- cartes : 16px ;
- boutons : 10px ;
- champs : 10px ;
- modales : 20px.

Ombres :
- discrètes ;
- utilisées uniquement pour séparer les niveaux ;
- jamais excessives.

Espacements :
- système cohérent basé sur 4px ou 8px ;
- marges régulières ;
- zones respirantes ;
- grille cohérente.

==================================================
5. RESPONSIVE DESIGN
==================================================

L’application doit fonctionner correctement sur :

- mobile : 320px à 639px ;
- tablette : 640px à 1023px ;
- desktop : 1024px à 1439px ;
- grand écran : 1440px et plus.

Règles responsive :

Sur mobile :
- remplacer la sidebar par un menu drawer ;
- transformer les tableaux complexes en cartes ou permettre un scroll horizontal ;
- empiler les formulaires ;
- placer l’action principale à portée du pouce ;
- éviter les textes trop longs ;
- utiliser des modales adaptées à la hauteur de l’écran ;
- conserver les boutons suffisamment grands ;
- ne pas afficher plus de deux colonnes.

Sur tablette :
- utiliser une grille flexible ;
- réduire la largeur de la sidebar ;
- conserver les statistiques principales visibles ;
- adapter les tableaux.

Sur desktop :
- afficher la sidebar ;
- utiliser une grille de 12 colonnes ;
- afficher les graphiques côte à côte lorsque l’espace le permet ;
- limiter la largeur maximale du contenu ;
- éviter les lignes de texte trop longues.

Le contenu ne doit jamais :
- sortir de l’écran ;
- être coupé ;
- provoquer un scroll horizontal général ;
- devenir illisible ;
- dépendre uniquement du survol de la souris.

==================================================
6. ARCHITECTURE GLOBALE
==================================================

Créer une structure d’application avec :

- AppShell ;
- Sidebar ;
- MobileNavigation ;
- Topbar ;
- Breadcrumbs ;
- PageHeader ;
- NotificationCenter ;
- UserMenu ;
- FarmSelector ;
- GlobalSearch ;
- ProtectedRoute ;
- PermissionGuard ;
- ErrorBoundary ;
- ToastProvider ;
- ConfirmDialog ;
- LoadingState ;
- EmptyState ;
- ErrorState ;
- Skeleton components.

La topbar doit afficher :
- le nom de l’exploitation active ;
- le profil utilisateur ;
- les notifications ;
- la recherche ;
- le bouton de changement d’exploitation si autorisé ;
- le bouton de déconnexion.

La sidebar doit contenir :

- Vue d’ensemble ;
- Exploitations ;
- Parcelles ;
- Cultures ;
- Activités ;
- Stocks ;
- Finances ;
- Consommation d’eau ;
- Rapports ;
- Utilisateurs ;
- Rôles et permissions ;
- Paramètres.

La navigation doit :
- afficher l’élément actif ;
- conserver la position logique ;
- être utilisable au clavier ;
- fonctionner sur mobile ;
- masquer les liens non autorisés ;
- afficher les badges de notification lorsque nécessaire.

==================================================
7. PAGES À CRÉER
==================================================

Créer au minimum les pages suivantes :

1. Landing page
2. Connexion
3. Inscription
4. Réinitialisation du mot de passe
5. Dashboard
6. Liste des exploitations
7. Détail d’une exploitation
8. Liste des parcelles
9. Liste des activités
10. Création d’une activité
11. Gestion des stocks
12. Entrée de stock
13. Sortie de stock
14. Finances
15. Ajout d’une dépense
16. Ajout d’une recette
17. Consommation d’eau
18. Rapports
19. Utilisateurs
20. Rôles et permissions
21. Paramètres
22. Page 403
23. Page 404
24. Page d’erreur serveur
25. Page hors connexion ou problème réseau.

==================================================
8. DASHBOARD
==================================================

Créer un dashboard professionnel avec :

En haut :
- titre personnalisé ;
- nom de l’exploitation active ;
- période sélectionnée ;
- bouton d’export ;
- bouton d’ajout rapide.

Cartes KPI :
- surface totale ;
- nombre de parcelles ;
- stock disponible ;
- dépenses du mois ;
- recettes du mois ;
- consommation d’eau ;
- activités en cours ;
- alertes importantes.

Chaque carte doit afficher :
- une icône ;
- un titre ;
- une valeur ;
- une unité ;
- une comparaison avec la période précédente ;
- une indication positive ou négative ;
- une explication accessible ;
- un état loading.

Graphiques :
- consommation d’eau par période ;
- dépenses et recettes ;
- évolution des stocks ;
- répartition des activités ;
- rendement par parcelle.

Tableaux :
- dernières activités ;
- stocks faibles ;
- transactions récentes ;
- notifications importantes.

Créer également :
- empty state ;
- loading state ;
- error state ;
- bouton actualiser ;
- filtre par période ;
- filtre par parcelle ;
- filtre par culture.

==================================================
9. FORMULAIRES
==================================================

Tous les formulaires doivent respecter les règles suivantes :

- label visible ;
- placeholder uniquement comme exemple ;
- indication obligatoire ou facultative ;
- validation au bon moment ;
- message d’erreur clair ;
- message de succès ;
- bouton Enregistrer ;
- bouton Annuler ;
- bouton Réinitialiser si pertinent ;
- état disabled pendant l’envoi ;
- prévention des doubles clics ;
- confirmation si des données saisies vont être perdues ;
- prise en charge du clavier ;
- ordre de tabulation logique.

Exemples de champs :
- nom de l’exploitation ;
- localisation ;
- superficie ;
- nom de la parcelle ;
- type de culture ;
- quantité ;
- unité ;
- prix ;
- date ;
- description ;
- utilisateur ;
- rôle ;
- montant ;
- type de transaction.

Les erreurs doivent être formulées en français simple.

Mauvais exemple :
« Invalid payload »

Bon exemple :
« Indiquez une quantité supérieure à zéro. »

==================================================
10. TABLEAUX
==================================================

Créer des tableaux professionnels avec :

- en-têtes explicites ;
- tri ;
- filtres ;
- recherche ;
- pagination ;
- sélection de lignes ;
- actions par ligne ;
- menu d’actions ;
- affichage du nombre de résultats ;
- état vide ;
- état de chargement ;
- état d’erreur ;
- responsive design ;
- scroll horizontal contrôlé sur petit écran ;
- confirmation avant suppression ;
- export CSV si pertinent.

Les tableaux doivent utiliser :
- des badges d’état ;
- des valeurs formatées ;
- des unités ;
- des dates compréhensibles ;
- des menus accessibles au clavier.

Sur mobile, convertir les lignes en cartes lorsque le tableau devient illisible.

==================================================
11. MODALES ET ACTIONS DESTRUCTIVES
==================================================

Toute suppression doit afficher une boîte de confirmation.

La confirmation doit préciser :
- l’élément concerné ;
- l’action réalisée ;
- les conséquences ;
- si l’action est irréversible ;
- le bouton Annuler ;
- le bouton Confirmer la suppression.

Exemple :

Titre :
« Supprimer cette activité ? »

Message :
« Cette activité sera définitivement supprimée. Cette action ne peut pas être annulée. »

Boutons :
- « Annuler »
- « Supprimer définitivement »

Ne jamais supprimer immédiatement une donnée critique après un simple clic.

==================================================
12. ÉTATS OBLIGATOIRES
==================================================

Pour chaque page et chaque composant important, créer :

- état normal ;
- état chargement ;
- état vide ;
- état erreur ;
- état succès ;
- état désactivé ;
- état permission refusée ;
- état hors connexion ;
- état de recherche sans résultat.

Les messages doivent être utiles et proposer une action.

Exemple d’état vide :
« Aucune activité enregistrée »
« Commencez par ajouter la première activité de cette exploitation. »
Bouton :
« Ajouter une activité »

Exemple d’état erreur :
« Impossible de charger les activités »
« Vérifiez votre connexion puis réessayez. »
Bouton :
« Réessayer »

==================================================
13. SÉCURITÉ ET ISOLATION DES DONNÉES
==================================================

Dans l’interface, afficher clairement l’exploitation active.

Ajouter :
- un FarmSelector ;
- un badge de contexte ;
- un avertissement lors du changement d’exploitation ;
- des permissions par rôle ;
- des boutons cachés ou désactivés si l’utilisateur n’a pas l’autorisation ;
- une page 403 ;
- des messages d’accès refusé ;
- un affichage contrôlé des données.

IMPORTANT :
La sécurité ne doit jamais dépendre uniquement du frontend.
Le frontend doit seulement améliorer l’expérience utilisateur.
L’API Laravel doit contrôler les permissions, les policies et l’isolation réelle des données.

Préparer les appels API avec une structure de données de ce type :

{
  id: string,
  farm_id: string,
  name: string,
  status: string,
  created_at: string,
  updated_at: string
}

Ne jamais afficher dans l’interface les données d’une autre exploitation.

==================================================
14. LANDING PAGE
==================================================

Créer une landing page complète avec :

1. Navbar
- logo AgriWater ;
- Accueil ;
- Fonctionnalités ;
- Sécurité ;
- Tarifs ;
- Contact ;
- Se connecter ;
- Commencer gratuitement.

2. Hero
Titre :
« Gérez votre exploitation agricole avec plus de clarté et d’efficacité »

Sous-titre :
« AgriWater centralise vos activités, vos stocks, vos finances et votre consommation d’eau dans une plateforme sécurisée. »

Boutons :
- Commencer gratuitement ;
- Découvrir la plateforme.

Ajouter une maquette réaliste du dashboard.

3. Fonctionnalités
Présenter :
- dashboard ;
- stocks ;
- activités ;
- finances ;
- eau ;
- sécurité ;
- utilisateurs ;
- rapports.

4. Section sécurité
Expliquer :
- isolation des données ;
- rôles et permissions ;
- traçabilité ;
- plateforme multi-exploitations.

5. Fonctionnement
Présenter trois étapes :
- créer une exploitation ;
- ajouter les données ;
- piloter l’activité.

6. Appel à l’action
Titre :
« Prenez le contrôle de votre exploitation dès aujourd’hui »

Boutons :
- Commencer gratuitement ;
- Demander une démonstration.

7. Footer
Ajouter :
- description ;
- liens produit ;
- liens entreprise ;
- liens légaux ;
- contact ;
- réseaux sociaux.

==================================================
15. DESIGN VISUEL
==================================================

Utiliser un style :

- moderne ;
- naturel ;
- professionnel ;
- premium ;
- simple ;
- technologique ;
- adapté au secteur agricole.

Éviter :
- les couleurs trop vives ;
- les gradients excessifs ;
- les animations inutiles ;
- les textes trop longs ;
- les cartes surchargées ;
- les icônes sans label ;
- les petits boutons ;
- les tableaux illisibles ;
- les contrastes insuffisants ;
- les éléments qui bougent constamment ;
- les interfaces ressemblant à un template générique.

Utiliser :
- des cartes équilibrées ;
- des icônes cohérentes ;
- des graphiques lisibles ;
- des illustrations liées à l’eau et à l’agriculture ;
- des boutons d’action visibles ;
- des espacements réguliers ;
- des transitions courtes et discrètes.

==================================================
16. PERFORMANCE
==================================================

Optimiser le frontend avec :

- lazy loading des pages ;
- code splitting ;
- chargement différé des graphiques lourds ;
- images optimisées ;
- composants mémorisés uniquement si nécessaire ;
- pagination côté serveur pour les grands tableaux ;
- debounce sur les champs de recherche ;
- skeleton plutôt qu’un écran vide ;
- absence de layout shift ;
- gestion propre des erreurs réseau.

Ne pas ajouter d’animation si elle nuit aux performances ou à l’accessibilité.

Respecter prefers-reduced-motion.

==================================================
17. INTERNATIONALISATION ET FORMATS
==================================================

Préparer l’application pour plusieurs langues.

Langue initiale :
- français.

Prévoir la traduction de :
- boutons ;
- menus ;
- messages d’erreur ;
- notifications ;
- statuts ;
- labels ;
- textes d’aide.

Formater correctement :
- dates ;
- heures ;
- nombres ;
- montants ;
- unités ;
- pourcentages.

Utiliser des unités explicites :
- hectares ;
- litres ;
- mètres cubes ;
- kilogrammes ;
- ariary ou devise configurée ;
- litres par jour ;
- dépenses mensuelles.

==================================================
18. TESTS UI
==================================================

Ajouter des tests ou une checklist pour vérifier :

- navigation clavier ;
- focus visible ;
- fonctionnement mobile ;
- fonctionnement tablette ;
- fonctionnement desktop ;
- ouverture et fermeture des modales ;
- validation des formulaires ;
- affichage des erreurs ;
- affichage des états vides ;
- permissions ;
- changement d’exploitation ;
- suppression avec confirmation ;
- filtres ;
- pagination ;
- recherche ;
- chargement ;
- accessibilité des boutons ;
- accessibilité des tableaux ;
- absence de débordement horizontal.

==================================================
19. FORMAT DE RÉPONSE ATTENDU
==================================================

Retourner :

1. L’architecture des dossiers.
2. Les tokens du design system.
3. Les composants réutilisables.
4. Les pages principales.
5. Les routes.
6. Les types TypeScript.
7. Les données mockées.
8. Le code complet des composants importants.
9. Les états loading, empty, error et success.
10. Les explications d’intégration avec Laravel.
11. Les recommandations de sécurité backend.
12. Une checklist finale UI/UX et accessibilité.

Avant de générer le code, vérifier que :
- la navigation est cohérente ;
- l’action principale est toujours identifiable ;
- les utilisateurs comprennent où ils se trouvent ;
- les erreurs sont compréhensibles ;
- les données sont correctement contextualisées ;
- le design fonctionne sans souris ;
- le design fonctionne sur mobile ;
- les composants sont réutilisables ;
- l’interface respecte les principes d’IHM ;
- aucune information importante ne dépend uniquement de la couleur.