const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE = "cab_events";

let _conn = null;
let _pubCh = null;

async function _connect() {
  if (_conn) return _conn;
  _conn = await amqp.connect(RABBITMQ_URL);
  _conn.on("error", () => { _conn = null; _pubCh = null; });
  _conn.on("close", () => { _conn = null; _pubCh = null; });
  return _conn;
}

async function _pubChannel() {
  if (_pubCh) return _pubCh;
  const conn = await _connect();
  _pubCh = await conn.createChannel();
  await _pubCh.assertExchange(EXCHANGE, "topic", { durable: true });
  return _pubCh;
}

async function publish(event, payload) {
  try {
    const ch = await _pubChannel();
    ch.publish(EXCHANGE, event, Buffer.from(JSON.stringify({ event, payload })), { persistent: true });
    console.log(`[rabbitmq] published "${event}"`);
  } catch (err) {
    console.error(`[rabbitmq] publish "${event}" lỗi:`, err.message);
  }
}

async function subscribe(event, handler) {
  try {
    const conn = await _connect();
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    const { queue } = await ch.assertQueue("", { exclusive: true });
    await ch.bindQueue(queue, EXCHANGE, event);
    await ch.consume(queue, async (msg) => {
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
    console.log(`[rabbitmq] subscribed "${event}"`);
  } catch (err) {
    console.error(`[rabbitmq] subscribe "${event}" lỗi:`, err.message);
  }
}

module.exports = { publish, subscribe };
