// KSK Splash — the language picker. Fits in one viewport, no scrolling.

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import PoweredBy from '../components/PoweredBy.jsx'
import Mascot from '../components/Mascot.jsx'

const LANGS = [
  { code: 'en', native: 'English',   english: 'English'   },
  { code: 'hi', native: 'हिन्दी',     english: 'Hindi'     },
  { code: 'gu', native: 'ગુજરાતી',   english: 'Gujarati'  },
  { code: 'mr', native: 'मराठी',     english: 'Marathi'   },
  { code: 'te', native: 'తెలుగు',    english: 'Telugu'    },
  { code: 'ta', native: 'தமிழ்',     english: 'Tamil'     },
  { code: 'bn', native: 'বাংলা',     english: 'Bengali'   },
  { code: 'or', native: 'ଓଡ଼ିଆ',     english: 'Odia'      },
]

export default function SplashPage() {
  const { navigate, lang, setLang, isAuthenticated } = useApp()
  const [selected, setSelected] = useState(lang || 'en')

  const handleContinue = () => {
    setLang(selected)
    navigate(isAuthenticated ? 'home' : 'login')
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="w-full max-w-[480px] mx-auto flex flex-col h-full px-6 py-3">

        {/* Top: mascot + heading (compact) */}
        <div className="flex flex-col items-center text-center w-full flex-shrink-0">
          <Mascot size={200} className="-mb-2" />
          <h1 className="text-[22px] font-bold text-txt-primary leading-tight">Choose your language</h1>
          <p className="text-[12px] text-txt-secondary mt-0.5">You can change this anytime from the Settings.</p>
        </div>

        {/* Language grid — fills the middle, no scroll */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[400px] mx-auto mt-3 flex-1 content-center">
          {LANGS.map(l => {
            const active = selected === l.code
            return (
              <button
                key={l.code}
                onClick={() => setSelected(l.code)}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 py-2.5 px-2 transition-all active:scale-[0.97] ${
                  active ? 'bg-ok-light border-ok' : 'bg-white border-bdr hover:border-primary'
                }`}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-ok flex items-center justify-center">
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </span>
                )}
                <span className={`text-[15px] font-bold leading-tight ${active ? 'text-ok' : 'text-txt-primary'}`} style={{ fontFamily: 'Noto Sans, sans-serif' }}>
                  {l.native}
                </span>
                {l.code !== 'en' && (
                  <span className="text-[10px] text-txt-tertiary leading-tight mt-0.5">{l.english}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Continue + footer logos */}
        <div className="w-full max-w-[400px] mx-auto flex flex-col items-center gap-3 flex-shrink-0 pt-3 pb-2">
          <button
            onClick={handleContinue}
            className="w-full bg-primary text-white font-bold text-[15px] py-3 rounded-pill shadow-modal active:opacity-80 transition-opacity">
            Continue
          </button>
          <PoweredBy size={20} />
        </div>
      </div>
    </div>
  )
}
