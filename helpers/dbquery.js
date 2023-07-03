const mysql = require ('mysql2/promise');

const createConnection = async() => {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'wa_asyik'
  });
}

const getReply = async(keyword) => {
  const connection = await createConnection();
  const [rows]     = await connection.execute('SELECT message FROM wa_replies WHERE keyword = ?', [keyword]);
  if (rows.length > 0) return rows[0].message;
  return false;
}

const readSession  = async(phone) => {
  const connection = await createConnection();
  const [rows]     = await connection.execute('SELECT session FROM wa_session WHERE nomor_hp = ?', [phone]);
  if (rows.length > 0) return rows[0].session;
  return false;
}

const all_session  = async() => {
  const connection = await createConnection();
  const [rows]     = await connection.execute('SELECT * FROM wa_session');
  if (rows.length > 0) return rows;
  return false;
}

const all_broadcast= async() => {
  const connection = await createConnection();
  const [rows]     = await connection.execute('SELECT * FROM wa_broadcast ORDER BY tanggal_broadcast ASC LIMIT 5');
  if (rows.length > 0) return rows;
  return false;
}

const getBroadcast = async(id) => {
  const connection = await createConnection();
  const [rows]     = await connection.execute('SELECT * FROM wa_broadcast_detail WHERE broadcast_id = ?', [id]);
  if (rows.length > 0) return rows;
  return false;
}

const saveSession  = async(nomor_hp,session) => {
  const connection = await createConnection();
  await connection.execute('INSERT INTO wa_session (nomor_hp, session) VALUES (?,?)', [nomor_hp, session],(error,
  results) => {
  if (error) return error;
  });
  return 'data berhasil di input';
}

const removeSession  = async(nomor_hp) => {
  const connection = await createConnection();
  await connection.execute('DELETE FROM wa_session WHERE nomor_hp = ?', [nomor_hp],(error,
  results) => {
  if (error) return error;
  });
  return 'data berhasil di hapus';
}

module.exports = {
  createConnection,
  getReply,
  saveSession,
  readSession,
  removeSession,
  all_session,
  all_broadcast,
  getBroadcast
}
