import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* HERO */}
        <section className={styles.hero}>
          <div className={styles.heroGrid}>
            <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(201,168,76,1)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          <div className={styles.heroAccent}></div>
          <div className={styles.heroAccent2}></div>
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>Civil Engineering &amp; Project Management</div>
            <h1 className={`display ${styles.heroTitle}`}>
              From <em>permit</em> to
              <br />
              possession — delivered.
            </h1>
            <p className={styles.heroSub}>
              DXE Solutions manages every non-structural dimension of your residential or
              commercial project. We coordinate, communicate, and close so your build crosses
              the finish line on time and on budget.
            </p>
            <div className={styles.heroActions}>
              <a href="/estimate" className="btn-primary">
                Request an Estimate
              </a>
              <a href="#services" className="btn-outline">
                Our Services
              </a>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.statItem}>
                <div className={styles.statNum}>
                  12<span>M+</span>
                </div>
                <div className={styles.statLabel}>in managed project value</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNum}>
                  47<span>+</span>
                </div>
                <div className={styles.statLabel}>projects completed</div>
              </div>
              <div className={styles.statItem}>
                <div className={styles.statNum}>
                  100<span>%</span>
                </div>
                <div className={styles.statLabel}>on-time delivery rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className={`section ${styles.aboutSection}`}>
          <div className="section-inner">
            <div className={styles.aboutGrid}>
              <div className={styles.aboutImg}>
                <div className={styles.aboutImgInner}>
                  <svg viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="180" width="160" height="8" fill="rgba(201,168,76,0.6)" />
                    <rect x="40" y="120" width="30" height="60" fill="rgba(255,255,255,0.15)" />
                    <rect x="80" y="80" width="40" height="100" fill="rgba(255,255,255,0.2)" />
                    <rect x="130" y="100" width="30" height="80" fill="rgba(255,255,255,0.12)" />
                    <rect x="45" y="135" width="8" height="8" fill="rgba(201,168,76,0.4)" />
                    <rect x="57" y="135" width="8" height="8" fill="rgba(201,168,76,0.4)" />
                    <rect x="85" y="95" width="8" height="8" fill="rgba(201,168,76,0.4)" />
                    <rect x="97" y="95" width="8" height="8" fill="rgba(201,168,76,0.4)" />
                    <rect x="135" y="115" width="8" height="8" fill="rgba(201,168,76,0.4)" />
                    <line x1="0" y1="188" x2="200" y2="188" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
                    <circle cx="50" cy="65" r="20" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="1" />
                    <line x1="50" y1="45" x2="50" y2="85" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5" />
                    <line x1="30" y1="65" x2="70" y2="65" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5" />
                  </svg>
                </div>
                <div className={styles.aboutBadge}>
                  <span className={styles.aboutBadgeBig}>15+</span>
                  <span className={styles.aboutBadgeSmall}>Years Experience</span>
                </div>
              </div>
              <div className={styles.aboutText}>
                <div className="section-header">
                  <div className="section-eyebrow">About DXE Solutions</div>
                  <h2 className="display">The expert between the plans and the keys.</h2>
                </div>
                <p className={styles.lead}>
                  Dixie brings over 15 years of civil engineering and construction management
                  expertise to every project she touches.
                </p>
                <p>
                  DXE Solutions was founded on a simple premise: great construction projects
                  don&apos;t fail because of the build — they fail because of what surrounds it.
                  Permitting delays, missed inspections, miscommunication between trades, and
                  scope creep are the real threats to your timeline and budget.
                </p>
                <p>
                  Dixie&apos;s role is to own everything outside the physical construction itself
                  — from the first permit application to the final certificate of occupancy.
                  She&apos;s the single point of accountability that keeps every stakeholder
                  aligned and every deadline met.
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

        {/* SERVICES */}
        <section id="services" className={`section ${styles.servicesSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">What We Do</div>
              <h2 className="display" style={{ color: 'var(--white)' }}>
                Everything the construction crew doesn&apos;t handle.
              </h2>
            </div>
            <div className={styles.servicesGrid}>
              {SERVICES.map((s) => (
                <div className={styles.serviceCard} key={s.title}>
                  <div className={styles.serviceIcon}>
                    <i className={`ti ${s.icon}`} aria-hidden="true"></i>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROJECTS */}
        <section id="projects" className={`section ${styles.projectsSection}`}>
          <div className="section-inner">
            <div className="section-header">
              <div className="section-eyebrow">Our Work</div>
              <h2 className="display">Delivered projects. Real results.</h2>
            </div>
            <div className={styles.projGrid}>
              {PROJECTS.map((p) => (
                <div className={styles.projCard} key={p.title}>
                  <div className={styles.projCardImg} style={{ background: p.bg }}>
                    <div className={styles.projTag}>{p.tag}</div>
                  </div>
                  <div className={styles.projInfo}>
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                    <div className={styles.projMeta}>
                      <span>{p.location}</span>
                      <span>{p.status}</span>
                      <span>{p.value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className={`section ${styles.contactSection}`}>
          <div className="section-inner">
            <div className={styles.contactGrid}>
              <div className={styles.contactInfo}>
                <div className="section-eyebrow">Contact</div>
                <h3 className="display">Let&apos;s talk about your project.</h3>
                <p>
                  Whether you have a project in progress or one just getting off the ground, DXE
                  Solutions is ready to help you navigate what comes next. Reach out directly or
                  request a formal estimate.
                </p>
                <div className={styles.contactDetail}>
                  <div className={styles.contactIcon}>
                    <i className="ti ti-map-pin" aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className={styles.contactLabel}>Location</div>
                    <div className={styles.contactVal}>Serving Greater Los Angeles &amp; Ventura County</div>
                  </div>
                </div>
                <div className={styles.contactDetail}>
                  <div className={styles.contactIcon}>
                    <i className="ti ti-mail" aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className={styles.contactLabel}>Email</div>
                    <div className={styles.contactVal}>dixie@dxesolutions.com</div>
                  </div>
                </div>
                <div className={styles.contactDetail}>
                  <div className={styles.contactIcon}>
                    <i className="ti ti-phone" aria-hidden="true"></i>
                  </div>
                  <div>
                    <div className={styles.contactLabel}>Phone</div>
                    <div className={styles.contactVal}>(818) 555-0000</div>
                  </div>
                </div>
              </div>
              <div className={styles.contactCta}>
                <h3 className="display">Ready to get started?</h3>
                <p>
                  The fastest way to get a response from Dixie is to fill out our project
                  estimate form. She reviews every submission personally and replies directly
                  to your email.
                </p>
                <a href="/estimate" className="btn-navy">
                  Request an Estimate
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

const SERVICES = [
  {
    icon: 'ti-license',
    title: 'Permitting & Entitlements',
    desc: 'Full management of permit applications, agency submissions, and approval tracking across all local, state, and municipal jurisdictions. We know the process, the players, and how to keep things moving.',
  },
  {
    icon: 'ti-clipboard-check',
    title: 'Inspections & Compliance',
    desc: 'Coordination and scheduling of all required inspections — structural, mechanical, electrical, and fire — with proactive compliance monitoring to prevent costly delays or corrections.',
  },
  {
    icon: 'ti-users',
    title: 'Stakeholder Coordination',
    desc: 'Single-point communication between owners, contractors, engineers, architects, municipalities, and lenders. No crossed wires. No dropped balls. One accountable manager from start to finish.',
  },
  {
    icon: 'ti-chart-line',
    title: 'Schedule & Budget Management',
    desc: 'Development and active management of project schedules and budgets, with real-time reporting and proactive mitigation of delays, overruns, and scope changes before they impact the bottom line.',
  },
  {
    icon: 'ti-file-search',
    title: 'Document Control',
    desc: 'Centralized management of all project documentation — contracts, drawings, RFIs, submittals, change orders, and as-builts — maintained in a structured, accessible system throughout the project lifecycle.',
  },
  {
    icon: 'ti-home-check',
    title: 'Close-Out & CO Management',
    desc: 'Systematic project close-out management including punch list coordination, final inspections, certificate of occupancy procurement, and warranty documentation to get you to the finish line clean and clear.',
  },
];

const PROJECTS = [
  {
    title: 'Calabasas Estate — 8,400 sq ft',
    tag: 'Residential',
    bg: 'var(--navy)',
    desc: 'Custom single-family luxury home. Full project management from entitlement through certificate of occupancy, including hillside grading permits and private road access approval.',
    location: 'Calabasas, CA',
    status: 'Completed 2024',
    value: '$4.2M value',
  },
  {
    title: 'Mixed-Use Development — 24 Units',
    tag: 'Commercial',
    bg: '#1a2a3a',
    desc: 'Ground-up mixed-use building with retail and residential. Coordinated 11 separate permit tracks, managed 4 inspection agencies, and delivered on schedule in a 26-month timeline.',
    location: 'Thousand Oaks, CA',
    status: 'Completed 2023',
    value: '$7.8M value',
  },
  {
    title: 'Historic Commercial Renovation',
    tag: 'Renovation',
    bg: '#0d1f30',
    desc: 'Adaptive reuse of a 1940s commercial building. Navigated historic preservation requirements, fire code modernization, and ADA compliance retrofit across 18,000 sq ft of occupied space.',
    location: 'Ventura, CA',
    status: 'Completed 2024',
    value: '$2.1M value',
  },
  {
    title: 'Westlake Village — Spec Development',
    tag: 'Residential',
    bg: '#162030',
    desc: 'Three-lot residential spec development. Managed simultaneous permitting across all three parcels, utility coordination, and HOA approvals to enable a unified construction start date.',
    location: 'Westlake Village, CA',
    status: 'In Progress',
    value: '$5.5M value',
  },
];
