// Chalk-style SVG diagrams for the ARISE MX classroom blackboard.
//
// One React component per diagram id in the ARISE catalogue. Each is a real
// SVG with hand-drawn stroke weights, a slight tremor via `filter: url(#chalk-rough)`,
// and chalk-white / chalk-yellow on the classroom's dark-green ground.
//
// Rendered by AriseClassroomCanvas whenever a board block of kind='diagram'
// arrives (either from a voice-tool call or a text-mode <<<DIAGRAM>>>id<<<END>>>
// fence). Falls back to a small "diagram not available" note if id is unknown.

// Shared filter — subtle turbulence gives every stroke a chalky, roughened
// edge. Defined once in the wrapper so all diagrams reuse it via url(#chalk-rough).
const RoughFilter = () => (
  <defs>
    <filter id="chalk-rough" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" />
    </filter>
    <filter id="chalk-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="0.4" />
      <feComposite in="SourceGraphic" operator="over" />
    </filter>
  </defs>
)

// ── Palette ─────────────────────────────────────────────────────────────
const CHALK = '#F5EED2'   // main chalk white (warm cream)
const YELLOW = '#FDE68A'   // accent chalk yellow
const RED    = '#FCA5A5'   // for errors / danger callouts
const GREEN  = '#86EFAC'   // for "correct" / OK callouts
const DIM    = 'rgba(245,238,210,0.55)'  // dimmed chalk (secondary labels)

// Chalky text — a helper so we're consistent across diagrams.
const ChalkText = (props) => (
  <text
    fill={props.fill || CHALK}
    fontFamily="'Caveat', 'Comic Sans MS', 'Marker Felt', cursive"
    fontSize={props.size || 16}
    textAnchor={props.anchor || 'middle'}
    filter="url(#chalk-glow)"
    {...props}
  >
    {props.children}
  </text>
)

// Chalky stroke line
const ChalkLine = (props) => (
  <line
    stroke={props.stroke || CHALK}
    strokeWidth={props.width || 2}
    strokeLinecap="round"
    filter="url(#chalk-rough)"
    {...props}
  />
)

// ── Individual diagrams ─────────────────────────────────────────────────

function OhmsLawDiagram() {
  // A chalk triangle with V, I × R at the vertices — the classroom mnemonic.
  return (
    <svg viewBox="0 0 320 240" width="100%" style={{ maxHeight: 260 }}>
      <RoughFilter />
      <ChalkText x={160} y={30} size={22} fill={YELLOW}>Ohm's Law</ChalkText>

      {/* Triangle */}
      <polygon points="160,58 60,200 260,200"
        fill="rgba(245,238,210,0.05)" stroke={CHALK} strokeWidth="2.5"
        strokeLinejoin="round" filter="url(#chalk-rough)" />

      {/* Divider inside — horizontal line under V, vertical between I and R */}
      <ChalkLine x1={100} y1={140} x2={220} y2={140} width={2.2} />
      <ChalkLine x1={160} y1={140} x2={160} y2={200} width={2.2} />

      <ChalkText x={160} y={110} size={40}>V</ChalkText>
      <ChalkText x={130} y={185} size={28}>I</ChalkText>
      <ChalkText x={190} y={185} size={28} fill={YELLOW}>R</ChalkText>

      <ChalkText x={160} y={224} size={15} fill={DIM}>V = I × R    ·    cover any one to find its formula</ChalkText>
    </svg>
  )
}

