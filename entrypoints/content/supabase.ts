import { BACKEND_URL } from "./constants";

const STORAGE_KEY = "fy_operator_session";

export type OperatorSession = {
  id: string;
  email: string;
  subscription_status: "active" | "inactive" | "expired";
  subscription_expires_at: string | null;
  session_token?: string;
};

export async function getOperatorSession(): Promise<OperatorSession | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as OperatorSession) ?? null;
  } catch {
    return null;
  }
}

// Authorization header for authenticated operator API calls (audit H1).
// Returns {} when there's no session token so callers can spread it safely.
export async function getOperatorAuthHeaders(): Promise<Record<string, string>> {
  const session = await getOperatorSession();
  return session?.session_token
    ? { Authorization: `Bearer ${session.session_token}` }
    : {};
}

export async function signInWithToken(
  token: string,
): Promise<{ error: string | null }> {
  try {
    const res = await fetch(`${BACKEND_URL}/operator/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.error ?? "Invalid token" };
    }

    // Store operator session locally (incl. the session token for auth)
    await browser.storage.local.set({
      [STORAGE_KEY]: { ...data.operator, session_token: data.session_token },
    });
    return { error: null };
  } catch {
    return { error: "Network error. Check your connection." };
  }
}

export async function signOut(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
  // Clear transient operator data so it can't bleed into the next operator
  // who signs in on this browser (audit C1). In-progress submissions in
  // storage.local are operator-scoped by tag and intentionally preserved.
  await browser.storage.session.remove([
    "fy_operator_submission",
    "autofillActive",
  ]);
}

// Kept for backwards compat but no longer used for auth
export async function signInWithGoogle(): Promise<void> {
  browser.runtime.sendMessage({
    type: "OPEN_URL",
    url: "https://formyaar.in/operator-dashboard.html",
  });
}
