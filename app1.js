const { Client, MessageMedia } = require('whatsapp-web.js');
const express    = require('express');
const { body, validationResult } = require('express-validator');
const socketIO   = require('socket.io');
const qrcode     = require('qrcode');
const http       = require('http');
const fs         = require('fs');
const{ phoneNumberFormatter } = require('./helpers/formatter');
const fileupload = require('express-fileupload');
const axios      = require('axios');
const port       = process.env.PORT || 8000;
const app        = express();
const server     = http.createServer(app);
const io         = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(fileupload({
  // debug: true
}))
//session qr
const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname});
});
//headless: false jika ingin langsung membuka browser wa web
const client = new Client({
   puppeteer: {
     headless: true,
     args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ],
   },
   session: sessionCfg,
   restartOnAuthFail: true, // related problem solution
 })

//reply message
client.on('message', async msg => {
  // Change the group subject
      let chat = await msg.getChat();
      if (!chat.isGroup) {
        if (msg.body == 'tes') {
          msg.reply('Oke Wa Bot Menerima Tes Anda');
        }else if(msg.body == 'good morning'){
          msg.reply('Good Morning Too');
        }else{
          msg.reply('Saya Whatsapp Bot, Maaf Saya Belum Menemukan Kata Kunci yg Anda Maksut');
        }
      } else {
        chat.markUnread();
      }
});

client.initialize();

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
});

const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}

app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty()
], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }
  const number  = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'Number is Not Registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status : true,
      data   : response
    });
  }).catch(err => {
    res.status(500).json({
      status : false,
      data   : err
    });
  });
});

//Send Media
app.post('/send-media', async (req, res) => {
  const number  = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  let media;
  if (req.body.file) {
    const fileUrl = req.body.file;
    let mimetype;
    const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer'}).then(response => {
      mimetype = response.headers['content-type'];
      return response.data.toString('base64');
    });
    media   = new MessageMedia(mimetype, attachment, 'media');
  }else{
    const file    = req.files.file;
    media   = new MessageMedia(file.mimetype, file.data.toString('base64'), file.name);
  }

  client.sendMessage(number, media, { caption: caption }).then(response => {
    res.status(200).json({
      status : true,
      data   : response
    });
  }).catch(err => {
    res.status(500).json({
      status : false,
      data   : err
    });
  });
});

server.listen(port, function() {
  console.log('oke aplikasi jalan');
});
