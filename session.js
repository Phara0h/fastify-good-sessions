const cookieSignature = require('cookie-signature')
const crypto = require('crypto');

class Session {
  constructor (secret, id, data, expires) {
    this.expires = expires;
    this.secret = secret;
    this._data = {};
    this._init = false;
    this._dataChanged = false;
    this.sessionId = id;
    if(data) {
      this.data = data;
    }
  }

  get data() {
    return this._data;
  }

  set data(d) {
    this._init=true;
    this._dataChanged = true;
    this._data =d;
  }



  async sign () {
    if(this.sessionId) {
      this.sessionId = this.sessionId + ':' + await Session.generateIdAdd();
      return cookieSignature.sign(this.sessionId, this.secret)
    }
    return null;
  }

  static unsign(id, secret) {
    try {
          return cookieSignature.unsign(id, secret).split(':')[0];
    } catch (e) {
      return false;
    }
  }

  static generateIdAdd() {
    return new Promise((resolve, reject)=>{
        crypto.randomBytes(16, (err, id) => {
          resolve(id.toString('base64'));
        });
    });
  }
}

module.exports = Session;
