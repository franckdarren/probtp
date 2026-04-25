"use client";
import { Bell } from "lucide-react";


export function Topbar() {

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div />

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
