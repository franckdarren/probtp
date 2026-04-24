'use server'

import { db } from '@/lib/db'
import { materials, materialEntries, users } from '@/lib/db/schema'
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

// --- Catalogue ---

export async function createMaterial(formData: FormData) {
  const dbUser = await getAuthUser()
  const name = formData.get('name') as string
  const unit = formData.get('unit') as string
  const unitPrice = formData.get('unitPrice') as string

  await db.insert(materials).values({
    name,
    unit,
    unitPrice,
    companyId: dbUser.companyId!,
  })

  revalidatePath('/materials')
}

export async function deleteMaterial(id: string) {
  await getAuthUser()
  await db.delete(materials).where(eq(materials.id, id))
  revalidatePath('/materials')
}

// --- Saisies ---

export async function createMaterialEntry(formData: FormData) {
  await getAuthUser()

  const projectId = formData.get('projectId') as string
  const materialId = formData.get('materialId') as string
  const quantity = formData.get('quantity') as string
  const dateStr = formData.get('date') as string

  const material = await db.query.materials.findFirst({ where: eq(materials.id, materialId) })
  if (!material) throw new Error('Matériau introuvable')

  const cost = (parseFloat(quantity) * parseFloat(material.unitPrice)).toString()

  await db.insert(materialEntries).values({
    projectId,
    materialId,
    quantity,
    unitPrice: material.unitPrice,
    cost,
    date: dateStr ? new Date(dateStr) : new Date(),
  })

  revalidatePath('/materials')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}

export async function deleteMaterialEntry(id: string, projectId: string) {
  await getAuthUser()
  await db.delete(materialEntries).where(eq(materialEntries.id, id))
  revalidatePath('/materials')
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
}
