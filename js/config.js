window.SIVUHUSTLE = {
  SUPABASE_URL: 'https://zjpvxacinryojpqwdrti.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_4m9ZxlvCezsxJepNe-4Jxw_g9VDZKPR',
  META_AD_ACCOUNT_ID: '1020488400221115',
  META_PIXEL_ID: '1552195963174216',
  STRIPE: {
    proMonthly: 'https://buy.stripe.com/6oUdRa72J6vSgiCc3va3u00',
    proYearly: 'https://buy.stripe.com/14A28s1Ip7zW1nIaZra3u02',
    lifetime: 'https://buy.stripe.com/bJe5kEcn3g6sfey9Vna3u01'
  },
  // Affiliate: täytä "url" kun ohjelma hyväksyy (koko linkki dashboardista).
  // signup = mistä haet kumppanuuden. fallback = tavallinen linkki ennen hyväksyntää.
  AFFILIATE: {
    hostinger: {
      signup: 'https://www.hostinger.com/affiliates',
      commission: '~60 % hosting-myynnistä',
      fallback: 'https://www.hostinger.fi/',
      url: ''
    },
    canva: {
      signup: 'https://www.canva.com/affiliates/',
      commission: '~36 USD / Pro-tilaus',
      fallback: 'https://www.canva.com/pro/',
      url: ''
    },
    mailerlite: {
      signup: 'https://www.mailerlite.com/affiliate-program',
      commission: '30 % toistuvasta',
      fallback: 'https://www.mailerlite.com/',
      url: ''
    },
    gumroad: {
      signup: 'https://gumroad.com/settings/advanced',
      commission: '10 % digimyynnistä',
      fallback: 'https://gumroad.com/',
      url: 'https://gumroad.com/?ref=sivuhustle'
    },
    verkkokauppa: {
      signup: 'https://www.verkkokauppa.com/affiliate',
      commission: '5–15 %',
      fallback: 'https://www.verkkokauppa.com/',
      url: ''
    },
    booking: {
      signup: 'https://admin.booking.com/affiliate/',
      commission: '4–12 % majoituksesta',
      fallback: 'https://www.booking.com/',
      url: ''
    }
  },
  // Vanha muoto — affiliate.js käyttää AFFILIATE-objektia ensisijaisesti
  AFFILIATE_LINKS: {
    gumroad: 'https://gumroad.com/?ref=sivuhustle',
    verkkokauppa: 'https://www.verkkokauppa.com/',
    booking: 'https://www.booking.com/',
    canva: 'https://www.canva.com/pro/',
    hostinger: 'https://www.hostinger.fi/',
    mailerlite: 'https://www.mailerlite.com/'
  }
};