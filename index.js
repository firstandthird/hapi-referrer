const inbound = require('inbound');

const defaults = {
  cookieName: 'ref',
  ttl: 30 * 86400000, // 30 days
  domains: [],
  inboundKeys: ['engine', 'network', 'site', 'from', 'client'],
  decorationName: 'getOriginalReferrer',
  verbose: false
};

exports.register = (server, options, next) => {
  options = Object.assign({}, defaults, options);

  server.ext('onPreHandler', (request, reply) => {
    if (request.method !== 'get') {
      return reply.continue();
    }

    let currentCookie = '';

    if (request.state) {
      currentCookie = request.state[options.cookieName] || '';
    }

    if (currentCookie.length) {
      return reply.continue();
    }

    const blacklisted = options.domains.find(item => request.info.referrer.indexOf(item) !== -1);

    if (blacklisted) {
      return reply.continue();
    }

    inbound.referrer.parse(request.url, request.info.referrer, (err, data) => {
      // $lab:coverage:off$
      if (err) {
        server.log(['hapi-referrer', 'error'], err);
        return reply.continue();
      }
      // $lab:coverage:on$

      // $lab:coverage:off$
      if (typeof data !== 'object' || typeof data.referrer !== 'object') {
        server.log(['hapi-referrer', 'info'], {
          message: 'referrer didn\'t return an object',
          url: request.url,
          ref: request.info.referrer
        });

        return reply.continue();
      }
      // $lab:coverage:on$

      data = data.referrer;

      if (data.type === 'unknown') {
        server.log(['hapi-referrer', 'info'], {
          message: 'unknown referrer',
          url: request.url,
          ref: request.info.referrer,
          data
        });

        return reply.continue();
      }

      const refString = [];

      refString.push(data.type);

      options.inboundKeys.forEach(key => {
        if (typeof data[key] !== 'undefined') {
          refString.push(data[key]);
        }
      });

      const cookieValue = `${refString.join('-')}||${Date.now()}||${encodeURIComponent(request.info.referrer)}`;

      if (options.verbose) {
        server.log(['hapi-referer', 'set-cookie', 'info'], {
          cookieName: options.cookieName,
          cookieValue,
          ttl: options.ttl
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
  });

  function getOriginalReferrer() {
    const currentCookie = this.state[options.cookieName] || '';

    if (!currentCookie) {
      return {};
    }

    const [referer, timestamp, uri] = currentCookie.split('||');

    return { referer, timestamp, uri: decodeURIComponent(uri) };
  }

  server.decorate('request', options.decorationName, getOriginalReferrer);

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
