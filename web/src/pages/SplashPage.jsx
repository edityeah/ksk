import { useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function SplashPage() {
  const { navigate, isAuthenticated } = useApp()
  useEffect(() => {
    const t = setTimeout(() => navigate(isAuthenticated ? 'home' : 'language', true), 1400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary-500 to-primary-700 text-white">
      <div className="tricolor-strip w-44 mb-8 rounded-full" />
      <div className="text-3xl font-bold tracking-tight">Kaushal Samiksha Kendra</div>
      <div className="text-sm uppercase tracking-widest mt-2 opacity-90">कौशल समीक्षा केंद्र</div>
      <div className="mt-10 text-xs opacity-80">NSDC · MSDE · Skill India</div>
      <div className="absolute bottom-8 text-xs opacity-70">Powered by SwiftChat</div>
    </div>
  )
}
