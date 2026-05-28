// Additive seed for mentors + community posts.
//
// Designed to be run against an existing populated DB (typically prod) to
// add the mentor directory + post feed content without touching anything
// else. Idempotent: if a mentor user with the same sidhId already exists,
// we update their MentorProfile in place rather than creating duplicates;
// if a post with an identical title+authorId already exists, we skip it.
//
// Usage:
//   DATABASE_URL=postgres://...prod...  node src/seed/seed-mentors-posts.js
//
// Pre-requisites that must already be in the target DB:
//   - All sectors (RAS, LOG, TEL, BFSI, HLT, ITS)
//   - Users with sidhIds: LRN-RANI-001, TC-PAT-001, TP-MB-001
//     (post authors that aren't mentors)
//
// If any of those aren't present, those particular posts are skipped with
// a warning — mentor + mentor-authored posts always succeed regardless.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ───────────────────────────────────────────────────────────────────────────
// MENTOR BLUEPRINTS — same set as in seed.js, with VERIFIED Indian Unsplash
// portraits (each URL was downloaded + visually inspected before commit).
// ───────────────────────────────────────────────────────────────────────────
const UNS = (id) => `https://images.unsplash.com/${id}?w=400&h=400&fit=crop&q=80`
const MENTORS = [
  { sidh: 'MNT-RR-001', name: 'Suresh Iyer',         phone: '9100000001', sector: 'RAS',  title: 'Store Operations Lead',      company: 'Reliance Retail',  years: 12, city: 'Mumbai',    state: 'MH', bio: 'Helping retail front-line associates grow into supervisor + cluster roles. Ex-DMart, Reliance Retail.',                  langs: ['en','hi','mr'], rate: null, photo: UNS('photo-1656221007870-dbb3900d6d99') },
  { sidh: 'MNT-DL-001', name: 'Priya Sharma',        phone: '9100000002', sector: 'LOG',  title: 'Hub Operations Manager',     company: 'Delhivery',        years: 9,  city: 'Gurgaon',   state: 'HR', bio: 'Logistics & supply chain mentor. Specialise in last-mile + warehouse roles for NSQF L3-L5 candidates.',                  langs: ['en','hi'],      rate: 500,  photo: UNS('premium_photo-1682089810582-f7b200217b67') },
  { sidh: 'MNT-JIO-001',name: 'Arjun Mehta',         phone: '9100000003', sector: 'TEL',  title: 'Field Engineering Lead',     company: 'Reliance Jio',     years: 11, city: 'Bengaluru', state: 'KA', bio: 'Field engineering + tower operations mentor. Started as a TTE myself, now lead a team of 40.',                          langs: ['en','hi','kn'], rate: 800,  photo: UNS('photo-1656221010175-bcfeadcb6017') },
  { sidh: 'MNT-HDF-001',name: 'Anita Krishnan',      phone: '9100000004', sector: 'BFSI', title: 'Branch Banking Manager',     company: 'HDFC Bank',        years: 14, city: 'Chennai',   state: 'TN', bio: 'BFSI mentor. Spent 14 years in branch banking. Now coaching candidates entering as Customer Service Associates.',         langs: ['en','ta','hi'], rate: 700,  photo: UNS('premium_photo-1664478244612-d4b3238abd81') },
  { sidh: 'MNT-APO-001',name: 'Dr. Ravi Naidu',      phone: '9100000005', sector: 'HLT',  title: 'Patient Care Training Head', company: 'Apollo Hospitals', years: 18, city: 'Hyderabad', state: 'TG', bio: 'Healthcare mentor for General Duty Assistant + Patient Care roles. Helping new GDAs avoid the burnout cliff in year 1.', langs: ['en','hi','te'], rate: null, photo: UNS('premium_photo-1682089804117-cea5d901647f') },
  { sidh: 'MNT-INF-001',name: 'Karthik Subramanian', phone: '9100000006', sector: 'ITS',  title: 'Engineering Manager',        company: 'Infosys',          years: 13, city: 'Pune',      state: 'MH', bio: 'IT-ITeS mentor. From a tier-3 town to EM at Infosys. Helping FutureSkills Prime graduates land their first dev role.',   langs: ['en','hi','ta'], rate: 1200, photo: UNS('photo-1656221009909-4f202547cd94') },
]

