const { Client, MessageMedia } = require('whatsapp-web.js');
const express    = require('express');
const socketIO   = require('socket.io');
const qrcode     = require('qrcode');
const http       = require('http');
const https      = require('https');
const cors       = require('cors');
const moment     = require('moment');
const{ phoneNumberFormatter } = require('./helpers/formatter');
const axios      = require('axios');
const port       = process.env.PORT || 7656;
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

const active_session = async function() {
  const session = await db.all_session();
  if(!session) return;
  for (var i = 0; i < session.length; i++) {
    const client = new Client({
       puppeteer: {
         headless: true,
         executablePath: '/usr/bin/chromium-browser',
         timeout: 0,
         args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <- this one doesn't works in Windows
          '--disable-gpu',
          '--disable-extensions'
        ],
       },
       session: session[i].session,
       restartOnAuthFail: true, // related problem solution
     })

     const user_id = session[i].user_id;
     const nomornya= session[i].nomor_hp;

    client.on('message', async msg => {
      // Change the group subject
          let chat = await msg.getChat();
          if (!chat.isGroup) {
            const pesanchat = msg.body;
            const keyword = await db.getkeyword(user_id,pesanchat);
            if (keyword) {
              msg.reply('mohon tunggu permintaan anda sedang di proses');
              let contact = await msg.getContact();
              let nomor   = contact.number;
              const no_hp = '0'+nomor.substr(2);
              const getContact = await db.readContact(no_hp,user_id);
              if (!getContact) {
                await db.saveContact(contact.pushname,no_hp,keyword);
                msg.reply('Selamat! Anda sudah terdaftar menjadi contact');
                kirim_autoresponder(nomornya,no_hp,keyword);
              }else{
                msg.reply('Anda sudah terdaftar menjadi contact');
              }
            }else if (msg.body == '#hapuscontact') {
              msg.reply('mohon tunggu permintaan hapus contact sedang di proses');
              let contact = await msg.getContact();
              let nomor   = contact.number;
              const no_hp = '0'+nomor.substr(2);
              const getContact = await db.readContact(no_hp);
              if (getContact) {
                await db.removeContact(nomornya,no_hp);
                await db.removePesanTerjadwal(nomornya,no_hp);
                msg.reply('Anda sudah tidak terdaftar menjadi contact');
              }else{
                msg.reply('Anda belum terdaftar menjadi contact');
              }
            }
          } else {
            chat.markUnread();
          }
    });
    await client.initialize();
    let tmpIntvl = setInterval(async function() {
    if (client.pupPage == null) {
      return;
    }
      // change default timeout to 5 minutes
      client.pupPage.setDefaultNavigationTimeout(300000);
      clearInterval(tmpIntvl);
    }, 1000);
  }
}
active_session();

async function kirim_autoresponder(sender,tujuan,keyword) {
  const data = await db.readAutoresponder(sender,keyword);
  for (var i = 0; i < data.length; i++) {
    if (i !== 0) {
      const pesan_terjadwal = await db.readPesanTerjadwal(sender,tujuan);
      var tanggal = moment().add(data[i].delay_autoresponder, 'hours').format('YYYY-MM-DD HH:mm:ss');
    }else{
      var tanggal = moment().format('YYYY-MM-DD HH:mm:ss');
    }
    const create = moment().format('YYYY-MM-DD HH:mm:ss');
    await db.savePesanTerjadwal(tanggal,data[i].sender_id,sender,tujuan,data[i].message_autoresponder,data[i].image_autoresponder,data[i].footer_autoresponder,create);
  }
}

const createSession = async function(id) {
  const client = new Client({
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      timeout: 0,
      args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       '--disable-dev-shm-usage',
       '--disable-accelerated-2d-canvas',
       '--no-first-run',
       '--no-zygote',
       '--single-process', // <- this one doesn't works in Windows
       '--disable-gpu',
       '--disable-extensions'
     ],
    },
     session: ''
   })

  client.initialize();
  io.emit('message', 'Wait a minute, generating QR code');
  client.on('qr',async (qr) => {
    // console.log('QR RECEIVED', 'qr');
    qrcode.toDataURL(qr, (err, url) => {
      io.emit('qr', url);
      io.emit('message', 'QR Code received, scan please!');
    });
  });

  //menyimpan data session
  var sessiontmp;
  client.on('authenticated',async (session) => {
    io.emit('authenticated', session);
    io.emit('message', 'sedang memproses nomor Anda');
    sessiontmp = session;
  });

  client.on('ready',async () => {
    const dataclient = client.info.wid;
    const hp    = dataclient.user;
    const no_hp = '0'+hp.substr(2);
    const savedSessions = await db.readSession(no_hp);
    var tanggal = moment().format('YYYY-MM-DD HH:mm:ss');
    if (!savedSessions) {
      // Save session to DB
      db.saveSession(id,no_hp,sessiontmp,tanggal);
    }else{
      db.removeSession(no_hp);
      db.saveSession(id,no_hp,sessiontmp,tanggal);
    }
    io.emit('authenticated', sessiontmp);
    io.emit('message', 'Whatsapp is authenticated!');
  });
};

// Socket IO
io.on('connection', function(socket) {
  socket.on('create-session', function(data) {
    createSession(data.id);
  });
});

app.post('/send-message', async (req, res) => {
  const sender  = req.body.sender;
  const number  = phoneNumberFormatter(req.body.number);
  const message = req.body.message;

  const savedSession = await db.readSession(sender);
  // var finalData = JSON.parse(savedSession);
  const client = new Client({
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      timeout: 0,
      args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       '--disable-dev-shm-usage',
       '--disable-accelerated-2d-canvas',
       '--no-first-run',
       '--no-zygote',
       '--single-process', // <- this one doesn't works in Windows
       '--disable-gpu',
       '--disable-extensions'
     ],
    },
     session: savedSession,
     restartOnAuthFail: true,
     takeoverOnConflict: true,
     takeoverTimeoutMs: 0,
   })
  await client.initialize();
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
  const number  = await phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;



  const savedSession = await db.readSession(sender);

  const client = new Client({
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      timeout: 0,
      args: [
       '--no-sandbox',
       '--disable-setuid-sandbox',
       '--disable-dev-shm-usage',
       '--disable-accelerated-2d-canvas',
       '--no-first-run',
       '--no-zygote',
       '--single-process', // <- this one doesn't works in Windows
       '--disable-gpu',
       '--disable-extensions',
       '--memory-pressure-off'
     ],
    },
     session: savedSession,
     restartOnAuthFail: true, // related problem solution
   })


  client.on('ready',async () => {
    const media = MessageMedia.fromFilePath('/var/www/html/cms.waasyik/public/img/gambar/'+req.body.file);
    client.sendMessage(number, media, { caption: caption }).then(response => {
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
  await client.initialize();
  // const agent = new https.Agent({
  //     rejectUnauthorized: false
  // });

});



server.listen(port, function() {
  console.log('oke aplikasi jalan');
});
