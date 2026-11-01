import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS } from '#/domain/progress'
import type { Settings } from '#/domain/progress'

export type SettingsValue = {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

export const SettingsContext = createContext<SettingsValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
})

export const useSettings = () => useContext(SettingsContext)
