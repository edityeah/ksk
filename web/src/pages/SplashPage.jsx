// KSK Splash — the language picker, matching SwiftChat's design exactly.
// Logo + "Choose your language" + 2-col grid with checkmark + Continue button.

import { useState } from 'react'
import { Check } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import Logo from '../components/Logo.jsx'
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white overflow-y-auto" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="w-full max-w-[480px] flex flex-col items-center justify-between min-h-screen px-6 py-10 gap-10">

        {/* Top: mascot + logo + heading */}
        <div className="flex flex-col items-center text-center w-full">
          <Mascot size={160} className="mb-2" />
          <div className="mb-3"><Logo size={48} /></div>
          <h1 className="text-[22px] font-bold text-txt-primary mb-1">Choose your language</h1>
          <p className="text-[13px] text-txt-secondary">You can change this anytime from the Settings.</p>
        </div>

        {/* Language grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-[380px]">
          {LANGS.map(l => {
            const active = selected === l.code
            return (
              <button
                key={l.code}
                onClick={() => setSelected(l.code)}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 py-4 px-3 transition-all active:scale-[0.97] ${
                  active ? 'bg-ok-light border-ok' : 'bg-white border-bdr hover:border-primary'
                }`}
              >
                {active && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-ok flex items-center justify-center">
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </span>
                )}
                <span className={`text-[16px] font-bold ${active ? 'text-ok' : 'text-txt-primary'}`} style={{ fontFamily: 'Noto Sans, sans-serif' }}>
                  {l.native}
                </span>
                {l.code !== 'en' && (
                  <span className="text-[11px] text-txt-tertiary mt-0.5">{l.english}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Continue button */}
        <div className="w-full max-w-[380px] flex flex-col items-center gap-5">
          <button
            onClick={handleContinue}
            className="w-full bg-primary text-white font-bold text-[15px] py-3.5 rounded-pill shadow-modal active:opacity-80 transition-opacity">
            Continue
          </button>
          <PoweredBy size={22} layout="stack" />
        </div>
      </div>
    </div>
  )
}
