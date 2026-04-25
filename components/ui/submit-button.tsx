'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ComponentProps } from 'react'

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, 'type' | 'disabled'>

export function SubmitButton({ children, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className={className} {...props}>
      {pending ? <Loader2 size={16} className="animate-spin" /> : children}
    </Button>
  )
}
