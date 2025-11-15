const functions = require('firebase-functions');

exports.ping = functions.https.onRequest((req, res) => {
  res.status(200).json({
    ok: true,
    message: 'Emulator hello from Firebase Functions'
  });
});

