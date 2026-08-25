// "An initiative of NSDC" badge used in auth screens & headers.
import NsdcLogo from './NsdcLogo.jsx'

export default function PoweredBy({ size = 22, className = '', layout = 'row' }) {
  if (layout === 'stack') {
    return (
      <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
        <div className="text-[10px] uppercase tracking-wider text-txt-tertiary font-semibold">An initiative of</div>
        <NsdcLogo size={size + 6} />
      </div>
    )
  }
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <NsdcLogo size={size + 4} />
    </div>
  )
}