function SeriesCircuitDiagram() {
  return (
    <svg viewBox="0 0 380 200" width="100%" style={{ maxHeight: 240 }}>
      <RoughFilter />
      <ChalkText x={190} y={26} size={20} fill={YELLOW}>Series circuit</ChalkText>

      {/* Rails */}
      <ChalkLine x1={30} y1={60} x2={30} y2={140} width={2} />       {/* battery + terminal */}
      <ChalkLine x1={30} y1={60} x2={90} y2={60} />                   {/* top wire */}
      <ChalkLine x1={30} y1={140} x2={350} y2={140} />                {/* bottom return wire */}
      <ChalkLine x1={310} y1={60} x2={350} y2={60} />                 {/* top wire to end */}
      <ChalkLine x1={350} y1={60} x2={350} y2={140} />                {/* right rail */}

      {/* Battery */}
      <ChalkLine x1={22} y1={80} x2={38} y2={80} width={3} />
      <ChalkLine x1={26} y1={95} x2={34} y2={95} width={2} />
      <ChalkLine x1={22} y1={110} x2={38} y2={110} width={3} />
      <ChalkLine x1={26} y1={125} x2={34} y2={125} width={2} />
      <ChalkText x={12} y={100} size={14} anchor="end" fill={DIM}>+</ChalkText>
      <ChalkText x={12} y={130} size={14} anchor="end" fill={DIM}>−</ChalkText>

      {/* Three resistors in series (zigzag) */}
      <Resistor x={90} y={60} label="R1" />
      <Resistor x={170} y={60} label="R2" />
      <Resistor x={250} y={60} label="R3" />

      {/* Current arrow */}
      <ChalkLine x1={200} y1={155} x2={260} y2={155} stroke={YELLOW} width={2} />
      <polyline points="255,148 265,155 255,162" stroke={YELLOW} strokeWidth={2}
        fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#chalk-rough)" />
      <ChalkText x={220} y={175} size={14} fill={YELLOW}>current I  (same everywhere)</ChalkText>
    </svg>
  )
}

function ParallelCircuitDiagram() {
  return (
    <svg viewBox="0 0 380 240" width="100%" style={{ maxHeight: 260 }}>
      <RoughFilter />
      <ChalkText x={190} y={26} size={20} fill={YELLOW}>Parallel circuit</ChalkText>

      {/* Battery on the left */}
      <ChalkLine x1={30} y1={60} x2={30} y2={200} width={2} />
      <ChalkLine x1={22} y1={110} x2={38} y2={110} width={3} />
      <ChalkLine x1={26} y1={122} x2={34} y2={122} width={2} />
      <ChalkLine x1={22} y1={134} x2={38} y2={134} width={3} />
      <ChalkText x={12} y={124} size={14} anchor="end" fill={DIM}>V</ChalkText>

      {/* Top + bottom rails */}
      <ChalkLine x1={30} y1={60} x2={330} y2={60} />
      <ChalkLine x1={30} y1={200} x2={330} y2={200} />
      <ChalkLine x1={330} y1={60} x2={330} y2={200} />

      {/* Three parallel branches */}
      <ChalkLine x1={100} y1={60} x2={100} y2={90} />
      <ChalkLine x1={100} y1={170} x2={100} y2={200} />
      <VerticalResistor x={100} y={90} label="R1" />

      <ChalkLine x1={190} y1={60} x2={190} y2={90} />
      <ChalkLine x1={190} y1={170} x2={190} y2={200} />
      <VerticalResistor x={190} y={90} label="R2" />

      <ChalkLine x1={280} y1={60} x2={280} y2={90} />
      <ChalkLine x1={280} y1={170} x2={280} y2={200} />
      <VerticalResistor x={280} y={90} label="R3" />

      <ChalkText x={190} y={225} size={13} fill={DIM}>voltage V is the same across each branch</ChalkText>
    </svg>
  )
}

