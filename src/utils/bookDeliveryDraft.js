const DRAFT_KEY = 'go7_book_delivery_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function loadBookDeliveryDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw);
    if (!draft?.savedAt || Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      sessionStorage.removeItem(DRAFT_KEY);
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

export function saveBookDeliveryDraft(draft) {
  try {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        ...draft,
        savedAt: Date.now(),
      })
    );
  } catch (err) {
    console.warn('Could not save booking draft:', err?.message);
  }
}

export function clearBookDeliveryDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
