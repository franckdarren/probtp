'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { useState } from 'react'

interface DeleteConfirmModalProps {
  action: () => Promise<unknown>
  description?: string
  triggerLabel?: string
}

export function DeleteConfirmModal({ action, description, triggerLabel }: DeleteConfirmModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {triggerLabel ? (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={16} />
          {triggerLabel}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 size={14} />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-3">
            {description ?? 'Cette action est irréversible.'}
          </p>
          <div className="flex gap-2 mt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1">
                Annuler
              </Button>
            </DialogClose>
            <form action={async () => { await action() }} className="flex-1">
              <SubmitButton variant="destructive" className="w-full text-white">
                Supprimer
              </SubmitButton>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
