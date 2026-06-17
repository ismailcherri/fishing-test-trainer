import { Link, useRouterState } from '@tanstack/react-router'
import { GraduationCap, ClipboardCheck, BookOpen } from 'lucide-react'

interface Tab {
  to: string
  label: string
  icon: React.ReactNode
  isActive: (pathname: string) => boolean
}

const tabs: Tab[] = [
  {
    to: '/',
    label: 'Train',
    icon: <GraduationCap className="w-5 h-5" />,
    isActive: (pathname) => pathname === '/' || pathname.startsWith('/train'),
  },
  {
    to: '/test',
    label: 'Test',
    icon: <ClipboardCheck className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/test'),
  },
  {
    to: '/questions',
    label: 'Questions',
    icon: <BookOpen className="w-5 h-5" />,
    isActive: (pathname) => pathname.startsWith('/questions'),
  },
]

export function BottomTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white z-50 pb-[env(safe-area-inset-bottom,0px)]">
      <div className="max-w-md mx-auto flex justify-around">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                active
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              <span className="mt-0.5">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
