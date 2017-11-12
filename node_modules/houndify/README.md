# Houndify Web SDK

The Houndify Web SDK allows you to make voice and text queries to the Houndify API from your browser or Node.js script.


## Features

* Voice search (Chrome, Firefox)
* Text search
* Conversation state
* Voice Activity Detection


## Structure

Web SDK consists of two parts: an in-browser javascript library **houndify-web-sdk.min.js** and a server-side Node.js module [**houndify**](https://www.npmjs.com/package/houndify). 
Both parts contain `HoundifyClient` that captures audio and text requests, and processes responses from the backend.

Because of CORS and security issues we also need a backend part that stores client credentials (Houndify Client ID and Client Key) and acts as a proxy for HTTP requests from browser to Houndify backend. Server-side part of SDK is a Node.js module **houndify** that also contains `HoundifyExpress` object with methods for building Express request handlers for authentication/proxy.


## Set up

### Client Side

Client side of Web SDK doesn't have any dependencies and consists of a single JS file. You can include it via script tag and work with global `Houndify` object.

```html
<script src="/path/to/houndify-web-sdk.min.js"></script>
<script>
var myClient = new Houndify.HoundifyClient(/* ..args.. */);
</script>
```

Or you can *require* `Houndify` as a CommonJS module.

```javascript
var Houndify = require('path/to/houndify-web-sdk.min'); 
//var Houndify = require('houndify');

var myClient = new Houndify.HoundifyClient(/* ..args.. */);
```


### Server Side

Server side of SDK is a `HoundifyExpress` object in the a [**houndify**](https://www.npmjs.com/package/houndify) module. Run `npm install houndify` to install it.

`HoundifyExpress` object in the module has three methods used for authenticating and proxying voice and text search requests.

```javascript
var houndifyExpress = require('houndify').HoundifyExpress;

app.get('/textSearchProxy', houndifyExpress.createTextProxyHandler());
```


### Example Project

*example* folder contains a project that shows a working setup of SDK. It contains a node *server.js* and *public* folder with frontend. 

`npm install` should install both [**express**](https://www.npmjs.com/package/express) and [**houndify**](https://www.npmjs.com/package/houndify).

You'll need to fill in your Houndify Client information in *config.json*. Make sure you also change "YOUR_CLIENT_ID" to your actual client id in `requestInfo` in *example/public/index.html* file.

**The latest versions of web browsers require secure connection for giving access to microphone.** While you can test Web SDK on *localhost* with HTTP server, you'll need to set up a HTTPS server for a different host. Set "https" flag in config file to "true" and add ssl certificate (server.crt) and key (server.key) files to the project root.

Run `node server.js` in the project folder and go to the url shown in the output of the running node server.

*example* folder also contains **node-client-text.js** and **node-client-voice.js**, sample Node.js scripts that show how to send text requests and stream audio from a file on a server side. You can find test audio files in **test_audio** folder.

```bash
node node-client-text.js --query "what is weather like in New York?"
node node-client-voice.js --audio ./path/to/audio.wav
```


## Using SDK

Client-side `Houndify` object contains a `HoundifyClient` constructor that accepts following options:

```javascript
var myClient = new Houndify.HoundifyClient({

  //Your Houndify Client ID
  clientId: "YOUR_CLIENT_ID", 

  //You need to create an endpoint on your server
  //for handling the authentication.
  //See SDK's server-side method HoundifyExpress.createAuthenticationHandler().
  authURL: "/houndifyAuth",

  //For testing environment you might want to authenticate on frontend without Node.js server. 
  //In that case you may pass in your Houndify Client Key instead of "authURL".
  //You should also pass clientKey instead of authURL if you're using HoundifyClient on server-side.
  //clientKey: "YOUR_CLIENT_KEY",

  //Enable Voice Activity Detection
  //See https://www.houndify.com/docs/advanced#voice-activity-detection
  //Default: true
  enableVAD: true,

  //You need to create an endpoint on your server
  //for handling the authentication and proxying 
  //text search http requests to Houndify backend
  //See SDK's server-side method HoundifyExpress.createTextProxyHandler().
  //You don't need text search proxy if you're using HoundifyClient on a server side.
  textSearchProxy: {
    url: "/textSearchProxy",
    method: "GET",
    // headers: {}
    // ... More proxy options will be added as needed
  },

  //Listeners

  //Fires after server responds with Response JSON
  //Info object contains useful information about the completed request
  //See https://houndify.com/reference/HoundServer
  onResponse: function(response, info) {
    // Response object uses bignumber-js (https://www.npmjs.com/package/bignumber.js)
    // for handling number out of safe number range of JS.
    // Use response.stringify([replace[, space]]) instead of JSON.stringify(response[, replace[, space]])
    // to get those bignumber-js objects stringified correctly

    var responseString = response.stringify(undefined, 2);
  },

  //Fires if error occurs during the request
  onError: function(err, info) {},

  //Fires every time backend sends a speech-to-text 
  //transcript of a voice query
  //See https://houndify.com/reference/HoundPartialTranscript
  onTranscriptionUpdate: function(trObj) {},

  //Fires after abort() method is called on voice search object
  onAbort: function(info) {},

  //Fires when start() metods is called on voice search object
  onRecordingStarted: function() {},

  //Fires when recording ends either after stop(), abort() or
  //when server detects the end of audio query and responds 
  //(VAD: https://www.houndify.com/docs/advanced#voice-activity-detection)
  onRecordingStopped: function() {},

  //Fires every time new audio frame of recording is captured
  onAudioFrame: function(frame) {}
});
```

Server-side `HoundifyExpress` object has *createAuthenticationHandler()* and *createTextProxyHandler()* methods that create Express request handlers for authentication and proxying.

```javascript
var Houndify = require('houndify');

//Authenticates Voice and Text requests
app.get('/houndifyAuth', Houndify.HoundifyExpress.createAuthenticationHandler({ 
  clientId:  "YOUR_CLIENT_ID", 
  clientKey: "YOUR_CLIENT_KEY"
}));

//Sends HTTP requests with Text queries to Houndify backend
app.get('/textSearchProxy', Houndify.HoundifyExpress.createTextProxyHandler());

//GET endpoint for text search proxy will make client send Request Info JSON in header. 
//If Request Info JSON can exceed your server's maximum header size limit, you should switch to POST endpoint.
//Make sure you put text body parser middleware before the text proxy handler:
//app.post('/textSearchProxy', require('body-parser').text({ limit: '1mb' }), Houndify.HoundifyExpress.createTextProxyHandler());

```


### Voice Search

`voiceSearch` object in newly created `HoundifyClient` will have following methods *startRecording()*, *stop()*, *abort()*, *startStreaming()*, *write()*, *decodeArrayBuffer()*, and *isStreaming()*.

```javascript
var myClient = new Houndify.HoundifyClient(/* ..args.. */);

// See https://houndify.com/reference/RequestInfo.
// Use bignumber-js (https://www.npmjs.com/package/bignumber.js)
// for passing number out of safe number range in RequestInfo
var requestInfo = { 
  ClientID: "YOUR_CLIENT_ID",
  Latitude: 37.388309, 
  Longitude: -121.973968
};

//starts recording and streaming of voice search requests to Houndify backend
//works only in latest chrome and firefox browsers
myClient.voiceSearch.startRecording(requestInfo, {
  // Optionally you can override default listeners 
  // for this specific query
  onResponse: function(response, info) { /* ... */ }
});

/* ... */

//stops streaming voice search requests, expects the final response from backend
myClient.voiceSearch.stop();

/* ... */

//aborts voice search request, does not expect final response from backend
myClient.voiceSearch.abort();

/* ... */

//check if the client is currently streaming a voice request
myClient.voiceSearch.isStreaming();

/* ... */

//stream 8/16 kHz mono 16-bit little-endian PCM samples 
//in Int16Array chunks to backend
//pass in original sample rate as the second argument to startStreaming() 
//and the audio will be resampled down to 16000 or 8000.
//works in Node.js and browser.
myClient.voiceSearch.startStreaming(requestInfo, 16000, {
  // Optionally you can override default listeners 
  // for this specific query
  onResponse: function(response, info) { /* ... */ }
});
myClient.voiceSearch.write(audioChunk);
myClient.voiceSearch.stop();

/* ... */

//in browsers only you can also upload and decode 
//audio file using decodeArrayBuffer() method
function onFileUpload() {
  // "fileInput" element is some input element:
  // <input type="file" id="fileInput" onchange="onFileUpload()" />
  var fileElt = document.getElementById("fileInput");
  var file = fileElt.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function() {
    var arrayBuffer = reader.result;
    myClient.voiceSearch.decodeArrayBuffer(arrayBuffer, function(audio) {
      myClient.voiceSearch.startStreaming(requestInfo, 16000);
      myClient.voiceSearch.write(audio);
      myClient.voiceSearch.stop();
    });
  };

  reader.readAsArrayBuffer(file);
}
```

**Note!** For voice search to work in production the frontend should be served through secure connection. See example project for https node server setup. You do not need https for *localhost*.

You can use Voice Search in the browser without setting up Node.js server. You can pass in the authentication information (Houndify Client Key) directly to `HoundifyClient` object and use server of your choice without server-side **houndify** module.

**Important!** Your client key is private and should not be exposed in the browser in production. Use Voice Search without authentication on server side only for testing, internal applications or in server-side `HoundifyClient`.


### Text Search

`textSearch` object in `HoundifyClient` will have *query()* method that accepts a query string and request info object.

```javascript
var myClient = new Houndify.HoundifyClient(/* ..args.. */);

// See https://houndify.com/reference/RequestInfo.
// Use bignumber-js (https://www.npmjs.com/package/bignumber.js)
// for passing number out of safe number range in RequestInfo
var requestInfo = { 
  ClientID: "YOUR_CLIENT_ID",
  Latitude: 37.388309, 
  Longitude: -121.973968
};

var queryString = "What is the weather like in Toronto?";

//send text search request to Houndify backend
myClient.textSearch.query(queryString, requestInfo, {
  // Optionally you can override default listeners 
  // for this specific query
  onResponse: function(response, info) { /* ... */ }
});
```

**Note!** In order to use Text Search you'll need a proxy endpoint on your server. `HoundifyExpress` object contains *createTextProxyHandler()* method for setting that up.


### Conversation State

Houndified domains can use context to enable a conversational user interaction. For example, users can say "show me coffee shops near me", "which ones have wifi?", "sort by rating", "navigate to the first one". By default Conversation State will be stored and shared with each request. You can disable/enable this feature and clear the current Conversation State by calling following methods in `HoundifyClient.conversation`.

```javascript
var myClient = new Houndify.HoundifyClient(/*  ..args.. */);

//disable conversations
myClient.conversation.disable();

//enable conversations
myClient.conversation.enable();

//clear, "forget", current conversation 
myClient.conversation.clear();

//get current conversation 
myClient.conversation.getState();

//set the conversation
myClient.conversation.setState(newState);
```


## Reimplementing HoundifyExpress for other servers

Node.js module **houndify** contains server-side `HoundifyExpress` object with three methods, two of which are mentioned above (creating express middleware for authentication and proxying requests) and one more helper one. **houndify-express.js** contains these three simple methods with annotations to make it easy to implement the server-side logic for servers other than Express.

**signToken(token, clientKey)** accepts a token/message and a Houndify Client Key and returns the token signed with the key using HMAC scheme. This method is used by *createAuthenticationHandler()* for authenticating Voice and Text Requests.

```javascript
var crypto = require('crypto');

//URL Decode Base64 String
function base64_url_decode(input) {
    return input.replace(/-/g, "+").replace(/_/g, "/");
}
//URL Encode Base64 String
function base64_url_encode(input) {
    return input.replace(/\+/g, "-").replace(/\//g, "_");
}

function signToken(token, clientKey) {
    var clientKeyBin = new Buffer(base64_url_decode(clientKey), "base64");
    var hash = crypto.createHmac('sha256', clientKeyBin).update(token).digest("base64");
    return base64_url_encode(hash);
}
```

**createAuthenticationHandler({ clientId, clientKey })** accepts an object with Houndify Client Id and secret Houndify Client Key and returns an Express handler for authentication requests from client-side `HoundifyClient`. These requests will send a token as a query parameter and expect the signature back as a plain text.

```javascript
function createAuthenticationHandler(opts) { 
    return function (req, res) {
        var signature = signToken(req.query.token, opts.clientKey);
        res.send(signature);
    }
}
```

**createTextProxyHandler()** returns a simple Express handler for proxying Text Requests from client-side `HoundifyClient` to Houndify backend. Query parameters of the incoming request should be reused for the request to backend (GET https://api.houndify.com/v1/text). Pick all "hound-*" headers from the incoming request, three required "hound-request-authentication", "hound-client-authentication", "hound-request-info", and two optional "hound-input-language-english-name" and "hound-input-language-ietf-tag", and send them to the backend with the same names.

```javascript
var request = require('request');

function createTextProxyHandler() {
    return function (req, res) {
        //houndify backend endpoint for text requests
        var houndBackend = "https://api.houndify.com/v1/text";

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

        //keep query parameters from incoming request
        request({
            url: houndBackend,
            qs: req.query,
            headers: houndifyHeaders,
        }, function (err, resp, body) {
            //if there's an error respond with '{ error: "%error string%" }' JSON
            if (err) return res.send({ error: err.toString() });
            
            //else send the response body from backend as it is
            res.send(body);
        });
    }
}
```
