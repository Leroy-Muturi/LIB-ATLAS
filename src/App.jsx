import { useState, useMemo, useCallback, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════
// LIB TENDER INTELLIGENCE SYSTEM v7.0
// Modern Banking × SaaS · Mobile-First · iPhone-Optimised
// Brand: #CC0000 Red · #111318 Black · #F8F9FB Light
// ══════════════════════════════════════════════════════════════════

const R  = "#CC0000";
const BK = "#111318";
const RL = "rgba(204,0,0,0.07)";

// ── HELPERS ──────────────────────────────────────────────────────
const fmtKES = n => !n ? "—" : n >= 1e9 ? `KES ${(n/1e9).toFixed(1)}B` : n >= 1e6 ? `KES ${(n/1e6).toFixed(1)}M` : `KES ${n.toLocaleString()}`;
const nowStr = () => new Date().toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
const daysSince = d => { if (!d) return 999; return Math.floor((Date.now() - new Date(d)) / 864e5); };
const isWithin7Days = d => daysSince(d) <= 7;
const isWithin1Year = d => daysSince(d) <= 365;

const PC  = { High: R, Medium: "#E65C00", Low: "#888", "—": "#3B6FD4" };
const PBG = { High: "rgba(204,0,0,0.06)", Medium: "rgba(230,92,0,0.06)", Low: "rgba(136,136,136,0.06)", "—": "rgba(59,111,212,0.06)" };
const TI  = {
  "LIB": "🔷", "Parastatal": "🏛", "Government Dept": "🏛", "County Govt": "🏙",
  "National Hospital": "🏥", "County Hospital": "🏥", "University": "🎓",
  "National School": "🏫", "Extra-County School": "🏫", "TVET": "🔧",
  "Water Utility": "💧", "NGO-International": "🌍", "NGO-Local": "🤝",
  "Listed Bank": "🏦", "Parastatal Bank": "🏦", "Listed Corporate": "📈",
};
const BD_STATUS = ["Tracking", "Approached", "Bid Submitted", "Won", "Lost", "Not Pursuing"];

// ── STORAGE (localStorage — works everywhere outside Claude sandbox) ──
const LS = {
  get: key => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error("Storage error:", e); } },
};
const KEYS = { entityIntel: "lib_ei_v3", liveTenders: "lib_lt_v3", refreshLog: "lib_rl_v3", tenderIntel: "lib_ti_v3" };

