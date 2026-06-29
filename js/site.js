// Pakota aina www — kirjautuminen säilyy (localStorage on domain-kohtainen)
(function () {
    if (location.hostname === 'sivuhustle.fi') {
        location.replace('https://www.sivuhustle.fi' + location.pathname + location.search + location.hash);
    }
})();

window.SIVUHUSTLE_SITE = {
    origin: 'https://www.sivuhustle.fi',
    home: 'https://www.sivuhustle.fi/',
    homeIndex: 'https://www.sivuhustle.fi/index.html'
};