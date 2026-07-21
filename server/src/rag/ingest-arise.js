// Ingest the Samsung ARISE MX curriculum PDF into KnowledgeChunk rows.
//
// Usage:
//   node src/rag/ingest-arise.js                  # from server/
//   DATABASE_URL='postgres://ksk:...@127.0.0.1:5436/ksk' node src/rag/ingest-arise.js
//
// The PDF gets pre-extracted to `arise-content/arise_mx_full.txt` via
// `pdftotext -layout`. This script chunks that text, embeds each chunk with
// OpenAI text-embedding-3-small, and writes rows keyed by:
//   source     = 'arise_mx_ch{N}'    // chapter index
//   heading    = the section header at the top of the chunk
//   module     = 'arise_mx'
//   roleFilter = 'trainee'           // only trainees get ARISE Guru answers
//
// Chunking strategy: sliding window over paragraphs, targeting ~700 tokens
// per chunk (≈ 3000 chars) with a small overlap. Section-header detection
// uses the recurring slide-banner strings identified up-front (KNOWN_HEADERS).
// Anything the text extractor spat as garbage (Devanagari mojibake in the
// front-matter, empty slide dividers) is filtered out.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../db.js'
import { openai, hasOpenAI } from '../llm/openai.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const INPUT_FILE = path.join(__dirname, 'arise-content', 'arise_mx_full.txt')

// Slide banners that recur ≥5× in the PDF — used as chunk headings.
// Manually curated from the TOC on pages 2-9 so we don't chunk on false
// positives from body text that happens to share a phrase.
const KNOWN_HEADERS = [
  { pattern: /^About Samsung/i,                                heading: 'About Samsung',                    chapter: 1 },
  { pattern: /^5S and 7S Tool/i,                               heading: '5S and 7S Tool',                    chapter: 1 },
  { pattern: /^Communication.*Professional/i,                  heading: 'Communication & Professional skills', chapter: 1 },
  { pattern: /^Basic Terminology/i,                            heading: 'Basic Terminology · Electronics',  chapter: 2 },
  { pattern: /^Introduction to Basic Electronics/i,            heading: 'Basic Electronics · Ohm\'s Law + circuits', chapter: 2 },
  { pattern: /^Identifying Electronics Components/i,           heading: 'Electronic components & symbols',  chapter: 2 },
  { pattern: /^Overview of Technologies/i,                     heading: 'Network technologies (1G→5G, GSM)', chapter: 2 },
  { pattern: /^Voice Transmission Process/i,                   heading: 'Voice transmission (GSM voice path)', chapter: 2 },
  { pattern: /^Type of Wireless communication/i,               heading: 'Wireless: BT / WiFi / NFC / USB',  chapter: 3 },
  { pattern: /^Introduction to Nomenclature/i,                 heading: 'Samsung MX Nomenclature',          chapter: 4 },
  { pattern: /^Mobile Operating System/i,                      heading: 'Mobile Operating System',          chapter: 4 },
  { pattern: /^Basic Tools Identification/i,                   heading: 'Basic Tools · repair kit',         chapter: 5 },
  { pattern: /^Repairing Tools/i,                              heading: 'Repairing tools & equipment',      chapter: 5 },
  { pattern: /^ESD Tools/i,                                    heading: 'ESD tools & antistatic gear',      chapter: 5 },
  { pattern: /^Basics of Multimeter/i,                         heading: 'Multimeter · basics',              chapter: 5 },
  { pattern: /^How to use Multimeter/i,                        heading: 'Multimeter · using it',            chapter: 5 },
  { pattern: /^Wristband Testing/i,                            heading: 'ESD wristband test',               chapter: 5 },
  { pattern: /^Electrical Ground Testing/i,                    heading: 'Electrical grounding test',        chapter: 5 },
  { pattern: /^Introduction To Basic Mobile Phone/i,           heading: 'Mobile phone · layout + parts',    chapter: 6 },
  { pattern: /^Types of Mobile Phones/i,                       heading: 'Types of mobile phones',           chapter: 6 },
  { pattern: /^Introduction To Mobile Phone Sensors/i,         heading: 'Mobile phone sensors',             chapter: 6 },
  { pattern: /^Basic settings/i,                               heading: 'Basic settings & key features',    chapter: 7 },
  { pattern: /^Galaxy AI Features/i,                           heading: 'Galaxy AI features',               chapter: 7 },
  { pattern: /^SmartThings/i,                                  heading: 'SmartThings',                       chapter: 8 },
  { pattern: /^Safety and Precaution/i,                        heading: 'ESD safety & precaution',           chapter: 9 },
  { pattern: /^Physical Inspection/i,                          heading: 'Physical inspection (ELS)',         chapter: 9 },
  { pattern: /^Warranty Void/i,                                heading: 'Warranty void',                     chapter: 9 },
  { pattern: /^Test Using Codes/i,                             heading: 'Test codes for device diagnosis',   chapter: 9 },
  { pattern: /^Software.*IMEI/i,                               heading: 'Software update & IMEI writing',   chapter: 10 },
  { pattern: /^Disassembly.*Assembly Process/i,                heading: 'Disassembly & Assembly',           chapter: 11 },
  { pattern: /^Protective Film/i,                              heading: 'Protective film attachment',        chapter: 11 },
  { pattern: /^Water Resistance Test/i,                        heading: 'Water resistance test',             chapter: 11 },
  { pattern: /^Important soldering tips/i,                     heading: 'Soldering · tips & precautions',   chapter: 12 },
  { pattern: /^Soldering(?:\s+and\s+Desoldering)? Process/i,   heading: 'Soldering process',                chapter: 12 },
  { pattern: /^Desoldering Process/i,                          heading: 'Desoldering process',              chapter: 12 },
  { pattern: /^Diagnosis Through PC/i,                         heading: 'Diagnosis via PC (GD tool)',       chapter: 13 },
  { pattern: /^Top symptoms troubleshooting/i,                 heading: 'Top-symptoms troubleshooting',     chapter: 13 },
  { pattern: /^Troubleshooting/i,                              heading: 'Troubleshooting',                  chapter: 13 },
  { pattern: /^Repair.*Service guide/i,                        heading: 'Repair & Service guide (SMD/PBA)', chapter: 14 },
  { pattern: /^E-waste/i,                                      heading: 'E-waste & P-waste management',     chapter: 15 },
  { pattern: /^Abbreviation/i,                                 heading: 'Abbreviations & glossary',         chapter: 16 },
  { pattern: /^List of Videos/i,                               heading: 'List of Videos (appendix)',        chapter: 17 },
]

