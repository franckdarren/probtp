import { pgTable, pgEnum, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const roleEnum = pgEnum('role', ['ADMIN', 'MANAGER', 'SAISIE', 'LECTEUR'])

export const projectStatusEnum = pgEnum('project_status', [
  'planifié',
  'en cours',
  'en pause',
  'terminé',
  'annulé',
])

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  budgetThreshold: numeric('budget_threshold', { precision: 5, scale: 2 }).notNull().default('1.00'),
  skilledRate: numeric('skilled_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  unskilledRate: numeric('unskilled_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  authId: text('auth_id').notNull().unique(),
  name: text('name'),
  email: text('email').notNull(),
  role: roleEnum('role').notNull().default('LECTEUR'),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const trades = pgTable('trades', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  dailyRate: numeric('daily_rate', { precision: 10, scale: 2 }).notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  status: projectStatusEnum('status').notNull().default('planifié'),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  initialBudget: numeric('initial_budget', { precision: 12, scale: 2 }).notNull().default('0'),
  adjustment: numeric('adjustment', { precision: 12, scale: 2 }).notNull().default('0'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const budgetItems = pgTable('budget_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const laborEntries = pgTable('labor_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  workerId: text('worker_id').notNull(),
  tradeId: uuid('trade_id').notNull().references(() => trades.id, { onDelete: 'restrict' }),
  daysWorked: numeric('days_worked', { precision: 6, scale: 2 }).notNull(),
  cost: numeric('cost', { precision: 12, scale: 2 }).notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  date: timestamp('date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const projectImages = pgTable('project_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  url: text('url').notNull(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  trades: many(trades),
}))

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
}))

export const tradesRelations = relations(trades, ({ one, many }) => ({
  company: one(companies, { fields: [trades.companyId], references: [companies.id] }),
  laborEntries: many(laborEntries),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, { fields: [projects.companyId], references: [companies.id] }),
  budgetItems: many(budgetItems),
  laborEntries: many(laborEntries),
  images: many(projectImages),
}))

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  project: one(projects, { fields: [budgetItems.projectId], references: [projects.id] }),
}))

export const laborEntriesRelations = relations(laborEntries, ({ one }) => ({
  project: one(projects, { fields: [laborEntries.projectId], references: [projects.id] }),
  trade: one(trades, { fields: [laborEntries.tradeId], references: [trades.id] }),
}))

export const projectImagesRelations = relations(projectImages, ({ one }) => ({
  project: one(projects, { fields: [projectImages.projectId], references: [projects.id] }),
}))
