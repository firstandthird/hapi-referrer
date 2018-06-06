// Referrer data from:
// https://github.com/segmentio/inbound/blob/master/test/cases/referrers.json

const Hapi = require('hapi');
const code = require('code');
const lab = exports.lab = require('lab').script();
const wreck = require('wreck');
const hapiReferrer = require('../index.js');
const Path = require('path');

let server;

lab.beforeEach(async () => {
  server = new Hapi.Server({
    port: 8000,
    routes: {
      state: {
        failAction: 'ignore'
      },
      files: {
        relativeTo: Path.join(__dirname, 'public')
      }
    }
  });

  await server.register(require('inert'));
  await server.register(require('vision'));

  server.views({
    engines: {
      html: require('handlebars')
    },
    relativeTo: __dirname,
    path: 'public'
  });

  server.route({
    method: 'GET',
    path: '/{param*}',
    handler: {
      directory: {
        path: '.',
        redirectToSlash: true,
        index: true
      }
    }
  });
});

lab.afterEach(() => server.stop());

lab.test('direct visits', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/');
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('direct with invalid cookies', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: 'ref64=;;'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
});

lab.test('direct with null cookie', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: null
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  const term = `ref64=${Buffer.from('direct').toString('base64')}`;
  code.expect(cookie[0]).to.include(term.substring(0, term.length - 2));
});

lab.test('ignores favicons', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/favicon.ico');

  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('ignores blacklisted paths', async () => {
  server.route({
    method: 'GET',
    path: '/public/images/image.jpg',
    handler(request, h) {
      return 'file';
    }
  });

  await server.register({
    plugin: hapiReferrer,
    options: {
      ignoredPaths: [
        '/public'
      ]
    }
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/public/images/image.jpg');

  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('skips non get requests', async () => {
  server.route({
    method: 'POST',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.post('http://localhost:8000');

  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  const term = Buffer.from('search%20-%20Google').toString('base64');
  code.expect(cookie[0]).to.include(term.substring(0, term.length - 3));
});

lab.test('empty referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: ''
    }
  });

  // Treated as direct visit
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  const term = `ref64=${Buffer.from('direct').toString('base64')}`;
  code.expect(cookie[0]).to.include(term.substring(0, term.length - 2));
});

lab.test('bad referrer set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: '111111111'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  const term = `ref64=${Buffer.from('link').toString('base64')}`;
  code.expect(cookie[0]).to.include(term.substring(0, term.length - 3));
});

lab.test('unknown referrer', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'http://swine.chat/'
    }
  });
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(1);
  const term = `ref64=${Buffer.from('link').toString('base64')}`;
  code.expect(cookie[0]).to.include(term.substring(0, term.length - 3));
});

lab.test('internal ref', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      referrer: 'http://localhost:8000/'
    }
  });
  // internal refs shouldn't trigger cookie
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('x-forwarded-proto', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      'x-forwarded-proto': 'https',
      referrer: 'https://localhost:8000/'
    }
  });
  // internal refs shouldn't trigger cookie
  const cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);
});

