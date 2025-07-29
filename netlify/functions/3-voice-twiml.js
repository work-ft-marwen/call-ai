// netlify/functions/3-voice-twiml.js
const twilio = require('twilio');

exports.handler = async function(event) {
  const { To } = event.queryStringParameters;
  const response = new twilio.twiml.VoiceResponse();
  const connect = response.connect();
  
  // IMPORTANT: Remplacez cette URL par l'URL de votre VRAI serveur WebSocket
  connect.stream({
    url: `wss://VOTRE-SERVEUR-WEBSOCKET.onrender.com`, 
    track: 'both_tracks'
  });
  response.dial({ callerId: process.env.TWILIO_PHONE_NUMBER }, To);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/xml' },
    body: response.toString(),
  };
};
