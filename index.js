'use strict'

const fastifyPlugin = require('fastify-plugin')
const Store = require('./memorystore')
var Session = require('./session.js')
const cookieSignature = require('cookie-signature')
const crypto = require('crypto');

function session (fastify, options, next) {

  ensureDefaults(options).then(options=>{


    fastify.decorateRequest('sessionStore', options.store);
    fastify.decorateRequest('session', {});
    fastify.decorateRequest('createSession', function(id, data) {
      this.session =  new Session(options.secret, id, data, Date.now() + options.cookie.maxAge);
    });
    fastify.decorateRequest('destroySession', destroySession);
    fastify.addHook('preValidation', preValidation(options));
    fastify.addHook('onSend', onSend(options));
    next();
  })


}


function preValidation (options) {
  const cookieOpts = options.cookie;
  const secret = options.secret;



  return function handleSession (request, reply, done) {
    const url = request.req.url;
    if (url.indexOf(cookieOpts.path || '/') !== 0) {
      done();
      return;
    }
    var sessionId = request.cookies[options.cookieName]
    if (!sessionId) {
      if(options.saveUninitialized) {
        newSession(secret, cookieOpts.maxAge, done);
      } else {
        done();
      }
    } else {
      const decryptedSessionId = Session.unsign(sessionId, secret)
      if (decryptedSessionId === false) {
        if(options.saveUninitialized) {
          newSession(secret, cookieOpts.maxAge, done);
        } else {
          done();
        }
      } else {
        options.store.get(decryptedSessionId, (err, session) => {
          if (err) {
            if (err.code === 'ENOENT') {
              if(options.saveUninitialized) {
                newSession(secret, cookieOpts.maxAge, done);
              } else {
                done();
              }
            } else {
              done(err)
            }
            return;
          }
          if (!session) {
            if(options.saveUninitialized) {
              newSession(secret, cookieOpts.maxAge, done);
            } else {
              done();
            }
            return;
          }
          if (session && session.expires && session.expires <= Date.now()) {
            options.store.destroy(decryptedSessionId, (err)=> {
              if (err) {
                done(err);
                return;
              }
              if(options.saveUninitialized) {
                newSession(secret, cookieOpts.maxAge, done);
              } else {
                done();
              }
            })
            return;
          }
          if(session) {
            request.session = session;
            request.session.sessionId = decryptedSessionId;
            done();
            return;
          }
          else {
            request.session = new Session(
              secret,
              decryptedSessionId,
              session._data,
              session.expires
            )
          }

          done();
        })
      }
    }
  }
}

function onSend (options) {
  return function saveSession (request, reply, payload, done) {
    const session = request.session
    if (!session || !session.sessionId || !shouldSaveSession(request, options.cookie, options.saveUninitialized)) {
      done()
      return
    }
    options.store.set(session.sessionId, session, async (err) => {
      if (err) {
        done(err)
        return
      }
      var cookie = setCookieExpire({...options.cookie});

      reply.setCookie(
        options.cookieName,
        await session.sign(),
        setCookieExpire({...options.cookie})
      )
      done()
    })
  }
}

function getDestroyCallback (secret, request, reply, done, cookieOpts) {
  return function destroyCallback (err) {
    if (err) {
      done(err)
      return
    }
    newSession(secret, request, cookieOpts, done)
  }

}

function setCookieExpire(cookie) {
  cookie.expires = new Date(Date.now() + cookie.maxAge);
  return cookie;
}

function newSession (secret, maxAge, done) {
  console.log('hi')
    const request = this
  request.session = new Session(secret, null, null, Date.now() + maxAge);
  if(done) {
      done()
  }
}

function destroySession (done) {
  const request = this
  request.sessionStore.destroy(request.session.sessionId, (err) => {
    request.session = null
    done(err)
  })
}

function ensureDefaults (options) {
    return new Promise((resolve, reject)=>{
      options.store = options.store || new Store();
      options.cookieName = options.cookieName || 'sid'
      options.cookie = options.cookie || {}
      if(options.cookie) {
        options.cookie = {
          maxAge: isSetDefault(options.cookie.maxAge, 900),
          path: isSetDefault(options.cookie.path,'/'),
          httpOnly: isSetDefault(options.cookie.httpOnly,true),
          secure: isSetDefault(options.cookie.secure, true),
          expires: 0,
          sameSite: isSetDefault(options.cookie.sameSite,null),
          domain: isSetDefault(options.cookie.domain,null)
        }
      }
      options.saveUninitialized = isSetDefault(options.saveUninitialized, true);
      if(!options.secret) {
        crypto.randomBytes(32, (err, secret) => {
          if(err) {
            reject(err)
            return;
          }
          options.secret = secret.toString('base64');
          resolve(options);
        })
      }
      else {
          resolve(options);
      }
  })
}

function shouldSaveSession (request, cookieOpts, saveUninitialized) {
  if (!saveUninitialized && !request.session._init) {
    return false
  }

  if(request.session._dataChanged) {
    request.session._dataChanged = false;
    return true;
  } else {
    return false;
  }
  if (cookieOpts.secure !== true) {
    return true
  }
  const connection = request.req.connection
  if (connection && connection.encrypted === true) {
    return true
  }
  const forwardedProto = request.headers['x-forwarded-proto']
  return forwardedProto === 'https'
}

function isSessionModified (session) {
  return (Object.keys(session).length !== 4)
}

var isSetDefault = function(v, d) {
    if(typeof v == 'number') {
      return (!Number.isNaN(v)) ? v : d;
    }
    return (v !== null && v !== undefined) ? v : d;
};

exports = module.exports = fastifyPlugin(session,   {
  fastify: '^2.0.0',
  name: 'fastify-good-session',
  dependencies: [
    'fastify-cookie'
  ]
})
module.exports.Store = Store
