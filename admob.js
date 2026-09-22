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

  function setBannerHeight(px) {
    document.documentElement.style.setProperty('--banner-h', px + 'px');
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
        margin: 0,
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
