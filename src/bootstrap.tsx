import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import styles from './styles.css?inline';
import theme from './ice-theme.css?inline';
import qol from './qol.css?inline';
import palantir from './palantir-theme.css?inline';
import premium from './premium-theme.css?inline';
import attention from './attention.css?inline';
import attentionExtra from './attention-extra.css?inline';
import vcPolish from './vc-polish.css?inline';

const roots = new WeakMap<Element, Root>();

export function mountCareerHub(host: HTMLElement) {
  if (roots.has(host)) return () => unmountCareerHub(host);
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles + '\n' + theme + '\n' + qol + '\n' + palantir + '\n' + premium + '\n' + attention + '\n' + attentionExtra + '\n' + vcPolish;
  const mount = document.createElement('div');
  mount.setAttribute('data-career-hub', '');
  shadow.replaceChildren(style, mount);
  const root = createRoot(mount);
  roots.set(host, root);
  root.render(<App />);
  return () => unmountCareerHub(host);
}

export function unmountCareerHub(host: HTMLElement) {
  roots.get(host)?.unmount();
  roots.delete(host);
  host.shadowRoot?.replaceChildren();
}
