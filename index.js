const RefParser = require('referer-parser');
const useragent = require('useragent');

const defaults = {
  cookieName: 'ref64',
  ttl: 30 * 86400000, // 30 days
  domains: [],
  ignoredPaths: [],
  decorationName: 'getOriginalReferrer',
  verbose: false,
  accept: ''
};

const register = (server, options) => {
  // update the useragent's library of browsers so it is always current:
  options = Object.assign({}, defaults, options);
  server.event('referrer');

  if (!options.ignoredPaths.includes('favicon.ico')) {
    options.ignoredPaths.push('favicon.ico');
  }

  server.ext('onPreHandler', (request, h) => {
    if (request.method !== 'get') {
      return h.continue;
    }

    if (options.accept) {
      if (!request.headers || !request.headers.accept || request.headers.accept.indexOf(options.accept) === -1) {
        return h.continue;
      }
    }

    const reqUri = `${request.headers['x-forwarded-proto'] || request.server.info.protocol}://${request.info.host}${request.url.path}`;

    let currentCookie = '';

    /* $lab:coverage:off$ */
    // hapi issue? can't reproduce in tests
    if (request.state) {
      currentCookie = request.state[options.cookieName] || '';
    }
    /* $lab:coverage:on$ */

    if (currentCookie.length) {
      server.events.emit('referrer', { request, refInfo: request[options.decorationName]() });
      return h.continue;
    }

    const blacklistedDomain = options.domains.find(item => request.info.referrer.indexOf(item) !== -1);
    const blacklistedPath = options.ignoredPaths.find(item => request.url.path.indexOf(item) !== -1);

    if (blacklistedDomain || blacklistedPath) {
      return h.continue;
    }

    const data = new RefParser(request.info.referrer, reqUri);

    if (data.medium === 'internal') {
      return h.continue;
    }

    const refString = [];

    if (data.medium !== 'unknown') {
      refString.push(data.medium);
    }

    if (data.referer) {
      refString.push(data.referer);
    }

    // if unknown - Check if direct or linked
    if (data.medium === 'unknown' && !data.referer) {
      if (request.info.referrer.length) {
        refString.push('link');
      } else {
        refString.push('direct');
      }
    }
    const ts = Date.now();

    const cookieValue = `${encodeURIComponent(refString.join(' - '))}||${ts}||${encodeURIComponent(request.info.referrer)}||${encodeURIComponent(reqUri)}`;

    const refInfo = {
      medium: refString.join(' - '),
      referrer: request.info.referrer,
      uri: reqUri
    };

    const agent = useragent.parse(request.headers['user-agent']);
    if (options.verbose) {
      server.log(['hapi-referrer', 'set-cookie', 'info'], {
        refInfo,
        ua: agent.source,
        browser: `${agent.family} ${agent.major}.${agent.minor}.${agent.patch}`
      });
    }

    h.state(options.cookieName, cookieValue, {
      path: '/',
      ttl: options.ttl,
      clearInvalid: true,
      ignoreErrors: true,
      encoding: 'base64'
    });

    server.events.emit('referrer', {
      request,
      refInfo
    });

    return h.continue;
  });

  function getOriginalReferrer() {
    const currentCookie = this.state[options.cookieName] || '';

    if (!currentCookie) {
      return {};
    }

    const [medium, timestamp, referrer, uri] = currentCookie.split('||');

    return {
      medium: decodeURIComponent(medium),
      timestamp,
      referrer: decodeURIComponent(referrer),
      uri: decodeURIComponent(uri) };
  }

  server.decorate('request', options.decorationName, getOriginalReferrer);
};

exports.plugin = {
  once: true,
  pkg: require('./package.json'),
  register
};
