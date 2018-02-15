# Call Houndify

This application allows you to make voice and text queries to the Houndify API from your phone. Check out this [Medium Post on integrating Houndify and Twilio](https://medium.com/houndify/accessing-houndify-through-phone-calls-and-text-messages-705c20fc9956) for more information. 


## Features

* Voice based queries
* Text based search


## Running Locally

Make sure you have [Node.js](http://nodejs.org/) installed.

Add your YOUR_CLIENT_ID and YOUR_CLIENT_KEY in config.json from your Houndify Client before running the application. 

```sh
git clone https://github.com/newtonjain/Call-Houndify.git # or clone your own fork
cd Call-Houndify
npm install
npm start
```

Your app should now be running on [localhost:3000](http://localhost:3000/).


## Documentation

For more information about using Houndify, see these docs:

- [Creating your First Houndify Client](https://medium.com/houndify/houndify-tutorial-create-client-try-api-c54103878e3b)
- [Houndify Web SDK](https://docs.houndify.com/sdks/docs/web)
- [Setting up Voice Request](https://docs.houndify.com/sdks/docs/web#voicerequest)
- [Setting up text request](https://docs.houndify.com/sdks/docs/web#textrequest)

### License

Licensed under the MIT License