function ResistorSymbolDiagram() {
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxHeight: 280 }}>
      <RoughFilter />
      <ChalkText x={190} y={26} size={20} fill={YELLOW}>Resistor symbols</ChalkText>

      {/* Fixed */}
      <g transform="translate(20,70)">
        <ChalkLine x1={0} y1={20} x2={30} y2={20} />
        <polyline points="30,20 40,10 60,30 80,10 100,30 120,10 130,20"
          stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkLine x1={130} y1={20} x2={160} y2={20} />
        <ChalkText x={80} y={-8} size={14} fill={YELLOW}>Fixed resistor</ChalkText>
        <ChalkText x={80} y={55} size={12} fill={DIM}>value printed on body via colour bands</ChalkText>
      </g>

      {/* Variable (rheostat) */}
      <g transform="translate(200,70)">
        <ChalkLine x1={0} y1={20} x2={30} y2={20} />
        <polyline points="30,20 40,10 60,30 80,10 100,30 120,10 130,20"
          stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkLine x1={130} y1={20} x2={160} y2={20} />
        {/* Arrow through the resistor */}
        <ChalkLine x1={80} y1={45} x2={80} y2={0} stroke={YELLOW} width={2.5} />
        <polyline points="72,10 80,-3 88,10" stroke={YELLOW} strokeWidth={2.5}
          fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkText x={80} y={-8} size={14} fill={YELLOW}>Variable (rheostat)</ChalkText>
        <ChalkText x={80} y={55} size={12} fill={DIM}>adjust the resistance manually</ChalkText>
      </g>

      {/* Preset (trimmer) */}
      <g transform="translate(20,180)">
        <ChalkLine x1={0} y1={20} x2={30} y2={20} />
        <polyline points="30,20 40,10 60,30 80,10 100,30 120,10 130,20"
          stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkLine x1={130} y1={20} x2={160} y2={20} />
        <ChalkLine x1={80} y1={45} x2={80} y2={0} stroke={YELLOW} width={2.5} />
        <ChalkText x={78} y={7} size={16} fill={YELLOW} anchor="start">┤</ChalkText>
        <ChalkText x={80} y={-8} size={14} fill={YELLOW}>Preset (trimmer)</ChalkText>
        <ChalkText x={80} y={55} size={12} fill={DIM}>calibrated once at factory / repair</ChalkText>
      </g>

      {/* Photoresistor / LDR */}
      <g transform="translate(200,180)">
        <circle cx={80} cy={20} r={30} fill="none" stroke={CHALK} strokeWidth={2}
          filter="url(#chalk-rough)" />
        <ChalkLine x1={0} y1={20} x2={50} y2={20} />
        <polyline points="55,20 65,10 80,30 95,10 105,20"
          stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkLine x1={110} y1={20} x2={160} y2={20} />
        {/* Light-arrows into the circle */}
        <ChalkLine x1={35} y1={-5} x2={55} y2={10} stroke={YELLOW} width={1.8} />
        <ChalkLine x1={45} y1={-5} x2={65} y2={10} stroke={YELLOW} width={1.8} />
        <ChalkText x={80} y={-8} size={14} fill={YELLOW}>LDR / photoresistor</ChalkText>
      </g>
    </svg>
  )
}

// Zigzag resistor primitive (horizontal), used by circuit diagrams
function Resistor({ x, y, label }) {
  return (
    <g transform={`translate(${x - 30},${y})`}>
      <polyline points="0,0 8,-10 24,10 40,-10 56,10 60,0"
        stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
        strokeLinejoin="round" filter="url(#chalk-rough)" />
      {label && <ChalkText x={30} y={-16} size={15} fill={YELLOW}>{label}</ChalkText>}
    </g>
  )
}

// Vertical zigzag resistor primitive
function VerticalResistor({ x, y, label }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <polyline points="0,0 -10,8 10,24 -10,40 10,56 0,60"
        stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
        strokeLinejoin="round" filter="url(#chalk-rough)" />
      {label && <ChalkText x={22} y={35} size={15} fill={YELLOW} anchor="start">{label}</ChalkText>}
    </g>
  )
}

