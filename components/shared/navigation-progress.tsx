'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigation } from '@/lib/navigation-context'

export function NavigationProgress() {
  const { pendingHref } = useNavigation()
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const isNavigatingRef = useRef(false)

  useEffect(() => {
    if (pendingHref) {
      isNavigatingRef.current = true
      setVisible(true)
      setWidth(0)
      // Two-step animation: quick jump then slow crawl
      const t1 = setTimeout(() => setWidth(25), 20)
      const t2 = setTimeout(() => setWidth(75), 300)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }

    if (isNavigatingRef.current) {
      isNavigatingRef.current = false
      setWidth(100)
      const t = setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 350)
      return () => clearTimeout(t)
    }
  }, [pendingHref])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-[2px] pointer-events-none">
      <div
        className="h-full bg-primary"
        style={{
          width: `${width}%`,
          transition: width === 100
            ? 'width 200ms ease-in'
            : 'width 600ms cubic-bezier(0.05, 0.8, 0.2, 1)',
        }}
      />
    </div>
  )
}
