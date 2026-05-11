import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://wkubrgktujihesjjxyrk.supabase.co",
  "sb_publishable_Om3cok-sF2MttenPzjmzGA_M1RMp6yc",
);

export type OperatorSession = {
  id: string;
  email: string;
  subscription_status: "active" | "inactive" | "expired";
  subscription_expires_at: string | null;
};

export async function getOperatorSession(): Promise<OperatorSession | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: operator } = await supabase
      .from("operators")
      .select("id, email, subscription_status, subscription_expires_at")
      .eq("id", session.user.id)
      .single();

    return operator ?? null;
  } catch {
    return null;
  }
}
export async function signInWithToken(
  token: string,
): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: token, // Supabase accepts access_token here for manual session set
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "Invalid token" };

    // Upsert operator record
    await supabase
      .from("operators")
      .upsert(
        { id: data.session.user.id, email: data.session.user.email },
        { onConflict: "id" },
      );
    return { error: null };
  } catch {
    return { error: "Failed to set session" };
  }
}

// Keep this for backwards compat but it now just opens the website
export async function signInWithGoogle(): Promise<void> {
  browser.runtime.sendMessage({
    type: "OPEN_URL",
    url: "https://formyaar.pages.dev/operator-login.html",
  });
}
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
