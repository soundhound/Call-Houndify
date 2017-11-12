
//"houndify" module contains both client-side ("HoundifyClient") and server-side ("HoundifyExpress") parts of SDK
var Houndify = require('houndify');
var wav = require('wav');
var fs = require('fs');
var path = require('path');


//parse arguments
var argv = require('minimist')(process.argv.slice(2));

//config file
var configFile = argv.config || 'config';
var config = require(path.join(__dirname, configFile));


//Initialize HoundifyClient with Client ID, Client Key and callback methods.
var myClient = new Houndify.HoundifyClient({
  clientId:  config.clientId, 
  clientKey: config.clientKey,
  onResponse: function(response, info) {
    console.log(response);
    //get current conversation state for a user and save it somewhere
    //you can then re-set it later, before sending another request for that user
    var conversationState = myClient.conversation.getState();
    myClient.conversation.setState(conversationState);
  },
  onError: function(err, info) {
    console.log(err);
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


//Read test wave and stream it to Houndify backend
var reader = new wav.Reader();
reader.on('format', function (format) {
  console.log(format);
  myClient.voiceSearch.startStreaming(requestInfo, 16000);
});

reader.on('data', function (chunk) {
  var arrayBuffer = new Uint8Array(chunk).buffer;
  var view = new Int16Array(arrayBuffer);
  myClient.voiceSearch.write(view);
});

reader.on('end', function() { 
  myClient.voiceSearch.stop(); 
});

var audioFile = argv.audio || path.join('test_audio', 'whatistheweatherthere.wav');
var audioFilePath = path.join(__dirname, audioFile)
var file = fs.createReadStream(audioFilePath);
file.pipe(reader);