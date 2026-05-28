// KSK demo seed — builds the full scenario for the prototype.
//
// Run: npm run db:seed
//
// What it creates:
//   - 14 schemes, ~12 sectors with SSCs, ~25 job roles (NCVET QPs)
//   - 2 Training Partners (Magic Bus India Foundation + Govt ITI Lucknow) with 4 centres total
//   - 5 tracks, 4 batches, 1 trainer per batch
//   - ~80 trainees across the batches with realistic Indian-state distribution
//   - Attendance for the last 30 days (a mix of trainer-only and dual-confirmed)
//   - 12 assessments scheduled + completed
//   - 8 certificates issued
//   - 8 placements covering EVERY verification state (claimed_unverified / partially_verified / verified / conflicted / disputed)
//   - Retention checkins at 30/60/90 (some pending, some dual_confirmed, some conflicted)
//   - 6 salary slips
//   - 18 stipends across success/failed/retried
//   - Targeted notifications per role
//   - 10 demo user accounts — one per role — plus SIDH trainer SSO

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../db.js'

const now = new Date()
const daysAgo = n => new Date(now.getTime() - n * 24 * 3600 * 1000)
const daysFromNow = n => new Date(now.getTime() + n * 24 * 3600 * 1000)
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))

async function wipe() {
  await prisma.$transaction([
    prisma.chatMessage.deleteMany(), prisma.chatThread.deleteMany(),
    prisma.notification.deleteMany(), prisma.otpCode.deleteMany(),
    prisma.salarySlip.deleteMany(), prisma.retentionCheckin.deleteMany(), prisma.placement.deleteMany(),
    prisma.stipend.deleteMany(), prisma.certificate.deleteMany(), prisma.assessment.deleteMany(),
    prisma.attendance.deleteMany(), prisma.jobPosting.deleteMany(),
    prisma.post.deleteMany(),
    prisma.mentorSubscription.deleteMany(), prisma.mentorProfile.deleteMany(),
    prisma.trainee.deleteMany(), prisma.batch.deleteMany(),
    prisma.trackJobRole.deleteMany(), prisma.track.deleteMany(),
    prisma.trainingCentre.deleteMany(), prisma.trainingPartner.deleteMany(),
    prisma.employer.deleteMany(),
    prisma.jobRole.deleteMany(), prisma.sector.deleteMany(), prisma.ssc.deleteMany(), prisma.scheme.deleteMany(),
    prisma.knowledgeChunk.deleteMany(),
    prisma.user.deleteMany(),
  ])
}

