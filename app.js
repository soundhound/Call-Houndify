//"houndify" module contains both client-side ("HoundifyClient") and server-side ("HoundifyExpress") parts of SDK
var Houndify = require('houndify');
var wav = require('wav');
var fs = require('fs');
var path = require('path');
var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const VoiceResponse = require('twilio').twiml.VoiceResponse;


//parse arguments
var argv = require('minimist')(process.argv.slice(2));

//config file
var configFile = argv.config || 'config';
var config = require(path.join(__dirname, configFile));

//express app
var app = express();
var port = env.port || config.port || 8446;
// var publicFolder = argv.public || 'public';
// app.use(express.static(path.join(__dirname, publicFolder)));



//Initialize HoundifyClient with Client ID, Client Key and callback methods.
var myClient = new Houndify.HoundifyClient({
  clientId:  config.clientId, 
  clientKey: config.clientKey,
  onResponse: function(response, info) {
    console.log("HERE IS THE RESPONSE", response);
    //get current conversation state for a user and save it somewhere
    //you can then re-set it later, before sending another request for that user
    var conversationState = myClient.conversation.getState();
    myClient.conversation.setState(conversationState);
    return response;
  },
  onError: function(err, info) {
    console.log("HERE IS THE ERROR", err);
  }
});

//REQUEST INFO JSON
//see https://houndify.com/reference/RequestInfo
var requestInfo = {
  ClientID: config.clientId, 
  UserID: "test_user",
  Latitude: 37.388309, 
  Longitude: -121.973968
}


if (config.https) {
  
    //ssl credentials
    var privateKey = fs.readFileSync(config.sslKeyFile);
    var certificate = fs.readFileSync(config.sslCrtFile);
    var credentials = { key: privateKey, cert: certificate };
  
    //https server
    var httpsServer = https.createServer(credentials, app);
    httpsServer.listen(port, function() {
      console.log("HTTPS server running on port", port);
      console.log("Open https://localhost:" + port, "in the browser to view the Web SDK demo");
    });
  
  } else {
  
    app.listen(port, function() {
      console.log("HTTP server running on port", port);
      console.log("Open http://localhost:" + port, "in the browser to view the Web SDK demo");
    });
  
  }

  
  // const app = express();
  
  app.use(bodyParser());

  app.get('/', function(req, res) {
    res.send("Hello World");
})
  
  app.post('/sms', (req, res) => {
    const twiml = new MessagingResponse();
    var query = req.body.Body;
    //Send the query from arguments with request info object

    var myClientText = new Houndify.HoundifyClient({
      clientId:  config.clientId, 
      clientKey: config.clientKey,
      onResponse: function(response, info) {
        console.log("HERE IS THE RESPONSE", response);
        //res.send(response);
        twiml.message(response.AllResults[0].SpokenResponse);
        //get current conversation state for a user and save it somewhere
        //you can then re-set it later, before sending another request for that user
        var conversationState = myClient.conversation.getState();
        myClient.conversation.setState(conversationState);
        res.writeHead(200, {'Content-Type': 'text/xml'});
        res.end(twiml.toString());
      },
      onError: function(err, info) {
        console.log("HERE IS THE ERROR", err);
      }
    });

    myClientText.textSearch.query(query, requestInfo);

  });
  
  app.get('/search', function(req, res) {
    var query = req.query.thebigquestion;
    //Send the query from arguments with request info object

    var myClientText = new Houndify.HoundifyClient({
      clientId:  config.clientId, 
      clientKey: config.clientKey,
      onResponse: function(response, info) {
        console.log("HERE IS THE RESPONSE", response);
        res.send(response.AllResults[0].SpokenResponse);
        //get current conversation state for a user and save it somewhere
        //you can then re-set it later, before sending another request for that user
        var conversationState = myClient.conversation.getState();
        myClient.conversation.setState(conversationState);
      },
      onError: function(err, info) {
        console.log("HERE IS THE ERROR", err);
      }
    });

    myClientText.textSearch.query(query, requestInfo);
  })

  //When Twilio posts the voice blob to the backend.
  app.post('/voice', (request, response) => {
    // Use the Twilio Node.js SDK to build an XML response
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'alice' }, 'hello world!');
  
    // Render the response as XML in reply to the webhook request
    response.type('text/xml');
    response.send(twiml.toString());
  });

  // Create a route that will handle Twilio webhook requests, sent as an
// HTTP POST to /voice in our application
app.post('/voice2', (request, response) => {
  // Get information about the incoming call, like the city associated
  // with the phone number (if Twilio can discover it)
  const city = request.body.FromCity;

  // Use the Twilio Node.js SDK to build an XML response
  const twiml = new VoiceResponse();
  twiml.say({voice: 'alice'},
    `Never gonna give you up ${city}.`
  );
  twiml.play({}, 'https://demo.twilio.com/docs/classic.mp3');

  // Render the response as XML in reply to the webhook request
  response.type('text/xml');
  response.send(twiml.toString());
});


  //When user is loading a file from the local path. 
  app.get('/file', function(req, res){

    var myClientVoice = new Houndify.HoundifyClient({
      clientId:  config.clientId, 
      clientKey: config.clientKey,
      onResponse: function(response, info) {
        console.log("HERE IS THE VOICE RESPONSE", response);
        res.send(response);

        //get current conversation state for a user and save it somewhere
        //you can then re-set it later, before sending another request for that user
        var conversationState = myClient.conversation.getState();
        myClient.conversation.setState(conversationState);
      },
      onError: function(err, info) {
        console.log("HERE IS THE ERROR", err);
      }
    });


    //Read test wave and stream it to Houndify backend
    var reader = new wav.Reader();
    reader.on('format', function (format) {
      console.log("HERE IS THE FORMAT", format);
      myClientVoice.voiceSearch.startStreaming(requestInfo, 16000);
    });

    reader.on('data', function (chunk) {
      var arrayBuffer = new Uint8Array(chunk).buffer;
      var view = new Int16Array(arrayBuffer);
      myClientVoice.voiceSearch.write(view);
    });

    reader.on('end', function() { 
      myClientVoice.voiceSearch.stop(); 
    });


    var audioFile = argv.audio || path.join('test_audio', 'turnthelightson.wav');
    var audioFilePath = path.join(__dirname, audioFile)
    var file = fs.createReadStream(audioFilePath);
    file.pipe(reader);

  })