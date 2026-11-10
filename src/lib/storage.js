const KEY = "startup-projections/v2";

export function loadStoredInputs() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeInputs(inputs) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(inputs));
  } catch {
    /* storage disabled or full — the model still works, it just won't persist */
  }
}

export function clearStoredInputs() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/** Everything the model needs fits in the URL hash, so a plan can be shared as a link. */
export function encodeShare(inputs) {
  return toBase64Url(JSON.stringify(inputs));
}

export function decodeShare(encoded) {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function readShareFromLocation() {
  try {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash.startsWith("s=")) return null;
    return decodeShare(hash.slice(2));
  } catch {
    return null;
  }
}

export function writeShareToLocation(inputs) {
  try {
    const url = `${window.location.origin}${window.location.pathname}#s=${encodeShare(inputs)}`;
    window.history.replaceState(null, "", url);
    return url;
  } catch {
    return null;
  }
}

export function shareUrlFor(inputs) {
  try {
    return `${window.location.origin}${window.location.pathname}#s=${encodeShare(inputs)}`;
  } catch {
    return "";
  }
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
