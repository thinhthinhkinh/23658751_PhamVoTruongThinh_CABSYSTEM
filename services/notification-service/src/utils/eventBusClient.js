const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const SERVICE_NAME = process.env.SERVICE_NAME || "service";
const EXCHANGE = "cab_events";

let _conn = null;
let _pubCh = null;
const _subs = []; // { event, handler, queueName }

async function _connect() {
  const conn = await amqp.connect(RABBITMQ_URL);
  conn.on("error", () => { _conn = null; _pubCh = null; _scheduleReconnect(); });
  conn.on("close", () => { _conn = null; _pubCh = null; _scheduleReconnect(); });
  _conn = conn;
  return conn;
}

function _scheduleReconnect() {
  setTimeout(() => _reconnect().catch(() => _scheduleReconnect()), 3000);
}

async function _reconnect() {
  const conn = await _connect();
  for (const s of _subs) await _doSubscribe(conn, s.event, s.handler, s.queueName);
}

async function _doSubscribe(conn, event, handler, queueName) {
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, "topic", { durable: true });
  await ch.assertQueue(queueName, { durable: true });
  await ch.bindQueue(queueName, EXCHANGE, event);
  await ch.consume(queueName, async (msg) => {
    if (!msg) return;
    try {
      const { payload } = JSON.parse(msg.content.toString());
      if (typeof handler === "function") await handler(payload);
      ch.ack(msg);
    } catch (err) {
      console.error(`[rabbitmq] handler "${event}" lỗi:`, err.message);
      ch.nack(msg, false, false);
    }
  });
  console.log(`[rabbitmq] subscribed "${event}" (queue: ${queueName})`);
}

async function publish(event, payload) {
  try {
    if (!_conn) await _connect();
    if (!_pubCh) {
      _pubCh = await _conn.createChannel();
      await _pubCh.assertExchange(EXCHANGE, "topic", { durable: true });
    }
    _pubCh.publish(EXCHANGE, event, Buffer.from(JSON.stringify({ event, payload })), { persistent: true });
    console.log(`[rabbitmq] published "${event}"`);
  } catch (err) {
    console.error(`[rabbitmq] publish "${event}" lỗi:`, err.message);
    _pubCh = null;
  }
}

async function subscribe(event, handler) {
  try {
    const queueName = `${SERVICE_NAME}.${event}`;
    _subs.push({ event, handler, queueName });
    if (!_conn) await _connect();
    await _doSubscribe(_conn, event, handler, queueName);
  } catch (err) {
    console.error(`[rabbitmq] subscribe "${event}" lỗi:`, err.message);
  }
}

module.exports = { publish, subscribe };
