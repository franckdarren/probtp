'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ComponentProps, ReactNode } from 'react'

type Props = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  href: string
  isDownload?: boolean
  icon?: ReactNode
  children: ReactNode
}

export function LoadingLinkButton({ href, isDownload, icon, children, ...props }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    setLoading(true)
    if (isDownload) {
      window.location.href = href
      setTimeout(() => setLoading(false), 3000)
    } else {
      router.push(href)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} {...props}>
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </Button>
  )
}