function MultimeterDiagram() {
  return (
    <svg viewBox="0 0 320 260" width="100%" style={{ maxHeight: 300 }}>
      <RoughFilter />
      <ChalkText x={160} y={24} size={20} fill={YELLOW}>Digital multimeter</ChalkText>

      {/* Body */}
      <rect x={40} y={40} width={240} height={200} rx={12} fill="none"
        stroke={CHALK} strokeWidth={2.5} filter="url(#chalk-rough)" />

      {/* Display */}
      <rect x={60} y={60} width={200} height={54} rx={4} fill="rgba(245,238,210,0.06)"
        stroke={CHALK} strokeWidth={1.5} filter="url(#chalk-rough)" />
      <ChalkText x={160} y={100} size={30} fill={YELLOW} anchor="middle">1 2 3 . 4</ChalkText>
      <ChalkText x={244} y={82} size={12} fill={DIM}>V DC</ChalkText>

      {/* Rotary selector */}
      <circle cx={160} cy={162} r={38} fill="none" stroke={CHALK} strokeWidth={2}
        filter="url(#chalk-rough)" />
      <ChalkLine x1={160} y1={162} x2={190} y2={140} stroke={YELLOW} width={3} />
      {/* Range labels */}
      <ChalkText x={160} y={124} size={11} fill={DIM}>V=</ChalkText>
      <ChalkText x={206} y={140} size={11} fill={DIM}>V~</ChalkText>
      <ChalkText x={210} y={185} size={11} fill={DIM}>Ω</ChalkText>
      <ChalkText x={160} y={210} size={11} fill={DIM}>A</ChalkText>
      <ChalkText x={110} y={185} size={11} fill={DIM}>♦</ChalkText>
      <ChalkText x={114} y={140} size={11} fill={DIM}>OFF</ChalkText>

      {/* Probe jacks */}
      <circle cx={90}  cy={225} r={7} fill="none" stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <circle cx={230} cy={225} r={7} fill="none" stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <circle cx={160} cy={225} r={7} fill="none" stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <ChalkText x={90}  y={253} size={11} fill={DIM}>COM</ChalkText>
      <ChalkText x={160} y={253} size={11} fill={DIM}>A</ChalkText>
      <ChalkText x={230} y={253} size={11} fill={DIM}>VΩ</ChalkText>

      {/* Probes */}
      <ChalkLine x1={90}  y1={225} x2={70}  y2={255} stroke={CHALK} width={2} />
      <ChalkLine x1={230} y1={225} x2={250} y2={255} stroke={RED}   width={2} />

      <ChalkText x={160} y={20} size={12} fill={DIM}>black → COM · red → VΩ (or A for current)</ChalkText>
    </svg>
  )
}

function PBALayoutDiagram() {
  return (
    <svg viewBox="0 0 400 260" width="100%" style={{ maxHeight: 280 }}>
      <RoughFilter />
      <ChalkText x={200} y={22} size={20} fill={YELLOW}>Smartphone PBA · top view</ChalkText>

      <rect x={30} y={40} width={340} height={200} rx={14} fill="none"
        stroke={CHALK} strokeWidth={2.5} filter="url(#chalk-rough)" />

      {/* Component blocks */}
      {[
        { x: 60,  y: 60,  w: 60, h: 40, label: 'CAM' },
        { x: 160, y: 60,  w: 80, h: 40, label: 'antenna' },
        { x: 280, y: 60,  w: 60, h: 40, label: 'SPK' },
        { x: 60,  y: 120, w: 60, h: 50, label: 'SoC',   fill: 'rgba(253,230,138,0.12)' },
        { x: 150, y: 120, w: 60, h: 50, label: 'PMIC',  fill: 'rgba(252,165,165,0.10)' },
        { x: 240, y: 120, w: 100, h: 50, label: 'RAM + storage' },
        { x: 60,  y: 190, w: 60, h: 40, label: 'modem' },
        { x: 150, y: 190, w: 80, h: 40, label: 'audio IC' },
        { x: 250, y: 190, w: 90, h: 40, label: 'USB / charge IC', fill: 'rgba(252,165,165,0.10)' },
      ].map(b => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4}
            fill={b.fill || 'rgba(245,238,210,0.05)'}
            stroke={CHALK} strokeWidth={1.5} filter="url(#chalk-rough)" />
          <ChalkText x={b.x + b.w / 2} y={b.y + b.h / 2 + 5} size={13}>{b.label}</ChalkText>
        </g>
      ))}

      <ChalkText x={200} y={252} size={12} fill={DIM}>failures cluster around <tspan fill={RED}>USB IC / PMIC</tspan> (charging) and audio</ChalkText>
    </svg>
  )
}

