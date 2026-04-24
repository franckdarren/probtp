'use server'

import { db } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCompanyAndUser(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const companyName = formData.get('companyName') as string

  const [company] = await db.insert(companies).values({
    name: companyName,
  }).returning()

  await db.insert(users).values({
    authId: user.id,
    email: user.email!,
    name: user.user_metadata?.name ?? null,
    role: 'ADMIN',
    companyId: company.id,
  })

  redirect('/dashboard')
}
