import { db } from '@/lib/db'
import { projectImages, projects } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { deleteImage, uploadImage } from './actions'

export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: { images: { orderBy: (i, { desc }) => [desc(i.createdAt)] } },
  })

  if (!project) notFound()

  // Générer des URLs signées pour chaque image
  const imagesWithUrls = await Promise.all(
    project.images.map(async (img) => {
      const { data } = await supabase.storage
        .from('project-images')
        .createSignedUrl(img.url, 3600)
      return { ...img, signedUrl: data?.signedUrl ?? null }
    })
  )

  const uploadAction = uploadImage.bind(null, id)

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Photos du chantier
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.name}
        </p>
      </div>
      

      {/* Upload */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
        <form action={uploadAction} encType="multipart/form-data" className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Ajouter une photo
            </label>
            <input
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              required
              className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Uploader
          </button>
        </form>
      </div>

      {/* Galerie */}
      {imagesWithUrls.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">Aucune photo pour ce chantier</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {imagesWithUrls.map((img) => {
            const deleteAction = deleteImage.bind(null, img.id, img.url, id)
            return (
              <div key={img.id} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
                {img.signedUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.signedUrl}
                    alt="Photo chantier"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end justify-end p-2">
                  <form action={deleteAction}>
                    <button
                      type="submit"
                      className="opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-full text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </form>
                </div>
                <p className="absolute bottom-0 left-0 right-0 text-[10px] text-white bg-black/40 px-2 py-1">
                  {new Date(img.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
