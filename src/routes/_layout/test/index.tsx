import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_layout/test/')({
  component: TestPage,
})

function TestPage() {
  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900 mb-2">Test Mode</h1>
      <p className="text-gray-500">Coming soon</p>
    </div>
  )
}
