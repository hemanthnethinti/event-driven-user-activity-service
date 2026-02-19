const { createEventProducer } = require('../../src/kafka/producer');

describe('kafka producer publish behavior', () => {
  const kafkaConfig = {
    clientId: 'test-client',
    brokers: ['localhost:9092'],
    topic: 'user-activity-events',
    producerRetries: 2,
    producerRetryBackoffMs: 1,
    connectionTimeout: 1000,
    requestTimeout: 1000
  };

  test('publishes event successfully', async () => {
    const mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined)
    };

    const producer = createEventProducer(kafkaConfig, { producer: mockProducer });
    await producer.publishEvent({ eventId: 'evt-1', userId: 'u1', eventType: 'LOGIN', timestamp: new Date().toISOString(), payload: {} });

    expect(mockProducer.send).toHaveBeenCalledTimes(1);
    expect(mockProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: kafkaConfig.topic,
        messages: [
          expect.objectContaining({
            key: 'evt-1'
          })
        ]
      })
    );
  });

  test('retries publishing and eventually succeeds', async () => {
    const mockProducer = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      send: jest
        .fn()
        .mockRejectedValueOnce(new Error('temporary broker error'))
        .mockResolvedValueOnce(undefined)
    };

    const producer = createEventProducer(kafkaConfig, { producer: mockProducer });
    await producer.publishEvent({ eventId: 'evt-2', userId: 'u1', eventType: 'LOGIN', timestamp: new Date().toISOString(), payload: {} });

    expect(mockProducer.send).toHaveBeenCalledTimes(2);
  });
});