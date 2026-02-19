const { createKafkaClient } = require('./kafkaClient');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createEventProducer(kafkaConfig, deps = {}) {
  const kafka = createKafkaClient(kafkaConfig);
  const producer = deps.producer || kafka.producer();

  async function connect() {
    await producer.connect();
  }

  async function disconnect() {
    await producer.disconnect();
  }

  async function publishEvent(event) {
    let lastError;

    for (let attempt = 1; attempt <= kafkaConfig.producerRetries + 1; attempt += 1) {
      try {
        await producer.send({
          topic: kafkaConfig.topic,
          messages: [
            {
              key: event.eventId,
              value: JSON.stringify(event)
            }
          ]
        });

        return;
      } catch (error) {
        lastError = error;
        console.error(`Producer send failed (attempt ${attempt})`, error.message);

        if (attempt <= kafkaConfig.producerRetries) {
          await sleep(kafkaConfig.producerRetryBackoffMs * attempt);
        }
      }
    }

    throw new Error(`Unable to publish event after retries: ${lastError ? lastError.message : 'Unknown error'}`);
  }

  return {
    connect,
    disconnect,
    publishEvent
  };
}

module.exports = {
  createEventProducer
};