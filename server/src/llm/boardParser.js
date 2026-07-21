// BoardParser — sibling to CardParser. Pulls `<<<BOARD:kind>>>…<<<END>>>`
// and `<<<DIAGRAM>>>id<<<END>>>` fences out of a streaming LLM reply and
// emits them as separate `board` / `diagram` events so the client can
// render them on the classroom whiteboard.
//
// Why not reuse CardParser: card fences carry JSON payloads, board fences
// carry raw text with a `kind` embedded in the opening tag. Different
// contract, so a dedicated parser keeps the LLM instructions simple.
//
// Fence grammar (loose but enforced here):
//   <<<BOARD:title>>>Ohm's Law<<<END>>>
//   <<<BOARD:formula>>>V = I × R<<<END>>>
//   <<<BOARD:bullets>>>line 1
//   line 2
//   line 3<<<END>>>
//   <<<DIAGRAM>>>ohms_law<<<END>>>
//
// Kinds are validated against BOARD_KINDS. Diagrams are validated against
// DIAGRAM_IDS. Anything else is emitted as fallback text so we never
// silently drop model output.

// Kinds the AriseClassroomCanvas renderer knows how to draw.
const BOARD_KINDS  = new Set(['title', 'bullets', 'formula', 'definition', 'steps', 'note'])
const DIAGRAM_IDS  = new Set([
  'ohms_law', 'series_circuit', 'parallel_circuit', 'resistor_symbol',
  'multimeter_layout', 'pcb_layout', 'gsm_architecture', 'solder_joint_good_bad',
  'phone_disassembly', 'esd_setup',
])

const OPEN_BOARD_PREFIX = '<<<BOARD:'
const OPEN_DIAGRAM      = '<<<DIAGRAM>>>'
const CLOSE             = '<<<END>>>'

// Longest prefix of a marker that could be hiding at the tail of the buffer.
// (We hold this many chars back before flushing text, so we don't accidentally
// stream half of an opening tag to the client and then never revoke it.)
const MAX_PENDING = Math.max(
  OPEN_BOARD_PREFIX.length + 20,  // BOARD prefix + max kind length + '>>>'
  OPEN_DIAGRAM.length,
  CLOSE.length,
) - 1

export class BoardParser {
  constructor({ onText, onBoard, onDiagram } = {}) {
    this.onText    = onText    || (() => {})
    this.onBoard   = onBoard   || (() => {})
    this.onDiagram = onDiagram || (() => {})
    this.buffer    = ''         // outside-fence buffer
    this.fenceBuf  = ''         // inside-fence buffer
    this.fenceKind = null       // 'board:<kind>' | 'diagram'
  }

  feed(chunk) {
    if (!chunk) return
    this.buffer += chunk
    /* eslint-disable no-constant-condition */
    while (true) {
      if (this.fenceKind === null) {
        // Look for the earliest opening marker.
        const iBoard   = this.buffer.indexOf(OPEN_BOARD_PREFIX)
        const iDiagram = this.buffer.indexOf(OPEN_DIAGRAM)
        // Pick whichever comes first (or -1 if neither).
        let idx, which
        if (iBoard === -1 && iDiagram === -1)          { idx = -1;      which = null    }
        else if (iBoard === -1)                        { idx = iDiagram; which = 'diagram' }
        else if (iDiagram === -1)                      { idx = iBoard;   which = 'board' }
        else if (iBoard < iDiagram)                    { idx = iBoard;   which = 'board' }
        else                                           { idx = iDiagram; which = 'diagram' }

        if (idx === -1) {
          const safe = Math.max(0, this.buffer.length - MAX_PENDING)
          if (safe > 0) {
            this.onText(this.buffer.slice(0, safe))
            this.buffer = this.buffer.slice(safe)
          }
          return
        }

        // Emit text up to the marker.
        if (idx > 0) this.onText(this.buffer.slice(0, idx))
        this.buffer = this.buffer.slice(idx)

        if (which === 'board') {
          // Need the closing '>>>' after the kind.
          const closeAngle = this.buffer.indexOf('>>>', OPEN_BOARD_PREFIX.length)
          if (closeAngle === -1) {
            // Kind hasn't fully arrived yet — wait for more chunk.
            return
          }
          const kind = this.buffer.slice(OPEN_BOARD_PREFIX.length, closeAngle).trim()
          this.buffer = this.buffer.slice(closeAngle + 3)   // skip past '>>>'
          this.fenceKind = `board:${kind}`
          this.fenceBuf = ''
        } else {
          this.buffer = this.buffer.slice(OPEN_DIAGRAM.length)
          this.fenceKind = 'diagram'
          this.fenceBuf = ''
        }
      }

      // Inside a fence — accumulate until CLOSE.
      const closeIdx = this.buffer.indexOf(CLOSE)
      if (closeIdx === -1) {
        const hold = Math.max(0, this.buffer.length - MAX_PENDING)
        if (hold > 0) {
          this.fenceBuf += this.buffer.slice(0, hold)
          this.buffer = this.buffer.slice(hold)
        }
        return
      }
      this.fenceBuf += this.buffer.slice(0, closeIdx)
      this.buffer = this.buffer.slice(closeIdx + CLOSE.length)
      this._emitFence()
      this.fenceKind = null
      this.fenceBuf = ''
    }
  }