function GSMArchitectureDiagram() {
  return (
    <svg viewBox="0 0 460 220" width="100%" style={{ maxHeight: 260 }}>
      <RoughFilter />
      <ChalkText x={230} y={22} size={20} fill={YELLOW}>GSM · voice-call path</ChalkText>

      {/* Handset */}
      <rect x={20} y={80} width={40} height={70} rx={6} fill="none"
        stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <ChalkText x={40} y={165} size={12}>MS</ChalkText>

      {/* Tower (BTS) */}
      <polyline points="115,150 100,80 130,80 115,150" stroke={CHALK}
        strokeWidth={2} fill="none" filter="url(#chalk-rough)" />
      <ChalkLine x1={95} y1={70} x2={135} y2={70} />
      <ChalkText x={115} y={165} size={12}>BTS</ChalkText>

      {/* BSC */}
      <rect x={175} y={100} width={60} height={40} rx={4} fill="none"
        stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <ChalkText x={205} y={125} size={13}>BSC</ChalkText>

      {/* MSC */}
      <rect x={280} y={100} width={60} height={40} rx={4} fill="none"
        stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <ChalkText x={310} y={125} size={13} fill={YELLOW}>MSC</ChalkText>

      {/* Databases */}
      <ellipse cx={310} cy={185} rx={38} ry={12} fill="none"
        stroke={CHALK} strokeWidth={1.8} filter="url(#chalk-rough)" />
      <ChalkText x={310} y={189} size={11} fill={DIM}>HLR · VLR · AuC · EIR</ChalkText>

      {/* Second handset */}
      <rect x={410} y={80} width={40} height={70} rx={6} fill="none"
        stroke={CHALK} strokeWidth={2} filter="url(#chalk-rough)" />
      <ChalkText x={430} y={165} size={12}>MS</ChalkText>

      {/* Connectors */}
      <ChalkLine x1={60} y1={115} x2={100} y2={115} stroke={YELLOW} width={2} />
      <ChalkLine x1={135} y1={115} x2={175} y2={120} />
      <ChalkLine x1={235} y1={120} x2={280} y2={120} />
      <ChalkLine x1={310} y1={140} x2={310} y2={173} />
      <ChalkLine x1={340} y1={115} x2={380} y2={115} />
      <ChalkLine x1={380} y1={115} x2={410} y2={115} stroke={YELLOW} width={2} />

      <ChalkText x={230} y={210} size={11} fill={DIM}>MSC looks up subscriber → routes to destination BTS</ChalkText>
    </svg>
  )
}

