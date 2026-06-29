(function () {
  const KEY = 'sh_attribution';
  const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];

  function fromUrl() {
    const out = {};
    const sp = new URLSearchParams(location.search);
    PARAMS.forEach(function (p) {
      const v = sp.get(p);
      if (v) out[p] = v;
    });
    return out;
  }

  function readStored() {
    try {
      const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function save(data) {
    if (!data || !Object.keys(data).length) return;
    try {
      const json = JSON.stringify(data);
      sessionStorage.setItem(KEY, json);
      localStorage.setItem(KEY, json);
    } catch (_) {}
  }

  function capture() {
    const incoming = fromUrl();
    if (Object.keys(incoming).length) {
      save(Object.assign(readStored(), incoming, { landing_page: location.pathname, captured_at: new Date().toISOString() }));
    } else if (!readStored().landing_page) {
      save({ landing_page: location.pathname, captured_at: new Date().toISOString() });
    }
  }

  function get() {
    const data = readStored();
    return {
      utm_source: data.utm_source || null,
      utm_medium: data.utm_medium || null,
      utm_campaign: data.utm_campaign || null,
      utm_content: data.utm_content || null,
      utm_term: data.utm_term || null,
      fbclid: data.fbclid || null,
      landing_page: data.landing_page || null
    };
  }

  capture();

  window.SivuHustleAttribution = { get: get, capture: capture };
})();