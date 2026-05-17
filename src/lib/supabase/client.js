import { createClient } from "@supabase/supabase-js";
import { peekAdminOAuthIntent } from "../oauth-intent.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// When the main app receives an OAuth callback that is actually intended for the
// admin origin (indicated by the admin intent cookie), we must NOT let the
// Supabase client consume the PKCE auth code.  The AuthCallbackPage component
// will redirect to the admin origin with the code intact so the admin Supabase
// client can exchange it instead.
const hasPendingAdminIntent =
  import.meta.env.VITE_APP_MODE !== "admin" && Boolean(peekAdminOAuthIntent());

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: !hasPendingAdminIntent,
        persistSession: true,
      },
    })
  : null;
