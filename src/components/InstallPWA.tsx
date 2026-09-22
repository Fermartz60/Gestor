import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: readonly string[]
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
    prompt(): Promise<void>
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
    appinstalled: Event
  }

  interface Window {
    onbeforeinstallprompt?: ((this: Window, event: BeforeInstallPromptEvent) => void) | null
  }
}

export default function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const busy = useRef(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const capturePrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      if (!standalone.matches) {
        setInstallPrompt(event)
        setError(null)
      }
    }
    const installed = () => { setInstallPrompt(null); setError(null) }
    const modeChanged = () => { if (standalone.matches) installed() }
    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', installed)
    standalone.addEventListener('change', modeChanged)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', installed)
      standalone.removeEventListener('change', modeChanged)
    }
  }, [])

  async function install() {
    if (!installPrompt || busy.current) return
    busy.current = true
    setInstalling(true)
    setError(null)
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
    } catch {
      setError('No se pudo abrir la instalación. Puedes intentarlo desde el menú del navegador.')
    } finally {
      // Un evento solo permite una solicitud, incluso si el usuario la descarta.
      setInstallPrompt(null)
      setInstalling(false)
      busy.current = false
    }
  }

  if (!installPrompt && !error) return null
  return <div className="flex flex-col gap-1">
    {installPrompt && <button type="button" onClick={install} disabled={installing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2f4f4f] px-3 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-[#243e3e] dark:bg-teal-700 dark:hover:bg-teal-600"><Download size={18} aria-hidden="true" />{installing ? 'Instalando…' : 'Instalar App'}</button>}
    {error && <p role="status" className="max-w-56 text-xs text-red-700 dark:text-red-300">{error}</p>}
  </div>
}
