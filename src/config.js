const dotenv = require('dotenv');

dotenv.config();

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3000),
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'event-driven-user-activity-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'user-activity-events',
    consumerGroup: process.env.KAFKA_CONSUMER_GROUP || 'user-activity-consumer-group',
    connectionTimeout: parseNumber(process.env.KAFKA_CONNECTION_TIMEOUT_MS, 10000),
    requestTimeout: parseNumber(process.env.KAFKA_REQUEST_TIMEOUT_MS, 30000),
    producerRetries: parseNumber(process.env.KAFKA_PRODUCER_RETRIES, 3),
    producerRetryBackoffMs: parseNumber(process.env.KAFKA_PRODUCER_RETRY_BACKOFF_MS, 500)
  }
};