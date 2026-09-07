import { useEffect, useState } from 'react';

export const views = ['Command', 'Applications', 'Projects', 'Skills & credentials', 'Sources', 'Activity', 'My documents', 'Guide'] as const;
export type View = typeof views[number];
export function useNavigation() {
  const read = (): View => {
    try { const value = decodeURIComponent(location.hash.slice(1)); return views.includes(value as View) ? value as View : 'Command'; }
    catch { return 'Command'; }
  };
  const [view, setView] = useState<View>(read);
  useEffect(() => { const update = () => setView(read()); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  return [view, (next: View) => { location.hash = encodeURIComponent(next); setView(next); window.scrollTo({ top: 0 }); }] as const;
}
// Only harmless display preferences are stored here. Career records remain in SQLite.
export function usePreference(key: string, fallback: string, allowed?: readonly string[]) {
  const [value, setValue] = useState<string>(() => {
    try { const saved = localStorage.getItem(`career-ui:${key}`); return saved !== null && (!allowed || allowed.includes(saved)) ? saved : fallback; }
    catch { return fallback; }
  });
  function save(next: string) { setValue(next); try { localStorage.setItem(`career-ui:${key}`, next); } catch { /* Private mode: retain this session. */ } }
  return [value, save] as const;
}
