// AdMob glue (banner + interstitial + rewarded), wired against
// @capacitor-community/admob. Every call below is guarded by AdMobPlugin's
// presence, matching the window.Capacitor && window.Capacitor.Plugins check
// index.html already uses for SplashScreen — so in plain-browser dev
// (`python -m http.server`, no Capacitor runtime) banner calls silently
// no-op and interstitial/rewarded calls invoke their callback immediately,
// keeping the app's flow identical to today with no ad plugin installed.
window.PnbAdMob = (function () {
  const AdMobPlugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;

  function platform() {
    return window.Capacitor && window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'web';
  }

  function adUnitFor(format) {
    const cfg = window.PNB_CONFIG || {};
    const units = cfg.ADMOB_AD_UNITS && cfg.ADMOB_AD_UNITS[format];
    return units && units[platform()];
  }

  // The adaptive banner's real height only arrives async, via
  // bannerAdSizeChanged, once the ad has actually loaded — reserving 0px
  // until then makes the palette/canvas/menu content visibly jump upward the
  // moment the ad appears. This app only ships on iPad (see CLAUDE.md), where
  // an anchored adaptive banner at full width consistently comes back at
  // 728x90 in testing, so reserve that height up front, synchronously, the
  // instant a banner is requested — before the ad has even loaded — so the
  // layout is already settled by the time it appears. bannerAdSizeChanged
  // still corrects this afterwards if the real value ever differs.
  const ESTIMATED_BANNER_H = 90;

  // The native plugin's `margin` for BOTTOM_CENTER pins the banner's bottom
  // edge to (safeAreaLayoutGuide.bottom - margin) — see BannerExecutor.swift.
  // With margin 0 that's flush with the safe area, i.e. just above the home
  // indicator, leaving a bare strip of webview background below the ad. A
  // negative margin pushes the banner's bottom edge past the safe area, down
  // to the physical screen edge. The exact push needed is the safe-area
  // inset itself (0 on Home-button iPads — where the ad is already flush —
  // up to ~20-34pt on Face ID iPads), read from the live CSS env() value
  // rather than hardcoded, so this can't overshoot and clip the ad off
  // devices where there's no inset to begin with.
  function getSafeAreaInsetBottom() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;left:0;width:0;border:0;margin:0;visibility:hidden;padding-bottom:env(safe-area-inset-bottom, 0px);';
    document.body.appendChild(probe);
    const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    probe.remove();
    return inset;
  }

  // index.html's content-reserving formulas (.canvas/.zoomControls/
  // .menuOverlay/.archiveOverlay padding) all add `--banner-h` AND their own
  // separate env(safe-area-inset-bottom) on top of it, because with the old
  // margin:0 banner those were two distinct strips (ad, then blank safe
  // area below it). Now that the banner is pushed down to physically fill
  // the safe-area strip too, that inset is no longer blank — it's the
  // bottom slice of the ad. Reserving the ad's full on-screen height *plus*
  // that same inset again would double-count it and open a gap above the ad
  // instead of below it. Subtracting the inset here keeps --banner-h equal
  // to just the portion of the ad that sits above the safe area, so
  // `--banner-h + env(safe-area-inset-bottom)` in those formulas still adds
  // up to the ad's true total height, gapless either side.
  function setBannerHeight(px) {
    const reserved = Math.max(0, px - getSafeAreaInsetBottom());
    document.documentElement.style.setProperty('--banner-h', reserved + 'px');
  }

  async function init() {
    if (!AdMobPlugin) return;
    try {
      if (platform() === 'ios') await AdMobPlugin.requestTrackingAuthorization();
    } catch (_e) {
      // ATT prompt declined/unavailable — ads still show, just non-personalized.
    }
    try {
      await AdMobPlugin.initialize({ initializeForTesting: !!(window.PNB_CONFIG && window.PNB_CONFIG.ADMOB_TEST_MODE) });
      AdMobPlugin.addListener('bannerAdSizeChanged', (info) => {
        if (info && typeof info.height === 'number') setBannerHeight(info.height);
      });
      AdMobPlugin.addListener('bannerAdFailedToLoad', () => {
        // No fill — don't leave an empty gutter reserved for an ad that isn't there.
        setBannerHeight(0);
      });
    } catch (_e) {
      // Ad SDK failed to initialize — leave --banner-h at its 0px default.
    }
  }

  async function showBanner() {
    if (!AdMobPlugin) return;
    const adId = adUnitFor('banner');
    if (!adId) return;
    setBannerHeight(ESTIMATED_BANNER_H); // reserve space before the ad loads, avoiding a layout jump
    try {
      await AdMobPlugin.showBanner({
        adId,
        adSize: 'ADAPTIVE_BANNER',
        position: 'BOTTOM_CENTER',
        margin: -getSafeAreaInsetBottom(),
        isTesting: !!(window.PNB_CONFIG && window.PNB_CONFIG.ADMOB_TEST_MODE),
      });
    } catch (_e) {
      // No fill / network error — don't hold onto reserved space for nothing.
      setBannerHeight(0);
    }
  }

  // Occasionally an ad (esp. a video creative) gets stuck on screen without
  // ever firing a dismiss/fail event — seen in testing with a frozen black
  // screen and no visible close control. Without a fallback the app would
  // wait forever, so give every full-screen ad a hard ceiling after which we
  // proceed regardless; if the ad is genuinely still stuck, revealing content
  // underneath at least means the app recovers correctly whenever it's
  // eventually dismissed (backgrounding, force-quit, or it unsticks itself).
  const WATCHDOG_MS = 45000;

  async function showInterstitial(onDone) {
    const done = () => { try { onDone(); } catch (_e) { /* caller's problem, not ours */ } };
    const adId = AdMobPlugin && adUnitFor('interstitial');
    if (!AdMobPlugin || !adId) { done(); return; }
    let settled = false;
    let watchdog;
    let dismissHandle, failHandle;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (dismissHandle) dismissHandle.remove();
      if (failHandle) failHandle.remove();
      done();
    };
    try {
      dismissHandle = await AdMobPlugin.addListener('interstitialAdDismissed', finish);
      failHandle = await AdMobPlugin.addListener('interstitialAdFailedToShow', finish);
      watchdog = setTimeout(finish, WATCHDOG_MS);
      await AdMobPlugin.prepareInterstitial({ adId, isTesting: !!(window.PNB_CONFIG && window.PNB_CONFIG.ADMOB_TEST_MODE) });
      await AdMobPlugin.showInterstitial();
    } catch (_e) {
      finish(); // never block the completion reveal on an ad failure
    }
  }

  async function showRewardedForHints(onEarned, onNoReward) {
    const noReward = () => { try { onNoReward(); } catch (_e) { /* caller's problem, not ours */ } };
    const earned = () => { try { onEarned(); } catch (_e) { /* caller's problem, not ours */ } };
    const adId = AdMobPlugin && adUnitFor('rewarded');
    if (!AdMobPlugin || !adId) { noReward(); return; }
    let settled = false;
    let watchdog;
    let rewarded = false;
    let rewardHandle, dismissHandle, failHandle;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (rewardHandle) rewardHandle.remove();
      if (dismissHandle) dismissHandle.remove();
      if (failHandle) failHandle.remove();
      // A stuck ad that never confirms a reward should not grant one.
      if (rewarded) earned(); else noReward();
    };
    try {
      rewardHandle = await AdMobPlugin.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
      dismissHandle = await AdMobPlugin.addListener('onRewardedVideoAdDismissed', finish);
      failHandle = await AdMobPlugin.addListener('onRewardedVideoAdFailedToShow', finish);
      watchdog = setTimeout(finish, WATCHDOG_MS);
      await AdMobPlugin.prepareRewardVideoAd({ adId, isTesting: !!(window.PNB_CONFIG && window.PNB_CONFIG.ADMOB_TEST_MODE) });
      await AdMobPlugin.showRewardVideoAd();
    } catch (_e) {
      finish();
    }
  }

  return { init, showBanner, showInterstitial, showRewardedForHints };
})();
