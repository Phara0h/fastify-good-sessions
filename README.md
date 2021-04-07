# fastify-good-sessions
A good fastify sessions plugin focused on speed.

## Installation
`fastify-cookie` is required depend
```bash
$ npm install fastify-good-sessions fastify-cookie
```
## Quick Start (Express)

```javascript
fastify.register(require('fastify-good-sessions'), {
  secret: config.cookie.session.secret,
  store: redis.sessionStore,
  cookie: {
    secure: config.https,
    httpOnly: true,
    maxAge: config.cookie.session.expiration,
    domain: config.cookie.domain
  },
  cookieName: 'sample:ssid',
  saveUninitialized: false
});
```
