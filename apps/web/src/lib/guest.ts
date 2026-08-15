// Web2-style guest identity. Likes and comments work without a wallet: each
// browser gets a stable random id (used to dedupe likes) and an optional
// display name the visitor can set. When a wallet IS connected, the address
// takes precedence over the guest id.
const GUEST_ID_KEY = 'verida_guest_id';
const GUEST_NAME_KEY = 'verida_guest_name';

export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY);
    if (!id) {
      id = `guest_${crypto.randomUUID()}`;
      localStorage.setItem(GUEST_ID_KEY, id);
    }
    return id;
  } catch {
    return `guest_${Math.random().toString(36).slice(2)}`;
  }
}

export function getGuestName(): string {
  try {
    return localStorage.getItem(GUEST_NAME_KEY)?.trim() || 'Guest';
  } catch {
    return 'Guest';
  }
}

export function setGuestName(name: string): void {
  try {
    const trimmed = name.trim();
    localStorage.setItem(GUEST_NAME_KEY, trimmed.length > 0 ? trimmed : 'Guest');
  } catch {
    /* storage unavailable — name just won't persist */
  }
}