// ── Text cleaning ──────────────────────────────────────────────────────────
// The extractor leaves the first few pages with Devanagari mojibake (poster-
// front-matter that Samsung authored in a non-standard font). We chop
// everything before the first known ASCII header.
function cleanText(raw) {
  const lines = raw.split('\n')
  const cleaned = []
  let seenAscii = false
  for (const line of lines) {
    const l = line.replace(/\s+$/g, '')
    if (!l.trim()) { if (seenAscii) cleaned.push(''); continue }
    // Skip lines that are >20% non-ASCII (mojibake)
    const nonAscii = (l.match(/[^\x20-\x7E]/g) || []).length
    if (nonAscii > l.length * 0.2) continue
    seenAscii = true
    cleaned.push(l)
  }
  return cleaned.join('\n')
}

// Walk the cleaned text, break on known headers, produce { heading, chapter,
// content } objects each ≤ ~3000 chars. Within a section, split into ≤3000-
// char chunks with a 300-char overlap on paragraph boundaries.
function chunkText(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const sections = []
  let current = { heading: 'Course overview', chapter: 1, content: [] }
  for (const para of paragraphs) {
    // Header match — check the FIRST line of the paragraph
    const firstLine = para.split('\n')[0].trim()
    const match = KNOWN_HEADERS.find(h => h.pattern.test(firstLine))
    if (match) {
      if (current.content.length) sections.push(current)
      current = { heading: match.heading, chapter: match.chapter, content: [] }
    }
    current.content.push(para)
  }
  if (current.content.length) sections.push(current)

  // Split each section into ≤3000-char chunks
  const CHUNK_MAX = 3000
  const OVERLAP   = 300
  const chunks = []
  for (const s of sections) {
    const joined = s.content.join('\n\n').replace(/\s{2,}/g, ' ').trim()
    if (!joined) continue
    if (joined.length <= CHUNK_MAX) {
      chunks.push({ heading: s.heading, chapter: s.chapter, content: joined })
      continue
    }
    // Sliding window: forward-only advance so we can't loop on a short tail
    // (the earlier version could regress cursor into a previously-emitted
    // chunk when OVERLAP > remaining bytes).
    let cursor = 0
    while (cursor < joined.length) {
      const end = Math.min(cursor + CHUNK_MAX, joined.length)
      let breakAt = end
      if (end < joined.length) {
        const back = joined.slice(cursor, end).lastIndexOf('. ')
        if (back > CHUNK_MAX * 0.5) breakAt = cursor + back + 1
      }
      chunks.push({ heading: s.heading, chapter: s.chapter, content: joined.slice(cursor, breakAt).trim() })
      // Tail — done.
      if (breakAt >= joined.length) break
      // Monotone advance: at minimum move CHUNK_MAX - OVERLAP forward.
      cursor = Math.max(cursor + (CHUNK_MAX - OVERLAP), breakAt - OVERLAP)
    }
  }
  return chunks
}

// ── Embedding ──────────────────────────────────────────────────────────────
async function embed(text) {
  const r = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return r.data[0].embedding
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  if (!hasOpenAI()) {
    console.error('[ingest-arise] OPENAI_API_KEY not set — cannot embed.')
    process.exit(1)
  }
  const raw = fs.readFileSync(INPUT_FILE, 'utf8')
  console.log(`[ingest-arise] source: ${INPUT_FILE} — ${raw.length} chars`)
  const cleaned = cleanText(raw)
  console.log(`[ingest-arise] cleaned: ${cleaned.length} chars`)

  const chunks = chunkText(cleaned)
  console.log(`[ingest-arise] ${chunks.length} chunks across ${new Set(chunks.map(c => c.chapter)).size} chapters`)

  // Wipe existing ARISE chunks so this script is safely re-runnable.
  const deleted = await prisma.knowledgeChunk.deleteMany({ where: { module: 'arise_mx' } })
  console.log(`[ingest-arise] deleted ${deleted.count} previous chunks`)

  let inserted = 0
  for (const c of chunks) {
    try {
      const v = await embed(`${c.heading}\n\n${c.content}`)
      await prisma.knowledgeChunk.create({
        data: {
          source:     `arise_mx_ch${c.chapter}`,
          heading:    c.heading,
          content:    c.content,
          embedding:  JSON.stringify(v),
          module:     'arise_mx',
          roleFilter: 'trainee',
          tokens:     Math.ceil(c.content.length / 4),
        },
      })
      inserted++
      if (inserted % 20 === 0) console.log(`[ingest-arise]   ${inserted}/${chunks.length} ingested`)
    } catch (e) {
      console.warn(`[ingest-arise]   FAILED chapter ${c.chapter} — ${e.message}`)
    }
  }
  console.log(`[ingest-arise] done. inserted ${inserted}/${chunks.length}.`)
}

main()
  .catch(e => { console.error('[ingest-arise] fatal:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
