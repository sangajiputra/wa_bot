var axios = require('axios');
var qs    = require('qs');
const db  = require('./helpers/db');
const moment = require('moment');
(async()=>{
  const pesan = await db.all_pesan_terjadwal();
  for (var i = 0; i < pesan.length; i++) {
        if (pesan[i].image_pesan_terjadwal != '') {
          var data = qs.stringify({
            'number': pesan[i].penerima_pesan_terjadwal,
            'caption': pesan[i].message_pesan_terjadwal+'\n\n\n\n'+pesan[i].footer_pesan_terjadwal,
            'file': pesan[i].image_pesan
          });
          var config = {
            method: 'post',
            url: 'http://localhost:7656/send-media',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.status));
            const create = moment().format('YYYY-MM-DD HH:mm:ss');
            await db.updatePesanTerjadwal('sukses',create,pesan[i].id_pesan_terjadwal);
          })
          .catch(function (error) {
            console.log(error);
          });
        }else{
          var data = qs.stringify({
            'number': pesan[i].tujuan_pesan,
            'message': pesan[i].message_pesan+'\n\n\n\n'+pesan[i].footer_pesan,
            'sender': pesan[i].sender_pesan
          });
          var config = {
            method: 'post',
            url: 'http://localhost:7656/send-message',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.status));
            const create = moment().format('YYYY-MM-DD HH:mm:ss');
            await db.updatePesanTerjadwal('sukses',create,pesan[i].id_pesan_terjadwal);
          })
          .catch(function (error) {
            console.log(error);
          });
        }
  }
})();
