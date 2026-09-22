import { useEffect, useState } from 'react'
import './theme-switch.css'

export interface ThemeToggleProps { onThemeChange: (dark: boolean) => void }

export default function ThemeToggle({ onThemeChange }: ThemeToggleProps) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('balance.theme') === 'dark' }
    catch { return document.documentElement.classList.contains('dark') }
  })
  const [error, setError] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    onThemeChange(dark)
  }, [dark, onThemeChange])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'balance.theme' || event.key === null) setDark(event.newValue === 'dark')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  function toggle(next: boolean) {
    setDark(next)
    try { localStorage.setItem('balance.theme', next ? 'dark' : 'light'); setError(false) }
    catch { setError(true) }
  }
  return <div className="flex flex-col gap-1">
    <div className="flex h-11 w-[68px] items-center justify-center">
    <label className="switch origin-center scale-75" title="Alternar modo oscuro">
      <input className="switch__input" type="checkbox" role="switch" aria-label="Modo oscuro" checked={dark} onChange={event => toggle(event.target.checked)} />
      <span className="switch__icon" aria-hidden="true">{Array.from({ length: 11 }, (_, index) => <span key={index} className={`switch__icon-part switch__icon-part--${index + 1}`} />)}</span>
      <span className="switch__sr">Modo oscuro</span>
    </label>
    </div>
    {error && <span role="status" className="max-w-40 text-xs text-amber-700 dark:text-amber-200">El tema se aplicó, pero no se pudo guardar.</span>}
  </div>
}
