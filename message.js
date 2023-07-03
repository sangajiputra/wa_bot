var axios    = require('axios');
const moment = require('moment');
var qs       = require('qs');
const db     = require('./helpers/db');
const kirim = async function(){
  var tanggal_sekarang = moment().format('YYYY-MM-DD HH:mm:ss');
  const list = await db.all_pesan_terjadwal(tanggal_sekarang);
  if (list) {
    for (var i = 0; i < list.length; i++) {
      var id   = list[i].id_pesan_terjadwal;
      await db.updatePesanTerjadwal('proses',tanggal_sekarang,id);
      if (list[i].image_pesan_terjadwal != '') {
        var data = qs.stringify({
          'sender': list[i].pengirim_pesan_terjadwal,
          'number': list[i].penerima_pesan_terjadwal,
          'caption': list[i].message_pesan_terjadwal+'\n\n\n\n'+list[i].footer_pesan_terjadwal,
          'file': list[i].image_pesan_terjadwal
        });
        var config = {
          method: 'post',
          url: 'http://localhost:8000/send-media',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data : data
        };

        axios(config)
        .then(async function (response) {
          await db.updatePesanTerjadwal('sukses',tanggal_sekarang,id);
        })
        .catch(async function (error) {
          await db.updatePesanTerjadwal('antri',tanggal_sekarang,id);
          console.log(error);
        });
      }else{
        var data = qs.stringify({
          'number': list[i].penerima_pesan_terjadwal,
          'message': list[i].message_pesan_terjadwal+'\n\n\n\n'+list[i].footer_pesan_terjadwal,
          'sender': list[i].pengirim_pesan_terjadwal
        });
        var config = {
          method: 'post',
          url: 'http://localhost:8000/send-message',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data : data
        };

        axios(config)
        .then(async function (response) {
          await db.updatePesanTerjadwal('sukses',tanggal_sekarang,id);
        })
        .catch(async function (error) {
          await db.updatePesanTerjadwal('sukses',tanggal_sekarang,id);
          console.log(error);
        });
      }
    }
  }
};
setInterval(kirim, 10000);
