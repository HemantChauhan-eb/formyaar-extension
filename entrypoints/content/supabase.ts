const BACKEND_URL = "https://formyaar-backend-production.up.railway.app";
const STORAGE_KEY = "fy_operator_session";

export type OperatorSession = {
  id: string;
  email: string;
  subscription_status: "active" | "inactive" | "expired";
  subscription_expires_at: string | null;
};

export async function getOperatorSession(): Promise<OperatorSession | null> {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as OperatorSession) ?? null;
  } catch {
    return null;
  }
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

    // Store operator session locally
    await browser.storage.local.set({ [STORAGE_KEY]: data.operator });
    return { error: null };
  } catch {
    return { error: "Network error. Check your connection." };
  }
}

export async function signOut(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

// Kept for backwards compat but no longer used for auth
export async function signInWithGoogle(): Promise<void> {
  browser.runtime.sendMessage({
    type: "OPEN_URL",
    url: "https://formyaar.pages.dev/operator-dashboard.html",
  });
}
