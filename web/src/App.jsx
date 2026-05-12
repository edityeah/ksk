import { useApp } from './context/AppContext.jsx'
import SplashPage from './pages/SplashPage.jsx'
import LanguagePage from './pages/LanguagePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import PhoneEntryPage from './pages/PhoneEntryPage.jsx'
import PhoneOtpPage from './pages/PhoneOtpPage.jsx'
import AadhaarEntryPage from './pages/AadhaarEntryPage.jsx'
import AadhaarOtpPage from './pages/AadhaarOtpPage.jsx'
import SidhRedirectPage from './pages/SidhRedirectPage.jsx'
import SidhVerifyingPage from './pages/SidhVerifyingPage.jsx'
import SidhResultPage from './pages/SidhResultPage.jsx'
import HomePage from './pages/HomePage.jsx'
import Toast from './components/Toast.jsx'
import CanvasPanel from './canvas/CanvasPanel.jsx'

const ROUTES = {
  splash: <SplashPage />,
  language: <LanguagePage />,
  login: <LoginPage />,
  phone_entry: <PhoneEntryPage />,
  phone_otp: <PhoneOtpPage />,
  aadhaar_entry: <AadhaarEntryPage />,
  aadhaar_otp: <AadhaarOtpPage />,
  sidh_redirect: <SidhRedirectPage />,
  sidh_verifying: <SidhVerifyingPage />,
  sidh_success: <SidhResultPage ok />,
  sidh_fail: <SidhResultPage ok={false} />,
  home: <HomePage />,
}

export default function App() {
  const { screen, canvas } = useApp()
  const content = ROUTES[screen] || <div className="p-6">Unknown screen: {screen}</div>

  return (
    <div className="min-h-screen bg-slate-50 text-txt-primary">
      {content}
      {canvas && <CanvasPanel />}
      <Toast />
    </div>
  )
}
