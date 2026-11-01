import { useCallback, useEffect, useState } from 'react'
import {
  Link,
  Outlet,
  createRootRouteWithContext,
} from '@tanstack/react-router'

import type { DataContext } from '#/data'
import type { Settings } from '#/domain/progress'
import { SettingsContext } from '#/lib/settings-context'

import '../styles.css'

export const Route = createRootRouteWithContext<{ data: DataContext }>()({
  loader: ({ context }) => context.data.progress.getSettings(),
  component: RootComponent,
})

function RootComponent() {
  const initial = Route.useLoaderData()
  const { data } = Route.useRouteContext()
  const [settings, setSettings] = useState<Settings>(initial)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch }
        void data.progress.saveSettings(next)
        return next
      })
    },
    [data],
  )

  return (
    <SettingsContext value={{ settings, update }}>
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-700">
          <Link to="/problems" search={{}} className="font-bold tracking-tight">
            algo<span className="text-amber-500">-dork</span>
          </Link>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700"
            onClick={() =>
              update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
            }
          >
            {settings.theme === 'dark' ? '☀ Light' : '☾ Dark'}
          </button>
        </header>
        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </SettingsContext>
  )
}
