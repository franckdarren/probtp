'use server'

import { db } from '@/lib/db'
import { projectImages, users } from '@/lib/db/schema'
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
  return { dbUser, supabase }
}

export async function uploadImage(projectId: string, formData: FormData) {
  const { supabase } = await getAuthUser()

  const file = formData.get('file') as File
  if (!file || file.size === 0) return

  const ext = file.name.split('.').pop()
  const path = `${projectId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('project-images')
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(error.message)

  // Store the storage path (not signed URL) for later re-signing
  await db.insert(projectImages).values({ projectId, url: path })

  revalidatePath(`/projects/${projectId}/media`)
}

export async function deleteImage(imageId: string, storagePath: string, projectId: string) {
  const { supabase } = await getAuthUser()

  await supabase.storage.from('project-images').remove([storagePath])
  await db.delete(projectImages).where(eq(projectImages.id, imageId))

  revalidatePath(`/projects/${projectId}/media`)
}
