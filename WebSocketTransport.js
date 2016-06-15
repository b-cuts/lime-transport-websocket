(function (root, factory) {
    if (typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory(require('lime-js'), require('bluebird'), require('websocket').w3cwebsocket);
    } else if (typeof define === 'function' && define.amd) {
        define(['Lime', 'Promise', 'WebSocket'], factory);
    } else if (typeof exports === 'object') {
        exports['MessagingHubClient'] = factory(require('lime-js'), require('bluebird'), require('websocket').w3cwebsocket);
    } else {
        root['MessagingHubClient'] = factory(root['Lime'], root['Promise'], root['WebSocket']);
    }
}(this, function (Lime, Promise, WebSocket) {

    var fvoid = function() { return undefined; };
    var log = console ? console.debug || console.log : fvoid;

    function ensureSocketOpen(webSocket) {
        if (!webSocket || webSocket.readyState !== webSocket.OPEN) {
            throw new Error('The connection is not open');
        }
    }

    // class WebSocketTransport
    var WebSocketTransport = function(traceEnabled) {
        this._traceEnabled = traceEnabled || false;
        this._webSocket = null;
        this.encryption = Lime.SessionEncryption.NONE;
        this.compression = Lime.SessionCompression.NONE;
    };
    WebSocketTransport.prototype.open = function(uri) {
        var self = this;

        if (uri.indexOf('wss://') > -1) {
            self.encryption = Lime.SessionEncryption.TLS;
        } else {
            self.encryption = Lime.SessionEncryption.NONE;
        }

        self.compression = Lime.SessionCompression.NONE;

        self._webSocket = new WebSocket(uri, 'lime');

        var promise = new Promise(function(resolve, reject) {
            self._webSocket.onopen = function() {
                resolve(null);
                self.onOpen();
            };
            self._webSocket.onerror = function(err) {
                reject(err);
                self.onError(err);
            };
            self._webSocket.onclose = self.onClose;
            self._webSocket.onmessage = function(e) {
                if (self._traceEnabled) {
                    log('WebSocket RECEIVE: ' + e.data);
                }
                self.onEnvelope(JSON.parse(e.data));
            };
        });

        return promise;
    };
    WebSocketTransport.prototype.close = function() {
        var self = this;

        ensureSocketOpen(self._webSocket);

        var promise = new Promise(function(resolve, reject) {
            self._webSocket.onclose = function() {
                resolve(null);
                self.onClose();
            };
            self._webSocket.onerror = function(e) {
                var err = new Error(e.toString());
                reject(err);
                self.onError(err);
            }
        });

        self._webSocket.close();

        return promise;
    };
    WebSocketTransport.prototype.send = function(envelope) {
        var self = this;

        ensureSocketOpen(self._webSocket);

        var envelopeString = JSON.stringify(envelope);
        self._webSocket.send(envelopeString);

        if (self._traceEnabled) {
            log('WebSocket SEND: ' + envelopeString);
        }
    };
    WebSocketTransport.prototype.onEnvelope = fvoid;
    WebSocketTransport.prototype.getSupportedCompression = function() {
        return [SessionCompression.NONE];
    };
    WebSocketTransport.prototype.setCompression = function(compression) {
        throw new Error('Compression change is not supported');
    };
    WebSocketTransport.prototype.getSupportedEncryption = function() {
        return [SessionEncryption.TLS, SessionEncryption.NONE];
    };
    WebSocketTransport.prototype.setEncryption = function(encryption) {
        throw new Error('Encryption change is not supported');
    };
    WebSocketTransport.prototype.onOpen = fvoid;
    WebSocketTransport.prototype.onClose = fvoid;
    WebSocketTransport.prototype.onError = fvoid;

    return WebSocketTransport;
}));