import { createFileRoute, Outlet } from '@tanstack/react-router'
import { BottomTabBar } from '#/components/BottomTabBar'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]">
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  )
}
