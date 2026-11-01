import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/problems/$slug')({
  component: () => <div className="p-6">Workspace placeholder</div>,
})
