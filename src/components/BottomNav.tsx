import { Home, PieChart, CreditCard, Settings } from 'lucide-react'

export type Tab = 'home' | 'reports' | 'installments' | 'settings'

interface BottomNavProps {
  activeTab: Tab
  setActiveTab: (tab: Tab) => void
}

const tabs = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'reports', label: 'Reportes', icon: PieChart },
  { id: 'installments', label: 'Meses', icon: CreditCard },
  { id: 'settings', label: 'Ajustes', icon: Settings },
] as const

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return <nav aria-label="Navegación principal" className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white pb-safe dark:border-slate-800 dark:bg-slate-900">
    <div className="mx-auto grid max-w-xl grid-cols-4">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} aria-haspopup={id === 'settings' ? 'dialog' : undefined} className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium focus-visible:outline-offset-[-3px] ${activeTab === id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
        <Icon size={22} aria-hidden="true" /><span>{label}</span>
      </button>)}
    </div>
  </nav>
}
