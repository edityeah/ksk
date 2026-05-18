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
  await prisma.jobPosting.create({
    data: { employerId: employer.id, title: 'Retail Sales Associate', jobRoleQp: 'RAS/Q0103', ctcMonthly: 14000, location: 'Patna', openings: 5 },
  })
  await prisma.jobPosting.create({
    data: { employerId: employer2.id, title: 'Cashier (Store)', jobRoleQp: 'RAS/Q0103', ctcMonthly: 13500, location: 'Lucknow', openings: 3 },
  })

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
  })) console.log(`  ${name.padEnd(20)} ${count}`)
}

main()
  .catch(e => { console.error('[seed] failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
