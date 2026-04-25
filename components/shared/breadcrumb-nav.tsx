'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Chantiers',
  budget: 'Budget',
  labor: 'Main-d\'œuvre',
  materials: 'Matériaux',
  settings: 'Paramètres',
  new: 'Nouveau chantier',
  media: 'Photos',
  export: 'Export',
}

export function BreadcrumbNav() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs: { label: string; href: string }[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const href = '/' + segments.slice(0, i + 1).join('/')

    // Skip UUID segments (project IDs) — show as "Détail chantier"
    const isUuid = /^[0-9a-f-]{36}$/.test(seg)
    const label = isUuid ? 'Détail' : (ROUTE_LABELS[seg] ?? seg)

    crumbs.push({ label, href })
  }

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
