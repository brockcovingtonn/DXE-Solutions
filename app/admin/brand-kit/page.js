import Image from 'next/image';
import PrintButton from '@/components/PrintButton';
import styles from './page.module.css';

export default function BrandKitPage() {
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <PrintButton label="Print / Save as PDF" className="btn-navy" />
      </div>

      <div className={styles.sheet}>
        {/* COVER */}
        <section className={styles.cover}>
          <div className={styles.coverLogo}>
            <Image src="/images/logo-cream.png" alt="DXE Solutions" fill style={{ objectFit: 'contain' }} priority />
          </div>
          <div className={styles.coverEyebrow}>Brand Guidelines</div>
          <h1 className={styles.coverTitle}>DXE Solutions</h1>
          <p className={styles.coverSub}>Permitting &amp; Project Management</p>
        </section>

        {/* LOGO */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Logo</h2>
          <p className={styles.sectionIntro}>
            Four approved variants, each built for a specific background. Never recolor, stretch,
            rotate, or add effects (drop shadows, outlines) to the logo — use the variant that
            already fits the background instead.
          </p>
          <div className={styles.logoGrid}>
            <LogoSwatch src="/images/logo-black.png" bg="#FFFFFF" label="Black" note="Light backgrounds — the default for print and documents" />
            <LogoSwatch src="/images/logo-slate.png" bg="#F6F8FA" label="Slate" note="Light/cream backgrounds — a softer alternative to black" />
            <LogoSwatch src="/images/logo-cream.png" bg="#2C3E50" label="Cream" dark note="Navy or dark backgrounds" />
            <LogoSwatch src="/images/logo-gold.png" bg="#2C3E50" label="Gold" dark note="Navy backgrounds — for emphasis, not body use" />
          </div>
          <div className={styles.rule}>
            <div className={styles.ruleLabel}>Clear space</div>
            <p>Keep at least the height of the logo mark as empty space on all sides — nothing else should crowd it.</p>
          </div>
          <div className={styles.rule}>
            <div className={styles.ruleLabel}>Minimum size</div>
            <p>Don&apos;t render the logo narrower than 100px wide (digital) or 1 inch (print) — it stops reading clearly below that.</p>
          </div>
        </section>

        {/* COLOR */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Color</h2>
          <p className={styles.sectionIntro}>
            Navy carries authority and structure; gold is the accent, used sparingly for emphasis
            (labels, dividers, calls to action) — never as a large fill.
          </p>
          <div className={styles.colorGroup}>
            <div className={styles.colorGroupLabel}>Navy</div>
            <div className={styles.swatchRow}>
              <ColorSwatch hex="#2C3E50" name="Navy Dark" />
              <ColorSwatch hex="#3E5468" name="Navy" primary />
              <ColorSwatch hex="#4A6178" name="Navy Mid" />
              <ColorSwatch hex="#5A7188" name="Navy Light" />
            </div>
          </div>
          <div className={styles.colorGroup}>
            <div className={styles.colorGroupLabel}>Gold</div>
            <div className={styles.swatchRow}>
              <ColorSwatch hex="#C9A857" name="Gold" primary />
              <ColorSwatch hex="#DBC07E" name="Gold Light" />
              <ColorSwatch hex="#F6EFDD" name="Gold Pale" dark />
            </div>
          </div>
          <div className={styles.colorGroup}>
            <div className={styles.colorGroupLabel}>Neutral</div>
            <div className={styles.swatchRow}>
              <ColorSwatch hex="#F6F8FA" name="Cream" dark />
              <ColorSwatch hex="#FFFFFF" name="White" dark border />
            </div>
          </div>
        </section>

        {/* TYPOGRAPHY */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Typography</h2>
          <p className={styles.sectionIntro}>
            Cormorant Garamond for headlines and document titles — it carries the formality of the
            work. Inter for everything read at length: body copy, labels, tables, UI.
          </p>
          <div className={styles.typeSpecimen}>
            <div className={styles.typeSpecimenLabel}>Display — Cormorant Garamond</div>
            <div className={styles.typeSample} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              The firm between the plans and the keys.
            </div>
            <div className={styles.typeWeights}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>Regular</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>Medium</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>Semibold</span>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700 }}>Bold</span>
            </div>
          </div>
          <div className={styles.typeSpecimen}>
            <div className={styles.typeSpecimenLabel}>Body — Inter</div>
            <div className={styles.typeSample} style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.05rem' }}>
              DXE Solutions manages every non-structural dimension of your project.
            </div>
            <div className={styles.typeWeights}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Regular</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Medium</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Semibold</span>
            </div>
          </div>
          <div className={styles.rule}>
            <div className={styles.ruleLabel}>Email &amp; other software</div>
            <p>
              Most email clients block custom fonts. Emails use Georgia (a close serif stand-in for
              Cormorant Garamond) for headings and the system sans-serif stack for body text —
              already built into every DXE Solutions notification email.
            </p>
          </div>
        </section>

        {/* APPLICATIONS */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Applications</h2>
          <p className={styles.sectionIntro}>
            This system is already live across the business — not just a reference, the actual
            styling used today:
          </p>
          <ul className={styles.appList}>
            <li><strong>Website</strong> — dxesolutions.com, navy nav bar, gold accents, Cormorant Garamond headlines.</li>
            <li><strong>Project Cover Sheets</strong> — navy letterhead header, gold accent rule, faint logo watermark.</li>
            <li><strong>Client &amp; lead emails</strong> — navy header bar, gold divider, matching type.</li>
            <li><strong>Client &amp; Employee Portal</strong> — same navy/gold/cream system throughout.</li>
          </ul>
        </section>

        <div className={styles.footer}>
          DXE Solutions · Brand Guidelines · dixie@dxesolutions.com
        </div>
      </div>
    </div>
  );
}

function LogoSwatch({ src, bg, label, note, dark }) {
  return (
    <div className={styles.logoSwatch}>
      <div className={styles.logoSwatchBox} style={{ background: bg }}>
        <div className={styles.logoSwatchImg}>
          <Image src={src} alt={`DXE Solutions — ${label}`} fill style={{ objectFit: 'contain' }} />
        </div>
      </div>
      <div className={styles.logoSwatchLabel}>{label}</div>
      <div className={styles.logoSwatchNote}>{note}</div>
    </div>
  );
}

function ColorSwatch({ hex, name, primary, dark, border }) {
  return (
    <div className={styles.swatch}>
      <div
        className={styles.swatchBox}
        style={{ background: hex, border: border ? '1px solid #DCE5EC' : 'none' }}
      >
        {primary && <span className={styles.swatchPrimaryTag}>Primary</span>}
      </div>
      <div className={styles.swatchName} style={{ color: dark ? '#2C3E50' : undefined }}>{name}</div>
      <div className={styles.swatchHex}>{hex}</div>
    </div>
  );
}
