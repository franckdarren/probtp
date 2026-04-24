# CLAUDE.md — BTP SaaS · Contexte Projet

> Ce fichier est le contexte de référence pour Claude sur ce projet.
> Il doit être lu en priorité avant toute intervention sur le code.

---

## 🧠 Vision Produit

Application SaaS de **gestion et pilotage de chantiers BTP** pour entreprises gabonaises.

Objectif MVP : permettre à une entreprise BTP de savoir en temps réel :

- Combien elle dépense
- Où elle en est sur ses chantiers
- Combien lui coûtent ses équipes
- Si elle est en retard ou en dépassement budgétaire

---

## 🏗️ Stack Technique

| Couche           | Technologie                         |
| ---------------- | ----------------------------------- |
| Frontend         | Next.js 16 (App Router)             |
| Backend          | Next.js Server Actions + API Routes |
| Base de données | Supabase (PostgreSQL)               |
| ORM              | Drizzle ORM                         |
| Auth             | Supabase Auth                       |
| Storage          | Supabase Storage                    |
| UI               | Tailwind CSS + shadcn/ui            |
| Langage          | TypeScript strict                   |

---

## 📁 Structure des Dossiers

```

├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/
│   │       ├── page.tsx
│   │       └── actions.ts          ← Server Action : création Company + User
│   ├── (app)/
│   │   ├── layout.tsx              ← layout protégé (vérifie auth + user en base)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts          ← createProject, updateProject, deleteProject
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── media/
│   │   │           ├── page.tsx
│   │   │           └── actions.ts  ← uploadImage, deleteImage (Supabase Storage)
│   │   ├── budget/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts          ← createBudgetItem, deleteBudgetItem
│   │   ├── labor/
│   │   │   ├── page.tsx
│   │   │   └── actions.ts          ← createLaborEntry, deleteLaborEntry
│   │   └── settings/
│   │       ├── page.tsx
│   │       └── actions.ts          ← updateCompany, createTrade, deleteTrade
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← createBrowserClient
│   │   └── server.ts               ← createServerClient (cookies)
│   ├── db/
│   │   ├── index.ts                ← singleton Drizzle client
│   │   └── schema.ts               ← schéma Drizzle (tables, relations, enums)
│   └── utils.ts
├── components/
│   ├── ui/                         ← composants shadcn (auto-générés)
│   └── shared/
│       └── app-nav.tsx             ← nav bottom mobile + sidebar desktop
middleware.ts                       ← protection routes (racine projet)
drizzle/
└── migrations/                     ← fichiers de migration SQL générés
drizzle.config.ts                   ← configuration Drizzle Kit
```

---

## 🧱 Schéma Base de Données

### Règles générales

- Tous les IDs sont des UUID (`uuid('id').defaultRandom()`)
- Suppressions en cascade (`.references(() => table.id, { onDelete: 'cascade' })`) sur toutes les relations enfants
- `companyId` présent sur `Project` et `Trade` pour isolation multi-tenant
- `User.authId` = UID Supabase Auth (lien entre Supabase Auth et Drizzle)
- Schéma défini dans `lib/db/schema.ts`, migrations gérées via Drizzle Kit

### Modèles

```ts
// Enum Role (pgEnum)
export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'SAISIE', 'LECTEUR'])
// ADMIN   → accès total
// MANAGER → gère ses chantiers
// SAISIE  → peut ajouter des données
// LECTEUR → lecture seule

companies     → id, name, budgetThreshold, skilledRate, unskilledRate
users         → id, authId (Supabase UID), role, companyId (→ companies)
trades        → id, name, dailyRate, companyId (→ companies)
projects      → id, name, status, companyId (→ companies), budgetItems[], laborEntries[], images[]
budgetItems   → id, label, amount, projectId (→ projects)
laborEntries  → id, workerId, tradeId, daysWorked, cost (persisté), projectId (→ projects)
projectImages → id, url, projectId (→ projects)
```

---

## 👥 Rôles Utilisateurs

| Rôle       | Permissions                                          |
| ----------- | ---------------------------------------------------- |
| `ADMIN`   | Tout faire (CRUD complet, paramètres, utilisateurs) |
| `MANAGER` | Gérer ses chantiers assignés                       |
| `SAISIE`  | Ajouter des données (labor, budget, images)         |
| `LECTEUR` | Consulter uniquement, aucune modification            |

---

## 📐 Règles Métier

### Budget

```
budgetAdjusted  = initialBudget + adjustment
difference      = budgetAdjusted - actualExpenses
consumptionRate = actualExpenses / budgetAdjusted
```

### Statut Budget

```
consumptionRate < 0.80                      → "OK"      (vert)
0.80 ≤ consumptionRate < budgetThreshold    → "Alerte"  (orange)
consumptionRate ≥ budgetThreshold           → "Dépassé" (rouge)
```

### Main-d'œuvre

```
cost = daysWorked * dailyRate
```

> ⚠️ L'overtime est ignoré pour le MVP (champ présent en base mais non utilisé dans les calculs)

### Statuts Chantier

`planifié` | `en cours` | `en pause` | `terminé` | `annulé`

---

## 🔐 Authentification & Sécurité

- Auth gérée par **Supabase Auth**
- Le `middleware.ts` à la racine protège toutes les routes sauf `/login`, `/register` et `/onboarding`
- Le layout `(app)/layout.tsx` vérifie que l'utilisateur existe en base — sinon redirige vers `/onboarding`
- Flux onboarding : Supabase Auth → `/onboarding` → création Company + User en base → `/dashboard`
- Le premier utilisateur d'une Company est créé avec le rôle `ADMIN`
- Chaque requête serveur doit vérifier que l'utilisateur appartient à la bonne `companyId`
- Ne jamais exposer de données d'une autre entreprise (**isolation multi-tenant stricte**)

