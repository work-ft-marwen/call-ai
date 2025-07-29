// netlify/functions/1-auth.js
const jwt = require('jsonwebtoken');

const MOCK_USER = {
  email: 'marwen.belhadj@aibotsautomations.com',
  passwordHash: '$2b$10$f.B/8V5wGaE1G/An7Ad1UeT4A3t1jBFdCgwx0oFk3sLz22j5y/x/S' // '1234567890'
};
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }
  try {
    const { email, password } = JSON.parse(event.body);
    if (email !== MOCK_USER.email || password !== '1234567890') {
      return { statusCode: 401, body: JSON.stringify({ message: 'Identifiants invalides.' }) };
    }
    const token = jwt.sign({ email: MOCK_USER.email, role: 'agent' }, JWT_SECRET, { expiresIn: '8h' });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur interne du serveur.' }) };
  }
};
