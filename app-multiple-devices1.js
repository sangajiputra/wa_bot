const { Client, MessageMedia } = require('whatsapp-web.js');
const express    = require('express');
const socketIO   = require('socket.io');
const qrcode     = require('qrcode');
const http       = require('http');
const https      = require('https');
const fs         = require('fs');
const cors       = require('cors')
const{ phoneNumberFormatter } = require('./helpers/formatter');
const axios      = require('axios');
const port       = process.env.PORT || 8000;
const app        = express();
const server     = http.createServer(app);
const io         = require("socket.io")(server, {cors: {
origin: "*", // or "*"
methods: ["GET", "POST"]}});
const db = require('./helpers/db');
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors());

app.get('/', (req,res) => {
  res.sendFile('index.html', { root: __dirname});
});

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
  session: ''
})
client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', 'Wait a minute, generating QR code');
  client.on('qr', (qr) => {
    //console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  //menyimpan data session
  client.on('authenticated', (session) => {
      //console.log('AUTHENTICATED', session);
      io.emit('message', 'Whatsapp is authenticated!');
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
        session: session
      })
      client.initialize();
      console.log(client.info.wid);
      // Save session to DB
      //db.saveSession(id,session);
  });
});

const checkRegisteredNumber = async function(number) {
  const isRegistered = await db.readSession(number);
  return isRegistered;
}

app.post('/send-message', async (req, res) => {
  const sender  = req.body.sender;
  const number  = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const savedSession = await db.readSession(id);
  var finalData = JSON.parse(savedSession);
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
     session: finalData,
     restartOnAuthFail: true, // related problem solution
   })
  client.initialize();

  const isRegisteredNumber = await checkRegisteredNumber(sender);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      data: 'Number is Not Registered'
    });
  }

  client.sendMessage(number, message).then(response => {
    res.status(200).json({
      status : true,
      data   : response
    });
  }).catch(err => {
    console.log(err);
    res.status(500).json({
      status : false,
      data   : err
    });
  });
});

//Send Media
app.post('/send-media', async (req, res) => {
  const sender  = req.body.sender;
  const number  = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;

  const savedSession = await db.readSession(id);
  var finalData = JSON.parse(savedSession);
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
     session: finalData,
     restartOnAuthFail: true, // related problem solution
   })
  client.initialize();

  const isRegisteredNumber = await checkRegisteredNumber(sender);

  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      data: 'Number is Not Registered'
    });
  }

  let media;
  if (req.body.file) {
    const agent = new https.Agent({
        rejectUnauthorized: false
    });
    const fileUrl = req.body.file;
    let mimetype;
    const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer', httpsAgent: agent}).then(response => {
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



const createSession = async function(id, description) {
  io.emit('message', 'Wait a minute, generating QR code');
  //headless: false jika ingin langsung membuka browser wa web
  const savedSession = await db.readSession(id);
  var finalData = JSON.parse(savedSession);
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
     session: finalData,
     restartOnAuthFail: true, // related problem solution
   })
  client.initialize();


    client.on('qr', (qr) => {
      //console.log('QR RECEIVED', qr);
      const savedSessions = savedSession;
      if (!savedSessions) {
        qrcode.toDataURL(qr, (err, url) => {
          io.emit('qr', {id: id, src: url});
          io.emit('message', {id: id, text: 'QR Code received, scan please!'});
        });
      }
    });

    client.on('ready', () => {
      io.emit('ready', {id: id});
      io.emit('message', {id: id, text: 'Whatsapp is ready!'});
      //console.log('Whatsapp is ready!')
    });

    //menyimpan data session
    client.on('authenticated', (session) => {
      //console.log('AUTHENTICATED', session);
      io.emit('authenticated', {id: id});
      io.emit('message', {id: id, text: 'Whatsapp is authenticated!'});
      const savedSessions = savedSession;
      if (!savedSessions) {
        // Save session to DB
        db.saveSession(id,session);
      }
    });

    //gagal login
    client.on('auth-failure', (session) => {
        io.emit('message', {id: id, text: 'Auth failure, restarting ...'});
    });

    client.on('disconnected', (reason) => {
      io.emit('message', {id: id, text: 'Whatsapp is disconnected!'});
      db.removeSession(id);
      client.destroy();
      client.initialize();

      io.emit('remove-session', id);
    });

    const checkRegisteredNumber = async function(number) {
      const isRegistered = await db.readSession(number);
      return isRegistered;
    }

    app.post('/send-message', async (req, res) => {
      const sender  = req.body.sender;
      const number  = phoneNumberFormatter(req.body.number);
      const message = req.body.message;

      const isRegisteredNumber = await checkRegisteredNumber(sender);

      if (!isRegisteredNumber) {
        return res.status(422).json({
          status: false,
          data: 'Number is Not Registered'
        });
      }

      client.sendMessage(number, message).then(response => {
        res.status(200).json({
          status : true,
          data   : response
        });
      }).catch(err => {
        console.log(err);
        res.status(500).json({
          status : false,
          data   : err
        });
      });
    });

    //Send Media
    app.post('/send-media', async (req, res) => {
      const sender  = req.body.sender;
      const number  = phoneNumberFormatter(req.body.number);
      const caption = req.body.caption;

      const isRegisteredNumber = await checkRegisteredNumber(sender);

      if (!isRegisteredNumber) {
        return res.status(422).json({
          status: false,
          data: 'Number is Not Registered'
        });
      }

      let media;
      if (req.body.file) {
        const agent = new https.Agent({
            rejectUnauthorized: false
        });
        const fileUrl = req.body.file;
        let mimetype;
        const attachment = await axios.get(fileUrl, { responseType: 'arraybuffer', httpsAgent: agent}).then(response => {
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

}

// Socket IO
io.on('connection', function(socket) {
  socket.on('create-session', function(data) {
    createSession(data.id, data.description);
  });
});



server.listen(port, function() {
  console.log('oke aplikasi jalan');
});
