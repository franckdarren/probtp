'use server'

import { db } from '@/lib/db'
import { projects, users } from '@/lib/db/schema'
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

export async function createProject(formData: FormData) {
  const dbUser = await getAuthUser()

  const name = formData.get('name') as string
  const initialBudget = formData.get('initialBudget') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  const [project] = await db.insert(projects).values({
    name,
    companyId: dbUser.companyId!,
    initialBudget: initialBudget || '0',
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
  }).returning()

  revalidatePath('/projects')
  redirect(`/projects/${project.id}`)
}

export async function updateProject(id: string, formData: FormData) {
  const dbUser = await getAuthUser()

  const name = formData.get('name') as string
  const status = formData.get('status') as string
  const initialBudget = formData.get('initialBudget') as string
  const adjustment = formData.get('adjustment') as string
  const startDate = formData.get('startDate') as string
  const endDate = formData.get('endDate') as string

  await db.update(projects)
    .set({
      name,
      status: status as typeof projects.$inferInsert.status,
      initialBudget: initialBudget || '0',
      adjustment: adjustment || '0',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    })
    .where(eq(projects.id, id))

  revalidatePath(`/projects/${id}`)
  revalidatePath('/projects')
  revalidatePath('/dashboard')
}

export async function deleteProject(id: string) {
  await getAuthUser()
  await db.delete(projects).where(eq(projects.id, id))
  revalidatePath('/projects')
  revalidatePath('/dashboard')
  redirect('/projects')
}
