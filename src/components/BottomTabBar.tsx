import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react'

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
    icon: <GraduationCap className="h-5 w-5" />,
    isActive: (pathname) => pathname === '/' || pathname.startsWith('/train'),
  },
  {
    to: '/test',
    label: 'Test',
    icon: <ClipboardCheck className="h-5 w-5" />,
    isActive: (pathname) => pathname.startsWith('/test'),
  },
  {
    to: '/questions',
    label: 'Questions',
    icon: <BookOpen className="h-5 w-5" />,
    isActive: (pathname) => pathname.startsWith('/questions'),
  },
  {
    to: '/summary',
    label: 'Summary',
    icon: <BarChart3 className="h-5 w-5" />,
    isActive: (pathname) => pathname.startsWith('/summary'),
  },
]

export function BottomTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Main navigation"
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto flex max-w-md justify-around">
        {tabs.map((tab) => {
          const active = tab.isActive(pathname)
          return (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center px-3 py-2 text-xs transition-colors ${
                active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
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
