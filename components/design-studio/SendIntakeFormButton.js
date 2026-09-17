'use client';

import { useState } from 'react';
import { S } from '@/lib/design-studio/brand';
import SendIntakeFormModal from './SendIntakeFormModal';

export default function SendIntakeFormButton() {
  const [show, setShow] = useState(false);
  return (
    <>
      <button type="button" style={S.btnGhost} onClick={() => setShow(true)}>
        Send Intake Form
      </button>
      {show ? <SendIntakeFormModal onClose={() => setShow(false)} /> : null}
    </>
  );
}
