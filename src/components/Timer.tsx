import { useEffect, useState, useRef } from 'react'

interface TimerProps {
  totalSeconds: number
  running: boolean
  onExpire: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function Timer({ totalSeconds, running, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!expiredRef.current) {
            expiredRef.current = true
            setTimeout(() => onExpire(), 0)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, onExpire])

  const isLow = remaining < 300

  return (
    <div className="flex items-center gap-2">
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`text-lg font-mono font-bold ${isLow ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
        {formatTime(remaining)}
      </span>
    </div>
  )
}
