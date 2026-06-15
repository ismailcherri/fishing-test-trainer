import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  )
}
