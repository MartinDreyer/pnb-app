// Supabase connection for local dev, matching pnb-database's supabase/config.toml.
// The anon key is a public key by design (Supabase's RLS is what actually protects data),
// safe to ship in client JS — swap SUPABASE_URL/SUPABASE_ANON_KEY per environment when
// deploying against a hosted Supabase project instead of the local stack.
//
// SUPABASE_URL uses the dev machine's LAN IP (not 127.0.0.1) so phones/tablets on the
// same Wi-Fi can reach it too — still works from the dev machine itself either way.
// This IP changes if the machine switches networks; update it if the app stops loading.
// LANG selects which i18n/<lang>.json file the UI loads (defaults to 'da' if
// unset). Add a new language by dropping in i18n/<lang>.json with the same
// keys as i18n/da.json, then set LANG here (or leave unset for Danish).
window.PNB_CONFIG = {
  SUPABASE_URL: 'http://192.168.87.86:54331',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  // LANG: 'en',
};
