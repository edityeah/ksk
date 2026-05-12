// NSDC brand mark — multi-colour stick figure with raised arms + N·S·D·C
// wordmark and "National Skill Development Corporation" tagline.

export default function NsdcLogo({ size = 32, showText = true, vertical = false }) {
  // Stick figure with four people in raised-arm pose, in NSDC brand palette.
  const icon = (
    <svg width={size} height={size} viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* central blue figure */}
      <g stroke="#1F66B4" strokeWidth="6" strokeLinecap="round" fill="none">
        <circle cx="40" cy="22" r="6" fill="#1F66B4" stroke="none" />
        <line x1="40" y1="30" x2="40" y2="56" />
        <line x1="40" y1="38" x2="28" y2="20" />
        <line x1="40" y1="38" x2="52" y2="20" />
        <line x1="40" y1="56" x2="30" y2="74" />
        <line x1="40" y1="56" x2="50" y2="74" />
      </g>
      {/* red figure right */}
      <g stroke="#E53935" strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="62" cy="30" r="4" fill="#E53935" stroke="none" />
        <line x1="62" y1="35" x2="62" y2="52" />
        <line x1="62" y1="40" x2="74" y2="28" />
      </g>
      {/* green figure left */}
      <g stroke="#43A047" strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="18" cy="30" r="4" fill="#43A047" stroke="none" />
        <line x1="18" y1="35" x2="18" y2="52" />
        <line x1="18" y1="40" x2="6" y2="28" />
      </g>
    </svg>
  )

  if (!showText) return icon

  const fontMain = Math.max(10, Math.round(size * 0.42))
  const fontSub  = Math.max(8, Math.round(size * 0.26))

  if (vertical) {
    return (
      <div className="inline-flex flex-col items-center gap-1">
        {icon}
        <div className="leading-none" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: fontMain, letterSpacing: '2px', color: '#0F172A' }}>
          N<span style={{ color: '#E53935' }}>·</span>S<span style={{ color: '#E53935' }}>·</span>D<span style={{ color: '#E53935' }}>·</span>C
        </div>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2">
      {icon}
      <div className="flex flex-col leading-tight">
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: fontMain, letterSpacing: '2px', color: '#0F172A', lineHeight: 1 }}>
          N<span style={{ color: '#E53935' }}>·</span>S<span style={{ color: '#E53935' }}>·</span>D<span style={{ color: '#E53935' }}>·</span>C
        </div>
        <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: fontSub, color: '#1F66B4', marginTop: 2, lineHeight: 1.1 }}>
          National Skill Development Corporation
        </div>
      </div>
    </div>
  )
}
