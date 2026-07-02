(function () {
  const cfg = window.SIVUHUSTLE || {};

  function getProgram(tool) {
    const programs = cfg.AFFILIATE || {};
    if (programs[tool]) return programs[tool];
    const legacy = (cfg.AFFILIATE_LINKS || {})[tool];
    if (legacy) return { url: legacy };
    return null;
  }

  function getAffiliateUrl(tool) {
    const prog = getProgram(tool);
    if (!prog) return null;
    if (prog.url && prog.url.trim()) return prog.url.trim();
    const partnerId = (prog.id && prog.id.trim()) || '';
    if (partnerId && typeof prog.build === 'function') return prog.build(partnerId);
    return prog.fallback || null;
  }

  function trackAffiliateClick(event, tool) {
    if (event) event.preventDefault();
    const url = getAffiliateUrl(tool);
    if (!url) {
      console.warn('[Affiliate] No URL for', tool);
      return;
    }
    if (typeof gtag === 'function') gtag('event', 'affiliate_click', { tool: tool });
    if (typeof trackMeta === 'function') trackMeta('ViewContent', { content_name: tool });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function hydrateAffiliateLinks() {
    document.querySelectorAll('[data-affiliate]').forEach(function (el) {
      const tool = el.getAttribute('data-affiliate');
      const url = getAffiliateUrl(tool);
      if (url) {
        el.setAttribute('href', url);
        el.removeAttribute('aria-disabled');
      } else {
        el.setAttribute('href', '#');
        el.setAttribute('aria-disabled', 'true');
      }
      if (!el.dataset.affiliateBound) {
        el.addEventListener('click', function (e) { trackAffiliateClick(e, tool); });
        el.dataset.affiliateBound = '1';
      }
    });
  }

  window.SivuHustleAffiliate = {
    getAffiliateUrl: getAffiliateUrl,
    trackAffiliateClick: trackAffiliateClick,
    hydrate: hydrateAffiliateLinks
  };

  window.trackAffiliateClick = trackAffiliateClick;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateAffiliateLinks);
  } else {
    hydrateAffiliateLinks();
  }
})();