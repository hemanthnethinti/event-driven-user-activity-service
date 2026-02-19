const { createKafkaClient } = require('./kafkaClient');
const { isValidUserEvent } = require('../events/userEvent');

function createEventConsumer(kafkaConfig, onEvent) {
  const kafka = createKafkaClient(kafkaConfig);
  const consumer = kafka.consumer({ groupId: kafkaConfig.consumerGroup });

  async function connect() {
    await consumer.connect();
    await consumer.subscribe({ topic: kafkaConfig.topic, fromBeginning: true });
  }

  async function disconnect() {
    await consumer.disconnect();
  }

  async function start() {
    await consumer.run({
      eachMessage: async ({ message }) => {
        let parsed;

        try {
          parsed = JSON.parse((message.value || Buffer.from('{}')).toString());
        } catch (error) {
          console.error('Malformed message received. Skipping message.', error.message);
          return;
        }

        if (!isValidUserEvent(parsed)) {
          console.error('Invalid UserEvent schema received. Skipping message.');
          return;
        }

        try {
          await onEvent(parsed);
        } catch (error) {
          console.error('Event processing failed. Skipping message.', error.message);
        }
      }
    });
  }

  return {
    connect,
    disconnect,
    start
  };
}

module.exports = {
  createEventConsumer
};