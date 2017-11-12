/*
 *
 * HoundifyExpress
 * Three methods used for authenticating and proxying 
 * voice and text queries to Houndify backend. 
 *
 */

'use strict';

var crypto = require('crypto');
var request = require('request');


//URL Decode Base64 String
function base64_url_decode(input) {
    return input.replace(/-/g, "+").replace(/_/g, "/");
}

//URL Encode Base64 String
function base64_url_encode(input) {
    return input.replace(/\+/g, "-").replace(/\//g, "_");
}


module.exports =  {
    
    /**
     * Signs a token/message with Houndify Client Key using the HMAC scheme.
     * Used for generation of 'Hound-Client-Authentication' header in Text Requests 
     * and signing of authentication token in Voice Requests.
     *
     * @param {string} token - Token/message to be signed
     * @param {string} clientKey - Houndify Client Key
     * @return {Object} An object with 'Hound-Request-Authentication' and 'Hound-Client-Authentication' keys
     */
    signToken: function(token, clientKey) {
        var clientKeyBin = new Buffer(base64_url_decode(clientKey), "base64");
        var hash = crypto.createHmac("sha256", clientKeyBin).update(token).digest("base64");
        return base64_url_encode(hash);
    },


    /**
     * Given Houndify Client Id and Client Key in options objects
     * returns an Express request handler for authenticating Voice Requests.
     * The request for authentications will contain "token" query parameter
     * that needs to be signed with secret Client Key.
     *
     * @param {Object} opts - Options
     * @return {Function} An Express request handler
     */
    createAuthenticationHandler: function(opts) { 
        var signToken = this.signToken;
        return function (req, res) {
            var signature = signToken(req.query.token, opts.clientKey);
            res.send(signature);
        }
    },


    /**
     * Returns a simple Express handler for proxying Text Requests.
     * The handler takes query parameters and authentication headers, 
     * "hound-request-authentication", "hound-client-authentication" and "hound-request-info"
     * and sends them in the request to backend (GET https://api.houndify.com/v1/text). 
     *
     * @return {Function} An Express request handler
     */
    createTextProxyHandler: function(altBackend) {
        return function (req, res) {
            //houndify backend endpoint for text requests
            var houndBackend = altBackend || "https://api.houndify.com/v1/text";

            //pick following three required and two optional headers from incoming request and send them to the backend
            var houndifyHeaders = {
                'Hound-Request-Authentication': req.headers['hound-request-authentication'],
                'Hound-Client-Authentication': req.headers['hound-client-authentication'],
                //GET requests contain Request Info JSON in header.
                //POST requests contain Request Info JSON in body. 
                //Use POST proxy if Request Info JSON is expected to be bigger than header size limit of server
                'Hound-Request-Info': req.headers['hound-request-info'] || req.body 
            }; 

            if (req.headers["hound-input-language-english-name"])
                houndifyHeaders["Hound-Input-Language-English-Name"] = req.headers["hound-input-language-english-name"];
            if (req.headers["hound-input-language-ietf-tag"])
                houndifyHeaders["Hound-Input-Language-IETF-Tag"] = req.headers["hound-input-language-ietf-tag"];

            request({
                url: houndBackend,
                qs: req.query,
                headers: houndifyHeaders
            }, function (err, resp, body) {
                //if there's an error respond with '{ error: "%error string%" }' JSON
                if (err) return res.send({ error: err.toString() });
                
                //else send the response body from backend as it is
                res.send(body);
            });
            
        }
    }
  
}