function SolderJointDiagram() {
  return (
    <svg viewBox="0 0 420 240" width="100%" style={{ maxHeight: 260 }}>
      <RoughFilter />
      <ChalkText x={210} y={22} size={20} fill={YELLOW}>Solder joints · good vs bad</ChalkText>

      {/* Three cross-sections side by side */}
      {[
        { x: 20,  label: 'GOOD',  color: GREEN,  desc: 'smooth · shiny · concave',    good: true },
        { x: 160, label: 'COLD',  color: YELLOW, desc: 'dull · grainy · iron too cool' },
        { x: 300, label: 'DRY',   color: RED,    desc: 'cracked ring · re-melt' },
      ].map(({ x, label, color, desc, good }, i) => (
        <g key={label} transform={`translate(${x},50)`}>
          {/* PCB layer */}
          <rect x={0} y={90} width={100} height={16} fill="rgba(245,238,210,0.08)"
            stroke={CHALK} strokeWidth={1.2} filter="url(#chalk-rough)" />
          <ChalkText x={50} y={102} size={10} fill={DIM}>PCB pad</ChalkText>

          {/* Component lead */}
          <ChalkLine x1={50} y1={20} x2={50} y2={90} width={3} />

          {/* Solder shape — good = concave/fillet, cold = blob, dry = ring */}
          {good && (
            <path d="M 20,90 Q 50,60 50,90 Q 50,60 80,90 Z"
              fill="rgba(134,239,172,0.18)" stroke={color} strokeWidth={2}
              strokeLinejoin="round" filter="url(#chalk-rough)" />
          )}
          {!good && label === 'COLD' && (
            <ellipse cx={50} cy={82} rx={26} ry={12}
              fill="rgba(253,230,138,0.15)" stroke={color} strokeWidth={2.2}
              filter="url(#chalk-rough)" />
          )}
          {label === 'DRY' && (
            <>
              <ellipse cx={50} cy={82} rx={26} ry={10}
                fill="none" stroke={color} strokeWidth={2.2}
                filter="url(#chalk-rough)" />
              {/* Crack lines */}
              <ChalkLine x1={30} y1={80} x2={38} y2={82} stroke={color} width={1.5} />
              <ChalkLine x1={60} y1={82} x2={70} y2={80} stroke={color} width={1.5} />
            </>
          )}

          <ChalkText x={50} y={140} size={16} fill={color}>{label}</ChalkText>
          <ChalkText x={50} y={162} size={11} fill={DIM}>{desc}</ChalkText>
        </g>
      ))}
    </svg>
  )
}

function PhoneDisassemblyDiagram() {
  return (
    <svg viewBox="0 0 380 260" width="100%" style={{ maxHeight: 300 }}>
      <RoughFilter />
      <ChalkText x={190} y={22} size={20} fill={YELLOW}>Smartphone · disassembly order</ChalkText>

      {/* Exploded stack */}
      {[
        { y: 45,  w: 200, label: '① back cover',           yellow: false },
        { y: 90,  w: 200, label: '② adhesive layer',       yellow: false },
        { y: 125, w: 180, label: '③ battery + FPC',        yellow: true },
        { y: 165, w: 190, label: '④ PBA (main board)',     yellow: false },
        { y: 205, w: 200, label: '⑤ display + digitizer',  yellow: false },
      ].map((layer, i) => {
        const cx = 190
        const x = cx - layer.w / 2
        return (
          <g key={i}>
            <rect x={x} y={layer.y} width={layer.w} height={22} rx={4}
              fill={layer.yellow ? 'rgba(252,165,165,0.10)' : 'rgba(245,238,210,0.05)'}
              stroke={layer.yellow ? RED : CHALK} strokeWidth={1.8}
              filter="url(#chalk-rough)" />
            <ChalkText x={cx} y={layer.y + 15} size={13} fill={layer.yellow ? RED : CHALK}>
              {layer.label}
            </ChalkText>
          </g>
        )
      })}

      {/* Warning callout */}
      <ChalkText x={80} y={130} size={11} fill={RED} anchor="end">disconnect FPC FIRST</ChalkText>
      <ChalkLine x1={80} y1={128} x2={100} y2={132} stroke={RED} width={1.5} />

      <ChalkText x={190} y={247} size={11} fill={DIM}>re-assembly: reverse the order · fresh adhesive · water-test at end</ChalkText>
    </svg>
  )
}

