'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/ui/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createProject } from '@/app/(app)/projects/actions'

export function NewProjectModal({ label = 'Nouveau', variant = 'default' }: {
  label?: string
  variant?: 'default' | 'outline'
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className="gap-1.5">
          <Plus size={16} />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader className="mb-4">
          <DialogTitle>Nouveau chantier</DialogTitle>
        </DialogHeader>
        <form action={createProject} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom du chantier <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Construction immeuble R+4"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="initialBudget">Budget initial (FCFA)</Label>
            <Input
              id="initialBudget"
              name="initialBudget"
              type="number"
              min="0"
              step="1"
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Date de début</Label>
              <Input id="startDate" name="startDate" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Date de fin prévue</Label>
              <Input id="endDate" name="endDate" type="date" />
            </div>
          </div>

          <SubmitButton className="w-full">
            Créer le chantier
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  )
}
