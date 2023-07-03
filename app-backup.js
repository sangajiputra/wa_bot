const { Client } = require('whatsapp-web.js');
const qrcode     = require('qrcode-terminal');
const fs         = require('fs');

//session qr
const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
//headless: false jika ingin langsung membuka browser wa web
const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });

//generate code QR
client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr);
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

//reply message
client.on('message', msg => {
    if (msg.body) {
        msg.reply('Aku WA bot, sek wonge sibuk!');
    }
});

client.initialize();
