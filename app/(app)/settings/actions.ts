'use server'

import { db } from '@/lib/db'
import { companies, trades, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const dbUser = await db.query.users.findFirst({ where: eq(users.authId, user.id) })
  if (!dbUser?.companyId) redirect('/onboarding')
  return dbUser
}

export async function updateCompany(formData: FormData) {
  const dbUser = await getAuthUser()

  const name = formData.get('name') as string
  const skilledRate = formData.get('skilledRate') as string
  const unskilledRate = formData.get('unskilledRate') as string
  const budgetThreshold = formData.get('budgetThreshold') as string

  await db.update(companies)
    .set({ name, skilledRate, unskilledRate, budgetThreshold })
    .where(eq(companies.id, dbUser.companyId!))

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

export async function createTrade(formData: FormData) {
  const dbUser = await getAuthUser()

  const name = formData.get('name') as string
  const dailyRate = formData.get('dailyRate') as string

  await db.insert(trades).values({
    name,
    dailyRate,
    companyId: dbUser.companyId!,
  })

  revalidatePath('/settings')
}

export async function deleteTrade(id: string) {
  await getAuthUser()
  await db.delete(trades).where(eq(trades.id, id))
  revalidatePath('/settings')
}
