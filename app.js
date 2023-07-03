const { Client, MessageMedia } = require('whatsapp-web.js');
const express    = require('express');
const { body, validationResult } = require('express-validator');
const socketIO   = require('socket.io');
const qrcode     = require('qrcode');
const http       = require('http');
const fs         = require('fs');
const cors       = require('cors')
const{ phoneNumberFormatter } = require('./helpers/formatter');
const fileupload = require('express-fileupload');
const axios      = require('axios');
const port       = process.env.PORT || 8000;
const app        = express();
const server     = http.createServer(app);
const io         = require("socket.io")(server, {cors: {
origin: "*", // or "*"
methods: ["GET", "POST"]}});

const client = new Client();
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors());



// //headless: false jika ingin langsung membuka browser wa web
// const client = new Client({
//    puppeteer: {
//      headless: true,
//      args: [
//       '--no-sandbox',
//       '--disable-setuid-sandbox',
//       '--disable-dev-shm-usage',
//       '--disable-accelerated-2d-canvas',
//       '--no-first-run',
//       '--no-zygote',
//       '--single-process', // <- this one doesn't works in Windows
//       '--disable-gpu'
//     ],
//    },
//    session: sessionCfg,
//    restartOnAuthFail: true, // related problem solution
//  })
//


// Socket IO
io.on('connection', function(socket) {
  socket.emit('message', 'Wait a minute, generating QR code');
  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  //menyimpan data session
  client.on('authenticated', (session) => {
      console.log('AUTHENTICATED', session);
      sessionCfg=session;
      fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
          if (err) {
              console.error(err);
          }
      });
  });
  client.initialize();
});

server.listen(port, function() {
  console.log('oke aplikasi jalan');
});
