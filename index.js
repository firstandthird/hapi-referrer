const RefParser = require('referer-parser');

const defaults = {
  cookieName: 'ref',
  ttl: 30 * 86400000, // 30 days
  domains: [],
  paths: [],
  decorationName: 'getOriginalReferrer',
  verbose: false
};

exports.register = (server, options, next) => {
  options = Object.assign({}, defaults, options);

  if (!options.paths.includes('favicon.ico')) {
    options.paths.push('favicon.ico');
  }

  server.ext('onPreHandler', (request, reply) => {
    if (request.method !== 'get') {
      return reply.continue();
    }

    const reqUri = `${request.headers['x-forwarded-proto'] || request.connection.info.protocol}://${request.info.host}${request.url.path}`;

    let currentCookie = '';

    /* $lab:coverage:off$ */
    // hapi issue? can't reproduce in tests
    if (request.state) {
      currentCookie = request.state[options.cookieName] || '';
    }
    /* $lab:coverage:on$ */

    if (currentCookie.length) {
      return reply.continue();
    }

    const blacklistedDomain = options.domains.find(item => request.info.referrer.indexOf(item) !== -1);
    const blacklistedPath = options.paths.find(item => request.url.path.indexOf(item) !== -1);

    if (blacklistedDomain || blacklistedPath) {
      return reply.continue();
    }

    const data = new RefParser(request.info.referrer, reqUri);

    if (data.medium === 'internal') {
      return reply.continue();
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

    const cookieValue = `${encodeURIComponent(refString.join(' - '))}||${Date.now()}||${encodeURIComponent(request.info.referrer)}||${encodeURIComponent(reqUri)}`;

    if (options.verbose) {
      server.log(['hapi-referrer', 'set-cookie', 'info'], {
        referrer: request.info.referrer,
        url: reqUri,
        type: refString.join(' - '),
        ua: request.headers['user-agent']
      });
    }

    reply.state(options.cookieName, cookieValue, {
      path: '/',
      ttl: options.ttl,
      clearInvalid: true,
      ignoreErrors: true
    });

    reply.continue();
  });

  function getOriginalReferrer() {
    const currentCookie = this.state[options.cookieName] || '';

    if (!currentCookie) {
      return {};
    }

    const [medium, timestamp, referrer, uri] = currentCookie.split('||');

    return { medium: decodeURIComponent(medium), timestamp, referrer: decodeURIComponent(referrer), uri: decodeURIComponent(uri) };
  }

  server.decorate('request', options.decorationName, getOriginalReferrer);

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
