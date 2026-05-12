import { useApp } from './context/AppContext.jsx'
import SplashPage from './pages/SplashPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PhoneEntryPage from './pages/PhoneEntryPage.jsx'
import PhoneOtpPage from './pages/PhoneOtpPage.jsx'
import AadhaarEntryPage from './pages/AadhaarEntryPage.jsx'
import AadhaarOtpPage from './pages/AadhaarOtpPage.jsx'
import SidhPartnerSelectPage from './pages/SidhPartnerSelectPage.jsx'
import SidhRedirectPage from './pages/SidhRedirectPage.jsx'
import SidhVerifyingPage from './pages/SidhVerifyingPage.jsx'
import SidhResultPage from './pages/SidhResultPage.jsx'
import HomePage from './pages/HomePage.jsx'
import Toast from './components/Toast.jsx'
import CanvasPanel from './canvas/CanvasPanel.jsx'

const ROUTES = {
  splash: <SplashPage />,
  login: <LoginPage />,
  phone_entry: <PhoneEntryPage />,
  phone_otp: <PhoneOtpPage />,
  aadhaar_entry: <AadhaarEntryPage />,
  aadhaar_otp: <AadhaarOtpPage />,
  sidh_partners: <SidhPartnerSelectPage />,
  sidh_redirect: <SidhRedirectPage />,
  sidh_verifying: <SidhVerifyingPage />,
  sidh_success: <SidhResultPage ok />,
  sidh_fail: <SidhResultPage ok={false} />,
  home: <HomePage />,
}

const AUTH_SCREENS = new Set(['splash', 'login', 'phone_entry', 'phone_otp', 'aadhaar_entry', 'aadhaar_otp', 'sidh_partners', 'sidh_redirect', 'sidh_verifying', 'sidh_success', 'sidh_fail'])

export default function App() {
  const { screen, canvas } = useApp()
  const content = ROUTES[screen] || <div className="p-6">Unknown screen: {screen}</div>
  const isAuth = AUTH_SCREENS.has(screen)
  const isFull = isAuth || screen === 'home'

  return (
    <div className="min-h-screen text-txt-primary" style={{ background: '#F4F6FA', fontFamily: 'Montserrat, sans-serif' }}>
      <div className={isFull ? 'min-h-screen' : 'min-h-screen max-w-[420px] mx-auto bg-white shadow-card'}>
        {content}
      </div>
      {canvas && <CanvasPanel />}
      <Toast />
    </div>
  )
}
