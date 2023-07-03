const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'wa_asyik',
  password: 'admin',
  port: 5432,
});

client.connect();

const all_session  = async() => {
  try {
    const res = await client.query('SELECT * FROM wa_session');
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const getkeyword  = async(sender,keyword) => {
  try {
    const res = await client.query('SELECT id_event_autoresponder FROM wa_event_autoresponder WHERE sender_event_autoresponder = $1 AND WHERE keyword_event_autoresponder = $2', [sender,keyword]);
    if (res.rows.length) return res.rows[0].session;
  } catch (e) {
    throw e;
  }
}

const all_pesan_terjadwal  = async(tanggal) => {
  try {
    const res = await client.query('SELECT * FROM wa_pesan_terjadwal WHERE status_pesan_terjadwal = $1 AND tanggal_pesan_terjadwal <= $2 ORDER BY tanggal_pesan_terjadwal ASC LIMIT 10', ['antri',tanggal]);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const readSession = async (phone) => {
  try {
    const res = await client.query('SELECT session FROM wa_session WHERE nomor_hp = $1', [phone]);
    if (res.rows.length) return res.rows[0].session;
  } catch (e) {
    throw e;
  }
}

const readAutoresponder = async (phone,keyword) => {
  try {
    const res = await client.query('SELECT * FROM wa_autoresponder WHERE sender_autoresponder = $1 AND status = $2 AND event_id = $3', [phone,'aktif',keyword]);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const readContact = async (phone,acara) => {
  try {
    const res = await client.query('SELECT * FROM wa_user_autoresponder WHERE nomor_user_autoresponder = $1 AND WHERE event_user_autoresponder = $2', [phone,acara]);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const readPesanTerjadwal = async (sender,tujuan) => {
  try {
    const res = await client.query('SELECT * FROM wa_pesan_terjadwal WHERE pengirim_pesan_terjadwal = $1 AND penerima_pesan_terjadwal = $2 AND sumber_pesan = $3 ORDER BY tanggal_pesan_terjadwal DESC LIMIT 1', [sender,tujuan,'autoresponder']);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const all_broadcast = async () => {
  try {
    const res = await client.query('SELECT * FROM wa_broadcast');
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const getBroadcast = async (id) => {
  try {
    const res = await client.query('SELECT * FROM wa_broadcast_detail WHERE broadcast_id = $1 ORDER BY urutan ASC', [id]);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const saveSession = async (user_id,nomor_hp,session,date) => {
  client.query('INSERT INTO wa_session (user_id,nomor_hp, session, create_at) values($1,$2,$3,$4)', [user_id,nomor_hp,session,date], (err, results) => {
    if(err){
      console.log('failed to save session', err);
    }else{
      console.log('session save');
    }
  });
}

const saveContact = async (nama_contact,nomor_contact,acara) => {
  client.query('INSERT INTO wa_user_autoresponder (nama_user_autoresponder,nomor_event_autoresponder,event_user_autoresponder) values($1,$2,$3)', [nama_contact,nomor_contact,acara], (err, results) => {
    if(err){
      console.log('failed to save contact', err);
    }
  });
}

const savePesanTerjadwal = async (tanggal,sender,pengirim,penerima,pesan,gambar,footer,create) => {
  client.query('INSERT INTO wa_pesan_terjadwal (tanggal_pesan_terjadwal,sender_id,pengirim_pesan_terjadwal,penerima_pesan_terjadwal,message_pesan_terjadwal,image_pesan_terjadwal,footer_pesan_terjadwal,status_pesan_terjadwal,create_date,tanggal_sukses,sumber_pesan) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [tanggal,sender,pengirim,penerima,pesan,gambar,footer,'antri',create,'','autoresponder'], (err, results) => {
    if(err){
      console.log('failed to save', err);
    }else{
      console.log('data saved');
    }
  });
}

const removeSession = async (nomor_hp) => {
  client.query('DELETE FROM wa_session WHERE nomor_hp = $1', [nomor_hp], (err, results) => {
    if(err){
      console.log('failed to remove', err);
    }else{
      console.log('success remove');
    }
  });
}

const removeContact = async (sender,nomor_hp) => {
  client.query('DELETE FROM wa_contact WHERE sender_contact = $1 AND nomor_contact = $2', [sender,nomor_hp], (err, results) => {
    if(err){
      console.log('failed to remove', err);
    }else{
      console.log('success remove');
    }
  });
}

const removePesanTerjadwal = async (sender,tujuan) => {
  try {
    const res = await client.query('DELETE FROM wa_pesan_terjadwal WHERE pengirim_pesan_terjadwal = $1 AND penerima_pesan_terjadwal = $2 AND sumber_pesan = $3 AND status_pesan_terjadwal = $4', [sender,tujuan,'autoresponder','antri']);
    if (res.rows.length) return res.rows;
  } catch (e) {
    throw e;
  }
}

const updatePesanTerjadwal = async (status,tanggal,id) => {
  client.query('UPDATE wa_pesan_terjadwal SET status_pesan_terjadwal = $1, tanggal_sukses = $2 WHERE id_pesan_terjadwal = $3', [status,tanggal,id], (err, results) => {
    if(err){
      console.log('failed to update', err);
    }
  });
}


module.exports = {
  readSession,
  saveSession,
  readContact,
  saveContact,
  removeSession,
  removeContact,
  removePesanTerjadwal,
  all_broadcast,
  getBroadcast,
  all_session,
  all_pesan_terjadwal,
  readAutoresponder,
  savePesanTerjadwal,
  readPesanTerjadwal,
  updatePesanTerjadwal,
  getkeyword
}
