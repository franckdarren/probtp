'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

type NavigationContextType = {
  pendingHref: string | null
  startNavigation: (href: string) => void
}

const NavigationContext = createContext<NavigationContextType>({
  pendingHref: null,
  startNavigation: () => {},
})

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  return (
    <NavigationContext.Provider value={{ pendingHref, startNavigation: setPendingHref }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return useContext(NavigationContext)
}
