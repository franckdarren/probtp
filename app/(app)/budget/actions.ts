'use server'

import { db } from '@/lib/db'
import { budgetItems, users } from '@/lib/db/schema'
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

export async function createBudgetItem(formData: FormData) {
  await getAuthUser()

  const projectId = formData.get('projectId') as string
  const label = formData.get('label') as string
  const amount = formData.get('amount') as string

  await db.insert(budgetItems).values({ projectId, label, amount })

  revalidatePath('/budget')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}

export async function deleteBudgetItem(id: string, projectId: string) {
  await getAuthUser()
  await db.delete(budgetItems).where(eq(budgetItems.id, id))
  revalidatePath('/budget')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}
