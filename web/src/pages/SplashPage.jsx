// KSK Splash — language picker. Everything stacks tightly from the top with
// minimal whitespace; PoweredBy logos sit at the bottom. No scroll.

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
      <div className="w-full max-w-[480px] mx-auto h-full flex flex-col px-5 py-3">

        {/* Mascot */}
        <div className="flex justify-center flex-shrink-0">
          <Mascot size={220} />
        </div>

        {/* Heading — sits immediately below mascot */}
        <div className="text-center flex-shrink-0 -mt-2">
          <h1 className="text-[22px] font-bold text-txt-primary leading-tight">Choose your language</h1>
          <p className="text-[12px] text-txt-secondary mt-0.5">You can change this anytime from the Settings.</p>
        </div>

        {/* Language grid — natural height, immediately below heading */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-[400px] mx-auto mt-4 flex-shrink-0">
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

        {/* Continue — right under the grid */}
        <button
          onClick={handleContinue}
          className="w-full max-w-[400px] mx-auto mt-4 bg-primary text-white font-bold text-[15px] py-3 rounded-pill shadow-modal active:opacity-80 transition-opacity flex-shrink-0">
          Continue
        </button>

        {/* PoweredBy — sits right below Continue */}
        <div className="flex justify-center mt-3 flex-shrink-0">
          <PoweredBy size={28} />
        </div>
      </div>
    </div>
  )
}
