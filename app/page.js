import Image from 'next/image';
import Footer from '@/components/Footer';
import StarRating from '@/components/StarRating';
import { createClient } from '@/lib/supabase-server';
import HomeNav from './HomeNav';
import HeroForm from './HeroForm';
import FaqAccordion from './FaqAccordion';
import styles from './page.module.css';

export default async function HomePage() {
  const supabase = createClient();
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <>
      <HomeNav />

      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroPhoto} aria-hidden="true">
            <Image
              src="/images/hero-downtown-la.jpg"
              alt=""
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 35%' }}
              priority
            />
            <div className={styles.heroPhotoOverlay}></div>
          </div>
          <div className={styles.heroGrid} aria-hidden="true">
            <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(201,168,87,1)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>
          </div>
          <div className={styles.heroAccent} aria-hidden="true"></div>
          <div className={styles.heroAccent2} aria-hidden="true"></div>

          <div className={styles.heroInner}>
            <div className={styles.heroContent}>
              <div className={styles.heroEyebrow}>Permitting &amp; Project Management</div>
              <h1 className={`display ${styles.heroTitle}`}>
                Your permit is not stuck. <em>It&apos;s unmanaged.</em>
              </h1>
              <p className={styles.heroSub}>
                DXE Solutions takes the plans, the city, the inspections and the schedule off your
                desk — and stays on it until you hand over the keys. Greater Los Angeles and
                Ventura County.
              </p>
              <div className={styles.heroFeatures}>
                <div className={styles.heroFeature}>
                  <div className={styles.heroFeatureLabel}>Plans → keys</div>
                  <div className={styles.heroFeatureDesc}>One point of contact the whole way</div>
                </div>
                <div className={styles.heroFeature}>
                  <div className={styles.heroFeatureLabel}>LA + Ventura</div>
                  <div className={styles.heroFeatureDesc}>City and county jurisdictions</div>
                </div>
                <div className={styles.heroFeature}>
                  <div className={styles.heroFeatureLabel}>Same week</div>
                  <div className={styles.heroFeatureDesc}>Review turnaround on new files</div>
                </div>
              </div>
            </div>

            <HeroForm />
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className={`section ${styles.aboutSection}`}>
          <div className="section-inner">
            <div className={styles.aboutGrid}>
              <div className={styles.aboutText}>
                <div className="section-header">
                  <div className="section-eyebrow">About DXE Solutions</div>
                  <div className={styles.aboutHeadingRow}>
                    <h2 className="display" style={{ color: 'var(--navy)' }}>
                      The firm between the plans and the keys.
                    </h2>
                    <div className={styles.aboutBadgeInline}>
                      <span className={styles.aboutBadgeBig}>15+</span>
                      <span className={styles.aboutBadgeSmall}>Years Experience</span>
                    </div>
                  </div>
                </div>
                <p className={styles.aboutLead}>
                  DXE Solutions brings over 15 years of permitting and construction
                  management expertise to every project we take on.
                </p>
                <p>
                  DXE Solutions was founded on a simple premise: great construction projects
                  don&apos;t fail because of the build — they fail because of what surrounds it.
                  Permitting delays, missed inspections, miscommunication between trades, and
                  scope creep are the real threats to your timeline and budget.
                </p>
                <p>
                  Our team owns everything outside the physical construction itself — from the
                  first permit application to the final certificate of occupancy. We&apos;re the
                  single point of accountability that keeps every stakeholder aligned and every
                  deadline met.
                </p>
                <p>
                  Whether you&apos;re developing a luxury residential estate or a commercial
                  complex, DXE Solutions brings the rigor, the relationships, and the relentless
                  follow-through to deliver your project finished.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* THE REAL COST */}
        <section className={`section ${styles.costSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">The Real Cost</div>
              <h2 className="display" style={{ color: 'var(--white)' }}>
                Every week a plan sits at the counter, you pay for it twice.
              </h2>
              <p className={styles.costLead}>
                Interest keeps running. The crew books someone else&apos;s job. The correction
                letter comes back asking for something that was answered in round one. Most
                delays are not engineering problems, they&apos;re follow-up problems.
              </p>
            </div>

            <div className={styles.costGrid}>
              <div className={styles.costCard}>
                <div className={styles.costCardLabel}>Without a manager on it</div>
                <ul className={styles.costList}>
                  {WITHOUT_POINTS.map((p) => (
                    <li key={p}>
                      <i className="ti ti-x" aria-hidden="true"></i>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`${styles.costCard} ${styles.costCardGold}`}>
                <div className={`${styles.costCardLabel} ${styles.costCardLabelGold}`}>
                  With DXE on it
                </div>
                <ul className={styles.costList}>
                  {WITH_POINTS.map((p) => (
                    <li key={p}>
                      <i className="ti ti-check" aria-hidden="true"></i>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className={`section ${styles.servicesSection}`}>
          <div className={styles.textureLayer} aria-hidden="true">
            <Image src="/images/blueprint-texture.jpg" alt="" fill style={{ objectFit: 'cover' }} />
          </div>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">What We Do</div>
              <h2 className="display" style={{ color: 'var(--navy)' }}>
                Everything the construction crew doesn&apos;t handle.
              </h2>
            </div>
            <div className={styles.servicesGrid}>
              {SERVICES.map((s) => (
                <div className={styles.serviceCard} key={s.title}>
                  <div className={styles.serviceNum}>{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>

            <div className={styles.photoGrid}>
              {PHOTO_TILES.map((t) => (
                <div className={styles.photoTile} key={t.title}>
                  <Image src={t.img} alt={t.title} fill style={{ objectFit: 'cover' }} />
                  <div className={styles.photoTileCaption}>
                    <strong>{t.title}</strong>
                    <span>{t.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLIENT PORTAL */}
        <section id="portal" className={`section ${styles.portalSection}`}>
          <div className="section-inner">
            <div className={styles.portalGrid}>
              <div className={styles.portalText}>
                <div className="section-header">
                  <div className="section-eyebrow">Client Portal</div>
                  <h2 className="display" style={{ color: 'var(--navy)' }}>
                    Your project, always in view.
                  </h2>
                </div>
                <p className={styles.portalLead}>
                  Every DXE Solutions client gets a private portal — not just status updates, but
                  the whole picture: organized, live, and available anytime you check it.
                </p>
                <ul className={styles.portalFeatures}>
                  {PORTAL_FEATURES.map((f) => (
                    <li key={f}>
                      <i className="ti ti-circle-check" aria-hidden="true"></i>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.portalGraphic}>
                <div className={styles.portalGraphicInner}>
                  <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="10" width="180" height="140" rx="2" fill="none" stroke="rgba(201,168,87,0.4)" strokeWidth="1" />
                    <line x1="10" y1="34" x2="190" y2="34" stroke="rgba(201,168,87,0.4)" strokeWidth="1" />
                    <circle cx="24" cy="22" r="4" fill="rgba(201,168,87,0.5)" />
                    <circle cx="40" cy="22" r="4" fill="rgba(62,84,104,0.25)" />
                    <circle cx="56" cy="22" r="4" fill="rgba(62,84,104,0.25)" />
                    <rect x="24" y="48" width="70" height="8" fill="rgba(62,84,104,0.2)" />
                    <rect x="24" y="64" width="152" height="1" stroke="rgba(62,84,104,0.15)" />
                    <rect x="24" y="76" width="60" height="34" fill="rgba(62,84,104,0.12)" />
                    <rect x="92" y="76" width="60" height="34" fill="rgba(201,168,87,0.14)" />
                    <rect x="24" y="120" width="128" height="6" fill="rgba(62,84,104,0.15)" />
                    <rect x="24" y="132" width="90" height="6" fill="rgba(62,84,104,0.1)" />
                  </svg>
                </div>
                <div className={styles.portalBadge}>
                  <i className="ti ti-lock" aria-hidden="true"></i>
                  <span>Private &amp; secure, per project</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className={`section ${styles.stepsSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">How It Works</div>
              <h2 className="display" style={{ color: 'var(--navy)' }}>
                Three steps, and you know the plan before you spend a dollar.
              </h2>
            </div>
            <div className={styles.stepsGrid}>
              {STEPS.map((s) => (
                <div className={styles.stepCard} key={s.title}>
                  <div className={styles.stepNum}>{s.num}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COVERAGE */}
        <section id="coverage" className={`section ${styles.coverageSection}`}>
          <div className={styles.textureLayerDark} aria-hidden="true">
            <Image src="/images/LosAngeles-Ventura.jpg" alt="" fill style={{ objectFit: 'cover' }} />
          </div>
          <div className="section-inner">
            <div className="section-eyebrow">Coverage</div>
            <h2 className="display" style={{ color: 'var(--white)' }}>
              Greater Los Angeles and Ventura County.
            </h2>
            <p>
              City of LA, LA County unincorporated, Ventura County and the surrounding cities. If
              your jurisdiction isn&apos;t on our list, say so on the call and we&apos;ll tell you
              straight whether we&apos;re the right fit.
            </p>
          </div>
        </section>

        {/* REVIEWS */}
        {reviews && reviews.length > 0 && (
          <section id="reviews" className={`section ${styles.reviewsSection}`}>
            <div className="section-inner">
              <div className="section-header">
                <div className="section-eyebrow">Client Reviews</div>
                <h2 className="display" style={{ color: 'var(--navy)' }}>
                  What clients say after we&apos;ve run their permits.
                </h2>
              </div>
              <div className={styles.reviewsGrid}>
                {reviews.map((r) => (
                  <div className={styles.reviewCard} key={r.id}>
                    <StarRating value={r.rating} readOnly size={16} />
                    {r.body && <p className={styles.reviewBody}>&ldquo;{r.body}&rdquo;</p>}
                    <div className={styles.reviewMeta}>
                      <span className={styles.reviewName}>{r.client_name}</span>
                      {r.project_type && <span className={styles.reviewType}>{r.project_type}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section id="faq" className={`section ${styles.faqSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">FAQ</div>
              <h2 className="display" style={{ color: 'var(--navy)' }}>
                Straight answers.
              </h2>
            </div>
            <FaqAccordion faqs={FAQS} />
          </div>
        </section>

        {/* FINAL CTA */}
        <section className={`section ${styles.finalSection}`}>
          <div className={styles.textureLayerDark} aria-hidden="true">
            <Image src="/images/Next-step.jpg" alt="" fill style={{ objectFit: 'cover' }} />
          </div>
          <div className="section-inner">
            <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
              Next Step
            </div>
            <h2 className="display" style={{ color: 'var(--white)' }}>
              Fifteen minutes now beats another month at the counter.
            </h2>
            <p>
              Book the call. You&apos;ll leave it knowing the next three steps on your project
              either way.
            </p>
            <a href="#call" className="btn-primary">
              Book a 15-min permit review
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const WITHOUT_POINTS = [
  'Plan check comments sit for weeks before anyone answers',
  "Nobody owns the resubmittal, so it goes back incomplete",
  'Inspections get called at the wrong stage and fail',
  'Consultants blame each other, you referee',
  'Your schedule is a guess',
];

const WITH_POINTS = [
  'One person answers the city and tracks every open comment',
  'Corrections turned around as a complete package',
  "Inspections sequenced and pre-walked before the inspector shows",
  'Consultants coordinated on one set of drawings',
  'You get a dated schedule and a weekly status note',
];

const SERVICES = [
  {
    num: '01',
    title: 'Permitting & Entitlements',
    desc: 'Full management of permit applications, agency submissions, and approval tracking across all local, state, and municipal jurisdictions. We know the process, the players, and how to keep things moving.',
  },
  {
    num: '02',
    title: 'Inspections & Compliance',
    desc: 'Coordination and scheduling of all required inspections — structural, mechanical, electrical, and fire — with proactive compliance monitoring to prevent costly delays or corrections.',
  },
  {
    num: '03',
    title: 'Stakeholder Coordination',
    desc: 'Single-point communication between owners, contractors, engineers, architects, municipalities, and lenders. No crossed wires. No dropped balls. One accountable manager from start to finish.',
  },
  {
    num: '04',
    title: 'Schedule & Budget Management',
    desc: 'Development and active management of project schedules and budgets, with real-time reporting and proactive mitigation of delays, overruns, and scope changes before they impact the bottom line.',
  },
  {
    num: '05',
    title: 'Document Control',
    desc: 'Centralized management of all project documentation — contracts, drawings, RFIs, submittals, change orders, and as-builts — maintained in a structured, accessible system throughout the project lifecycle.',
  },
  {
    num: '06',
    title: 'Close-Out & CO Management',
    desc: 'Systematic project close-out management including punch list coordination, final inspections, certificate of occupancy procurement, and warranty documentation to get you to the finish line clean and clear.',
  },
];

const PORTAL_FEATURES = [
  'Live project status & milestone tracking',
  'All project documents in one place',
  'Progress photos updated by your PM',
  'Notes and updates from Dixie',
  'Upload your own files securely',
  'Manage multiple projects in one account',
];

const PHOTO_TILES = [
  { img: '/images/site-grading-aerial.jpg', title: 'Site & grading', sub: 'Pad, drainage, retaining — engineered and approved.' },
  { img: '/images/inspections-framing.jpg', title: 'Inspections', sub: 'Pre-walked before the inspector shows up.' },
  { img: '/images/closeout-house.jpg', title: 'Close-out', sub: 'Sign-offs, C of O, keys in hand.' },
];

const STEPS = [
  {
    num: '01',
    title: '15-minute call',
    desc: 'Address, scope, jurisdiction, and where it stands today. Free.',
  },
  {
    num: '02',
    title: 'Written path and fee',
    desc: 'You get the steps, the sequence, the realistic dates, and a flat scope. No hourly surprises.',
  },
  {
    num: '03',
    title: 'We run it',
    desc: 'We become the point of contact with the city and your consultants. Weekly status until close-out.',
  },
];

const FAQS = [
  {
    q: 'How much does it cost?',
    a: "Scope drives it, so we quote flat after the call rather than guessing on a website. Small residential permit management sits at the low end; multi-agency commercial work is higher. You'll have the number in writing before any work starts.",
  },
  {
    q: "Can you take over a project that's already stuck?",
    a: "Yes — that's one of our most common calls. We read the file, find what's actually blocking it, and give you a straight answer on what it takes to get moving again.",
  },
  {
    q: 'Do you stamp drawings?',
    a: "No — DXE Solutions manages permitting, inspections, and project coordination. Stamped drawings come from your project's civil, structural, or architectural engineer of record; we make sure their work gets through the counter without delay.",
  },
  {
    q: 'How fast can you start?',
    a: "Most engagements start with the 15-minute call this week. If we're a fit, you'll have a written scope and start date within a few business days.",
  },
  {
    q: 'Do you work with owners or only contractors?',
    a: "Both. We're brought on directly by owners and developers, and just as often by contractors who need one person managing the paperwork and schedule so the field crew can stay heads-down on the build.",
  },
];
