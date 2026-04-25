'use client'

import { useEffect } from 'react'
import { useSidebar } from '@/components/ui/sidebar'

export function SwipeHandler() {
  const { setOpenMobile, isMobile } = useSidebar()

  useEffect(() => {
    if (!isMobile) return

    let startX = 0
    let startY = 0

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const endY = e.changedTouches[0].clientY
      const dx = endX - startX
      const dy = Math.abs(endY - startY)

      if (startX < 30 && dx > 60 && dy < 80) {
        setOpenMobile(true)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, setOpenMobile])

  return null
}