const pwHash = bcrypt.hashSync('Demo@123', 10)

// future(N) / past(N) — relative dates so the seed always looks "live".
const future = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x }
const past   = (d) => { const x = new Date(); x.setDate(x.getDate() - d); return x }

async function main() {
  console.log('[seed-mp] connecting…')
  // Lookup tables — sectors + non-mentor post authors must already exist
  // in the target DB. We tolerate missing post authors (those posts get
  // skipped) but bail if sectors are missing — that means the DB hasn't
  // been initialised with the main seed and this script can't help.
  const sectors = await prisma.sector.findMany({})
  const SBC = Object.fromEntries(sectors.map(s => [s.code, s]))
  for (const code of ['RAS','LOG','TEL','BFSI','HLT','ITS']) {
    if (!SBC[code]) {
      console.error(`[seed-mp] FATAL: sector code "${code}" not found in DB. Run the main seed first.`)
      process.exit(1)
    }
  }

  // ── Mentors ───────────────────────────────────────────────────────────
  console.log('[seed-mp] mentors…')
  const mentorUserBySidh = {}
  let mentorsCreated = 0, mentorsUpdated = 0
  for (const m of MENTORS) {
    const sec = SBC[m.sector]
    let u = await prisma.user.findUnique({ where: { sidhId: m.sidh } })
    if (!u) {
      u = await prisma.user.create({
        data: {
          role: 'mentor', name: m.name, phone: m.phone,
          sidhId: m.sidh, passwordHash: pwHash, language: 'en',
          profile: JSON.stringify({ mentor: true }),
        },
      })
      mentorsCreated++
    }
    mentorUserBySidh[m.sidh] = u

    const profileData = {
      title:      m.title,
      company:    m.company,
      sectorId:   sec.id,
      yearsExp:   m.years,
      bio:        m.bio,
      languages:  JSON.stringify(m.langs),
      city:       m.city,
      state:      m.state,
      photoUrl:   m.photo,
      hourlyRate: m.rate,
      available:  true,
    }
    const existingProfile = await prisma.mentorProfile.findUnique({ where: { userId: u.id } })
    if (existingProfile) {
      await prisma.mentorProfile.update({ where: { id: existingProfile.id }, data: profileData })
      mentorsUpdated++
    } else {
      await prisma.mentorProfile.create({ data: { ...profileData, userId: u.id } })
    }
  }
  console.log(`[seed-mp]   created=${mentorsCreated} updated=${mentorsUpdated}`)

  // ── Auto-subscribe Rani (hero trainee) to retail mentor ───────────────
  const raniUser = await prisma.user.findUnique({ where: { sidhId: 'LRN-RANI-001' } })
  const sureshMentor = mentorUserBySidh['MNT-RR-001']
  if (raniUser && sureshMentor) {
    const sureshProfile = await prisma.mentorProfile.findUnique({ where: { userId: sureshMentor.id } })
    if (sureshProfile) {
      // upsert via unique constraint — second run is a no-op
      await prisma.mentorSubscription.upsert({
        where: { mentorProfileId_subscriberId: { mentorProfileId: sureshProfile.id, subscriberId: raniUser.id } },
        update: {},
        create: { mentorProfileId: sureshProfile.id, subscriberId: raniUser.id },
      })
    }
  }

  // ── Posts ─────────────────────────────────────────────────────────────
  console.log('[seed-mp] community posts…')
  const tcPatUser   = await prisma.user.findUnique({ where: { sidhId: 'TC-PAT-001' } })
  const tpHqUser    = await prisma.user.findUnique({ where: { sidhId: 'TP-MB-001' } })

  const FEED = [
    { authorId: tpHqUser?.id, sectorId: SBC.RAS.id,
      kind: 'event', title: 'Reliance Retail · North India Hiring Fair',
      body: 'Walk-in interviews for Retail Sales Associate, Cashier and Store Supervisor roles. 250+ openings across Patna, Lucknow, Kanpur, Varanasi, Bhopal. Bring your Skill Passport + ID proof. NSQF L3 / L4 candidates preferred. Selected candidates get an on-the-spot offer letter.',
      eventAt: future(5), venue: 'Patliputra Convention Centre, Patna',
      ctaLabel: 'Register for the fair', ctaUrl: 'https://example.com/fair/reliance-north-2026',
      createdAt: past(0) },
    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: SBC.LOG.id,
      kind: 'event', title: 'Delhivery Hub Walk-in · Patna + Muzaffarpur',
      body: 'My ops team is hiring 80 Warehouse Assistants + 40 Sorters for two upcoming hub launches in Bihar. Same-day decisioning. Free transport from Patna Junction. NSQF L3 logistics certified candidates welcome. Drop a comment if you\'re planning to show up — I\'ll keep an eye out.',
      eventAt: future(9), venue: 'Delhivery Hub Bypass, Patna',
      ctaLabel: 'Get directions', ctaUrl: 'https://maps.google.com/?q=Delhivery+Hub+Patna',
      createdAt: past(0) },
    { authorId: tpHqUser?.id, sectorId: SBC.RAS.id,
      kind: 'opening', title: "We're hiring 15 RSAs · Reliance Retail Patna",
      body: 'Reliance Retail — Patna Store Cluster is hiring 15 Retail Sales Associates. ₹13,500–₹15,000/mo, ESIC + EPFO from day 1. NSQF L3 in Retail (RAS/Q0103) required. Apply with your Skill Passport in one tap.',
      ctaLabel: 'Apply with Skill Passport', ctaUrl: 'ksk://canvas/jobs_marketplace',
      createdAt: past(1) },
    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: SBC.LOG.id,
      kind: 'opening', title: 'Hiring at my Gurgaon hub — 6 Warehouse Asst slots',
      body: "My team at Delhivery Gurgaon has 6 open Warehouse Assistant slots. ₹14,500/mo, two shifts, free meals. Looking for early-morning-shift comfort + scanner literacy. Drop a comment with your KSK Skill Passport ID and I'll refer you directly.",
      ctaLabel: 'Comment to refer', ctaUrl: null,
      createdAt: past(2) },
    { authorId: tpHqUser?.id, sectorId: null,
      kind: 'announcement', title: 'PMKVY 5.0 Skill Vouchers go live next Monday',
      body: 'PMKVY 5.0 launches with skill vouchers worth ₹8,000 per candidate — redeemable at accredited training centres. Pre-register on Skill India Digital Hub before this Friday to get the early-access batch. Your KSK Skill Passport is already eligible.',
      eventAt: future(7),
      ctaLabel: 'Read scheme guidelines', ctaUrl: 'https://skillindiadigital.gov.in/pmkvy5',
      createdAt: past(2) },
    { authorId: tpHqUser?.id, sectorId: null,
      kind: 'announcement', title: 'NAPS stipend window closes 30th — file before then',
      body: 'Reminder for apprentices on NAPS: claim window for this quarter closes on the 30th. Make sure your Aadhaar is seeded to your bank — most failures we see are Aadhaar–bank mismatches, not eligibility issues. Check status under My Stipend.',
      ctaLabel: 'Check my stipend', ctaUrl: 'ksk://canvas/stipend_status',
      createdAt: past(3) },
    { authorId: mentorUserBySidh['MNT-RR-001']?.id, sectorId: SBC.RAS.id,
      kind: 'milestone', title: 'Two of my mentees promoted to Floor Supervisor 🎉',
      body: 'Both started as RSA NSQF L3 candidates 14 months ago at Reliance Smart Patna. Career velocity in retail is real — show up, observe, ask. Happy to share the exact 90-day plan they followed if anyone wants it — drop a comment.',
      createdAt: past(3) },
    { authorId: tcPatUser?.id, sectorId: SBC.RAS.id,
      kind: 'milestone', title: 'Batch RA-2026-04 crossed 60% attendance threshold',
      body: 'Proud moment for Magic Bus Patna · Retail batch RA-2026-04. We crossed the 60% attendance threshold for the cohort — NAPS stipend processing starts next week. To the cohort: your first credit lands within ~30 days. Keep showing up.',
      createdAt: past(4) },
    { authorId: mentorUserBySidh['MNT-RR-001']?.id, sectorId: SBC.RAS.id,
      kind: 'note', title: "Tip: own your store's SKU map in week 1",
      body: 'Tip for first-time Retail Sales Associates — spend your first week mapping which SKU lives where in your store. Customers ask "where is X" 30+ times a day. The assistant who can answer in 5 seconds becomes the floor lead in 6 months.',
      createdAt: past(5) },
    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: SBC.LOG.id,
      kind: 'note', title: 'What I look for in a Warehouse Assistant interview',
      body: 'Three things: (1) basic Excel + scanner literacy, (2) willingness to do early-morning shifts, (3) clarity on safety SOPs. Train on those before you apply — most candidates lose the role on (3), not (1).',
      createdAt: past(5) },
    { authorId: mentorUserBySidh['MNT-JIO-001']?.id, sectorId: SBC.TEL.id,
      kind: 'note', title: 'Telecom Tower Tech: the first 90 days matter more than the cert',
      body: 'For everyone training as a Telecom Tower Technician — the certification is just the door. The first 90 days on a tower site teach you more than 6 months in a centre. Treat your foreman like a second instructor.',
      createdAt: past(6) },
    { authorId: mentorUserBySidh['MNT-HDF-001']?.id, sectorId: SBC.BFSI.id,
      kind: 'note', title: 'BFSI candidates: 2 things that get you past first filter',
      body: 'A clean LinkedIn profile + the NCFE basic certificate gets you past the first filter at most private banks. Both are free + take a weekend. If you have not done both this month, that\'s where I\'d start.',
      createdAt: past(6) },
    { authorId: mentorUserBySidh['MNT-APO-001']?.id, sectorId: SBC.HLT.id,
      kind: 'note', title: 'GDAs: negotiate your shift pattern BEFORE you join',
      body: 'Most attrition I see in General Duty Assistants is people doing back-to-back nights for 3 months and then quitting. Negotiate your shift rotation in the offer letter, not after joining. Hospitals will agree more often than you think.',
      createdAt: past(7) },
    { authorId: mentorUserBySidh['MNT-INF-001']?.id, sectorId: SBC.ITS.id,
      kind: 'note', title: "FSP folks: pick a stack, don't chase \"fullstack\"",
      body: 'For the FutureSkills Prime crowd — do NOT chase the "fullstack" tag in your first job. Pick one stack (MERN or Python+Django), build 2 small end-to-end projects, aim for a quality backend or frontend role. Breadth comes after you have shipped something.',
      createdAt: past(8) },
    { authorId: raniUser?.id, sectorId: SBC.RAS.id,
      kind: 'note', title: 'Help — "angry customer about a delayed delivery" mock',
      body: 'Day 3 of my Retail Sales Associate training at Magic Bus Patna. Today we did mock customer scenarios. The "angry customer about a delayed delivery" one was the hardest — I froze. Any tips from working RSAs on how you handle this in real life?',
      createdAt: past(9) },
  ]

  let postsCreated = 0, postsSkipped = 0
  for (const p of FEED) {
    if (!p.authorId) { postsSkipped++; continue }
    // Idempotency: skip if a post with the same author + title already exists.
    const exists = p.title
      ? await prisma.post.findFirst({ where: { authorId: p.authorId, title: p.title } })
      : null
    if (exists) { postsSkipped++; continue }
    await prisma.post.create({ data: p })
    postsCreated++
  }
  console.log(`[seed-mp]   posts created=${postsCreated} skipped=${postsSkipped}`)

  // ── Final counts ──────────────────────────────────────────────────────
  const mentorCount = await prisma.mentorProfile.count()
  const postCount   = await prisma.post.count()
  console.log(`\n[seed-mp] done. mentors=${mentorCount} posts=${postCount}`)
}

main()
  .catch(e => { console.error('[seed-mp] FAILED:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