  flush() {
    if (this.fenceKind !== null) {
      // Stream ended mid-fence — emit what we captured as text so nothing
      // is silently lost.
      this.onText(`\n${this.fenceBuf}\n${this.buffer}`)
    } else if (this.buffer) {
      this.onText(this.buffer)
    }
    this.buffer = ''
    this.fenceBuf = ''
    this.fenceKind = null
  }

  _emitFence() {
    const raw = (this.fenceBuf || '').trim()
    if (!raw) return
    if (this.fenceKind === 'diagram') {
      const id = raw.toLowerCase()
      if (!DIAGRAM_IDS.has(id)) {
        this.onText(`\n[diagram ${id} not available]\n`)
        return
      }
      this.onDiagram({ id })
      return
    }
    const kind = this.fenceKind.replace(/^board:/, '')
    if (!BOARD_KINDS.has(kind)) {
      // Unknown kind — fall through as a note.
      this.onBoard({ kind: 'note', text: raw })
      return
    }
    this.onBoard({ kind, text: raw })
  }
}

// Instructions block appended to the ARISE Guru's system prompt in text
// mode. Teaches the model to embed board / diagram fences alongside its
// prose. Kept short to avoid inflating the token budget.
export const BOARD_MARKER_INSTRUCTIONS = `
## Writing on the classroom whiteboard (text-chat mode)

You are answering the trainee in a TEXT chat next to a blackboard. To
write on the board, embed these fences in your reply — the client hides
them from the chat bubble and renders them on the blackboard:

  <<<BOARD:title>>>Series vs Parallel Circuits<<<END>>>
  <<<BOARD:definition>>>Series circuit: components connected in a single loop. Current is the same through each; voltage divides across them.<<<END>>>
  <<<BOARD:formula>>>V = I × R<<<END>>>
  <<<BOARD:bullets>>>Same current through all components
Voltage divides across each component
Total resistance = R1 + R2 + R3<<<END>>>
  <<<BOARD:steps>>>Power off the phone
Eject the SIM tray
Warm the back cover
Cut the adhesive with a pick
Disconnect the battery FPC first<<<END>>>
  <<<BOARD:note>>>Rule of thumb: in series, one dead component kills the whole circuit.<<<END>>>

Pre-authored diagrams you can display (choose one exactly from this list):
  <<<DIAGRAM>>>ohms_law<<<END>>>
  <<<DIAGRAM>>>series_circuit<<<END>>>
  <<<DIAGRAM>>>parallel_circuit<<<END>>>
  <<<DIAGRAM>>>resistor_symbol<<<END>>>
  <<<DIAGRAM>>>multimeter_layout<<<END>>>
  <<<DIAGRAM>>>pcb_layout<<<END>>>
  <<<DIAGRAM>>>gsm_architecture<<<END>>>
  <<<DIAGRAM>>>solder_joint_good_bad<<<END>>>
  <<<DIAGRAM>>>phone_disassembly<<<END>>>
  <<<DIAGRAM>>>esd_setup<<<END>>>

Rules:
- Whenever you introduce a new definition, formula, symbol, or step-list, ALWAYS put it on the board with a fence. Not doing so is a bug.
- Fenced content is NOT shown in the chat bubble. Repeat the essence in your prose too — don't leave the reader with only fences.
- Prefer a diagram over an ASCII sketch when one exists. Trainees learn faster from a proper drawing.
- After board updates, always continue in prose with either an example or a 1-line comprehension check.
`