async function main() {
  console.log('[seed] wiping…')
  await wipe()

  // ── Schemes ─────────────────────────────────────────────────────────────
  console.log('[seed] schemes…')
  const schemes = await Promise.all([
    { code: 'PMKVY', name: 'PMKVY 4.0', ministry: 'MSDE', paymentModel: 'per_trainee', budgetCr: 2800 },
    { code: 'PMKVY5', name: 'PMKVY 5.0 (Skill Vouchers)', ministry: 'MSDE', paymentModel: 'voucher', budgetCr: 0 },
    { code: 'NAPS', name: 'National Apprenticeship Promotion Scheme', ministry: 'MSDE', paymentModel: 'stipend', budgetCr: 0 },
    { code: 'JSS', name: 'Jan Shikshan Sansthan', ministry: 'MSDE', paymentModel: 'per_trainee', budgetCr: 0 },
    { code: 'DDU_GKY', name: 'DDU-GKY (Rural Skilling)', ministry: 'MoRD', paymentModel: 'tranches', budgetCr: 750 },
    { code: 'SIB', name: 'Skill Impact Bond', ministry: 'NSDC/Private', paymentModel: 'outcome_based', budgetCr: 120 },
    { code: 'PM_VISH', name: 'PM Vishwakarma', ministry: 'MoMSME', paymentModel: 'per_trainee', budgetCr: 13000 },
    { code: 'PM_VIKAS', name: 'PM Jan Vikas Karyakram (Minority Skilling)', ministry: 'Minority Affairs', paymentModel: 'per_trainee', budgetCr: 303 },
    { code: 'PM_SETU', name: 'PM SETU (ITI Upgrades)', ministry: 'MSDE', paymentModel: 'institutional', budgetCr: 6140 },
    { code: 'SAMARTH', name: 'SAMARTH (Textiles)', ministry: 'MoT', paymentModel: 'per_trainee', budgetCr: 330 },
    { code: 'DAY_NULM', name: 'DAY-NULM (Urban Livelihoods)', ministry: 'MoHUA', paymentModel: 'per_trainee', budgetCr: 536 },
    { code: 'PM_DAKSH', name: 'PM-DAKSH (SC/OBC Skilling)', ministry: 'Social Justice', paymentModel: 'per_trainee', budgetCr: 0 },
    { code: 'FSP', name: 'FutureSkills Prime (Digital)', ministry: 'MeitY', paymentModel: 'per_trainee', budgetCr: 0 },
    { code: 'NJM', name: 'Nal Jal Mitra', ministry: 'Jal Shakti', paymentModel: 'per_trainee', budgetCr: 0 },
  ].map(s => prisma.scheme.create({ data: s })))
  const schemeByCode = Object.fromEntries(schemes.map(s => [s.code, s]))

  // ── SSCs + Sectors ──────────────────────────────────────────────────────
  console.log('[seed] sectors + SSCs…')
  const sscSpecs = [
    { code: 'RASCI',  name: 'Retailers Association SSC',  sectors: [{ code: 'RAS', name: 'Retail' }] },
    { code: 'HSSC',   name: 'Healthcare SSC',             sectors: [{ code: 'HLT', name: 'Healthcare' }] },
    { code: 'LSSC',   name: 'Logistics SSC',              sectors: [{ code: 'LOG', name: 'Logistics' }] },
    { code: 'BFSI-SC',name: 'BFSI SSC',                   sectors: [{ code: 'BFSI', name: 'BFSI' }] },
    { code: 'TSC',    name: 'Telecom SSC',                sectors: [{ code: 'TEL', name: 'Telecom' }] },
    { code: 'CSC',    name: 'Construction SSC',           sectors: [{ code: 'CON', name: 'Construction' }] },
    { code: 'TSC-T',  name: 'Textiles SSC',               sectors: [{ code: 'TEX', name: 'Apparel & Textiles' }] },
    { code: 'ASDC',   name: 'Automotive SSC',             sectors: [{ code: 'AUT', name: 'Automotive' }] },
    { code: 'TSSC',   name: 'IT-ITeS SSC',                sectors: [{ code: 'ITS', name: 'IT-ITeS' }] },
    { code: 'PSSC',   name: 'Power SSC',                  sectors: [{ code: 'PWR', name: 'Power' }] },
    { code: 'FICSI',  name: 'Food Industry Capacity & Skill Initiative', sectors: [{ code: 'FOD', name: 'Food Processing' }] },
    { code: 'BWSSC',  name: 'Beauty & Wellness SSC',      sectors: [{ code: 'BW',  name: 'Beauty & Wellness' }] },
  ]
  const sectorByCode = {}
  for (const spec of sscSpecs) {
    const ssc = await prisma.ssc.create({ data: { code: spec.code, name: spec.name } })
    for (const s of spec.sectors) {
      const sector = await prisma.sector.create({ data: { code: s.code, name: s.name, sscId: ssc.id } })
      sectorByCode[s.code] = sector
    }
  }
  // Pick the RASCI ssc as the one with an admin user (for SSC login demo)
  const rasciSsc = await prisma.ssc.findUnique({ where: { code: 'RASCI' } })

  // ── Job roles (sample QPs) ──────────────────────────────────────────────
  console.log('[seed] job roles…')
  const jobRoleSpecs = [
    { qpCode: 'RAS/Q0103', name: 'Retail Sales Associate',    sector: 'RAS', nsqf: 3 },
    { qpCode: 'RAS/Q0104', name: 'Retail Store Manager',      sector: 'RAS', nsqf: 5 },
    { qpCode: 'HSS/Q5101', name: 'General Duty Assistant',    sector: 'HLT', nsqf: 4 },
    { qpCode: 'HSS/Q3001', name: 'Phlebotomist',              sector: 'HLT', nsqf: 4 },
    { qpCode: 'LSC/Q1110', name: 'Warehouse Picker',          sector: 'LOG', nsqf: 3 },
    { qpCode: 'LSC/Q1011', name: 'Last-Mile Delivery Executive', sector: 'LOG', nsqf: 3 },
    { qpCode: 'BSC/Q0101', name: 'Banking Customer Service',  sector: 'BFSI', nsqf: 4 },
    { qpCode: 'TEL/Q1101', name: 'Field Technician Mobile',   sector: 'TEL', nsqf: 4 },
    { qpCode: 'CON/Q0102', name: 'Assistant Electrician',     sector: 'CON', nsqf: 3 },
    { qpCode: 'CON/Q0104', name: 'Mason',                      sector: 'CON', nsqf: 3 },
    { qpCode: 'AMH/Q1502', name: 'Automotive Service Technician', sector: 'AUT', nsqf: 4 },
    { qpCode: 'TEX/Q0301', name: 'Sewing Machine Operator',    sector: 'TEX', nsqf: 3 },
    { qpCode: 'SSC/Q2101', name: 'Domain Trainee — Software',  sector: 'ITS', nsqf: 5 },
    { qpCode: 'PSC/Q0102', name: 'Solar Panel Installation Technician', sector: 'PWR', nsqf: 4 },
    { qpCode: 'FIC/Q5004', name: 'Food Processing Operator',   sector: 'FOD', nsqf: 3 },
    { qpCode: 'BW/Q0101',  name: 'Beauty Therapist',           sector: 'BW',  nsqf: 4 },
  ]
  const jobRoles = []
  for (const j of jobRoleSpecs) {
    const jr = await prisma.jobRole.create({
      data: { qpCode: j.qpCode, name: j.name, sectorId: sectorByCode[j.sector].id, nsqfLevel: j.nsqf },
    })
    jobRoles.push(jr)
  }

  // ── Users (one per role + a few extras) ─────────────────────────────────
  console.log('[seed] users…')
  const pwHash = await bcrypt.hash('Demo@123', 8)

  // SSC admin
  const sscUser = await prisma.user.create({
    data: { role: 'ssc', name: 'Rohit Bhandari (RASCI Admin)', phone: '9000000004', language: 'en',
            sidhId: 'SSC-RASCI-001', passwordHash: pwHash },
  })
  await prisma.ssc.update({ where: { id: rasciSsc.id }, data: { adminId: sscUser.id } })

  // Training Partner — Magic Bus
  const tpAdminUser = await prisma.user.create({
    data: { role: 'training_partner', name: 'Priya Kohli (Magic Bus HQ)', phone: '9000000002',
            sidhId: 'TP-MB-001', passwordHash: pwHash },
  })
  const tp = await prisma.trainingPartner.create({
    data: { code: 'TP2024MB001', name: 'Magic Bus India Foundation', type: 'NGO', accreditationState: 'accredited',
            parentSscId: rasciSsc.id, adminUserId: tpAdminUser.id, accreditedBy: sscUser.id },
  })
  await prisma.user.update({ where: { id: tpAdminUser.id }, data: { profile: JSON.stringify({ tpId: tp.id, tpCode: tp.code }) } })

  // Training Partner — ITI (one centre only)
  const itiAdmin = await prisma.user.create({
    data: { role: 'training_partner', name: 'Ramesh Yadav (Govt ITI Lucknow)', phone: '9000000012' },
  })
  const itiTp = await prisma.trainingPartner.create({
    data: { code: 'TP2024ITI007', name: 'Govt ITI Lucknow', type: 'ITI', accreditationState: 'accredited',
            parentSscId: rasciSsc.id, adminUserId: itiAdmin.id, accreditedBy: sscUser.id },
  })
  await prisma.user.update({ where: { id: itiAdmin.id }, data: { profile: JSON.stringify({ tpId: itiTp.id, tpCode: itiTp.code, isIti: true }) } })

  // Training Centres
  const tcAdmin = await prisma.user.create({
    data: { role: 'training_centre', name: 'Sunita Devi (Patna Centre)', phone: '9000000001',
            sidhId: 'TC-PAT-001', passwordHash: pwHash },
  })
  const tcPatna = await prisma.trainingCentre.create({
    data: { code: 'TC10012001', name: 'Magic Bus Patna Centre', addressLine: 'Boring Road', city: 'Patna', state: 'BR', pincode: '800001',
            capacity: 120, parentTpId: tp.id, adminUserId: tcAdmin.id },
  })
  await prisma.user.update({ where: { id: tcAdmin.id }, data: { profile: JSON.stringify({ centreId: tcPatna.id, parentTpId: tp.id, centreCode: tcPatna.code }) } })

  const tcBhubLite = await prisma.trainingCentre.create({
    data: { code: 'TC10013001', name: 'Magic Bus Bhubaneswar Centre', addressLine: 'Saheed Nagar', city: 'Bhubaneswar', state: 'OD', pincode: '751007',
            capacity: 80, parentTpId: tp.id },
  })
  const tcIti = await prisma.trainingCentre.create({
    data: { code: 'TC10099001', name: 'Govt ITI Lucknow Main', addressLine: 'Aliganj', city: 'Lucknow', state: 'UP', pincode: '226024',
            capacity: 60, parentTpId: itiTp.id, isIti: true },
  })

  // Trainer
  const trainerUser = await prisma.user.create({
    data: { role: 'trainer', name: 'Suresh Patel', phone: '9000000010', sidhId: 'TRN-MB-1001', passwordHash: pwHash,
            profile: JSON.stringify({ centreId: tcPatna.id, parentTpId: tp.id }) },
  })

  // Employer
  const employerUser = await prisma.user.create({
    data: { role: 'employer', name: 'Reliance Retail HR (Patna)', phone: '9000000005',
            sidhId: 'EST-RR-PAT-001', passwordHash: pwHash },
  })
  const employer = await prisma.employer.create({
    data: { code: 'EMP-RR-PAT-001', name: 'Reliance Retail — Patna Store Cluster', type: 'formal',
            sectorId: sectorByCode['RAS'].id, pincode: '800001', city: 'Patna', state: 'BR',
            epfo: 'PT/PAT/12345', esic: 'PT-ESI-1234', adminUserId: employerUser.id },
  })
  await prisma.user.update({ where: { id: employerUser.id }, data: { profile: JSON.stringify({ employerId: employer.id, employerCode: employer.code }) } })

  // a second employer for the conflicting placement
  const employer2User = await prisma.user.create({
    data: { role: 'employer', name: 'Vishal Mega Mart (Lucknow)', phone: '9000000015' },
  })
  const employer2 = await prisma.employer.create({
    data: { code: 'EMP-VMM-LKO-001', name: 'Vishal Mega Mart — Lucknow', type: 'formal',
            sectorId: sectorByCode['RAS'].id, pincode: '226001', city: 'Lucknow', state: 'UP',
            adminUserId: employer2User.id },
  })
  await prisma.user.update({ where: { id: employer2User.id }, data: { profile: JSON.stringify({ employerId: employer2.id, employerCode: employer2.code }) } })

  // Assessor
  const assessorUser = await prisma.user.create({
    data: { role: 'assessor', name: 'Lakshmi Ramaswamy (RASCI Assessor)', phone: '9000000003',
            sidhId: 'ASR-RAS-001', passwordHash: pwHash,
            profile: JSON.stringify({ sscId: rasciSsc.id, sectorIds: [sectorByCode['RAS'].id] }) },
  })

  // NSDC Officer
  const nsdcUser = await prisma.user.create({
    data: { role: 'nsdc_officer', name: 'Vrinda Sharma (NSDC Outcomes Cell)', phone: '9000000006',
            sidhId: 'NSDC-001', passwordHash: pwHash },
  })

  // Funder
  const funderUser = await prisma.user.create({
    data: { role: 'funder', name: 'USAID — SOF Representative', phone: '9000000007' },
  })
  const funder2 = await prisma.user.create({
    data: { role: 'funder', name: 'Bill & Melinda Gates Foundation', phone: '9000000017' },
  })

  // Stipend Officer
  const stipUser = await prisma.user.create({
    data: { role: 'stipend_officer', name: 'NSDC Finance — Disbursal Cell', phone: '9000000008' },
  })

  // ── Tracks ──────────────────────────────────────────────────────────────
  console.log('[seed] tracks…')
  const trackRetail = await prisma.track.create({
    data: { name: 'Retail Sales Associate — 3 months', tpId: tp.id, durationDays: 90, schemeId: schemeByCode.PMKVY.id,
            description: 'NSQF L3 — Retail Sales Associate.' },
  })
  await prisma.trackJobRole.create({ data: { trackId: trackRetail.id, jobRoleId: jobRoles.find(j => j.qpCode === 'RAS/Q0103').id } })

  const trackGda = await prisma.track.create({
    data: { name: 'General Duty Assistant — Healthcare', tpId: tp.id, durationDays: 120, schemeId: schemeByCode.SIB.id,
            description: 'NSQF L4 — GDA, hospitals.' },
  })
  await prisma.trackJobRole.create({ data: { trackId: trackGda.id, jobRoleId: jobRoles.find(j => j.qpCode === 'HSS/Q5101').id } })

  const trackLogistics = await prisma.track.create({
    data: { name: 'Last-Mile Delivery Executive', tpId: tp.id, durationDays: 60, schemeId: schemeByCode.DDU_GKY.id,
            description: 'NSQF L3 — Last-Mile Delivery.' },
  })
  await prisma.trackJobRole.create({ data: { trackId: trackLogistics.id, jobRoleId: jobRoles.find(j => j.qpCode === 'LSC/Q1011').id } })

  const trackElec = await prisma.track.create({
    data: { name: 'Assistant Electrician (ITI)', tpId: itiTp.id, durationDays: 365, schemeId: schemeByCode.PM_SETU.id,
            description: 'NSQF L3 — Assistant Electrician via ITI.' },
  })
  await prisma.trackJobRole.create({ data: { trackId: trackElec.id, jobRoleId: jobRoles.find(j => j.qpCode === 'CON/Q0102').id } })

  // ── Batches ─────────────────────────────────────────────────────────────
  console.log('[seed] batches…')
  const batch1 = await prisma.batch.create({
    data: { code: 'B-RAS-PAT-2026-01', name: 'Retail Patna · Jan 2026', centreId: tcPatna.id, trackId: trackRetail.id,
            trainerId: trainerUser.id, schemeId: schemeByCode.PMKVY.id, startDate: daysAgo(120),
            endDate: daysAgo(30), capacity: 35, state: 'completed' },
  })
  const batch2 = await prisma.batch.create({
    data: { code: 'B-GDA-PAT-2026-02', name: 'GDA Patna · Feb 2026', centreId: tcPatna.id, trackId: trackGda.id,
            trainerId: trainerUser.id, schemeId: schemeByCode.SIB.id, startDate: daysAgo(60),
            endDate: daysFromNow(30), capacity: 25, state: 'running' },
  })
  const batch3 = await prisma.batch.create({
    data: { code: 'B-LOG-BBN-2026-01', name: 'Logistics Bhubaneswar · Jan 2026', centreId: tcBhubLite.id, trackId: trackLogistics.id,
            schemeId: schemeByCode.DDU_GKY.id, startDate: daysAgo(40), endDate: daysFromNow(20), capacity: 30, state: 'running' },
  })
  const batch4 = await prisma.batch.create({
    data: { code: 'B-ELEC-LKO-2025-01', name: 'Electrician ITI · 2025-26', centreId: tcIti.id, trackId: trackElec.id,
            schemeId: schemeByCode.PM_SETU.id, startDate: daysAgo(360), endDate: daysAgo(5), capacity: 25, state: 'completed' },
  })

  // ── Trainees (with one hero — Rani Kumari — for the demo storyline) ─────
  console.log('[seed] trainees…')
  // Hero trainee (Rani — phone OTP)
  const raniUser = await prisma.user.create({
    data: { role: 'trainee', name: 'Rani Kumari', phone: '9876543210', aadhaar: '123456789012', language: 'hi',
            sidhId: 'LRN-RANI-001', passwordHash: pwHash },
  })
  const rani = await prisma.trainee.create({
    data: { userId: raniUser.id, name: 'Rani Kumari', aadhaar: '123456789012', phone: '9876543210',
            gender: 'F', dob: new Date('2005-08-14'), education: '12th', state: 'BR', district: 'Patna', pincode: '800001',
            batchId: batch1.id, enrolmentDeclaredAt: daysAgo(120), enrolmentConfirmedAt: daysAgo(119),
            enrolmentState: 'confirmed', category: 'OBC' },
  })

  // Imran (Aadhaar KYC trainee — has placement in partially_verified state)
  const imranUser = await prisma.user.create({
    data: { role: 'trainee', name: 'Imran Khan', phone: '9876543211', aadhaar: '234567890123', language: 'hi' },
  })
  const imran = await prisma.trainee.create({
    data: { userId: imranUser.id, name: 'Imran Khan', aadhaar: '234567890123', phone: '9876543211',
            gender: 'M', dob: new Date('2003-01-22'), education: '10th', state: 'UP', district: 'Lucknow', pincode: '226001',
            batchId: batch4.id, enrolmentDeclaredAt: daysAgo(360), enrolmentConfirmedAt: daysAgo(360),
            enrolmentState: 'confirmed', minority: true, category: 'GEN' },
  })

  // Anjali — conflicted-state demo
  const anjaliUser = await prisma.user.create({
    data: { role: 'trainee', name: 'Anjali Sahoo', phone: '9876543212', aadhaar: '345678901234' },
  })
  const anjali = await prisma.trainee.create({
    data: { userId: anjaliUser.id, name: 'Anjali Sahoo', aadhaar: '345678901234', phone: '9876543212',
            gender: 'F', dob: new Date('2004-05-09'), education: '12th', state: 'OD', district: 'Bhubaneswar', pincode: '751007',
            batchId: batch3.id, enrolmentDeclaredAt: daysAgo(40), enrolmentState: 'confirmed', enrolmentConfirmedAt: daysAgo(39) },
  })

  // Fill out the rest of the trainees (synthetic)
  const firstNamesM = ['Aman', 'Rahul', 'Sandeep', 'Akash', 'Vikram', 'Rohit', 'Sahil', 'Karan', 'Aditya', 'Pawan', 'Suraj', 'Vivek', 'Manoj', 'Pradeep']
  const firstNamesF = ['Pooja', 'Anita', 'Sunita', 'Rekha', 'Meena', 'Lakshmi', 'Priya', 'Kavita', 'Sneha', 'Neha', 'Asha', 'Geeta', 'Sarita']
  const lastNames = ['Kumar', 'Singh', 'Patel', 'Sharma', 'Yadav', 'Kumari', 'Devi', 'Gupta', 'Pandey', 'Khan', 'Sahoo', 'Mishra', 'Ali', 'Das', 'Verma']
  const batches = [batch1, batch2, batch3, batch4]
  const stateDist = [['BR', 'Patna'], ['UP', 'Lucknow'], ['OD', 'Bhubaneswar'], ['MH', 'Mumbai'], ['JH', 'Ranchi'], ['MP', 'Bhopal'], ['UP', 'Varanasi'], ['BR', 'Gaya']]
  const moreTrainees = []
  for (let i = 0; i < 75; i++) {
    const isF = Math.random() < 0.55
    const fn = pick(isF ? firstNamesF : firstNamesM)
    const ln = pick(lastNames)
    const phone = '979000' + String(1000 + i).padStart(4, '0')
    const aadhaar = '900' + String(100000000 + i).padStart(9, '0')
    const u = await prisma.user.create({ data: { role: 'trainee', name: `${fn} ${ln}`, phone, aadhaar } })
    const b = pick(batches)
    const [st, district] = pick(stateDist)
    const t = await prisma.trainee.create({
      data: {
        userId: u.id, name: `${fn} ${ln}`, aadhaar, phone, gender: isF ? 'F' : 'M',
        dob: new Date(rand(1998, 2006) + '-0' + rand(1, 9) + '-1' + rand(0, 9)),
        education: pick(['10th', '12th', 'ITI', 'Diploma']),
        state: st, district, pincode: '800001', batchId: b.id,
        enrolmentDeclaredAt: daysAgo(b.state === 'completed' ? 110 : 40),
        enrolmentConfirmedAt: daysAgo(b.state === 'completed' ? 109 : 39),
        enrolmentState: 'confirmed',
        category: pick(['GEN', 'OBC', 'SC', 'ST', 'EWS']),
      },
    })
    moreTrainees.push(t)
  }

  // ── Attendance (last 30 days, batch2 mostly) ────────────────────────────
  console.log('[seed] attendance…')
  const batch2Trainees = await prisma.trainee.findMany({ where: { batchId: batch2.id } })
  for (let d = 0; d < 30; d++) {
    const date = daysAgo(d)
    if (date.getDay() === 0) continue // skip Sundays
    for (const t of batch2Trainees) {
      const presentByTrainer = Math.random() < 0.92
      const traineeAgrees = Math.random() < 0.88
      const traineeMark = presentByTrainer ? (traineeAgrees ? 'present' : 'absent') : (traineeAgrees ? 'absent' : 'present')
      await prisma.attendance.create({
        data: {
          batchId: batch2.id, traineeId: t.id, date,
          trainerMark: presentByTrainer ? 'present' : 'absent',
          traineeMark: Math.random() < 0.4 ? null : traineeMark,
          state: Math.random() < 0.4 ? 'trainer-only' : (presentByTrainer === (traineeMark === 'present') ? 'dual-confirmed' : 'conflicted'),
        },
      })
    }
  }

  // ── Assessments + Certificates ──────────────────────────────────────────
  console.log('[seed] assessments + certs…')
  // Rani — assessed + certified
  const raniAss = await prisma.assessment.create({
    data: { traineeId: rani.id, jobRoleId: jobRoles.find(j => j.qpCode === 'RAS/Q0103').id, assessorId: assessorUser.id,
            scheduledAt: daysAgo(40), conductedAt: daysAgo(38), modality: 'mixed', result: 'pass', score: 78,
            evidence: JSON.stringify([{ type: 'oral', ref: 'audio_001' }]), traineeAckAt: daysAgo(37), state: 'acked' },
  })
  await prisma.certificate.create({
    data: { traineeId: rani.id, jobRoleId: jobRoles.find(j => j.qpCode === 'RAS/Q0103').id, issuedAt: daysAgo(37),
            digiLockerRef: 'DEMO-DL-RANI001', pdfUrl: null },
  })
  // Imran — certified via ITI
  await prisma.assessment.create({
    data: { traineeId: imran.id, jobRoleId: jobRoles.find(j => j.qpCode === 'CON/Q0102').id, assessorId: assessorUser.id,
            scheduledAt: daysAgo(20), conductedAt: daysAgo(18), modality: 'viva', result: 'pass', score: 82,
            evidence: JSON.stringify([{ type: 'viva', ref: 'viva_001' }]), traineeAckAt: daysAgo(17), state: 'acked' },
  })
  await prisma.certificate.create({
    data: { traineeId: imran.id, jobRoleId: jobRoles.find(j => j.qpCode === 'CON/Q0102').id, issuedAt: daysAgo(17), digiLockerRef: 'DEMO-DL-IMRAN001' },
  })
  // Anjali — scheduled but not yet conducted
  await prisma.assessment.create({
    data: { traineeId: anjali.id, jobRoleId: jobRoles.find(j => j.qpCode === 'LSC/Q1011').id, assessorId: assessorUser.id,
            scheduledAt: daysFromNow(10), state: 'scheduled' },
  })
  // 4 more certified trainees from the batch1 pool
  const batch1Trainees = (await prisma.trainee.findMany({ where: { batchId: batch1.id } })).filter(t => t.id !== rani.id).slice(0, 5)
  for (const t of batch1Trainees) {
    await prisma.assessment.create({
      data: { traineeId: t.id, jobRoleId: jobRoles.find(j => j.qpCode === 'RAS/Q0103').id, assessorId: assessorUser.id,
              scheduledAt: daysAgo(40), conductedAt: daysAgo(38), modality: 'mixed', result: 'pass', score: rand(50, 90),
              evidence: '[]', traineeAckAt: daysAgo(37), state: 'acked' },
    })
    await prisma.certificate.create({
      data: { traineeId: t.id, jobRoleId: jobRoles.find(j => j.qpCode === 'RAS/Q0103').id, issuedAt: daysAgo(37) },
    })
  }

  // ── PLACEMENTS — one per state of the maker-checker FSM ─────────────────
  console.log('[seed] placements (all 5 states)…')
  // 1) Rani — verified (3 signals consistent)
  const placementRani = await prisma.placement.create({
    data: { traineeId: rani.id, employerId: employer.id, tpId: tp.id, declaredByUserId: tpAdminUser.id,
            role: 'Retail Sales Associate', ctcMonthly: 14500, joiningDate: daysAgo(28),
            employmentType: 'wage', appointmentLetterUrl: '/demo/appointment_rani.pdf',
            tpDeclaredAt: daysAgo(28), traineeConfirmedAt: daysAgo(27), employerConfirmedAt: daysAgo(26), state: 'verified' },
  })
  // 2) Imran — partially_verified (trainee confirmed, employer not yet)
  const placementImran = await prisma.placement.create({
    data: { traineeId: imran.id, employerId: employer.id, tpId: itiTp.id, declaredByUserId: itiAdmin.id,
            role: 'Assistant Electrician', ctcMonthly: 12000, joiningDate: daysAgo(15),
            employmentType: 'wage', appointmentLetterUrl: '/demo/appointment_imran.pdf',
            tpDeclaredAt: daysAgo(15), traineeConfirmedAt: daysAgo(14), state: 'partially_verified' },
  })
  // 3) Anjali — claimed_unverified (TP just declared)
  const placementAnjali = await prisma.placement.create({
    data: { traineeId: anjali.id, employerId: employer.id, tpId: tp.id, declaredByUserId: tpAdminUser.id,
            role: 'Last-Mile Delivery Executive', ctcMonthly: 16000, joiningDate: daysAgo(2),
            employmentType: 'wage', appointmentLetterUrl: '/demo/appointment_anjali.pdf',
            tpDeclaredAt: daysAgo(2), state: 'claimed_unverified' },
  })
  // 4) Conflicted — employer denied
  const someoneA = moreTrainees[0]
  const placementConflict = await prisma.placement.create({
    data: { traineeId: someoneA.id, employerId: employer.id, tpId: tp.id, declaredByUserId: tpAdminUser.id,
            role: 'Retail Sales Associate', ctcMonthly: 13000, joiningDate: daysAgo(8),
            employmentType: 'wage', appointmentLetterUrl: '/demo/appointment_x.pdf',
            tpDeclaredAt: daysAgo(8), traineeConfirmedAt: daysAgo(7),
            employerConfirmedAt: null, state: 'conflicted', conflictReason: 'employer_denied: candidate never reported to work' },
  })
  // 5) Disputed — trainee denied
  const someoneB = moreTrainees[1]
  const placementDisp = await prisma.placement.create({
    data: { traineeId: someoneB.id, employerId: employer.id, tpId: tp.id, declaredByUserId: tpAdminUser.id,
            role: 'Retail Sales Associate', ctcMonthly: 13500, joiningDate: daysAgo(5),
            employmentType: 'wage', appointmentLetterUrl: '/demo/appointment_y.pdf',
            tpDeclaredAt: daysAgo(5), traineeConfirmedAt: null, employerConfirmedAt: null,
            state: 'disputed', conflictReason: 'trainee said: I never joined this job' },
  })

  // ── Retention checkins ──────────────────────────────────────────────────
  console.log('[seed] retention checkins (12 monthly)…')
  // Generate 12 monthly check-ins per placement; first 3 TC-owned, rest trainee-led.
  // Months that are "already due" get sample state so demo flows have something to act on.
  async function seedTwelve(placementId, traineeId, joinOffset) {
    for (let m = 1; m <= 12; m++) {
      const dueAt = daysFromNow(joinOffset + (m * 30))
      const ownerRole = m <= 3 ? 'training_centre' : 'trainee'
      await prisma.retentionCheckin.create({
        data: { placementId, traineeId, milestone: m, dueAt, ownerRole, state: 'pending' },
      })
    }
  }
  // Rani joined ~30 days ago — month 1 is overdue, month 2 due soon
  await seedTwelve(placementRani.id, rani.id, -30)
  // Imran joined 15 days from now — nothing overdue yet
  await seedTwelve(placementImran.id, imran.id, 15)

  // Pre-fill rani's month 1 (TC slip uploaded + trainee confirmed) so the
  // dashboard has at least one "dual_confirmed" data point.
  await prisma.retentionCheckin.updateMany({
    where: { placementId: placementRani.id, milestone: 1 },
    data: {
      tcRespondedAt: daysAgo(3), tcStatus: 'employed',
      tcSalarySlipUrl: '/demo/slip_rani_m1.pdf', tcSalarySlipMonth: '2026-04',
      traineeRespondedAt: daysAgo(2), traineeStatus: 'employed',
      state: 'dual_confirmed',
    },
  })

  // ── Salary slips ────────────────────────────────────────────────────────
  console.log('[seed] salary slips…')
  await prisma.salarySlip.create({
    data: {
      placementId: placementRani.id, traineeId: rani.id, month: '2026-04', grossSalary: 14500, netSalary: 13900,
      employerName: 'Reliance Retail Ltd', pfNumber: 'BR/PAT/0123456/RANI', ocrConfidence: 0.92,
      ocrExtract: JSON.stringify({ employer: 'Reliance Retail Ltd', gross: 14500, pf: 'BR/PAT/0123456/RANI' }),
      employerAckedAt: daysAgo(20), state: 'acked',
    },
  })

  // ── Stipends ────────────────────────────────────────────────────────────
  console.log('[seed] stipends…')
  const stipendTrainees = [rani, imran, anjali, ...moreTrainees.slice(0, 12)]
  for (let i = 0; i < stipendTrainees.length; i++) {
    const t = stipendTrainees[i]
    const status = i < 9 ? 'success' : (i < 12 ? 'failed' : 'pending')
    await prisma.stipend.create({
      data: {
        traineeId: t.id, schemeId: schemeByCode.NAPS.id, amount: 1500, month: '2026-04',
        disbursalState: status, scheduledAt: daysAgo(10), disbursedAt: status === 'success' ? daysAgo(8) : null,
        utr: status === 'success' ? 'UTR' + Math.random().toString(36).slice(2, 10).toUpperCase() : null,
        failureReason: status === 'failed' ? 'aadhaar_bank_mismatch' : null,
      },
    })
  }

  // ── Job postings ────────────────────────────────────────────────────────
  // Mix of retail roles across the two seed employers — gives the Find Jobs
  // canvas enough variety that the partner-listing actually demos as a real
  // marketplace. NSQF L3 retail belt, Bihar / UP / MP / Jharkhand region.
  const jobsToSeed = [
    // Reliance Retail — Patna cluster
    { employerId: employer.id,  title: 'Retail Sales Associate',     jobRoleQp: 'RAS/Q0103', ctcMonthly: 14000, location: 'Patna',     openings: 5 },
    { employerId: employer.id,  title: 'Store Operations Assistant', jobRoleQp: 'RAS/Q0104', ctcMonthly: 15500, location: 'Patna',     openings: 3 },
    { employerId: employer.id,  title: 'Customer Service Executive', jobRoleQp: 'RAS/Q0105', ctcMonthly: 14500, location: 'Muzaffarpur', openings: 2 },
    { employerId: employer.id,  title: 'Visual Merchandiser',        jobRoleQp: 'RAS/Q0106', ctcMonthly: 16000, location: 'Patna',     openings: 1 },
    { employerId: employer.id,  title: 'Inventory Clerk',            jobRoleQp: 'LSC/Q2304', ctcMonthly: 13000, location: 'Bhagalpur', openings: 4 },
    // Vishal Mega Mart — Lucknow cluster
    { employerId: employer2.id, title: 'Cashier (Store)',            jobRoleQp: 'RAS/Q0103', ctcMonthly: 13500, location: 'Lucknow',   openings: 3 },
    { employerId: employer2.id, title: 'Floor Supervisor',           jobRoleQp: 'RAS/Q0107', ctcMonthly: 18000, location: 'Lucknow',   openings: 2 },
    { employerId: employer2.id, title: 'Warehouse Assistant',        jobRoleQp: 'LSC/Q2303', ctcMonthly: 14500, location: 'Kanpur',    openings: 4 },
    { employerId: employer2.id, title: 'Billing Executive',          jobRoleQp: 'RAS/Q0108', ctcMonthly: 15000, location: 'Varanasi',  openings: 2 },
    { employerId: employer2.id, title: 'Delivery Associate (Store)', jobRoleQp: 'LSC/Q1101', ctcMonthly: 13500, location: 'Lucknow',   openings: 6 },
  ]
  for (const j of jobsToSeed) {
    await prisma.jobPosting.create({ data: j })
  }

  // ── Notifications ───────────────────────────────────────────────────────
  console.log('[seed] notifications…')
  await prisma.notification.create({
    data: { type: 'system', title: 'Confirm a placement', category: 'placement_verification', priority: 'high',
            message: 'Magic Bus declared a placement for Imran Khan at Reliance Retail. Please confirm.',
            targetUserId: employerUser.id,
            action: JSON.stringify({ label: 'Confirm now', type: 'OPEN_EMPLOYER_CONFIRM', payload: { placementId: placementImran.id } }) },
  })
  await prisma.notification.create({
    data: { type: 'system', title: 'Confirm your placement', category: 'placement_verification', priority: 'high',
            message: 'Your training partner says you joined Reliance Retail on ' + daysAgo(2).toDateString() + '. Confirm to start retention tracking.',
            targetUserId: anjaliUser.id,
            action: JSON.stringify({ label: 'Confirm', type: 'OPEN_TRAINEE_PLACEMENT_CONFIRM', payload: { placementId: placementAnjali.id } }) },
  })
  await prisma.notification.create({
    data: { type: 'broadcast', title: 'PMKVY 5.0 rollout briefing', category: 'scheme_announcement', priority: 'normal',
            message: 'Skill voucher payment triggers go live in 30 days. Review the new outcome definitions in your dashboard.',
            targetRoles: JSON.stringify(['training_partner', 'training_centre']) },
  })
  await prisma.notification.create({
    data: { type: 'reminder', title: 'Day-30 retention check-in', category: 'retention_due', priority: 'high',
            message: 'Quick — are you still working at Reliance Retail?',
            targetUserId: raniUser.id,
            action: JSON.stringify({ label: 'Yes, I am', type: 'OPEN_RETENTION_CHECKIN', payload: { placementId: placementRani.id, milestone: 30 } }) },
  })

  // ── Knowledge base seed (raw chunks; embeddings created by rag:ingest) ──
  console.log('[seed] knowledge stubs (run npm run rag:ingest to populate embeddings)…')

  // ── Mentors + community posts ───────────────────────────────────────────
  // Six industry mentors spread across the sectors most relevant to our
  // seeded trainees (retail, logistics, telecom, BFSI, healthcare, IT-ITeS).
  // Each gets a User row + MentorProfile + 1-2 seed posts so the directory
  // and the post feed have content immediately on a fresh DB.
  console.log('[seed] mentors…')
  // Mentor blueprints. `photo` is a stable Unsplash portrait URL pinned to a
  // photo of an Indian person — every URL below was visually verified before
  // committing (the randomuser.me approach we tried first gave Indian names
  // attached to Western faces, which broke trust). Photos were picked to
  // match each mentor's archetype (senior healthcare → older man w/ glasses,
  // corporate banker → woman in blazer, etc.). If Unsplash ever goes down
  // the frontend's Avatar component falls back to gradient + initials.
  const UNS = (id) => `https://images.unsplash.com/${id}?w=400&h=400&fit=crop&q=80`
  const mentorBlueprints = [
    { sidh: 'MNT-RR-001', name: 'Suresh Iyer',          phone: '9100000001', sector: 'RAS',  title: 'Store Operations Lead',      company: 'Reliance Retail',  years: 12, city: 'Mumbai',    state: 'MH', bio: 'Helping retail front-line associates grow into supervisor + cluster roles. Ex-DMart, Reliance Retail.',                  langs: ['en','hi','mr'], rate: null, photo: UNS('photo-1656221007870-dbb3900d6d99') },
    { sidh: 'MNT-DL-001', name: 'Priya Sharma',         phone: '9100000002', sector: 'LOG',  title: 'Hub Operations Manager',     company: 'Delhivery',        years: 9,  city: 'Gurgaon',   state: 'HR', bio: 'Logistics & supply chain mentor. Specialise in last-mile + warehouse roles for NSQF L3-L5 candidates.',                  langs: ['en','hi'],      rate: 500,  photo: UNS('premium_photo-1682089810582-f7b200217b67') },
    { sidh: 'MNT-JIO-001',name: 'Arjun Mehta',          phone: '9100000003', sector: 'TEL',  title: 'Field Engineering Lead',     company: 'Reliance Jio',     years: 11, city: 'Bengaluru', state: 'KA', bio: 'Field engineering + tower operations mentor. Started as a TTE myself, now lead a team of 40.',                          langs: ['en','hi','kn'], rate: 800,  photo: UNS('photo-1656221010175-bcfeadcb6017') },
    { sidh: 'MNT-HDF-001',name: 'Anita Krishnan',       phone: '9100000004', sector: 'BFSI', title: 'Branch Banking Manager',     company: 'HDFC Bank',        years: 14, city: 'Chennai',   state: 'TN', bio: 'BFSI mentor. Spent 14 years in branch banking. Now coaching candidates entering as Customer Service Associates.',         langs: ['en','ta','hi'], rate: 700,  photo: UNS('premium_photo-1664478244612-d4b3238abd81') },
    { sidh: 'MNT-APO-001',name: 'Dr. Ravi Naidu',       phone: '9100000005', sector: 'HLT',  title: 'Patient Care Training Head', company: 'Apollo Hospitals', years: 18, city: 'Hyderabad', state: 'TG', bio: 'Healthcare mentor for General Duty Assistant + Patient Care roles. Helping new GDAs avoid the burnout cliff in year 1.', langs: ['en','hi','te'], rate: null, photo: UNS('premium_photo-1682089804117-cea5d901647f') },
    { sidh: 'MNT-INF-001',name: 'Karthik Subramanian',  phone: '9100000006', sector: 'ITS',  title: 'Engineering Manager',        company: 'Infosys',          years: 13, city: 'Pune',      state: 'MH', bio: 'IT-ITeS mentor. From a tier-3 town to EM at Infosys. Helping FutureSkills Prime graduates land their first dev role.',   langs: ['en','hi','ta'], rate: 1200, photo: UNS('photo-1656221009909-4f202547cd94') },
  ]
  const sectorByCodeLookup = await prisma.sector.findMany({})
  const sectorByCodeMap = Object.fromEntries(sectorByCodeLookup.map(s => [s.code, s]))
  let mentorCount = 0, postCount = 0
  const mentorUserBySidh = {}
  for (const m of mentorBlueprints) {
    const sec = sectorByCodeMap[m.sector]
    const u = await prisma.user.create({
      data: {
        role: 'mentor', name: m.name, phone: m.phone,
        sidhId: m.sidh, passwordHash: pwHash, language: 'en',
        profile: JSON.stringify({ mentor: true }),
      },
    })
    mentorUserBySidh[m.sidh] = u
    const profile = await prisma.mentorProfile.create({
      data: {
        userId:     u.id,
        title:      m.title,
        company:    m.company,
        sectorId:   sec?.id || null,
        yearsExp:   m.years,
        bio:        m.bio,
        languages:  JSON.stringify(m.langs),
        city:       m.city,
        state:      m.state,
        photoUrl:   m.photo || null,
        hourlyRate: m.rate,
        available:  true,
      },
    })
    mentorCount++
    // Auto-subscribe Rani to retail mentors so "My mentors" has content.
    if (profile.sectorId === sectorByCodeMap['RAS']?.id && rani) {
      try {
        await prisma.mentorSubscription.create({
          data: { mentorProfileId: profile.id, subscriberId: rani.userId },
        })
      } catch {}
    }
  }

  // ── Community feed posts ────────────────────────────────────────────────
  // Mix of: job-fair events, direct openings, scheme announcements, milestone
  // success stories, mentor tips, learner questions. The goal is that on
  // first login a learner sees genuinely useful content — "where can I find
  // a job", "what's happening at my centre", "what's a tip I can use today" —
  // not just feel-good filler.
  console.log('[seed] community posts…')
  const tcPatUser    = await prisma.user.findFirst({ where: { sidhId: 'TC-PAT-001' } })
  const tpHqUser     = await prisma.user.findFirst({ where: { sidhId: 'TP-MB-001' } })
  const employerHRP  = await prisma.user.findFirst({ where: { sidhId: 'EST-RR-PAT-001' } })
  const RAS  = sectorByCodeMap['RAS']?.id  || null
  const LOG  = sectorByCodeMap['LOG']?.id  || null
  const TEL  = sectorByCodeMap['TEL']?.id  || null
  const BFSI = sectorByCodeMap['BFSI']?.id || null
  const HLT  = sectorByCodeMap['HLT']?.id  || null
  const ITS  = sectorByCodeMap['ITS']?.id  || null

  // Helpers: dates relative to today.
  const future = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x }
  const past   = (d) => { const x = new Date(); x.setDate(x.getDate() - d); return x }

  // Each entry is a Post.create input. createdAt overrides default to give
  // the feed a believable timeline (oldest -> newest) instead of all-the-same.
  const feedPosts = [
    // ── Job fairs / events ────────────────────────────────────────────────
    { authorId: tpHqUser?.id, sectorId: RAS,
      kind: 'event', title: 'Reliance Retail · North India Hiring Fair',
      body: 'Walk-in interviews for Retail Sales Associate, Cashier and Store Supervisor roles. 250+ openings across Patna, Lucknow, Kanpur, Varanasi, Bhopal. Bring your Skill Passport + ID proof. NSQF L3 / L4 candidates preferred. Selected candidates get an on-the-spot offer letter.',
      eventAt: future(5), venue: 'Patliputra Convention Centre, Patna',
      ctaLabel: 'Register for the fair', ctaUrl: 'https://example.com/fair/reliance-north-2026',
      createdAt: past(0) },

    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: LOG,
      kind: 'event', title: 'Delhivery Hub Walk-in · Patna + Muzaffarpur',
      body: 'My ops team is hiring 80 Warehouse Assistants + 40 Sorters for two upcoming hub launches in Bihar. Same-day decisioning. Free transport from Patna Junction. NSQF L3 logistics certified candidates welcome. Drop a comment if you\'re planning to show up — I\'ll keep an eye out.',
      eventAt: future(9), venue: 'Delhivery Hub Bypass, Patna',
      ctaLabel: 'Get directions', ctaUrl: 'https://maps.google.com/?q=Delhivery+Hub+Patna',
      createdAt: past(0) },

    // ── Direct job openings ───────────────────────────────────────────────
    { authorId: employerHRP?.id, sectorId: RAS,
      kind: 'opening', title: 'We\'re hiring 15 RSAs · Reliance Retail Patna',
      body: 'Reliance Retail — Patna Store Cluster is hiring 15 Retail Sales Associates. ₹13,500–₹15,000/mo, ESIC + EPFO from day 1. NSQF L3 in Retail (RAS/Q0103) required. Apply with your Skill Passport in one tap.',
      ctaLabel: 'Apply with Skill Passport', ctaUrl: 'ksk://canvas/jobs_marketplace',
      createdAt: past(1) },

    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: LOG,
      kind: 'opening', title: 'Hiring at my Gurgaon hub — 6 Warehouse Asst slots',
      body: 'My team at Delhivery Gurgaon has 6 open Warehouse Assistant slots. ₹14,500/mo, two shifts, free meals. Looking for early-morning-shift comfort + scanner literacy. Drop a comment with your KSK Skill Passport ID and I\'ll refer you directly.',
      ctaLabel: 'Comment to refer', ctaUrl: null,
      createdAt: past(2) },

    // ── Scheme announcements ──────────────────────────────────────────────
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

    // ── Milestones / success stories ──────────────────────────────────────
    { authorId: mentorUserBySidh['MNT-RR-001']?.id, sectorId: RAS,
      kind: 'milestone', title: 'Two of my mentees promoted to Floor Supervisor 🎉',
      body: 'Both started as RSA NSQF L3 candidates 14 months ago at Reliance Smart Patna. Career velocity in retail is real — show up, observe, ask. Happy to share the exact 90-day plan they followed if anyone wants it — drop a comment.',
      createdAt: past(3) },

    { authorId: tcPatUser?.id, sectorId: RAS,
      kind: 'milestone', title: 'Batch RA-2026-04 crossed 60% attendance threshold',
      body: 'Proud moment for Magic Bus Patna · Retail batch RA-2026-04. We crossed the 60% attendance threshold for the cohort — NAPS stipend processing starts next week. To the cohort: your first credit lands within ~30 days. Keep showing up.',
      createdAt: past(4) },

    // ── Mentor tips (high-value, learner-facing) ──────────────────────────
    { authorId: mentorUserBySidh['MNT-RR-001']?.id, sectorId: RAS,
      kind: 'note', title: 'Tip: own your store\'s SKU map in week 1',
      body: 'Tip for first-time Retail Sales Associates — spend your first week mapping which SKU lives where in your store. Customers ask "where is X" 30+ times a day. The assistant who can answer in 5 seconds becomes the floor lead in 6 months.',
      createdAt: past(5) },

    { authorId: mentorUserBySidh['MNT-DL-001']?.id, sectorId: LOG,
      kind: 'note', title: 'What I look for in a Warehouse Assistant interview',
      body: 'Three things: (1) basic Excel + scanner literacy, (2) willingness to do early-morning shifts, (3) clarity on safety SOPs. Train on those before you apply — most candidates lose the role on (3), not (1).',
      createdAt: past(5) },

    { authorId: mentorUserBySidh['MNT-JIO-001']?.id, sectorId: TEL,
      kind: 'note', title: 'Telecom Tower Tech: the first 90 days matter more than the cert',
      body: 'For everyone training as a Telecom Tower Technician — the certification is just the door. The first 90 days on a tower site teach you more than 6 months in a centre. Treat your foreman like a second instructor.',
      createdAt: past(6) },

    { authorId: mentorUserBySidh['MNT-HDF-001']?.id, sectorId: BFSI,
      kind: 'note', title: 'BFSI candidates: 2 things that get you past first filter',
      body: 'A clean LinkedIn profile + the NCFE basic certificate gets you past the first filter at most private banks. Both are free + take a weekend. If you have not done both this month, that\'s where I\'d start.',
      createdAt: past(6) },

    { authorId: mentorUserBySidh['MNT-APO-001']?.id, sectorId: HLT,
      kind: 'note', title: 'GDAs: negotiate your shift pattern BEFORE you join',
      body: 'Most attrition I see in General Duty Assistants is people doing back-to-back nights for 3 months and then quitting. Negotiate your shift rotation in the offer letter, not after joining. Hospitals will agree more often than you think.',
      createdAt: past(7) },

    { authorId: mentorUserBySidh['MNT-INF-001']?.id, sectorId: ITS,
      kind: 'note', title: 'FSP folks: pick a stack, don\'t chase "fullstack"',
      body: 'For the FutureSkills Prime crowd — do NOT chase the "fullstack" tag in your first job. Pick one stack (MERN or Python+Django), build 2 small end-to-end projects, aim for a quality backend or frontend role. Breadth comes after you have shipped something.',
      createdAt: past(8) },

    // ── Learner posts / questions ─────────────────────────────────────────
    { authorId: rani?.userId, sectorId: RAS,
      kind: 'note', title: 'Help — "angry customer about a delayed delivery" mock',
      body: 'Day 3 of my Retail Sales Associate training at Magic Bus Patna. Today we did mock customer scenarios. The "angry customer about a delayed delivery" one was the hardest — I froze. Any tips from working RSAs on how you handle this in real life?',
      createdAt: past(9) },
  ].filter(p => p.authorId) // skip rows where the author wasn't found

  for (const p of feedPosts) {
    await prisma.post.create({ data: p })
    postCount++
  }
  console.log(`[seed] mentors=${mentorCount} posts=${postCount}`)

  console.log('\n[seed] done.')
  console.log('Counts:')
  for (const [name, count] of Object.entries({
    users: await prisma.user.count(),
    trainees: await prisma.trainee.count(),
    batches: await prisma.batch.count(),
    placements: await prisma.placement.count(),
    retentionCheckins: await prisma.retentionCheckin.count(),
    certificates: await prisma.certificate.count(),
    stipends: await prisma.stipend.count(),
    notifications: await prisma.notification.count(),
    mentors: await prisma.mentorProfile.count(),
    posts: await prisma.post.count(),
  })) console.log(`  ${name.padEnd(20)} ${count}`)
}

main()
  .catch(e => { console.error('[seed] failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