// ── SEED TENDERS ─────────────────────────────────────────────────
const SEED_TENDERS = [
  { id: 1,  no: "TSC/MED/2022-2025",         entity: "Teachers Service Commission",         desc: "Medical Insurance — 400,000+ teachers & dependents (3 years)",    cat: "Medical",            posted: "2022-10-01", closed: "2022-11-30", deadline: "2022-11-30 10:00 AM", awardedTo: "Minet Kenya (consortium lead)", broker: "Minet Kenya",    underwriter: "Old Mutual General", amount: 17600000000, period: "Dec 2022–Nov 2025", status: "Expired",  source: "Standard Media / Minet.com", docUrl: null,                         notes: "Largest public-sector insurance contract in Kenya. KES 17.6B/yr. Expired Nov 2025. KES 4.4B still owed by GoK. Teachers migrated to SHA Dec 2025." },
  { id: 2,  no: "KPA/005/2025-26/INS",        entity: "Kenya Ports Authority",               desc: "Insurance Brokerage — General & Group Life (3 years)",            cat: "General+Group Life", posted: "2025-12-01", closed: "2026-01-31", deadline: "2026-01-31 12:00 PM", awardedTo: "Not yet confirmed",            broker: "Minet Kenya",    underwriter: null,                 amount: null,        period: "Feb 2026–Jan 2029", status: "Closed",   source: "tenders.go.ke",              docUrl: "https://tenders.go.ke",      notes: "3-year contract from Feb 2026. Previously held by Minet. High-value target for LIB." },
  { id: 3,  no: "KR/SCM/006/2025-2026",       entity: "Kenya Railways — SGR Assets",         desc: "General Insurance Brokerage — SGR Assets (2 years)",             cat: "General",            posted: "2025-12-10", closed: "2026-03-15", deadline: "2026-03-15 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "2 years",           status: "Closed",   source: "tenders.go.ke",              docUrl: "https://tenders.go.ke",      notes: "SGR-specific assets. Very high asset value. Competitive." },
  { id: 4,  no: "KPC/INS/OT/2025-2028",       entity: "Kenya Pipeline Company",              desc: "Insurance Brokerage — KPC petroleum infrastructure (3 years)",   cat: "General",            posted: "2025-03-01", closed: "2025-04-16", deadline: "2025-04-16 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "Jul 2025–Jun 2028", status: "Awarded",  source: "tenders.go.ke",              docUrl: "https://kpc.co.ke",           notes: "High-risk petroleum assets. 3-year contract." },
  { id: 5,  no: "GDC/IBS/OT/067/2024-2025",   entity: "Geothermal Development Company",     desc: "Insurance Brokerage — GDC Assets (1 year)",                      cat: "General",            posted: "2025-04-01", closed: "2025-05-23", deadline: "2025-05-23 12:00 PM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "Jul 2025–Jun 2026", status: "Awarded",  source: "gdc.co.ke",                  docUrl: "https://gdc.co.ke",           notes: "Annual renewal. Two-stage evaluation: broker first, underwriter second." },
  { id: 6,  no: "NCWSC/24/2025",              entity: "Nairobi City Water & Sewerage Co.",   desc: "Insurance Brokerage — General (1 year)",                         cat: "General",            posted: "2025-12-01", closed: "2026-01-06", deadline: "2026-01-06 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "1 year",            status: "Closed",   source: "tenders.go.ke",              docUrl: "https://nairobiwater.co.ke",  notes: "Annual. Bid security KES 500,000. Physical submission only." },
  { id: 7,  no: "KRA/HQS/RFP-016/2024-25",    entity: "Kenya Revenue Authority",             desc: "Self-Funded Admin & Care Management — Staff (3 years)",          cat: "Medical Admin",      posted: "2024-10-01", closed: "2024-11-21", deadline: "2024-11-21 10:00 AM", awardedTo: "Liaison Healthcare (contested)", broker: "Disputed",      underwriter: null,                 amount: null,        period: "3 years",           status: "Disputed", source: "KEHC Judgment 6478 May 2025",docUrl: "https://kra.go.ke",           notes: "ACTIVE DISPUTE. Minet challenged at PPARB. KEHC quashed PPARB decision May 2025. Remitted for reconsideration." },
  { id: 8,  no: "PPRA/05/2024-2025",           entity: "Public Procurement Reg. Authority",  desc: "Medical Insurance — Board Members & Staff (2 years)",            cat: "Medical",            posted: "2024-11-01", closed: "2024-12-17", deadline: "2024-12-17 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "2 years",           status: "Awarded",  source: "tenders.go.ke",              docUrl: "https://ppra.go.ke",          notes: "Renewal Dec 2026. Bid security KES 600M insurer cap. Attainable for LIB." },
  { id: 9,  no: "TSC/MED/SEC/2025",            entity: "Teachers Service Commission",         desc: "Medical — Commissioners & Secretariat Staff (post-SHA)",         cat: "Medical",            posted: "2025-11-20", closed: "2025-12-09", deadline: "2025-12-09 10:00 AM", awardedTo: "Under procurement",            broker: null,             underwriter: null,                 amount: null,        period: "2025–2026",         status: "Tracking", source: "Education News KE",          docUrl: null,                          notes: "Bid security KES 9,000,000. After 400k+ teachers migrated to SHA Dec 2025." },
  { id: 10, no: "KETRACO/INS/2025-2027",       entity: "Kenya Electricity Transmission Co.", desc: "Brokerage — General & Group Life (2 years)",                     cat: "General+Group Life", posted: "2025-01-15", closed: "2025-03-01", deadline: "2025-03-01 12:00 PM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "2025–2027",         status: "Awarded",  source: "tenderyetu.com",             docUrl: "https://ketraco.co.ke",       notes: "Next renewal March 2027. High-value target." },
  { id: 11, no: "SAFARICOM/EOI/MED/2024",      entity: "Safaricom PLC",                      desc: "Medical Insurance Brokerage & Administration (EOI)",             cat: "Medical",            posted: "2024-08-01", closed: "2024-09-15", deadline: "2024-09-15 10:00 AM", awardedTo: "Aon Kenya",                    broker: "Aon Kenya",      underwriter: "Jubilee Health",     amount: null,        period: "Annual",            status: "Awarded",  source: "tenderyetu.com",             docUrl: null,                          notes: "Largest corporate medical account. Currently Aon. Monitor for disruption opportunity." },
  { id: 12, no: "NCC/F&EP/AM/T/528/2024-25",   entity: "Nairobi City County Government",     desc: "General Insurance Services 2025/2026",                          cat: "General",            posted: "2025-03-01", closed: "2025-04-30", deadline: "2025-04-30 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "Annual",            status: "Awarded",  source: "tenders.go.ke",              docUrl: "https://tenders.go.ke",       notes: "Largest county. Annual cycle. Next expected Q1 2027." },
  { id: 13, no: "EACC/T/11-12/2024-2025",      entity: "Ethics & Anti-Corruption Comm.",     desc: "Medical + GPA + General Insurance Services",                    cat: "Medical+GPA+Gen",    posted: "2025-08-01", closed: "2025-10-01", deadline: "2025-10-01 10:00 AM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "Annual",            status: "Awarded",  source: "eacc.go.ke",                 docUrl: "https://eacc.go.ke",          notes: "Annual cycle. Addendum issued March 2026." },
  { id: 14, no: "DBK/ITT/039/2024",             entity: "Development Bank of Kenya",          desc: "Brokerage — Staff Medical Cover (3 years renewable)",            cat: "Medical",            posted: "2024-09-01", closed: "2024-10-15", deadline: "2024-10-15 12:00 PM", awardedTo: "Not yet confirmed",            broker: null,             underwriter: null,                 amount: null,        period: "3 years",           status: "Awarded",  source: "tenderyetu.com",             docUrl: null,                          notes: "Renewal Oct 2027. Good LIB target." },
  { id: 15, no: "KAFU/MED/2026",                entity: "Kaimosi Friends University (KAFU)",  desc: "Medical Insurance Cover — Inpatient & Outpatient, Staff (1 year)", cat: "Medical",           posted: "2026-07-01", closed: "2026-07-14", deadline: "2026-07-14 11:00 AM", awardedTo: null,                           broker: null,             underwriter: null,                 amount: null,        period: "1 year renewable",  status: "Open",     source: "kafu.ac.ke",                 docUrl: "https://kafu.ac.ke",          notes: "OPEN NOW — deadline July 14 2026. Bid security KES 200,000 bank guarantee. Physical submission only. Attainable for LIB." },
];

// ── SEED ENTITIES ─────────────────────────────────────────────────
const SEED_ENTITIES = [
  { id: 1,  n: "Laser Insurance Brokers Limited (LIB)",             t: "LIB",               s: "LIB",           p: "—",    st: "50+",    notes: "IRA-licensed Broker + MIP. Products: Flexi Maisha, Boda 100, Post-Retirement Medical Fund. Partners: Bliss Healthcare, CPF Group, Lap Trust. KPIs: 92% retention, 85%+ satisfaction." },
  { id: 2,  n: "Kenya Ports Authority (KPA)",                       t: "Parastatal",        s: "Transport",     p: "High", st: "5000+",  notes: "KPA/005/2025-26/INS confirmed PPIP. 3-yr Feb 2026. Previously held by Minet Kenya." },
  { id: 3,  n: "Kenya Railways Corporation (SGR)",                  t: "Parastatal",        s: "Transport",     p: "High", st: "3000+",  notes: "KR/SCM/006/2025-2026 confirmed PPIP Dec 2025. 2-year contract." },
  { id: 4,  n: "Kenya Airports Authority (KAA)",                    t: "Parastatal",        s: "Transport",     p: "High", st: "3000+",  notes: "JKIA + 20 airports. Large asset base. Annual tender." },
  { id: 5,  n: "Kenya National Highways Authority (KeNHA)",         t: "Parastatal",        s: "Infrastructure",p: "High", st: "2000+",  notes: "Large fleet + property cover." },
  { id: 6,  n: "Kenya Electricity Generating Company (KenGen)",     t: "Parastatal",        s: "Energy",        p: "High", st: "3000+",  notes: "Annual brokerage tender." },
  { id: 7,  n: "Kenya Electricity Transmission Co. (KETRACO)",      t: "Parastatal",        s: "Energy",        p: "High", st: "1000+",  notes: "2-yr contract confirmed. Renewal March 2027." },
  { id: 8,  n: "Kenya Power & Lighting Co. (KPLC)",                 t: "Parastatal",        s: "Energy",        p: "High", st: "8000+",  notes: "NSE-listed. Very large fleet + assets." },
  { id: 9,  n: "Kenya Pipeline Company (KPC)",                      t: "Parastatal",        s: "Energy",        p: "High", st: "1000+",  notes: "KPC/INS/OT/2025-2028 confirmed. High-risk petroleum assets." },
  { id: 10, n: "Kenya Revenue Authority (KRA)",                     t: "Parastatal",        s: "Finance",       p: "High", st: "7000+",  notes: "Active dispute: Minet v KRA KEHC 6478 (May 2025)." },
  { id: 11, n: "Central Bank of Kenya (CBK)",                       t: "Parastatal",        s: "Finance",       p: "High", st: "2000+",  notes: "High-value assets + large staff medical." },
  { id: 12, n: "Kenya Reinsurance Corporation (Kenya Re)",          t: "Parastatal",        s: "Finance",       p: "High", st: "500+",   notes: "NSE-listed. Annual confirmed PPIP." },
  { id: 13, n: "National Social Security Fund (NSSF)",              t: "Parastatal",        s: "Social",        p: "High", st: "3000+",  notes: "Large staff complement." },
  { id: 14, n: "Social Health Authority (SHA, former NHIF)",        t: "Parastatal",        s: "Health",        p: "High", st: "4000+",  notes: "Replaced NHIF Oct 2024. Fresh procurement cycle expected." },
  { id: 15, n: "Teachers Service Commission (TSC)",                 t: "Government Dept",   s: "Education",     p: "High", st: "3000+",  notes: "KES 17.6B medical contract (Minet 2022-2025) expired Nov 2025." },
  { id: 16, n: "Kenya Wildlife Service (KWS)",                      t: "Parastatal",        s: "Environment",   p: "High", st: "4000+",  notes: "Fleet, rangers, aviation. Premium cover." },
  { id: 17, n: "Kenyatta National Hospital (KNH)",                  t: "National Hospital", s: "Health",        p: "High", st: "6000+",  notes: "1,800 beds. Annual WIBA+GPA+medical+property." },
  { id: 18, n: "Moi Teaching & Referral Hospital (MTRH)",           t: "National Hospital", s: "Health",        p: "High", st: "3000+",  notes: "1,020 beds. Eldoret. Confirmed tender on PPIP." },
  { id: 19, n: "Kenyatta University Teaching & Referral Hospital",  t: "National Hospital", s: "Health",        p: "High", st: "2000+",  notes: "650 beds. Growing procurement cycle." },
  { id: 20, n: "Nairobi City County Government",                    t: "County Govt",       s: "County Govt",   p: "High", st: "15000+", notes: "NCC/F&EP/AM/T/528/2024-2025 PPIP confirmed. Largest county." },
  { id: 21, n: "Mombasa County Government",                         t: "County Govt",       s: "County Govt",   p: "High", st: "5000+",  notes: "Second-largest urban county." },
  { id: 22, n: "Kisumu County Government",                          t: "County Govt",       s: "County Govt",   p: "High", st: "4000+",  notes: "Lake region hub." },
  { id: 23, n: "Nakuru County Government",                          t: "County Govt",       s: "County Govt",   p: "High", st: "4000+",  notes: "Rift Valley hub." },
  { id: 24, n: "Kiambu County Government",                          t: "County Govt",       s: "County Govt",   p: "High", st: "5000+",  notes: "Nairobi satellite. High-value accounts." },
  { id: 25, n: "University of Nairobi (UoN)",                       t: "University",        s: "University",    p: "High", st: "5000+",  notes: "Largest university. Annual medical + GPA tender." },
  { id: 26, n: "Kenyatta University (KU)",                          t: "University",        s: "University",    p: "High", st: "4000+",  notes: "Multi-campus. Annual cycle." },
  { id: 27, n: "Moi University",                                    t: "University",        s: "University",    p: "High", st: "3000+",  notes: "Eldoret. Large staff complement." },
  { id: 28, n: "Jomo Kenyatta Univ. of Agriculture & Technology",   t: "University",        s: "University",    p: "High", st: "3000+",  notes: "Engineering + tech focus." },
  { id: 29, n: "Egerton University",                                t: "University",        s: "University",    p: "High", st: "2000+",  notes: "Njoro campus. Annual cycle." },
  { id: 30, n: "Kenya Medical Training College (KMTC)",             t: "TVET",              s: "TVET",          p: "High", st: "5000+",  notes: "23 campuses. 27,000+ students. Annual tender." },
  { id: 31, n: "Nairobi City Water & Sewerage Co. (NCWSC)",         t: "Water Utility",     s: "Water",         p: "High", st: "3000+",  notes: "NCWSC/24/2025 confirmed PPIP Jan 2026." },
  { id: 32, n: "Mombasa Water & Sewerage Company",                  t: "Water Utility",     s: "Water",         p: "High", st: "1000+",  notes: "Coast region. Annual." },
  { id: 33, n: "Amref Health Africa",                               t: "NGO-International", s: "NGO",           p: "High", st: "2000+",  notes: "Founded Nairobi 1957. Fleet + staff cover." },
  { id: 34, n: "UNHCR Kenya",                                       t: "NGO-International", s: "NGO",           p: "High", st: "1000+",  notes: "UN refugee agency. Nairobi + Dadaab." },
  { id: 35, n: "UNICEF Kenya",                                      t: "NGO-International", s: "NGO",           p: "High", st: "500+",   notes: "UN children's fund. Large fleet + staff." },
  { id: 36, n: "WFP Kenya",                                         t: "NGO-International", s: "NGO",           p: "High", st: "500+",   notes: "World Food Programme. Nairobi + Dadaab." },
  { id: 37, n: "World Vision Kenya",                                t: "NGO-International", s: "NGO",           p: "High", st: "2000+",  notes: "Child welfare. Nationwide. Large fleet." },
  { id: 38, n: "Kenya Red Cross Society",                           t: "NGO-International", s: "NGO",           p: "High", st: "2000+",  notes: "Semi-public. Fleet + property. Annual." },
  { id: 39, n: "Kenya Commercial Bank (KCB)",                       t: "Listed Bank",       s: "Finance",       p: "High", st: "7000+",  notes: "GoK stake. NSE-listed. Large medical tender." },
  { id: 40, n: "Equity Bank Kenya",                                 t: "Listed Bank",       s: "Finance",       p: "High", st: "8000+",  notes: "NSE-listed. Large staff complement." },
  { id: 41, n: "Safaricom PLC",                                     t: "Listed Corporate",  s: "Corporate",     p: "High", st: "6000+",  notes: "EOI confirmed 2024. Currently Aon Kenya. Monitor for disruption." },
  { id: 42, n: "Kenya Airways (KQ)",                                t: "Listed Corporate",  s: "Corporate",     p: "High", st: "4000+",  notes: "Aviation + fleet. Specialist cover." },
  { id: 43, n: "Co-operative Bank of Kenya",                        t: "Listed Bank",       s: "Finance",       p: "High", st: "5000+",  notes: "Co-op movement owned. NSE-listed." },
  { id: 44, n: "East African Breweries Ltd (EABL)",                 t: "Listed Corporate",  s: "Corporate",     p: "High", st: "2000+",  notes: "Diageo-owned. Large property portfolio." },
  { id: 45, n: "Aga Khan Foundation Kenya (AKF)",                   t: "NGO-International", s: "NGO",           p: "High", st: "500+",   notes: "Development + health. Annual procurement." },
  { id: 46, n: "Coast General Teaching & Referral Hospital",        t: "County Hospital",   s: "Health",        p: "High", st: "2000+",  notes: "700 beds. Mombasa." },
  { id: 47, n: "Nakuru Level 6 Hospital",                           t: "County Hospital",   s: "Health",        p: "High", st: "2000+",  notes: "588 beds." },
  { id: 48, n: "Jaramogi Oginga Odinga Teaching & Referral Hosp.",  t: "County Hospital",   s: "Health",        p: "High", st: "1500+",  notes: "461 beds. Kisumu." },
  { id: 49, n: "Alliance High School",                              t: "National School",   s: "Secondary",     p: "High", st: "1200+",  notes: "Kiambu. Premier national school." },
  { id: 50, n: "Starehe Boys Centre & School",                      t: "National School",   s: "Secondary",     p: "High", st: "1500+",  notes: "Nairobi. Large complex + staff." },
  { id: 51, n: "Mang'u High School",                                t: "National School",   s: "Secondary",     p: "High", st: "1200+",  notes: "Kiambu. Top national boys school." },
  { id: 52, n: "Kapsabet Boys High School",                         t: "National School",   s: "Secondary",     p: "High", st: "1000+",  notes: "Nandi. 2024 KCSE top 3." },
  { id: 53, n: "Maranda High School",                               t: "National School",   s: "Secondary",     p: "High", st: "1000+",  notes: "Siaya. Top Nyanza school." },
  { id: 54, n: "Alliance Girls High School",                        t: "National School",   s: "Secondary",     p: "High", st: "1000+",  notes: "Kiambu. 2025 KCSE top girls." },
  { id: 55, n: "Moi High School Kabarak",                           t: "National School",   s: "Secondary",     p: "High", st: "900+",   notes: "Nakuru. 2024 & 2025 KCSE top." },
  { id: 56, n: "Kaimosi Friends University (KAFU)",                 t: "University",        s: "University",    p: "High", st: "1000+",  notes: "OPEN TENDER: Medical Insurance Jul 14 2026 deadline. Bid security KES 200,000." },
  { id: 57, n: "Maseno University",                                 t: "University",        s: "University",    p: "Medium",st: "1500+",  notes: "Kisumu region." },
  { id: 58, n: "Masinde Muliro Univ. of Science & Technology",      t: "University",        s: "University",    p: "Medium",st: "1500+",  notes: "Western Kenya." },
  { id: 59, n: "Dedan Kimathi Univ. of Technology (DeKUT)",         t: "University",        s: "University",    p: "Medium",st: "1000+",  notes: "Nyeri." },
  { id: 60, n: "Technical University of Kenya (TUK)",               t: "University",        s: "University",    p: "Medium",st: "1500+",  notes: "Nairobi CBD." },
  { id: 61, n: "Technical University of Mombasa (TUM)",             t: "University",        s: "University",    p: "Medium",st: "1000+",  notes: "Coast." },
  { id: 62, n: "Kisii University",                                  t: "University",        s: "University",    p: "Medium",st: "1000+",  notes: "Nyanza." },
  { id: 63, n: "South Eastern Kenya University (SEKU)",             t: "University",        s: "University",    p: "Medium",st: "700+",   notes: "Kitui." },
  { id: 64, n: "Chuka University",                                  t: "University",        s: "University",    p: "Medium",st: "800+",   notes: "Tharaka Nithi." },
  { id: 65, n: "Co-operative University of Kenya (CUK)",            t: "University",        s: "University",    p: "Medium",st: "500+",   notes: "Karen, Nairobi." },
  { id: 66, n: "Kakamega County Government",                        t: "County Govt",       s: "County Govt",   p: "Medium",st: "4000+",  notes: "Western Kenya." },
  { id: 67, n: "Meru County Government",                            t: "County Govt",       s: "County Govt",   p: "Medium",st: "3000+",  notes: "Mount Kenya." },
  { id: 68, n: "Uasin Gishu County Government",                     t: "County Govt",       s: "County Govt",   p: "Medium",st: "3000+",  notes: "Eldoret-based." },
  { id: 69, n: "Ethics & Anti-Corruption Commission (EACC)",        t: "Parastatal",        s: "Governance",    p: "Medium",st: "500+",   notes: "Confirmed: Medical, GPA, General — Sep 2025." },
  { id: 70, n: "Kenya Medical Research Institute (KEMRI)",          t: "Parastatal",        s: "Health",        p: "Medium",st: "2000+",  notes: "Research labs. Specialist equipment." },
  { id: 71, n: "Kenya Medical Supplies Authority (KEMSA)",          t: "Parastatal",        s: "Health",        p: "Medium",st: "1000+",  notes: "Fleet + property + medical." },
  { id: 72, n: "Kenya Forest Service (KFS)",                        t: "Parastatal",        s: "Environment",   p: "Medium",st: "3000+",  notes: "Field staff. GPA + WIBA key." },
  { id: 73, n: "Kenya Bureau of Standards (KEBS)",                  t: "Parastatal",        s: "Trade",         p: "Medium",st: "1000+",  notes: "Annual medical + GPA." },
  { id: 74, n: "Nakuru Water & Sanitation Services",                t: "Water Utility",     s: "Water",         p: "Medium",st: "500+",   notes: "Rift Valley." },
  { id: 75, n: "Eldoret Water & Sanitation Co. (ELDOWAS)",          t: "Water Utility",     s: "Water",         p: "Medium",st: "500+",   notes: "Uasin Gishu." },
  { id: 76, n: "Kisumu Water & Sanitation Co. (KIWASCO)",           t: "Water Utility",     s: "Water",         p: "Medium",st: "500+",   notes: "Lake Victoria." },
  { id: 77, n: "Athi Water Works Development Agency",               t: "Water Utility",     s: "Water",         p: "Medium",st: "500+",   notes: "Bulk supply Nairobi metro." },
  { id: 78, n: "Parliamentary Joint Services Commission",           t: "Government Dept",   s: "Government",    p: "Medium",st: "500+",   notes: "MP medical tender Dec 2025. Bid security KES 4M." },
  { id: 79, n: "Development Bank of Kenya (DBK)",                   t: "Parastatal Bank",   s: "Finance",       p: "Medium",st: "500+",   notes: "DBK/ITT/039/2024 confirmed." },
  { id: 80, n: "Save the Children Kenya",                           t: "NGO-International", s: "NGO",           p: "Medium",st: "500+",   notes: "Child welfare. Nationwide." },
  { id: 81, n: "Oxfam Kenya",                                       t: "NGO-International", s: "NGO",           p: "Medium",st: "300+",   notes: "Poverty + humanitarian." },
  { id: 82, n: "Pumwani Maternity Hospital",                        t: "County Hospital",   s: "Health",        p: "Medium",st: "800+",   notes: "354 beds. Nairobi." },
  { id: 83, n: "Kakamega County Referral Hospital",                 t: "County Hospital",   s: "Health",        p: "Medium",st: "1000+",  notes: "Western Kenya hub." },
  { id: 84, n: "Mama Lucy Kibaki Hospital",                         t: "County Hospital",   s: "Health",        p: "Medium",st: "500+",   notes: "112 beds. Eastlands, Nairobi." },
  { id: 85, n: "Meru Teaching & Referral Hospital",                 t: "County Hospital",   s: "Health",        p: "Medium",st: "800+",   notes: "306 beds. Meru County." },
  { id: 86, n: "Garissa County Government",                         t: "County Govt",       s: "County Govt",   p: "Low",  st: "2000+",  notes: "North Eastern hub." },
  { id: 87, n: "Turkana County Government",                         t: "County Govt",       s: "County Govt",   p: "Low",  st: "2000+",  notes: "CAT/OPEN/04/2024-2025 PPIP confirmed." },
  { id: 88, n: "Mandera County Government",                         t: "County Govt",       s: "County Govt",   p: "Low",  st: "1500+",  notes: "North Eastern." },
  { id: 89, n: "Wajir County Government",                           t: "County Govt",       s: "County Govt",   p: "Low",  st: "1500+",  notes: "North Eastern." },
  { id: 90, n: "Public Procurement Regulatory Authority (PPRA)",    t: "Parastatal",        s: "Governance",    p: "Low",  st: "300+",   notes: "PPRA/05/2024-2025 confirmed PPIP." },
];

const ALL_TYPES   = ["All", ...new Set(SEED_ENTITIES.map(e => e.t))].sort();
const ALL_SECTORS = ["All", ...new Set(SEED_ENTITIES.map(e => e.s))].sort();
const PRIOS       = ["All", "High", "Medium", "Low"];

// ── STATUS CHIP ───────────────────────────────────────────────────
function StatusChip({ s }) {
  const map = {
    Open:     { bg: "#DCFCE7", c: "#15803D" },
    Closed:   { bg: "#FEE2E2", c: "#B91C1C" },
    Awarded:  { bg: "#DBEAFE", c: "#1D4ED8" },
    Tracking: { bg: "#FEF3C7", c: "#92400E" },
    Expired:  { bg: "#F3F4F6", c: "#6B7280" },
    Disputed: { bg: "#FFF7ED", c: "#C2410C" },
  };
  const st = map[s] || { bg: "#F3F4F6", c: "#6B7280" };
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color: st.c, background: st.bg, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {s}
    </span>
  );
}

// ── ICONS ─────────────────────────────────────────────────────────
const Icons = {
  Home:     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Tenders:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Pipeline: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Analytics:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Search:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Refresh:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

// ── MAIN APP ──────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]           = useState("home");
  const [eQ, setEQ]             = useState("");
  const [eT, setET]             = useState("All");
  const [eS, setES]             = useState("All");
  const [eP, setEP]             = useState("All");
  const [eSel, setESel]         = useState(null);
  const [tSel, setTSel]         = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [entityIntel, setEI]    = useState({});
  const [tenderIntel, setTI]    = useState({});
  const [liveTenders, setLive]  = useState([]);
  const [refreshing, setRef]    = useState(false);
  const [refreshLog, setLog]    = useState(null);
  const [refreshErr, setErr]    = useState(null);
  const [showFilters, setSF]    = useState(false);
  const [docState, setDoc]      = useState(null);
  const [docModal, setDocModal] = useState(false);
  const [domainWarn, setDW]     = useState(null);

  // ── LOAD FROM localStorage ON MOUNT ────────────────────────────
  useEffect(() => {
    const ei = LS.get(KEYS.entityIntel);
    const lt = LS.get(KEYS.liveTenders);
    const rl = LS.get(KEYS.refreshLog);
    const ti = LS.get(KEYS.tenderIntel);
    if (ei) setEI(ei);
    if (lt) setLive(lt);
    if (rl) setLog(rl);
    if (ti) setTI(ti);
  }, []);

  // ── INTEL SAVE ─────────────────────────────────────────────────
  const saveEI = useCallback((id, data) => {
    const u = { ...entityIntel, [id]: { ...data, lastUpdated: nowStr() } };
    setEI(u); LS.set(KEYS.entityIntel, u);
  }, [entityIntel]);

  const saveTI = useCallback((id, data) => {
    const u = { ...tenderIntel, [id]: { ...data, lastUpdated: nowStr() } };
    setTI(u); LS.set(KEYS.tenderIntel, u);
  }, [tenderIntel]);

  // ── REFRESH — calls /api/scan Vercel function ───────────────────
  const handleRefresh = useCallback(async () => {
    setRef(true); setErr(null);
    try {
      const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const stamped = (data.tenders || []).map((t, i) => ({
        ...t, id: `live_${Date.now()}_${i}`, isLive: true, fetchedAt: nowStr(),
      }));
      setLive(stamped);
      const log = { time: nowStr(), found: stamped.length, ok: true };
      setLog(log); LS.set(KEYS.liveTenders, stamped); LS.set(KEYS.refreshLog, log);
      setTab("tenders");
    } catch (e) {
      setErr(e.message);
      const log = { time: nowStr(), found: 0, ok: false };
      setLog(log); LS.set(KEYS.refreshLog, log);
    } finally { setRef(false); }
  }, []);

  // ── DOCUMENT FETCH — calls /api/document Vercel function ────────
  const fetchDocument = useCallback(async (url) => {
    if (!url) { setDoc({ ok: false, reason: "No document URL available for this tender." }); setDocModal(true); return; }
    setDoc({ loading: true, url }); setDocModal(true);
    try {
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.requiresConfirmation) { setDocModal(false); setDW({ url, hostname: new URL(url).hostname }); return; }
      setDoc({ ...data, url });
    } catch (e) {
      setDoc({ ok: false, reason: e.message, url });
    }
  }, []);

  const confirmUnsafe = useCallback(async () => {
    if (!domainWarn) return;
    const url = domainWarn.url; setDW(null);
    setDoc({ loading: true, url }); setDocModal(true);
    try {
      const res = await fetch("/api/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, bypassSafetyCheck: true }),
      });
      setDoc({ ...await res.json(), url });
    } catch (e) { setDoc({ ok: false, reason: e.message, url }); }
  }, [domainWarn]);

  // ── DERIVED DATA ────────────────────────────────────────────────
  const allTenders = useMemo(() => [...liveTenders, ...SEED_TENDERS], [liveTenders]);

  const recentTenders = useMemo(() =>
    allTenders
      .filter(t => isWithin7Days(t.posted) || t.isLive)
      .sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
  , [allTenders]);

  const pipelineTenders = useMemo(() =>
    SEED_TENDERS
      .filter(t => !isWithin7Days(t.posted) && isWithin1Year(t.posted) && (t.broker || t.underwriter || t.amount))
      .sort((a, b) => new Date(b.posted || 0) - new Date(a.posted || 0))
  , []);

  const ents = useMemo(() => SEED_ENTITIES.filter(e => {
    const q = eQ.toLowerCase();
    const intel = entityIntel[e.id] || {};
    const prio = intel.priority || e.p;
    return (!q || e.n.toLowerCase().includes(q) || e.s.toLowerCase().includes(q) || (intel.intelNotes || e.notes).toLowerCase().includes(q))
      && (eT === "All" || e.t === eT) && (eS === "All" || e.s === eS) && (eP === "All" || prio === eP);
  }), [eQ, eT, eS, eP, entityIntel]);

  const highCount = SEED_ENTITIES.filter(e => (entityIntel[e.id]?.priority || e.p) === "High").length;

  const openEdit = useCallback((entity) => {
    const s = entityIntel[entity.id] || {};
    setEditForm({
      priority: s.priority || entity.p, broker: s.broker || "", underwriter: s.underwriter || "",
      premium: s.premium || "", renewal: s.renewal || "", bidBefore: s.bidBefore || "No",
      contact: s.contact || "", bdStatus: s.bdStatus || "Tracking", intelNotes: s.intelNotes || "",
    });
    setEditMode(true);
  }, [entityIntel]);

  const saveEdit = useCallback(() => {
    if (!eSel) return;
    saveEI(eSel.id, editForm); setEditMode(false);
  }, [eSel, editForm, saveEI]);

  // ── STYLE ATOMS ─────────────────────────────────────────────────
  const inp = { background: "#F0F1F3", border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: BK, outline: "none", width: "100%", fontFamily: "inherit" };
  const lbl = { fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, display: "block" };

  const gradients = {
    home:     "linear-gradient(135deg, #111318 0%, #1C2030 100%)",
    tenders:  "linear-gradient(135deg, #111318 0%, #1C2030 100%)",
    pipeline: "linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)",
    intel:    "linear-gradient(135deg, #059669 0%, #064E3B 100%)",
  };

  const NAV = [
    { id: "home",     l: "Home",     icon: Icons.Home },
    { id: "tenders",  l: "Tenders",  icon: Icons.Tenders },
    { id: "pipeline", l: "Pipeline", icon: Icons.Pipeline },
    { id: "intel",    l: "Analytics",icon: Icons.Analytics },
  ];

  // ── SHARED COMPONENTS ────────────────────────────────────────────
  const PageHeader = ({ title, sub, tab: t }) => (
    <div style={{ background: gradients[t] || gradients.home, padding: "52px 20px 20px", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>{sub}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>{title}</div>
        </div>
        <button onClick={() => { handleRefresh(); }}
          disabled={refreshing}
          style={{ background: refreshing ? "rgba(255,255,255,0.1)" : R, border: "none", borderRadius: 10, padding: "9px 14px", display: "flex", alignItems: "center", gap: 6, cursor: refreshing ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
          <span style={{ display: "inline-block", animation: refreshing ? "spin 0.8s linear infinite" : "none", color: "#fff" }}>{Icons.Refresh}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{refreshing ? "Scanning" : "Refresh"}</span>
        </button>
      </div>
    </div>
  );

  const TenderCard = ({ t }) => {
    const ti = tenderIntel[t.id] || {};
    return (
      <div onClick={() => setTSel(t)}
        style={{ background: "#fff", borderRadius: 16, padding: "16px", marginBottom: 10, cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", borderLeft: `3px solid ${t.isLive ? "#22C55E" : t.status === "Open" ? R : "#E5E7EB"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: R, fontWeight: 700 }}>{t.no || "—"}</div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {t.isLive && <span style={{ fontSize: 8, background: "#DCFCE7", color: "#15803D", fontWeight: 800, padding: "2px 6px", borderRadius: 20 }}>LIVE</span>}
            {t.docUrl && <span style={{ fontSize: 8, background: RL, color: R, fontWeight: 800, padding: "2px 6px", borderRadius: 20 }}>DOC</span>}
            <StatusChip s={t.status} />
          </div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: BK, marginBottom: 3 }}>{t.entity}</div>
        <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <div style={{ background: "#F8F9FB", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Amount</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.amount ? R : "#D1D5DB", marginTop: 2 }}>{fmtKES(t.amount)}</div>
          </div>
          <div style={{ background: "#FFF7ED", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Deadline</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginTop: 2 }}>{t.deadline || t.closed || "—"}</div>
          </div>
          {t.posted && (
            <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "7px 10px" }}>
              <div style={{ fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>Posted</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D", marginTop: 2 }}>{t.posted}</div>
            </div>
          )}
          {(t.broker || ti.action) && (
            <div style={{ background: "#EFF6FF", borderRadius: 8, padding: "7px 10px" }}>
              <div style={{ fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{ti.action ? "LIB Action" : "Broker"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ti.action || t.broker}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const EntityCard = ({ e }) => {
    const intel = entityIntel[e.id] || {};
    const prio  = intel.priority || e.p;
    const hasIntel = !!(intel.broker || intel.intelNotes || intel.bdStatus);
    return (
      <div onClick={() => { setESel(e); setEditMode(false); }}
        style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", marginBottom: 8, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{TI[e.t] || "🏢"}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: BK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.n}</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{e.s} · {e.st}</span>
              {hasIntel && <span style={{ fontSize: 8, background: RL, color: R, fontWeight: 800, padding: "1px 6px", borderRadius: 20 }}>INTEL</span>}
              {intel.bdStatus && intel.bdStatus !== "Tracking" && (
                <span style={{ fontSize: 8, background: "#DBEAFE", color: "#1D4ED8", fontWeight: 800, padding: "1px 6px", borderRadius: 20 }}>{intel.bdStatus}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: PC[prio] || "#D1D5DB" }} />
            <span style={{ fontSize: 8, fontWeight: 700, color: PC[prio] || "#D1D5DB" }}>{prio}</span>
          </div>
        </div>
        {intel.broker && (
          <div style={{ marginTop: 8, background: "#FFF7ED", borderRadius: 8, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 9, color: "#92400E", fontWeight: 700 }}>Broker:</span>
            <span style={{ fontSize: 9, color: "#B45309", fontWeight: 600 }}>{intel.broker}</span>
          </div>
        )}
        {(intel.intelNotes || (!intel.broker && e.notes)) && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#9CA3AF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {intel.intelNotes || e.notes}
          </div>
        )}
      </div>
    );
  };

  // Sheet modal wrapper
  const Sheet = ({ onClose, children }) => (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 999, display: "flex", alignItems: "flex-end", backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#F8F9FB", borderRadius: "24px 24px 0 0", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 -4px 40px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "12px 0 0", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 36, height: 4, background: "#E5E7EB", borderRadius: 2 }} />
        </div>
        <div style={{ padding: "12px 20px 40px" }}>
          {children}
        </div>
      </div>
    </div>
  );

  const DataCell = ({ label, value, color }) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: color || BK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</div>
    </div>
  );

  const Btn = ({ label, onClick, primary, disabled }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ flex: 1, background: primary ? R : "#F3F4F6", border: "none", borderRadius: 14, color: primary ? "#fff" : "#6B7280", padding: "14px", fontSize: 13, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, opacity: disabled ? 0.5 : 1 }}>
      {label}
    </button>
  );

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Inter', -apple-system, 'Segoe UI', sans-serif", background: "#F8F9FB", minHeight: "100vh", maxWidth: 430, margin: "0 auto", color: BK, paddingBottom: 80 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, select, textarea, button { font-family: inherit; }
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(255,255,255,0.35); }
      `}</style>

      {/* ══ HOME ══ */}
      {tab === "home" && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          <div style={{ background: gradients.home, padding: "52px 20px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(204,0,0,0.07)" }} />
            <div style={{ position: "absolute", top: 30, right: 30, width: 90, height: 90, borderRadius: "50%", background: "rgba(204,0,0,0.05)" }} />
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Laser Insurance Brokers</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Tender Intelligence</div>
                </div>
                <button onClick={handleRefresh} disabled={refreshing}
                  style={{ background: refreshing ? "rgba(255,255,255,0.08)" : R, border: "none", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 7, cursor: refreshing ? "not-allowed" : "pointer" }}>
                  <span style={{ display: "inline-block", animation: refreshing ? "spin 0.8s linear infinite" : "none", color: "#fff" }}>{Icons.Refresh}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{refreshing ? "Scanning…" : "Refresh"}</span>
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { l: "Entities",     v: SEED_ENTITIES.length,   c: "#fff" },
                  { l: "This Week",    v: recentTenders.length,    c: recentTenders.length > 0 ? "#4ADE80" : "#fff", sub: "new tenders" },
                  { l: "High Priority",v: highCount,               c: "#FCA5A5" },
                ].map((k, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.v}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Refresh status */}
          {refreshLog && (
            <div style={{ margin: "12px 16px 0", background: "#fff", borderRadius: 12, padding: "11px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: refreshLog.ok ? "#22C55E" : R, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: BK }}>
                  {refreshLog.ok ? `${refreshLog.found} tender${refreshLog.found !== 1 ? "s" : ""} found` : "Last scan failed"}
                </span>
              </div>
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{refreshLog.time}</span>
            </div>
          )}
          {refreshErr && <div style={{ margin: "10px 16px 0", background: "#FEF2F2", borderRadius: 12, padding: "11px 16px", fontSize: 12, color: "#B91C1C", fontWeight: 500 }}>⚠ {refreshErr}</div>}
          {refreshing && (
            <div style={{ margin: "12px 16px 0", background: "#FFFBEB", borderRadius: 12, padding: "13px 16px", display: "flex", gap: 12, alignItems: "center", border: "1px solid #FDE68A" }}>
              <div style={{ width: 18, height: 18, border: "2.5px solid #FCD34D", borderTop: "2.5px solid #92400E", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>Scanning procurement portals…</div>
                <div style={{ fontSize: 10, color: "#B45309", marginTop: 2 }}>PPIP · EGP · tenderyetu · 20+ entity sites</div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { l: "New Tenders",   sub: `${recentTenders.length} this week`,                       icon: "📋", action: () => setTab("tenders"),  c: R },
                { l: "BD Pipeline",   sub: `${SEED_ENTITIES.length} entities`,                        icon: "🎯", action: () => setTab("pipeline"), c: "#3B6FD4" },
                { l: "Intel Library", sub: `${Object.keys(entityIntel).length} with notes`,           icon: "🔍", action: () => setTab("intel"),    c: "#059669" },
                { l: "Scan Now",      sub: refreshing ? "Scanning…" : "Search all portals",           icon: "⟳",  action: handleRefresh,            c: "#7C3AED" },
              ].map((a, i) => (
                <div key={i} onClick={a.action}
                  style={{ background: "#fff", borderRadius: 16, padding: "16px", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 8, WebkitTapHighlightColor: "transparent" }}
                  onTouchStart={e => e.currentTarget.style.transform = "scale(0.97)"}
                  onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}>
                  <div style={{ fontSize: 24 }}>{a.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: BK }}>{a.l}</div>
                    <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{a.sub}</div>
                  </div>
                  <div style={{ width: 28, height: 3, background: a.c, borderRadius: 2 }} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent tenders preview */}
          {recentTenders.length > 0 && (
            <div style={{ padding: "20px 16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>This Week</div>
                <div onClick={() => setTab("tenders")} style={{ fontSize: 11, fontWeight: 700, color: R, cursor: "pointer" }}>View all →</div>
              </div>
              {recentTenders.slice(0, 3).map(t => <TenderCard key={t.id} t={t} />)}
            </div>
          )}
        </div>
      )}

      {/* ══ TENDERS ══ */}
      {tab === "tenders" && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          <PageHeader title="Active Tenders" sub="Live Intelligence" tab="tenders" />
          <div style={{ padding: "12px 16px" }}>
            {refreshing && (
              <div style={{ background: "#FFFBEB", borderRadius: 12, padding: "13px 16px", display: "flex", gap: 12, alignItems: "center", border: "1px solid #FDE68A", marginBottom: 12 }}>
                <div style={{ width: 18, height: 18, border: "2.5px solid #FCD34D", borderTop: "2.5px solid #92400E", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>Scanning all procurement portals…</div>
                  <div style={{ fontSize: 10, color: "#B45309", marginTop: 2 }}>PPIP · EGP · tenderyetu · 50+ sites. Takes 30–60s.</div>
                </div>
              </div>
            )}
            {refreshErr && <div style={{ background: "#FEF2F2", borderRadius: 12, padding: "11px 16px", fontSize: 12, color: "#B91C1C", marginBottom: 12 }}>⚠ {refreshErr}</div>}

            {recentTenders.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 16, padding: "36px 20px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: BK, marginBottom: 6 }}>No tenders this week</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>Tap Refresh to scan all Kenyan procurement portals for new postings</div>
                <button onClick={handleRefresh} disabled={refreshing}
                  style={{ background: R, color: "#fff", border: "none", borderRadius: 12, padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  {refreshing ? "Scanning…" : "⟳ Scan Now"}
                </button>
              </div>
            ) : recentTenders.map(t => <TenderCard key={t.id} t={t} />)}
          </div>
        </div>
      )}

      {/* ══ PIPELINE ══ */}
      {tab === "pipeline" && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          <div style={{ background: gradients.pipeline, padding: "52px 20px 20px", position: "sticky", top: 0, zIndex: 50 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>BD Intelligence</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Target Pipeline</div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{Icons.Search}</span>
              <input placeholder="Search entities…" value={eQ} onChange={e => setEQ(e.target.value)}
                style={{ background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13, flex: 1 }} />
            </div>
          </div>

          <div style={{ padding: "10px 16px 0" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
              <button onClick={() => setSF(!showFilters)}
                style={{ background: showFilters ? BK : "#fff", color: showFilters ? "#fff" : BK, border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                {showFilters ? "Filters ▲" : "Filters ▼"}
              </button>
              {PRIOS.map(p => (
                <button key={p} onClick={() => setEP(p)}
                  style={{ background: eP === p ? R : "#fff", color: eP === p ? "#fff" : "#6B7280", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 11, cursor: "pointer", fontWeight: eP === p ? 700 : 500, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  {p}
                </button>
              ))}
              <span style={{ fontSize: 10, color: "#9CA3AF" }}>{ents.length}</span>
            </div>

            {showFilters && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <select value={eS} onChange={e => setES(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
                  {ALL_SECTORS.map(o => <option key={o}>{o}</option>)}
                </select>
                <select value={eT} onChange={e => setET(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12 }}>
                  {ALL_TYPES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}

            {pipelineTenders.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>📄 Known Tenders — with Intel</div>
                {pipelineTenders.map(t => (
                  <div key={t.id} onClick={() => setTSel(t)}
                    style={{ background: "#fff", borderRadius: 14, padding: "14px 16px", marginBottom: 8, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderLeft: "3px solid #3B6FD4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ fontSize: 10, fontFamily: "monospace", color: "#3B6FD4", fontWeight: 700 }}>{t.no}</div>
                      <StatusChip s={t.status} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{t.entity}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {t.broker && <span style={{ fontSize: 10, color: "#B45309", fontWeight: 600 }}>Broker: {t.broker}</span>}
                      {t.underwriter && <span style={{ fontSize: 10, color: "#1D4ED8", fontWeight: 600 }}>UW: {t.underwriter}</span>}
                      {t.amount && <span style={{ fontSize: 10, color: R, fontWeight: 700 }}>{fmtKES(t.amount)}</span>}
                    </div>
                  </div>
                ))}
                <div style={{ height: 1, background: "#E5E7EB", margin: "14px 0" }} />
              </>
            )}

            <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>🎯 BD Entities — {ents.length} targets</div>
            {ents.map(e => <EntityCard key={e.id} e={e} />)}
          </div>
        </div>
      )}

      {/* ══ ANALYTICS ══ */}
      {tab === "intel" && (
        <div style={{ animation: "fadeUp 0.25s ease" }}>
          <div style={{ background: gradients.intel, padding: "52px 20px 24px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 3 }}>Intelligence Summary</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>Analytics</div>
          </div>
          <div style={{ padding: "16px" }}>
            {/* LIB KPIs */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>LIB Performance</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[["Client Retention", "92%", R], ["Satisfaction", "85%+", "#059669"], ["Expense Ratio", "16.8%", "#3B6FD4"], ["Operating Ratio", "89%", "#7C3AED"]].map(([l, v, c]) => (
                  <div key={l} style={{ background: "#F8F9FB", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline breakdown */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Pipeline by Type</div>
              {Object.entries(SEED_ENTITIES.reduce((a, e) => { a[e.t] = (a[e.t] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([t, c]) => {
                const pct = Math.round(c / SEED_ENTITIES.length * 100);
                return (
                  <div key={t} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: "#374151", fontWeight: 500 }}>{TI[t] || "🏢"} {t}</span>
                      <span style={{ color: "#9CA3AF", fontWeight: 700 }}>{c}</span>
                    </div>
                    <div style={{ height: 5, background: "#F3F4F6", borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: 5, background: R, borderRadius: 3, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Confirmed awards */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Confirmed Awards</div>
              {SEED_TENDERS.filter(t => t.awardedTo && !t.awardedTo.toLowerCase().includes("confirmed") && !t.awardedTo.toLowerCase().includes("procurement") && !t.awardedTo.toLowerCase().includes("yet")).map((t, i, arr) => (
                <div key={t.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.entity}</div>
                  <div style={{ fontSize: 11, color: "#B45309", marginTop: 2, fontWeight: 600 }}>{t.awardedTo}</div>
                  {t.broker && <div style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}>Broker: {t.broker}</div>}
                  {t.underwriter && <div style={{ fontSize: 10, color: "#6B7280" }}>UW: {t.underwriter}</div>}
                  <div style={{ fontSize: 18, fontWeight: 800, color: t.amount ? R : "#D1D5DB", marginTop: 4 }}>{fmtKES(t.amount)}</div>
                </div>
              ))}
            </div>

            {/* Competitors */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Competitor Intel</div>
              {[
                { b: "Minet Kenya", ac: "TSC 2022–2025 (KES 17.6B/yr) · KPA prev · KRA dispute 2025", note: "TSC expired Nov 2025. KES 4.4B still owed by GoK.", t: 1 },
                { b: "Aon Kenya", ac: "Safaricom PLC medical EOI 2024 (confirmed)", note: "Multinational accounts focus.", t: 1 },
                { b: "Liaison Healthcare", ac: "KRA medical admin — KEHC dispute May 2025", note: "Remitted for reconsideration.", t: 2 },
              ].map((c, i, arr) => (
                <div key={i} style={{ display: "flex", gap: 12, paddingBottom: 12, marginBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <div style={{ width: 3, borderRadius: 2, background: c.t === 1 ? R : "#D1D5DB", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.b}</div>
                      <span style={{ fontSize: 8, fontWeight: 800, color: c.t === 1 ? R : "#6B7280", background: c.t === 1 ? RL : "#F3F4F6", padding: "2px 7px", borderRadius: 20 }}>Tier {c.t}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#B45309", fontWeight: 600, marginBottom: 3 }}>{c.ac}</div>
                    <div style={{ fontSize: 11, color: "#9CA3AF" }}>{c.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", zIndex: 200, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setTab(n.id)}
            style={{ flex: 1, background: "transparent", border: "none", padding: "11px 0 9px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === n.id ? R : "#9CA3AF", transition: "color 0.15s" }}>
            {n.icon}
            <span style={{ fontSize: 9, fontWeight: tab === n.id ? 800 : 500, letterSpacing: "0.02em" }}>{n.l}</span>
          </button>
        ))}
      </div>

      {/* ══ ENTITY DETAIL / EDIT SHEET ══ */}
      {eSel && (
        <Sheet onClose={() => { setESel(null); setEditMode(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>{TI[eSel.t] || "🏢"}</span>
                  <div style={{ fontSize: 14, fontWeight: 800, color: BK, lineHeight: 1.2 }}>{eSel.n}</div>
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{eSel.t} · {eSel.s} · {eSel.st} staff</div>
              </div>
              {!editMode && (
                <button onClick={() => openEdit(eSel)}
                  style={{ background: R, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, marginLeft: 10 }}>
                  ✏ Edit
                </button>
              )}
            </div>
          </div>

          {!editMode ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <DataCell label="Priority"      value={entityIntel[eSel.id]?.priority || eSel.p}                                                                  color={PC[entityIntel[eSel.id]?.priority || eSel.p]} />
                <DataCell label="BD Status"     value={entityIntel[eSel.id]?.bdStatus || "—"}                                                                     color="#1D4ED8" />
                <DataCell label="Current Broker"value={entityIntel[eSel.id]?.broker || "—"}                                                                       color="#B45309" />
                <DataCell label="Underwriter"   value={entityIntel[eSel.id]?.underwriter || "—"} />
                <DataCell label="Est. Premium"  value={entityIntel[eSel.id]?.premium ? `KES ${Number(entityIntel[eSel.id].premium).toLocaleString()}` : "—"}      color={R} />
                <DataCell label="Next Renewal"  value={entityIntel[eSel.id]?.renewal || "—"}                                                                      color="#059669" />
                <DataCell label="Bid Before?"   value={entityIntel[eSel.id]?.bidBefore || "—"} />
                <DataCell label="Contact"       value={entityIntel[eSel.id]?.contact || "—"} />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Intelligence Notes</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{entityIntel[eSel.id]?.intelNotes || eSel.notes || "No notes yet. Tap Edit to add intel."}</div>
              </div>
              {entityIntel[eSel.id]?.lastUpdated && <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 12, textAlign: "right" }}>Updated: {entityIntel[eSel.id].lastUpdated}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn label="Close" onClick={() => setESel(null)} />
                <Btn label="Find Tenders →" onClick={() => { setTab("tenders"); setESel(null); }} primary />
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Priority</label>
                  <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })} style={inp}>
                    {["High", "Medium", "Low"].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>BD Status</label>
                  <select value={editForm.bdStatus} onChange={e => setEditForm({ ...editForm, bdStatus: e.target.value })} style={inp}>
                    {BD_STATUS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Current Broker</label>
                  <input value={editForm.broker} onChange={e => setEditForm({ ...editForm, broker: e.target.value })} style={inp} placeholder="e.g. Minet Kenya" />
                </div>
                <div>
                  <label style={lbl}>Underwriter</label>
                  <input value={editForm.underwriter} onChange={e => setEditForm({ ...editForm, underwriter: e.target.value })} style={inp} placeholder="e.g. Britam" />
                </div>
                <div>
                  <label style={lbl}>Est. Annual Premium (KES)</label>
                  <input type="number" value={editForm.premium} onChange={e => setEditForm({ ...editForm, premium: e.target.value })} style={inp} placeholder="5000000" />
                </div>
                <div>
                  <label style={lbl}>Next Renewal Date</label>
                  <input type="date" value={editForm.renewal} onChange={e => setEditForm({ ...editForm, renewal: e.target.value })} style={inp} />
                </div>
                <div>
                  <label style={lbl}>LIB Bid Before?</label>
                  <select value={editForm.bidBefore} onChange={e => setEditForm({ ...editForm, bidBefore: e.target.value })} style={inp}>
                    <option>No</option><option>Yes</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Contact at Entity</label>
                  <input value={editForm.contact} onChange={e => setEditForm({ ...editForm, contact: e.target.value })} style={inp} placeholder="Name + Title" />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Intelligence Notes</label>
                  <textarea value={editForm.intelNotes} onChange={e => setEditForm({ ...editForm, intelNotes: e.target.value })}
                    style={{ ...inp, height: 90, resize: "vertical" }}
                    placeholder="Source of intel, relationship notes, what you know, date gathered…" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn label="Cancel" onClick={() => setEditMode(false)} />
                <Btn label="💾 Save Intel" onClick={saveEdit} primary />
              </div>
            </>
          )}
        </Sheet>
      )}

      {/* ══ TENDER DETAIL SHEET ══ */}
      {tSel && (
        <Sheet onClose={() => setTSel(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: R, fontWeight: 700 }}>{tSel.no || "—"}</div>
              <div style={{ display: "flex", gap: 6 }}>
                {tSel.isLive && <span style={{ fontSize: 8, background: "#DCFCE7", color: "#15803D", fontWeight: 800, padding: "2px 7px", borderRadius: 20 }}>LIVE</span>}
                <StatusChip s={tSel.status} />
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: BK, marginBottom: 3 }}>{tSel.entity}</div>
            <div style={{ fontSize: 12, color: "#9CA3AF" }}>{tSel.desc}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <DataCell label="Category"          value={tSel.cat} />
            <DataCell label="Award Amount"      value={fmtKES(tSel.amount)}          color={tSel.amount ? R : null} />
            <DataCell label="Date Posted"        value={tSel.posted}                  color={tSel.posted ? "#059669" : null} />
            <DataCell label="Submission Deadline"value={tSel.deadline || tSel.closed} color="#B45309" />
            <DataCell label="Contract Period"   value={tSel.period} />
            <DataCell label="Current Broker"    value={tSel.broker}                  color="#B45309" />
            <DataCell label="Awarded To"        value={tSel.awardedTo} />
            <DataCell label="Underwriter"       value={tSel.underwriter}             color="#1D4ED8" />
          </div>

          {/* Officer notes */}
          {(() => {
            const ti = tenderIntel[tSel.id] || {};
            return (
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>LIB Action & Notes</div>
                <select value={ti.action || "—"} onChange={async e => saveTI(tSel.id, { ...ti, action: e.target.value })} style={{ ...inp, marginBottom: 8 }}>
                  <option>—</option>
                  {["Bidding", "Monitoring", "Passed", "Won", "Lost"].map(s => <option key={s}>{s}</option>)}
                </select>
                <textarea value={ti.notes || ""} onChange={e => saveTI(tSel.id, { ...ti, notes: e.target.value })}
                  placeholder="Officer notes, strategy, contacts…" style={{ ...inp, height: 70, resize: "vertical" }} />
              </div>
            );
          })()}

          <div style={{ background: "#fff", borderRadius: 12, padding: "14px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Intelligence Notes</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>{tSel.notes}</div>
          </div>
          <div style={{ fontSize: 9, color: "#9CA3AF", marginBottom: 14, textAlign: "right" }}>Source: {tSel.source}</div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn label="Close" onClick={() => setTSel(null)} />
            <Btn label={tSel.docUrl ? "📄 Get Document" : "No Doc"} onClick={() => fetchDocument(tSel.docUrl)} primary={!!tSel.docUrl} disabled={!tSel.docUrl} />
          </div>
        </Sheet>
      )}

      {/* ══ DOMAIN WARNING ══ */}
      {domainWarn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: BK, textAlign: "center", marginBottom: 8 }}>Unverified Domain</div>
            <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7, textAlign: "center", marginBottom: 20 }}>
              <strong style={{ color: "#B45309" }}>{domainWarn.hostname}</strong> is not on LIB's verified safe domain list. Fetching from unverified domains carries security risk.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn label="Stay Safe" onClick={() => setDW(null)} />
              <button onClick={confirmUnsafe} style={{ flex: 1, background: "#B45309", border: "none", borderRadius: 14, color: "#fff", padding: "14px", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Proceed Anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DOCUMENT SHEET ══ */}
      {docModal && (
        <Sheet onClose={() => setDocModal(false)}>
          {docState?.loading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 48, height: 48, border: `3px solid rgba(204,0,0,0.15)`, borderTop: `3px solid ${R}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: BK, marginBottom: 6 }}>Fetching & verifying document</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>Checking domain · Verifying file type · Scanning content</div>
            </div>
          ) : docState?.ok ? (
            <>
              <div style={{ background: "#DCFCE7", borderRadius: 14, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>🔒</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#15803D" }}>Document Verified Safe</div>
                  <div style={{ fontSize: 10, color: "#16A34A", marginTop: 2 }}>{docState.fileType?.toUpperCase() || "Document"} · Domain verified · Clean</div>
                </div>
              </div>
              {docState.title && <div style={{ fontSize: 15, fontWeight: 800, color: BK, marginBottom: 12 }}>{docState.title}</div>}
              {docState.warnings?.length > 0 && (
                <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
                  {docState.warnings.map((w, i) => <div key={i} style={{ fontSize: 11, color: "#B45309" }}>{w}</div>)}
                </div>
              )}
              <div style={{ background: "#F8F9FB", borderRadius: 12, padding: "14px", fontSize: 12, color: "#374151", lineHeight: 1.8, maxHeight: 280, overflowY: "auto", fontFamily: "monospace", marginBottom: 16 }}>
                {docState.extractedText || "Document content extracted."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn label="Close" onClick={() => setDocModal(false)} />
                <Btn label="Open Original ↗" onClick={() => window.open(docState.url, "_blank")} primary />
              </div>
            </>
          ) : (
            <>
              <div style={{ background: "#FEF2F2", borderRadius: 14, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 22 }}>🚫</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#B91C1C" }}>Document Unavailable</div>
                  <div style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>{docState?.reason}</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.7, marginBottom: 16 }}>
                This document may require a login or purchase fee. Visit the source portal to access it directly.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn label="Close" onClick={() => setDocModal(false)} />
                {docState?.url && <Btn label="Open Portal ↗" onClick={() => window.open(docState.url, "_blank")} primary />}
              </div>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
