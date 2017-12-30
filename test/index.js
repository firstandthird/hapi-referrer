// Referrer data from:
// https://github.com/segmentio/inbound/blob/master/test/cases/referrers.json

const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const wreck = require('wreck');
const hapiReferrer = require('../index.js');

let server;

lab.beforeEach(() => {
  server = new Hapi.Server();

  server.connection({
    host: 'localhost',
    port: 8000,
    routes: {
      state: {
        failAction: 'ignore'
      },
      log: false
    }
  });
});

lab.afterEach(() => server.stop());

lab.test('direct visits', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/');
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('direct with invalid cookies', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: 'ref=;;'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('direct with null cookie', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: null
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  code.expect(cookie[0]).to.include('search-google');
});

lab.test('empty referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: ''
    }
  });

  // Treated as direct visit
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('bad referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: '111111111'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('dont re-set cookie if set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: `ref=search-google||${Date.now()}||https%3A%2F%2Fwww.google.co.uk%2Furl%3Fsa%3Dt%26rct%3Dj%26q%3D%26esrc%3Ds%26source%3Dweb%26cd%3D2%26ved%3D0CEgQFjAB%26url%3Dhttps%253A%252F%252Fwww.datanitro.com%252F%26ei%3D02ImUK--C6KX1AWbpIDICg%26usg%3DAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ%26sig2%3DtzL6mJCTxRdYnOxnc3Dl5A`,
      referrer: 'http://www.facebook.com/l.php?u=http%3A%2F%2Fwww.bbc.co.uk%2Fnews%2Fworld-middle-east-17491344&h=9AQETn-0sAQG_wX_M3znTwpLi4cHiMvnYLNfKXx1Cfax0Gg&enc=AZOI2gtApY3kKYhAITt1FyIks0OWBBk9QOSyxlrEDx2bybjgeAQtR8UkVCYM0LAsX7Pjo0Clr-yC3FosYCyOczGR_ti6KbCzrxywXNYCrzLfHg'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('dont set cookie if domain blacklisted', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer,
    options: {
      domains: ['www.facebook.com']
    }
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'http://www.facebook.com/l.php?u=http%3A%2F%2Fwww.bbc.co.uk%2Fnews%2Fworld-middle-east-17491344&h=9AQETn-0sAQG_wX_M3znTwpLi4cHiMvnYLNfKXx1Cfax0Gg&enc=AZOI2gtApY3kKYhAITt1FyIks0OWBBk9QOSyxlrEDx2bybjgeAQtR8UkVCYM0LAsX7Pjo0Clr-yC3FosYCyOczGR_ti6KbCzrxywXNYCrzLfHg'
    }
  });
  let cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);

  const result = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });
  cookie = result.res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('decorate request with getOriginalReferrer', async () => {
  let ref;

  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      ref = request.getOriginalReferrer();
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  const dt = Date.now();

  await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: `ref=search-google||${dt}||https%3A%2F%2Fwww.google.co.uk%2Furl%3Fsa%3Dt%26rct%3Dj%26q%3D%26esrc%3Ds%26source%3Dweb%26cd%3D2%26ved%3D0CEgQFjAB%26url%3Dhttps%253A%252F%252Fwww.datanitro.com%252F%26ei%3D02ImUK--C6KX1AWbpIDICg%26usg%3DAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ%26sig2%3DtzL6mJCTxRdYnOxnc3Dl5A`
    }
  });

  code.expect(ref).to.be.an.object();
  code.expect(ref).to.equal({
    referer: 'search-google',
    timestamp: dt.toString(),
    uri: 'https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&ved=0CEgQFjAB&url=https%3A%2F%2Fwww.datanitro.com%2F&ei=02ImUK--C6KX1AWbpIDICg&usg=AFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ&sig2=tzL6mJCTxRdYnOxnc3Dl5A'
  });
});

lab.test('decorate request with getOriginalReferrer - no ref', async () => {
  let ref;

  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      ref = request.getOriginalReferrer();
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer
  });

  await server.start();

  await wreck.get('http://localhost:8000/');

  code.expect(ref).to.be.an.object();
  code.expect(ref).to.equal({});
});

lab.test('verbose mode logs when cookie set', async () => {
  let log;

  server.route({
    method: 'GET',
    path: '/',
    handler(request, reply) {
      reply('ok');
    }
  });

  await server.register({
    register: hapiReferrer,
    options: {
      verbose: true
    }
  });

  await server.start();

  server.on('log', l => {
    log = l;
  });

  await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });

  code.expect(log.tags).to.equal(['hapi-referer', 'set-cookie', 'info']);
});
