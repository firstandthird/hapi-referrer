# hapi-referrer [![Build Status](https://travis-ci.org/firstandthird/hapi-referrer.svg?branch=master)](https://travis-ci.org/firstandthird/hapi-referrer) [![Coverage Status](https://coveralls.io/repos/github/firstandthird/hapi-referrer/badge.svg?branch=master)](https://coveralls.io/github/firstandthird/hapi-referrer?branch=master)

Hapi plugin to log referrers from search/ads/social/etc

### Options:
 - `cookieName` - Name of the cookie to be set
 - `ttl` - cookie expiration, defaults to 30 days
 - `domains` - array of domains. Domains in the list will not have their referrer set
 - `ignoredPaths` - array of paths. Paths set here wont have cookies set. Note, applies to all paths matching the text. Example: `/public` would also block `/public/css/common.css`
 - `verbose` - Enable debug logging when cookie set
