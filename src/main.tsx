import { mountCareerHub } from './bootstrap';
import { enableResponsiveFrame } from './security/messaging';

const host = document.querySelector<HTMLElement>('#career-hub-root');
if (!host) throw new Error('Career Hub mount element was not found');
mountCareerHub(host);

const parentOrigin = new URLSearchParams(window.location.search).get('parentOrigin') ?? undefined;
enableResponsiveFrame(parentOrigin);
