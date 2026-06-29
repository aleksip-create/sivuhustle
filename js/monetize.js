(function () {
  const cfg = window.SIVUHUSTLE || {};
  const home = (window.SIVUHUSTLE_SITE && window.SIVUHUSTLE_SITE.homeIndex) || 'index.html';
  const pricingUrl = home + '#hinnat';
  const stripe = cfg.STRIPE || {};

  const GUIDES = {
    'affiliate-opas.html': { label: 'Affiliate-opas', hook: '47 valmista linkkiä + SEO-strategia' },
    'digituote-opas.html': { label: 'Digituote-opas', hook: 'Valmiit pohjat + myyntitekstit' },
    'blogi-opas.html': { label: 'Blogi & SEO', hook: '42 sivun case + avainsanalista' },
    'verotus-opas.html': { label: 'Verotus-opas', hook: 'YEL-laskuri + kirjanpitörutiini' },
    'youtube-tiktok-opas.html': { label: 'YouTube & TikTok', hook: 'Sisältökalenteri + tulostrategia' },
    'email-markkinointi-opas.html': { label: 'Sähköpostimarkkinointi', hook: 'Sekvenssimallit + konversiot' },
    'saas-opas.html': { label: 'SaaS-opas', hook: 'MVP-checklist + hinnoittelumalli' },
    'kaynnistys-opas.html': { label: '7 päivän suunnitelma', hook: 'Kaikki Pro-oppaat + 24 kk laskuri' }
  };

  function pageKey() {
    const p = location.pathname.split('/').pop();
    return p || 'index.html';
  }

  function track(event, params) {
    if (typeof gtag === 'function') gtag('event', event, params || {});
    if (typeof trackMeta === 'function' && event === 'pro_cta_click') {
      trackMeta('InitiateCheckout', { content_name: (params && params.placement) || 'guide', value: 7.9, currency: 'EUR' });
    }
  }

  function goPricing(placement) {
    track('pro_cta_click', { placement: placement, page: pageKey() });
    location.href = pricingUrl;
  }

  function startCheckout(plan, placement) {
    const url = stripe[plan];
    if (!url) {
      goPricing(placement);
      return;
    }
    track('pro_cta_click', { placement: placement, plan: plan, page: pageKey() });
    if (typeof gtag === 'function') gtag('event', 'begin_checkout', { item_name: plan });
    location.href = url;
  }

  function dismissSticky() {
    const bar = document.getElementById('sh-sticky-pro');
    if (bar) bar.classList.add('translate-y-full');
    try { sessionStorage.setItem('sh_sticky_dismissed', '1'); } catch (_) {}
  }

  function ensureStickyBar(meta) {
    if (document.getElementById('sh-sticky-pro')) return;
    const bar = document.createElement('div');
    bar.id = 'sh-sticky-pro';
    bar.className = 'fixed bottom-0 left-0 right-0 z-50 translate-y-full transition-transform duration-300 pointer-events-none no-print';
    bar.innerHTML = `
      <div class="max-w-3xl mx-auto px-4 pb-4 pointer-events-auto">
        <div class="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-slate-700">
          <div class="text-sm min-w-0">
            <span class="font-semibold text-emerald-400">Pro:</span>
            ${meta.hook} · <span class="text-emerald-300 font-semibold">7,90 €/kk</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" data-sh-checkout="proMonthly" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold">Avaa Pro</button>
            <button type="button" data-sh-dismiss class="w-8 h-8 text-slate-400 hover:text-white text-xl" aria-label="Sulje">&times;</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(bar);
    bar.querySelector('[data-sh-dismiss]').onclick = dismissSticky;
    bar.querySelector('[data-sh-checkout]').onclick = function () {
      startCheckout('proMonthly', 'guide_sticky');
    };
  }

  function showScrollModal(meta) {
    try { if (sessionStorage.getItem('sh_scroll_modal')) return; } catch (_) {}
    try { sessionStorage.setItem('sh_scroll_modal', '1'); } catch (_) {}

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-6 no-print';
    overlay.innerHTML = `
      <div class="bg-white max-w-md w-full rounded-3xl p-8 shadow-xl">
        <button type="button" data-sh-close class="float-right text-2xl text-slate-300 hover:text-slate-500" aria-label="Sulje">&times;</button>
        <p class="text-emerald-600 text-xs font-bold uppercase tracking-widest">Jatka lukemista Pro:lla</p>
        <h3 class="text-2xl font-bold mt-2 tracking-tight">Haluatko täyden ${meta.label}?</h3>
        <p class="text-slate-600 text-sm mt-2">${meta.hook}. Kaikki Pro-oppaat, laskuri ja mallit yhdellä jäsenyydellä.</p>
        <button type="button" data-sh-checkout class="mt-6 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl">Pro 7,90 €/kk</button>
        <button type="button" data-sh-pricing class="mt-2 w-full py-2 text-sm text-slate-500 hover:text-slate-700">Vertaa hintoja</button>
        <button type="button" data-sh-close class="mt-1 w-full text-sm text-slate-400">Jatka ilmaista versiota</button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    overlay.querySelectorAll('[data-sh-close]').forEach(function (btn) {
      btn.onclick = function () { overlay.remove(); };
    });
    overlay.querySelector('[data-sh-pricing]').onclick = function () {
      overlay.remove();
      goPricing('guide_scroll_modal');
    };
    overlay.querySelector('[data-sh-checkout]').onclick = function () {
      overlay.remove();
      startCheckout('proMonthly', 'guide_scroll_modal');
    };
    track('pro_modal_view', { placement: 'guide_scroll', page: pageKey() });
  }

  function onScroll(meta, opts) {
    const y = window.scrollY;
    const bar = document.getElementById('sh-sticky-pro');
    let dismissed = false;
    try { dismissed = !!sessionStorage.getItem('sh_sticky_dismissed'); } catch (_) {}

    if (bar && !dismissed && y > (opts.stickyAt || 320)) {
      bar.classList.remove('translate-y-full');
    }

    const docH = document.documentElement.scrollHeight - window.innerHeight;
    if (docH > 0 && opts.showScrollModal !== false) {
      const pct = y / docH;
      if (pct >= (opts.modalAt || 0.55)) {
        showScrollModal(meta);
        window.removeEventListener('scroll', scrollHandler);
      }
    }
  }

  let scrollHandler = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function isAlreadyPro() {
    try {
      if (!window.supabase) {
        await loadScript('https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js');
      }
      if (!window.SivuHustleAuth) {
        await loadScript('js/auth.js');
        await new Promise(function (r) { setTimeout(r, 80); });
      }
      if (window.SivuHustleAuth) {
        var state = await window.SivuHustleAuth.getAuthState();
        return !!state.isPro;
      }
    } catch (_) {}
    return false;
  }

  function init(options) {
    const key = pageKey();
    const meta = GUIDES[key];
    if (!meta) return;

    const opts = Object.assign({ stickyAt: 320, modalAt: 0.55, showScrollModal: true }, options || {});
    ensureStickyBar(meta);
    scrollHandler = function () { onScroll(meta, opts); };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    onScroll(meta, opts);
  }

  async function bootstrap() {
    if (await isAlreadyPro()) return;
    init();
  }

  window.SivuHustleMonetize = {
    init: init,
    goPricing: goPricing,
    startCheckout: startCheckout
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();