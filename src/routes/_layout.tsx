import { BottomTabBar } from '#/components/BottomTabBar'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout')({
  component: LayoutComponent,
})

function LayoutComponent() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-gray-50">
      <div className="pt-[env(safe-area-inset-top,0px)] pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  )
}
