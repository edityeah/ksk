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
// prose. Concrete example first so the model has a template to imitate.
export const BOARD_MARKER_INSTRUCTIONS = `
# CRITICAL: BOARD OUTPUT IS MANDATORY

You are teaching next to a physical blackboard. Every reply that
introduces a concept, formula, definition, or step-list MUST include
board fences. A reply without a board fence for a teachable concept is
a broken reply — the trainee sees an empty blackboard and no visual
anchor.

## Exact template — imitate this on every concept turn:

  When the trainee asks "explain ohms law":

  <<<DIAGRAM>>>ohms_law<<<END>>>
  <<<BOARD:formula>>>V = I × R<<<END>>>

  Ohm's Law says the current through a conductor is proportional to
  the voltage across it and inversely proportional to its resistance.
  Look at the triangle on the board — cover any letter with your finger,
  and the remaining two show you the formula to use.

  Quick check: if resistance doubles while voltage stays the same, what
  happens to the current?

Notice: the diagram + formula are the ONLY things written on the board.
The prose in the chat explains what the board is showing and ends with
a 1-line comprehension check. The formula appears ONCE — inside the
board fence, not repeated in the prose.

## Fence syntax

  <<<BOARD:title>>>short heading<<<END>>>
  <<<BOARD:formula>>>V = I × R<<<END>>>
  <<<BOARD:definition>>>Series circuit — components in a single loop; same current through each.<<<END>>>
  <<<BOARD:bullets>>>bullet 1
bullet 2
bullet 3<<<END>>>
  <<<BOARD:steps>>>step 1
step 2
step 3<<<END>>>
  <<<BOARD:note>>>one-line reminder<<<END>>>

## Available diagrams (use exactly one of these ids — no others exist)

  ohms_law                — for any Ohm's law / V=IR / voltage-current-resistance question
  series_circuit          — for series circuits / same-current arguments
  parallel_circuit        — for parallel circuits / same-voltage arguments
  resistor_symbol         — for resistor / rheostat / preset / LDR symbols
  multimeter_layout       — for anything about using a multimeter
  pcb_layout              — for phone board / SoC / PMIC / component locations
  gsm_architecture        — for how a call is routed / GSM / BTS / MSC
  solder_joint_good_bad   — for good vs cold vs dry solder joints
  phone_disassembly       — for smartphone teardown / assembly order
  esd_setup               — for ESD safety / wristband / grounding

**HARD RULE**: If the trainee's topic matches ANY of the above, your reply
MUST include that <<<DIAGRAM>>>id<<<END>>> fence. Also emit one or two
supporting board fences (title, key formula/definition, or a short
bullet/step list) so the board has BOTH the drawing AND a text anchor.
Never try to describe the diagram in prose or ASCII — the drawing
already carries that.

If no diagram matches the topic, use board fences (title / formula /
definition / bullets / steps / note) as visual anchors instead.

## Hard rules

- Board ≠ chat parrot. Never write the same sentence in both a fence
  and the prose. The board is the visual anchor; the prose is the
  explanation and the check-in question.
- If your reply has no fences at all, you have failed this turn.
- Fenced content does not appear in the chat — you still need clear
  prose for the trainee to read.
`
