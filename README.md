<h1 align="center">hapi-referrer</h1>

<p align="center">
  <a href="https://github.com/firstandthird/hapi-referrer/actions">
    <img src="https://img.shields.io/github/workflow/status/firstandthird/hapi-referrer/Test/main?label=Tests&style=for-the-badge" alt="Test Status"/>
  </a>
  <a href="https://github.com/firstandthird/hapi-referrer/actions">
    <img src="https://img.shields.io/github/workflow/status/firstandthird/hapi-referrer/Lint/main?label=Lint&style=for-the-badge" alt="Lint Status"/>
  </a>
  <img src="https://img.shields.io/npm/v/hapi-referrer.svg?label=npm&style=for-the-badge" alt="NPM" />
</p>

Hapi plugin to log referrers from search/ads/social/etc

## Installation

```sh
npm install hapi-referrer
```

_or_

```sh
yarn add hapi-referrer
```

## Options:
 - `cookieName` - Name of the cookie to be set
 - `ttl` - cookie expiration, defaults to 30 days
 - `domains` - array of domains. Domains in the list will not have their referrer set
 - `ignoredPaths` - array of paths. Paths set here wont have cookies set. Note, applies to all paths matching the text. Example: `/public` would also block `/public/css/common.css`
 - `verbose` - Enable debug logging when cookie set


---

<a href="https://firstandthird.com"><img src="https://firstandthird.com/_static/ui/images/safari-pinned-tab-62813db097.svg" height="32" width="32" align="right"></a>

_A [First + Third](https://firstandthird.com) Project_