lab.test('dont re-set cookie if set', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: `ref64=${Buffer.from(`search%20-%20Google||${Date.now()}||https%3A%2F%2Fwww.google.co.uk%2Furl%3Fsa%3Dt%26rct%3Dj%26q%3D%26esrc%3Ds%26source%3Dweb%26cd%3D2%26ved%3D0CEgQFjAB%26url%3Dhttps%253A%252F%252Fwww.datanitro.com%252F%26ei%3D02ImUK--C6KX1AWbpIDICg%26usg%3DAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ%26sig2%3DtzL6mJCTxRdYnOxnc3Dl5A`).toString('base64')}`,
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
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register({
    plugin: hapiReferrer,
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

lab.test('dont set cookie if doesnt match accept', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register({
    plugin: hapiReferrer,
    options: {
      accept: 'text/html'
    }
  });

  await server.start();

  const { res } = await wreck.get('http://localhost:8000/', {
    headers: {
    }
  });
  let cookie = res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);

  const result2 = await wreck.get('http://localhost:8000/', {
    headers: {
      accept: 'text/json'
    }
  });
  cookie = result2.res.headers['set-cookie'] || [];
  code.expect(cookie.length).to.equal(0);

  const result = await wreck.get('http://localhost:8000/', {
    headers: {
      accept: 'text/html */*'
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
    handler(request, h) {
      ref = request.getOriginalReferrer();
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

  await server.start();

  const dt = Date.now();
  await wreck.get('http://localhost:8000/', {
    headers: {
      cookie: `ref64=${Buffer.from(`search%20-%20Google||${dt}||https%3A%2F%2Fwww.google.co.uk%2Furl%3Fsa%3Dt%26rct%3Dj%26q%3D%26esrc%3Ds%26source%3Dweb%26cd%3D2%26ved%3D0CEgQFjAB%26url%3Dhttps%253A%252F%252Fwww.datanitro.com%252F%26ei%3D02ImUK--C6KX1AWbpIDICg%26usg%3DAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ%26sig2%3DtzL6mJCTxRdYnOxnc3Dl5A||${encodeURIComponent('http://localhost:8000/')}`).toString('base64')}`
    }
  });

  code.expect(ref).to.be.an.object();
  code.expect(ref).to.equal({
    medium: 'search - Google',
    timestamp: dt.toString(),
    uri: 'http://localhost:8000/',
    referrer: 'https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&ved=0CEgQFjAB&url=https%3A%2F%2Fwww.datanitro.com%2F&ei=02ImUK--C6KX1AWbpIDICg&usg=AFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ&sig2=tzL6mJCTxRdYnOxnc3Dl5A'
  });
});

lab.test('decorate request with getOriginalReferrer - no ref', async () => {
  let ref;

  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      ref = request.getOriginalReferrer();
      return h.view('index');
    }
  });

  await server.register(hapiReferrer);

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
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register({
    plugin: hapiReferrer,
    options: {
      verbose: true
    }
  });

  await server.start();

  server.events.on('log', l => {
    log = l;
  });

  await wreck.get('http://localhost:8000/', {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });

  code.expect(log.tags).to.equal(['hapi-referrer', 'set-cookie', 'info']);

  code.expect(log.data).to.equal({
    refInfo: {
      referrer: 'https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&ved=0CEgQFjAB&url=https%3A%2F%2Fwww.datanitro.com%2F&ei=02ImUK--C6KX1AWbpIDICg&usg=AFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ&sig2=tzL6mJCTxRdYnOxnc3Dl5A',
      uri: 'http://localhost:8000/',
      medium: 'search - Google'
    },
    ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
    browser: 'Chrome 51.0.2704'
  });
});

lab.test('emits referrer event', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register({
    plugin: hapiReferrer,
    options: {
      verbose: true
    }
  });

  await server.start();

  let evt = null;
  server.events.on('referrer', data => {
    evt = data;
  });

  await wreck.get('http://localhost:8000/', {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A'
    }
  });

  code.expect(evt.request).to.exist();
  code.expect(evt.refInfo).to.equal({
    referrer: 'https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&ved=0CEgQFjAB&url=https%3A%2F%2Fwww.datanitro.com%2F&ei=02ImUK--C6KX1AWbpIDICg&usg=AFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ&sig2=tzL6mJCTxRdYnOxnc3Dl5A',
    uri: 'http://localhost:8000/',
    medium: 'search - Google'
  });
});

lab.test('emits referrer event if already has ref', async () => {
  server.route({
    method: 'GET',
    path: '/',
    handler(request, h) {
      return h.view('index');
    }
  });

  await server.register({
    plugin: hapiReferrer,
    options: {
      verbose: true
    }
  });

  await server.start();

  let evt = null;
  server.events.on('referrer', data => {
    evt = data;
  });

  const ts = Date.now();
  await wreck.get('http://localhost:8000/', {
    headers: {
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36',
      referrer: 'https://www.google.co.uk/url?sa\u003dt\u0026rct\u003dj\u0026q\u003d\u0026esrc\u003ds\u0026source\u003dweb\u0026cd\u003d2\u0026ved\u003d0CEgQFjAB\u0026url\u003dhttps%3A%2F%2Fwww.datanitro.com%2F\u0026ei\u003d02ImUK--C6KX1AWbpIDICg\u0026usg\u003dAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ\u0026sig2\u003dtzL6mJCTxRdYnOxnc3Dl5A',
      cookie: `ref64=${Buffer.from(`search%20-%20Google||${ts}||https%3A%2F%2Fwww.google.co.uk%2Furl%3Fsa%3Dt%26rct%3Dj%26q%3D%26esrc%3Ds%26source%3Dweb%26cd%3D2%26ved%3D0CEgQFjAB%26url%3Dhttps%253A%252F%252Fwww.datanitro.com%252F%26ei%3D02ImUK--C6KX1AWbpIDICg%26usg%3DAFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ%26sig2%3DtzL6mJCTxRdYnOxnc3Dl5A`).toString('base64')}`,
    }
  });

  code.expect(evt.request).to.exist();
  code.expect(evt.refInfo).to.equal({
    medium: 'search - Google',
    referrer: 'https://www.google.co.uk/url?sa=t&rct=j&q=&esrc=s&source=web&cd=2&ved=0CEgQFjAB&url=https%3A%2F%2Fwww.datanitro.com%2F&ei=02ImUK--C6KX1AWbpIDICg&usg=AFQjCNHOS6IopwZTOOXX-temg3t9jph8SQ&sig2=tzL6mJCTxRdYnOxnc3Dl5A',
    uri: 'undefined',
    timestamp: ts.toString()
  });
});
