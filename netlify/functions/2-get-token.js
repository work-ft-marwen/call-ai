// netlify/functions/2-get-token.js
const jwt = require('jsonwebtoken');
const twilio = require('twilio');

const { JWT_SECRET, TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWIML_APP_SID } = process.env;

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }
  try {
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: 'Accès non autorisé.' };
    }
    const userToken = authHeader.split(' ')[1];
    jwt.verify(userToken, JWT_SECRET);

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    const accessToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity: 'ai_sales_agent' });
    const grant = new VoiceGrant({ outgoingApplicationSid: TWIML_APP_SID, incomingAllow: false });
    accessToken.addGrant(grant);

    return { statusCode: 200, body: JSON.stringify({ token: accessToken.toJwt() }) };
  } catch (error) {
    console.error("Erreur de génération de jeton Twilio:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
