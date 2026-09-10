// Seed / re-seed the training course quiz banks. Idempotent: wipes and
// re-inserts every question. Run with:
//   node -r dotenv/config ...  — or export DATABASE_URL and run directly.
import pg from 'pg';

const QUIZZES = {
  'Process Overview': [
    { q: 'In DXE’s 16-phase process, which phase comes first?', o: ['Foundation', 'Demo / Grading', 'Framing', 'Finals'], c: 1 },
    { q: 'Where do "Meter Spots" fall in the 16-phase sequence?', o: ['Before Foundation', 'Right after Framing', 'Before Utilities', 'After Roofing'], c: 1 },
    { q: 'What is the final phase of the process?', o: ['Kitchen Cabinets', 'Hardscape / Landscape', 'Finals', 'Stucco'], c: 2 },
  ],
  'Client Onboarding & Workflow': [
    { q: 'When creating a new client & project, why does setting the correct project type matter?', o: ['It sets the invoice amount', 'It pre-fills the right phases for that scope', 'It emails the client automatically', 'It assigns employees'], c: 1 },
    { q: 'When should you log permits you already know a project will need?', o: ['Only once submitted', 'Only after the permit is issued', 'Up front, even if the status is "Not Started"', 'Only when the client asks'], c: 2 },
    { q: 'The client-facing progress bar should be updated…', o: ['In one batch at the end', 'As phases actually happen', 'Only when the client logs in', 'Never — it updates itself'], c: 1 },
    { q: 'A project is ready to be marked "Completed" once…', o: ['The contract is signed', 'The first invoice is paid', 'The certificate of occupancy or final sign-off is in hand', 'Framing passes inspection'], c: 2 },
  ],
  'Construction Phase Guide': [
    { q: 'Before taking action on a project instruction, you should always…', o: ['Wait for the Monday meeting', 'Get confirmation in a text or email first', 'Ask the client', 'Post it on the calendar'], c: 1 },
    { q: 'Before demolition where digging is involved, who must be called?', o: ['The city inspector', 'DigAlert (811)', 'LADWP', 'The soil engineer'], c: 1 },
    { q: 'When visiting a project site you should…', o: ['Only go if there’s an inspection', 'Take lots of pictures and inspect the site at each visit', 'Avoid talking to subs', 'Wait for Herbert to arrive'], c: 1 },
    { q: 'If you solve an unexpected situation in the field, what should you do?', o: ['Nothing', 'Write down how it was solved and tell Dixie for the SQC Guide book', 'Only tell the client', 'Keep it to yourself'], c: 1 },
  ],
  'Permitting': [
    { q: 'A "permitting-only" engagement means…', o: ['DXE also manages the field crew', 'No active field coordination is included', 'The client pays nothing up front', 'DXE pulls every subcontractor permit'], c: 1 },
    { q: 'In a permitting engagement, each round of city comments and each response should be…', o: ['Emailed to the client only', 'Logged as its own Action Item', 'Ignored until the final round', 'Handled verbally'], c: 1 },
    { q: 'Highway Dedication must be cleared…', o: ['After the A-Permit', 'Before getting the A-Permit', 'After framing', 'At close-out'], c: 1 },
    { q: 'ADUs are exempt from which fee?', o: ['The building permit fee', 'The Recreation and Parks (Parks & Rec) fee', 'The LADWP meter fee', 'The plan-check fee'], c: 1 },
  ],
  'Utilities': [
    { q: 'Utility company work-request / tracking numbers should be logged…', o: ['At the end of the project', 'As soon as they’re issued', 'Only if the client asks', 'Never — the utility keeps them'], c: 1 },
    { q: 'Who is responsible for all city and utility fees on a temporary power pole?', o: ['DXE', 'The owner', 'The contractor', 'The city waives them'], c: 1 },
    { q: 'How many water meters is a project generally allowed?', o: ['3', 'Up to 5 (4 new plus the existing)', 'Unlimited', 'One per unit'], c: 1 },
    { q: 'A water line of what size or larger requires a plumbing permit?', o: ['1"', '1-1/2"', '2" or larger', '3" only'], c: 2 },
  ],
  'City & Agency Portals': [
    { q: 'For new construction in Pasadena, a CofO application must be submitted…', o: ['Before final', 'Within 90 days after final', 'Within one year', 'It’s automatic'], c: 1 },
    { q: 'In Long Beach, architecturally-drawn existing floor plans are…', o: ['On the OpenLB portal', 'Not online — viewable in person at the Permit Center Resource Center', 'Emailed on request', 'Never kept by the city'], c: 1 },
    { q: 'To get copies of existing plans in Long Beach you need written permission from…', o: ['Just the city', 'The current owner and the original architect/engineer of record', 'The contractor', 'Nobody'], c: 1 },
  ],
  'Residential — New Construction': [
    { q: 'Before submittal you should get and add to Permitting Details the…', o: ['Contractor’s license', 'APN and zoning', 'Client’s budget', 'Utility bills'], c: 1 },
    { q: 'Which typically must clear before the building permit?', o: ['Framing', 'Grading', 'The final inspection', 'Solar'], c: 1 },
    { q: 'At the end of the job, which inspections tend to stack up?', o: ['Only fire', 'Building, fire, and utility finals', 'Only grading', 'None'], c: 1 },
  ],
  'Residential — ADU': [
    { q: 'Before submitting an ADU you should…', o: ['Assume the ordinance is the same as last time', 'Confirm the current local ADU ordinance (setbacks, size, parking)', 'Skip zoning review', 'Wait for corrections'], c: 1 },
    { q: 'ADUs frequently need which utility change flagged early?', o: ['A new gas line only', 'A separate meter or a panel upgrade', 'Nothing', 'A private well'], c: 1 },
    { q: 'To prevent scope creep on an ADU you should…', o: ['Verbally agree to extras', 'Document scope clearly in Project Details so any expansion is a visible change', 'Ignore main-house requests', 'Always include a full remodel'], c: 1 },
  ],
  'Residential — Renovation / Addition': [
    { q: 'Before submitting a remodel you should request or confirm…', o: ['New-construction plans', 'Existing plans/permits (existing conditions)', 'The client’s insurance', 'A soil report'], c: 1 },
    { q: 'Wall removal or foundation work should be tracked…', o: ['Bundled into the general "Building" permit', 'As its own permit thread', 'Verbally', 'Only after inspection'], c: 1 },
    { q: 'A common source of friction on remodels is…', o: ['Paint color', 'Occupied-home logistics for utilities and access during construction', 'Permit fees', 'Parking'], c: 1 },
  ],
  'Commercial — New Construction': [
    { q: 'Zoning / use (entitlement) approvals should be tracked…', o: ['As part of the building permit', 'As their own separate permit entry', 'Verbally', 'Not at all'], c: 1 },
    { q: 'Fire, health, and building department review on commercial work is best tracked…', o: ['As one "in review" line', 'With a permit entry per agency', 'Only by the contractor', 'After CofO'], c: 1 },
    { q: 'Commercial close-out (CO) packages are…', o: ['Lighter than residential', 'Heavier — accessibility and fire/life-safety sign-off take real time', 'Not required', 'Handled entirely by the city'], c: 1 },
  ],
  'Commercial — Tenant Improvement': [
    { q: 'An occupancy or use change can…', o: ['Speed up review', 'Trigger a much bigger review than the client expects', 'Be skipped', 'Only affect signage'], c: 1 },
    { q: 'Demo on a TI project…', o: ['Is always part of the buildout permit', 'Often needs its own permit and inspection before buildout', 'Requires no permit', 'Happens after buildout'], c: 1 },
    { q: 'Landlord / base-building approvals should be obtained…', o: ['After corrections come back', 'In writing before submittal', 'Verbally', 'Only if the city asks'], c: 1 },
  ],
  'Mixed-Use Development': [
    { q: 'Residential and commercial components of a mixed-use project should be…', o: ['Combined into one tracker', 'Kept distinct per use — separate permits and phases', 'Ignored until the end', 'Handled by the client'], c: 1 },
    { q: 'Because mixed-use often has combined parking or shared-utility requirements, you should…', o: ['Assume standard single-use rules', 'Confirm requirements with the jurisdiction early', 'Wait for corrections', 'Skip the parking review'], c: 1 },
  ],
};

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('delete from public.training_quiz_questions');
let n = 0;
for (const [category, questions] of Object.entries(QUIZZES)) {
  for (let i = 0; i < questions.length; i++) {
    const { q, o, c } = questions[i];
    await client.query(
      'insert into public.training_quiz_questions (category, sort_order, question, options, correct_index) values ($1,$2,$3,$4,$5)',
      [category, i + 1, q, JSON.stringify(o), c]
    );
    n++;
  }
}
console.log(`seeded ${n} quiz questions across ${Object.keys(QUIZZES).length} categories`);
await client.end();
