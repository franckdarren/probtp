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

| Couche          | Technologie                         |
| --------------- | ----------------------------------- |
| Frontend        | Next.js 14 (App Router)             |
| Backend         | Next.js Server Actions + API Routes |
| Base de données | Supabase (PostgreSQL)               |
| ORM             | Prisma                              |
| Auth            | Supabase Auth                       |
| Storage         | Supabase Storage                    |
| UI              | Tailwind CSS + shadcn/ui            |
| Langage         | TypeScript strict                   |

---

## 📁 Structure des Dossiers

```

├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              ← layout protégé (auth requise)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── media/page.tsx
│   │   ├── budget/page.tsx
│   │   ├── labor/page.tsx
│   │   └── settings/page.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               ← createBrowserClient
│   │   ├── server.ts               ← createServerClient (cookies)
│   │   └── middleware.ts
│   ├── prisma.ts                   ← singleton PrismaClient
│   └── utils.ts
├── components/
│   ├── ui/                         ← composants shadcn (auto-générés)
│   └── shared/                     ← composants métier réutilisables
middleware.ts                       ← protection routes (racine projet)
prisma/
└── schema.prisma
```

---

## 🧱 Schéma Base de Données

### Règles générales

- Tous les IDs sont des UUID (`@default(uuid())`)
- Suppressions en cascade (`onDelete: Cascade`) sur toutes les relations enfants
- `companyId` présent sur `Project` et `Trade` pour isolation multi-tenant
- `User.authId` = UID Supabase Auth (lien entre Supabase Auth et Prisma)

### Modèles

```prisma
enum Role {
  ADMIN     // accès total
  MANAGER   // gère ses chantiers
  SAISIE    // peut ajouter des données
  LECTEUR   // lecture seule
}

Company       → users[], projects[], trades[]
User          → authId (Supabase UID), role, companyId
Trade         → métier avec taux journalier, lié à une Company
Project       → chantier, lié à Company, a budgetItems[], laborEntries[], images[]
BudgetItem    → poste budgétaire d'un Project
LaborEntry    → entrée main-d'œuvre journalière d'un Project
ProjectImage  → photo d'un Project (URL Supabase Storage)
```

---

## 👥 Rôles Utilisateurs

| Rôle      | Permissions                                         |
| --------- | --------------------------------------------------- |
| `ADMIN`   | Tout faire (CRUD complet, paramètres, utilisateurs) |
| `MANAGER` | Gérer ses chantiers assignés                        |
| `SAISIE`  | Ajouter des données (labor, budget, images)         |
| `LECTEUR` | Consulter uniquement, aucune modification           |

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
- Le `middleware.ts` à la racine protège toutes les routes sauf `/login` et `/register`
- À la création du compte : onboarding obligatoire pour créer/rejoindre une Company
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

| Module       | Route                  | Description                             |
| ------------ | ---------------------- | --------------------------------------- |
| Dashboard    | `/dashboard`           | KPIs globaux, tableau chantiers actifs  |
| Chantiers    | `/projects`            | CRUD projets, statut, avancement, dates |
| Budget       | `/budget`              | Postes budgétaires, dépenses, écarts    |
| Main-d'œuvre | `/labor`               | Saisie ouvriers, jours, coûts auto      |
| Suivi visuel | `/projects/[id]/media` | Upload & galerie photos par chantier    |
| Paramètres   | `/settings`            | Infos entreprise, taux MO, métiers      |

### 🔜 Exclus (V2)

- Gestion des matériaux / anticipation retards IA
- Graphiques budget vs dépenses avancés
- Objectifs vs réalisé
- Répartition main-d'œuvre par métier
- Automatisation fournisseurs

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
- Toujours filtrer les requêtes Prisma par `companyId` de l'utilisateur connecté
- Le `budgetThreshold` de Company détermine le seuil d'alerte rouge (configurable par entreprise)
- `Trade` est lié à une `Company` — pas de trades globaux partagés entre entreprises

---

## 🚀 État d'Avancement

- [x] Spécifications validées
- [x] Stack technique définie
- [ ] Schéma Prisma finalisé
- [ ] Setup technique documenté
- [ ] Installation des dépendances
- [ ] Migration base de données
- [ ] Auth (login / register / onboarding)
- [ ] Dashboard
- [ ] Module Chantiers
- [ ] Module Budget
- [ ] Module Main-d'œuvre
- [ ] Module Suivi visuel
- [ ] Module Paramètres
