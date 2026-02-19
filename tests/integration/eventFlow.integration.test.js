const request = require('supertest');

const config = require('../../src/config');
const { createApp } = require('../../src/app');
const { createEventProducer } = require('../../src/kafka/producer');
const { createEventConsumer } = require('../../src/kafka/consumer');
const { createProcessedEventsStore } = require('../../src/store/processedEventsStore');
const { createEventProcessor } = require('../../src/services/eventProcessor');

jest.setTimeout(30000);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(conditionFn, timeoutMs = 10000, intervalMs = 200) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (conditionFn()) {
      return;
    }
    await wait(intervalMs);
  }

  throw new Error('Timed out waiting for condition');
}

describe('integration: publish and consume user activity events', () => {
  let producer;
  let consumer;
  let store;
  let app;

  const testKafkaConfig = {
    ...config.kafka,
    consumerGroup: `test-consumer-group-${Date.now()}`
  };

  beforeAll(async () => {
    store = createProcessedEventsStore();
    producer = createEventProducer(testKafkaConfig);
    const processor = createEventProcessor(store);
    consumer = createEventConsumer(testKafkaConfig, processor);

    await producer.connect();
    await consumer.connect();
    await consumer.start();

    app = createApp({
      eventProducer: producer,
      processedEventsStore: store
    });
  });

  afterAll(async () => {
    if (consumer) {
      await consumer.disconnect();
    }

    if (producer) {
      await producer.disconnect();
    }
  });

  test('POST /events/generate publishes to Kafka and GET /events/processed returns consumed events', async () => {
    store.clear();

    const payloads = [
      { userId: 'user-a', eventType: 'LOGIN', payload: { ip: '10.0.0.1' } },
      { userId: 'user-b', eventType: 'PRODUCT_VIEW', payload: { productId: 'p-123' } },
      { userId: 'user-c', eventType: 'LOGOUT', payload: {} }
    ];

    for (const payload of payloads) {
      const response = await request(app).post('/events/generate').send(payload);
      expect(response.statusCode).toBe(201);
      expect(response.body.eventId).toEqual(expect.any(String));
    }

    await waitFor(() => store.count() >= payloads.length);

    const processedResponse = await request(app).get('/events/processed');
    expect(processedResponse.statusCode).toBe(200);
    expect(Array.isArray(processedResponse.body)).toBe(true);
    expect(processedResponse.body.length).toBeGreaterThanOrEqual(payloads.length);

    for (const event of processedResponse.body) {
      expect(event).toEqual(
        expect.objectContaining({
          eventId: expect.any(String),
          userId: expect.any(String),
          eventType: expect.any(String),
          timestamp: expect.any(String)
        })
      );
    }
  });

  test('invalid POST /events/generate payload returns 400', async () => {
    const response = await request(app)
      .post('/events/generate')
      .send({ userId: '', eventType: 'INVALID_TYPE' });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        message: 'Invalid request payload',
        errors: expect.any(Array)
      })
    );
  });

  test('duplicate eventId is processed only once', async () => {
    store.clear();

    const duplicateEvent = {
      eventId: 'duplicate-event-1',
      userId: 'dup-user',
      eventType: 'LOGIN',
      timestamp: new Date().toISOString(),
      payload: { source: 'integration-test' }
    };

    await producer.publishEvent(duplicateEvent);
    await producer.publishEvent(duplicateEvent);

    await waitFor(() => store.has('duplicate-event-1'));
    await wait(500);

    const processed = store.getAll().filter((event) => event.eventId === 'duplicate-event-1');
    expect(processed.length).toBe(1);
  });
});