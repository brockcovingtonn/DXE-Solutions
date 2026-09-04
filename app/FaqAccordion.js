'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function FaqAccordion({ faqs }) {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className={styles.faqList}>
      {faqs.map((f, i) => (
        <div className={styles.faqItem} key={f.q}>
          <button
            type="button"
            className={styles.faqQuestion}
            onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
            aria-expanded={openFaq === i}
          >
            {f.q}
            <i className={`ti ${openFaq === i ? 'ti-minus' : 'ti-plus'}`} aria-hidden="true"></i>
          </button>
          {openFaq === i && <p className={styles.faqAnswer}>{f.a}</p>}
        </div>
      ))}
    </div>
  );
}