---

## 🗄️ Supabase Storage

- Bucket : `project-images`
- Accès : **privé** (URLs signées, pas d'accès public direct)
- Route media : `/projects/[id]/media`

---

## 📦 Modules Fonctionnels (MVP)

### ✅ Inclus MVP

| Module        | Route                    | Description                             |
| ------------- | ------------------------ | --------------------------------------- |
| Dashboard     | `/dashboard`           | KPIs globaux, tableau chantiers actifs  |
| Chantiers     | `/projects`            | CRUD projets, statut, avancement, dates |
| Budget        | `/budget`              | Postes budgétaires, dépenses, écarts |
| Main-d'œuvre | `/labor`               | Saisie ouvriers, jours, coûts auto     |
| Suivi visuel  | `/projects/[id]/media` | Upload & galerie photos par chantier    |
| Paramètres   | `/settings`            | Infos entreprise, taux MO, métiers     |

### 🔜 V2 — Roadmap

#### Priorité 1 — Valeur métier immédiate
- [ ] **Graphiques & analytiques** — courbes budget vs dépenses, taux de consommation par chantier
- [ ] **Gestion des matériaux** — saisie des achats matériaux, coût par chantier, stock simplifié
- [ ] **Export PDF/Excel** — rapport chantier (budget, MO, matériaux) exportable

#### Priorité 2 — Collaboration & équipe
- [ ] **Gestion multi-utilisateurs** — invitation par email, changement de rôle, liste des membres
- [ ] **Notifications & alertes** — email/push quand seuil budgétaire atteint ou chantier en retard

#### Priorité 3 — Pilotage avancé
- [ ] **Objectifs vs réalisé** — suivi avancement physique (%) par chantier
- [ ] **Répartition MO par métier** — analyse des coûts main-d'œuvre ventilée par trade
- [ ] **Anticipation retards IA** — détection automatique des risques de dépassement

#### Priorité 4 — Technique & infrastructure
- [ ] **Mode hors-ligne / PWA** — cache stratégique pour utilisation sur chantier sans réseau
- [ ] **Automatisation fournisseurs** — commandes, relances, suivi livraisons

---

## 📱 Principes de Développement

1. **Mobile-first** — l'app est utilisée sur chantier, donc sur téléphone
2. **Offline-ready** — prévoir le mode hors-ligne (PWA ou cache stratégique)
3. **Calculs côté serveur** — jamais de calculs critiques uniquement côté client
4. **Simplicité UX** — pas de complexité inutile, l'utilisateur est sur le terrain
5. **TypeScript strict** — tout est typé, pas de `any`
6. **Architecture modulaire** — un composant = une responsabilité
7. **Éviter l'over-engineering** — on construit ce dont on a besoin maintenant

---

## 🌍 Contexte Métier

- Pays par défaut : **Gabon**
- Devise par défaut : **FCFA**
- Les taux journaliers ouvriers sont définis dans les paramètres entreprise (`skilledRate`, `unskilledRate`)
- Les métiers (`Trade`) sont créés par l'entreprise et réutilisés dans les saisies MO

---

## ⚠️ Points d'Attention

- `LaborEntry.cost` est **persisté en base** (pas calculé à la volée) pour conserver l'historique même si les taux changent ultérieurement
- `User.authId` doit être synchronisé avec Supabase Auth à la création du compte
- Toujours filtrer les requêtes Drizzle par `companyId` de l'utilisateur connecté
- Le `budgetThreshold` de Company détermine le seuil d'alerte rouge (configurable par entreprise)
- `Trade` est lié à une `Company` — pas de trades globaux partagés entre entreprises
- Utiliser `drizzle-kit generate` pour créer les migrations et `drizzle-kit migrate` pour les appliquer

---

## 🚀 État d'Avancement

### MVP — Terminé
- [X] Spécifications validées
- [X] Stack technique définie
- [X] Schéma Drizzle finalisé (`lib/db/schema.ts`)
- [X] Configuration Drizzle Kit (`drizzle.config.ts`)
- [X] Setup technique documenté
- [X] Installation des dépendances (`drizzle-orm`, `drizzle-kit`, `postgres`)
- [X] Migration base de données
- [X] Auth (login / register / onboarding)
- [X] Dashboard
- [X] Module Chantiers
- [X] Module Budget
- [X] Module Main-d'œuvre
- [X] Module Suivi visuel
- [X] Module Paramètres

### V2 — Priorité 1 (valeur métier immédiate)
- [ ] Graphiques & analytiques (courbes budget vs dépenses par chantier)
- [ ] Gestion des matériaux (saisie achats, coût par chantier)
- [ ] Export PDF/Excel (rapport chantier complet)

### V2 — Priorité 2 (collaboration & équipe)
- [ ] Gestion multi-utilisateurs (invitation email, changement de rôle)
- [ ] Notifications & alertes (email/push sur dépassement budget)

### V2 — Priorité 3 (pilotage avancé)
- [ ] Objectifs vs réalisé (avancement physique % par chantier)
- [ ] Répartition MO par métier (analyse coûts ventilée par trade)
- [ ] Anticipation retards IA (détection risques de dépassement)

### V2 — Priorité 4 (technique & infrastructure)
- [ ] Mode hors-ligne / PWA (cache stratégique sans réseau)
- [ ] Automatisation fournisseurs (commandes, relances, livraisons)
