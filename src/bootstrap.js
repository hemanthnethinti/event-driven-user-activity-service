const config = require('./config');
const { createApp } = require('./app');
const { createEventProducer } = require('./kafka/producer');
const { createEventConsumer } = require('./kafka/consumer');
const { createProcessedEventsStore } = require('./store/processedEventsStore');
const { createEventProcessor } = require('./services/eventProcessor');

async function bootstrap() {
  const store = createProcessedEventsStore();
  const producer = createEventProducer(config.kafka);
  const processor = createEventProcessor(store);
  const consumer = createEventConsumer(config.kafka, processor);

  await producer.connect();
  await consumer.connect();
  await consumer.start();

  const app = createApp({
    eventProducer: producer,
    processedEventsStore: store
  });

  return {
    app,
    producer,
    consumer,
    store
  };
}

module.exports = {
  bootstrap
};