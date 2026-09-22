// Supabase connection for local dev, matching pnb-database's supabase/config.toml.
// The anon key is a public key by design (Supabase's RLS is what actually protects data),
// safe to ship in client JS — swap SUPABASE_URL/SUPABASE_ANON_KEY per environment when
// deploying against a hosted Supabase project instead of the local stack.
//
// SUPABASE_URL uses the dev machine's Bonjour/mDNS hostname (`<name>.local`, from
// System Settings > General > Sharing > Local hostname, or `scutil --get LocalHostName`)
// instead of its LAN IP, so phones/tablets on the same Wi-Fi can still reach it after the
// machine's IP changes (a plain IP goes stale on every network switch — that's what was
// breaking the iPad build). Still works from the dev machine itself either way. This is a
// dev-only convenience: once there's a real deployed Supabase project, point this at its
// permanent URL instead.
// LANG selects which i18n/<lang>.json file the UI loads (defaults to 'da' if
// unset). Add a new language by dropping in i18n/<lang>.json with the same
// keys as i18n/da.json, then set LANG here (or leave unset for Danish).
//
// ENV controls how startup failures are surfaced: 'development' (default)
// shows the raw technical debug banner + detailed error text, which is what
// you want while working on this app or diagnosing a broken local Supabase
// stack. Set ENV: 'production' for real deployments so a failure instead
// shows a short, translated "something went wrong" popup with an error code,
// with no technical detail or URLs exposed to end users.
//
// AdMob: ad unit IDs and app IDs for the banner/interstitial/rewarded ads
// (see admob.js). ADMOB_TEST_MODE true uses Google's public test ad unit IDs
// below (always safe to ship/commit — they never earn revenue and always
// fill), so the ad flows are fully exercised in dev/TestFlight without a live
// AdMob account. Flip to false and replace ADMOB_APP_ID/ADMOB_AD_UNITS with
// real ones from the AdMob console once the app is ready for release — ad
// unit IDs aren't secrets (only useful paired with app ownership), safe to
// commit like SUPABASE_ANON_KEY. Note ADMOB_APP_ID here is used at JS-init
// time only; the native SDK also reads its own compiled-in copy from
// ios/App/App/Info.plist / android/app/src/main/AndroidManifest.xml, which
// needs a native rebuild (not just this file) to change.
window.PNB_CONFIG = {
  SUPABASE_URL: 'http://MacBook-Pro.local:54331',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  // LANG: 'en',
  ENV: 'development',
  // ENV: 'production',
  ADMOB_TEST_MODE: true,
  ADMOB_APP_ID: {
    ios: 'ca-app-pub-3940256099942544~1458002511',
    android: 'ca-app-pub-3940256099942544~3347511713',
  },
  ADMOB_AD_UNITS: {
    banner: { ios: 'ca-app-pub-3940256099942544/2934735716', android: 'ca-app-pub-3940256099942544/6300978111' },
    interstitial: { ios: 'ca-app-pub-3940256099942544/4411468910', android: 'ca-app-pub-3940256099942544/1033173712' },
    rewarded: { ios: 'ca-app-pub-3940256099942544/1712485313', android: 'ca-app-pub-3940256099942544/5224354917' },
  },
  // Real IDs (swap in before release — ADMOB_APP_ID also requires a native rebuild):
  // ADMOB_TEST_MODE: false,
  // ADMOB_APP_ID: { ios: 'ca-app-pub-XXXX~YYYY', android: 'ca-app-pub-XXXX~ZZZZ' },
  // ADMOB_AD_UNITS: { banner: {...}, interstitial: {...}, rewarded: {...} },
  ADMOB_HINT_REWARD_COUNT: 3, // bonus hints granted per rewarded-ad view
};
