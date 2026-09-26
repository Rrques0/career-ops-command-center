import { useEffect, useMemo, useState } from 'react';

type Prefill = {
  firstName: string; lastName: string; email: string; phone: string; city: string;
  dateOfBirth: string; linkedin: string; workAuthorization: string; salaryRequirement: string;
};

const empty: Prefill = { firstName: '', lastName: '', email: '', phone: '', city: '', dateOfBirth: '', linkedin: '', workAuthorization: 'U.S. citizen — no sponsorship required', salaryRequirement: '' };
const fields: [keyof Prefill, string, string][] = [
  ['firstName', 'First name', 'Archis'], ['lastName', 'Last name', 'Khanal'], ['email', 'Email', 'name@example.com'],
  ['phone', 'Phone', '(555) 555-5555'], ['city', 'City / relocation', 'Syracuse, NY'], ['dateOfBirth', 'Date of birth', ''],
  ['linkedin', 'LinkedIn URL', 'https://www.linkedin.com/in/...'], ['workAuthorization', 'Work authorization', 'U.S. citizen — no sponsorship required'],
  ['salaryRequirement', 'Salary requirement', 'Open to market-aligned compensation'],
];

function read(): Prefill {
  try { const saved = JSON.parse(localStorage.getItem('career-ui:prefill-v1') || '{}'); return { ...empty, ...saved }; } catch { return empty; }
}

export function PrefillVault() {
  const [values, setValues] = useState<Prefill>(read);
  const [message, setMessage] = useState('');
  useEffect(() => { try { localStorage.setItem('career-ui:prefill-v1', JSON.stringify(values)); } catch { /* private mode: retain this session */ } }, [values]);
  const macro = useMemo(() => fields.map(([key, label]) => `${label}: ${values[key] || `{{${key}}}`}`).join('\n'), [values]);
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setMessage(`${label} copied`); setTimeout(() => setMessage(''), 1800); }
    catch { setMessage('Clipboard unavailable — select and copy manually.'); }
  }
  return <section className="panel prefill-vault" aria-label="Application prefills"><div className="section-label">APPLICATION PREFILLS<span>LOCAL BROWSER MACROS</span></div><p className="muted">Enter recurring answers once. These values stay in this browser and are never sent automatically.</p><div className="prefill-grid">{fields.map(([key, label, placeholder]) => <label key={key}>{label}<input type={key === 'dateOfBirth' ? 'date' : key === 'email' ? 'email' : 'text'} value={values[key]} placeholder={placeholder} maxLength={240} onChange={e => setValues(current => ({ ...current, [key]: e.target.value }))}/><button type="button" onClick={() => void copy(values[key] || `{{${key}}}`, label)}>Copy</button></label>)}</div><div className="prefill-actions"><button type="button" onClick={() => void copy(macro, 'Application macro block')}>Copy application macro block</button><button type="button" onClick={() => setValues(empty)}>Clear local prefills</button><span role="status">{message}</span></div><details><summary>Preview macro block</summary><pre>{macro}</pre></details></section>;
}
