/**
 * Local chat state — the server session is authoritative; this only tracks
 * rendered message bubbles + the latest UI card payload.
 */
let mid = 0;
const nextId = () => `m${++mid}`;

export function botMessage(text, ui = null) {
  return { id: nextId(), role: 'assistant', text, ui, ts: Date.now() };
}

export function userMessage(text) {
  return { id: nextId(), role: 'user', text, ts: Date.now() };
}

import { createElement } from 'react';

/** Render **bold** from the server templates (no JSX — this file stays .js). */
export function renderInline(text) {
  return String(text || '').split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? createElement('strong', { key: i }, part.slice(2, -2))
      : createElement('span', { key: i }, part)
  );
}