function ESDSetupDiagram() {
  return (
    <svg viewBox="0 0 400 220" width="100%" style={{ maxHeight: 240 }}>
      <RoughFilter />
      <ChalkText x={200} y={22} size={20} fill={YELLOW}>ESD-safe bench</ChalkText>

      {/* Wrist */}
      <circle cx={60} cy={70} r={22} fill="none" stroke={CHALK} strokeWidth={2}
        filter="url(#chalk-rough)" />
      <ChalkText x={60} y={74} size={12}>wrist</ChalkText>
      <ChalkText x={60} y={102} size={11} fill={DIM}>strap</ChalkText>

      {/* Strap coil */}
      <path d="M 60,92 Q 80,110 100,100 Q 120,90 140,110 Q 160,130 180,120"
        stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
        filter="url(#chalk-rough)" />

      {/* Resistor inline */}
      <g transform="translate(150,110)">
        <polyline points="0,10 8,0 20,20 32,0 44,20 50,10"
          stroke={CHALK} strokeWidth={2} fill="none" strokeLinecap="round"
          strokeLinejoin="round" filter="url(#chalk-rough)" />
        <ChalkText x={25} y={-4} size={11} fill={YELLOW}>1 MΩ</ChalkText>
      </g>

      {/* Mat */}
      <rect x={200} y={110} width={160} height={40} rx={4}
        fill="rgba(245,238,210,0.06)" stroke={CHALK} strokeWidth={2}
        filter="url(#chalk-rough)" />
      <ChalkText x={280} y={135} size={14}>ESD mat</ChalkText>

      {/* Ground line */}
      <ChalkLine x1={280} y1={150} x2={280} y2={180} stroke={YELLOW} width={2} />
      <ChalkLine x1={260} y1={180} x2={300} y2={180} stroke={YELLOW} width={2.5} />
      <ChalkLine x1={265} y1={186} x2={295} y2={186} stroke={YELLOW} width={2} />
      <ChalkLine x1={270} y1={192} x2={290} y2={192} stroke={YELLOW} width={1.5} />
      <ChalkText x={280} y={210} size={11} fill={DIM}>ground point</ChalkText>

      {/* Wristband continuity note */}
      <ChalkText x={140} y={200} size={11} fill={DIM}>wristband test: continuity ≤ 20 MΩ</ChalkText>
    </svg>
  )
}

// ── Registry ────────────────────────────────────────────────────────────
export const CHALK_DIAGRAMS = {
  ohms_law:               OhmsLawDiagram,
  series_circuit:         SeriesCircuitDiagram,
  parallel_circuit:       ParallelCircuitDiagram,
  resistor_symbol:        ResistorSymbolDiagram,
  multimeter_layout:      MultimeterDiagram,
  pcb_layout:             PBALayoutDiagram,
  gsm_architecture:       GSMArchitectureDiagram,
  solder_joint_good_bad:  SolderJointDiagram,
  phone_disassembly:      PhoneDisassemblyDiagram,
  esd_setup:              ESDSetupDiagram,
}

export const CHALK_DIAGRAM_TITLES = {
  ohms_law:              "Ohm's Law",
  series_circuit:        'Series circuit',
  parallel_circuit:      'Parallel circuit',
  resistor_symbol:       'Resistor symbols',
  multimeter_layout:     'Digital multimeter',
  pcb_layout:            'Smartphone PBA · top view',
  gsm_architecture:      'GSM · voice-call path',
  solder_joint_good_bad: 'Solder joints · good vs bad',
  phone_disassembly:     'Smartphone · disassembly order',
  esd_setup:             'ESD-safe bench',
}

export default function ChalkDiagram({ id }) {
  const Comp = CHALK_DIAGRAMS[id]
  if (!Comp) {
    return (
      <div className="border border-dashed border-emerald-100/20 rounded-lg p-4 text-emerald-100/50 text-[12px]">
        Diagram <code>{id}</code> not available yet.
      </div>
    )
  }
  return (
    <div className="rounded-xl p-2" style={{
      background: 'radial-gradient(rgba(245,238,210,0.03) 1px, transparent 1px)',
      backgroundSize: '8px 8px',
    }}>
      <Comp />
    </div>
  )
}
