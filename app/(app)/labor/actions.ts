'use server'

import { db } from '@/lib/db'
import { laborEntries, trades, users } from '@/lib/db/schema'
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

export async function createLaborEntry(formData: FormData) {
  const dbUser = await getAuthUser()

  const projectId = formData.get('projectId') as string
  const workerId = formData.get('workerId') as string
  const tradeId = formData.get('tradeId') as string
  const daysWorked = formData.get('daysWorked') as string
  const dateStr = formData.get('date') as string

  const trade = await db.query.trades.findFirst({ where: eq(trades.id, tradeId) })
  if (!trade) throw new Error('Métier introuvable')

  const cost = (parseFloat(daysWorked) * parseFloat(trade.dailyRate)).toString()

  await db.insert(laborEntries).values({
    projectId,
    workerId,
    tradeId,
    daysWorked,
    cost,
    date: dateStr ? new Date(dateStr) : new Date(),
  })

  revalidatePath('/labor')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}

export async function deleteLaborEntry(id: string, projectId: string) {
  await getAuthUser()
  await db.delete(laborEntries).where(eq(laborEntries.id, id))
  revalidatePath('/labor')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}
