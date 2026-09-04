'use client';

import { useRouter } from 'next/navigation';
import adminStyles from '@/components/admin.module.css';
import { CONTACT_CATEGORIES } from '@/lib/constants';

export default function ContactCategoryFilter({ current }) {
  const router = useRouter();

  function handleChange(e) {
    const value = e.target.value;
    router.push(value ? `/admin/contacts?category=${encodeURIComponent(value)}` : '/admin/contacts');
  }

  return (
    <select
      className={adminStyles.fieldInput}
      style={{ maxWidth: '280px' }}
      value={current || ''}
      onChange={handleChange}
    >
      <option value="">All categories</option>
      {CONTACT_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
