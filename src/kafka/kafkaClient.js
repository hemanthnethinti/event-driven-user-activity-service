const { Kafka, logLevel } = require('kafkajs');

function createKafkaClient(kafkaConfig) {
  return new Kafka({
    clientId: kafkaConfig.clientId,
    brokers: kafkaConfig.brokers,
    connectionTimeout: kafkaConfig.connectionTimeout,
    requestTimeout: kafkaConfig.requestTimeout,
    logLevel: logLevel.NOTHING
  });
}

module.exports = {
  createKafkaClient
};