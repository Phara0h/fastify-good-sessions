'use strict';

class MemoryStore {
    constructor() {
        this.sessions = {};
    }

    async set(sessionId, session, callback) {
        this.sessions[sessionId] = session;

        if(callback) {
          callback();
        }
        return this.sessions[sessionId];

    }

    async get(sessionId, callback) {
      if(callback) {
        callback(null, this.sessions[sessionId]);
      }

      return this.sessions[sessionId];
    }

    async destroy(sessionId, callback) {
        delete this.sessions[sessionId];
        if(callback) {
          callback();
        }
    }
}

module.exports = MemoryStore;
