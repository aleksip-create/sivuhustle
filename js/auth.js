/**
 * Jaettu Supabase-auth — yksi client koko sivustolle.
 */
(function () {
    const SUPABASE_URL = 'https://zjpvxacinryojpqwdrti.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_4m9ZxlvCezsxJepNe-4Jxw_g9VDZKPR';

    const AUTH_OPTIONS = {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    };

    let client = null;
    let listenerAttached = false;

    function getClient() {
        if (!window.supabase) return null;
        if (!client) {
            client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_OPTIONS);
        }
        return client;
    }

    async function readSession() {
        const sb = getClient();
        if (!sb) return { sb: null, session: null, user: null };
        const { data: { session }, error } = await sb.auth.getSession();
        if (error) console.warn('[Auth] getSession:', error.message);
        return { sb, session, user: session?.user || null };
    }

    async function isProUser(user, sb) {
        if (!user || !sb) return false;

        const userMeta = user.user_metadata || {};
        const appMeta = user.app_metadata || {};
        if (userMeta.pro || userMeta.is_pro || appMeta.pro || appMeta.is_pro) {
            return true;
        }

        try {
            const { data, error } = await sb
                .from('profiles')
                .select('is_pro, subscription_type')
                .eq('id', user.id)
                .maybeSingle();
            if (error) console.warn('[Auth] profiles:', error.message);
            if (!data) return false;
            const paidPlans = ['pro', 'pro_yearly', 'lifetime'];
            return !!(data.is_pro || paidPlans.includes(data.subscription_type));
        } catch (_) {
            return false;
        }
    }

    async function syncProFromStripe() {
        const { sb, user, session } = await readSession();
        if (!sb || !user || !session?.access_token) return false;

        try {
            const res = await fetch(SUPABASE_URL + '/functions/v1/activate-pro', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + session.access_token,
                    apikey: SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                }
            });
            const result = await res.json();
            if (result.is_pro) {
                await sb.auth.refreshSession();
                return true;
            }
        } catch (e) {
            console.warn('[Auth] Pro sync failed:', e);
        }
        return false;
    }

    async function getAuthState() {
        let { sb, user } = await readSession();
        if (!user) return { user: null, isPro: false, client: sb };

        let isPro = await isProUser(user, sb);
        if (!isPro) {
            await syncProFromStripe();
            ({ user } = await readSession());
            isPro = await isProUser(user, sb);
        }
        return { user, isPro, client: sb };
    }

    function attachAuthListener(onChange) {
        const sb = getClient();
        if (!sb || listenerAttached) return;
        listenerAttached = true;

        sb.auth.onAuthStateChange(async (event, session) => {
            if (event === 'INITIAL_SESSION' && !session) {
                const cached = await readSession();
                if (cached.user) {
                    onChange({ user: cached.user, isPro: await isProUser(cached.user, sb), event });
                    return;
                }
            }
            const user = session?.user || null;
            const isPro = await isProUser(user, sb);
            onChange({ user, isPro, event });
        });
    }

    function showGate() {
        const gate = document.getElementById('pro-gate');
        const content = document.getElementById('pro-content');
        if (gate) gate.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }

    function showContent(email) {
        const gate = document.getElementById('pro-gate');
        const content = document.getElementById('pro-content');
        if (gate) gate.classList.add('hidden');
        if (content) content.classList.remove('hidden');
        const badge = document.getElementById('pro-user-email');
        if (badge && email) badge.textContent = email;
    }

    async function requireProPage() {
        const { user, isPro } = await getAuthState();
        if (isPro) {
            showContent(user?.email);
            return true;
        }
        showGate();
        return false;
    }

    function bootstrapMainSite() {
        const run = async () => {
            if (typeof window.onSivuHustleAuthReady !== 'function') return;
            const state = await getAuthState();
            window.onSivuHustleAuthReady(state);
            attachAuthListener(async (next) => {
                if (next.event === 'SIGNED_OUT' && !next.user) {
                    const cached = await readSession();
                    if (cached.user) {
                        window.onSivuHustleAuthReady({
                            user: cached.user,
                            isPro: await isProUser(cached.user, cached.sb)
                        });
                        return;
                    }
                }
                window.onSivuHustleAuthReady(next);
            });
            const sb = getClient();
            if (sb) {
                sb.auth.refreshSession().then(async () => {
                    const state2 = await getAuthState();
                    window.onSivuHustleAuthReady(state2);
                }).catch(() => {});
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', run);
        } else {
            run();
        }
    }

    window.SivuHustleAuth = {
        getClient,
        readSession,
        getAuthState,
        syncProFromStripe,
        isProUser,
        requireProPage,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (document.body.dataset.authSite === 'true') {
            bootstrapMainSite();
        }
        if (document.body.dataset.requirePro === 'true') {
            requireProPage();
        }
    });
})();