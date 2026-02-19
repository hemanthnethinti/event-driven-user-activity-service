const { createProcessedEventsStore } = require('../../src/store/processedEventsStore');
const { createEventProcessor } = require('../../src/services/eventProcessor');

describe('event processing and idempotency', () => {
  test('stores only unique events by eventId', async () => {
    const store = createProcessedEventsStore();
    const processEvent = createEventProcessor(store);

    const baseEvent = {
      eventId: 'event-1',
      userId: 'user-1',
      eventType: 'LOGIN',
      timestamp: new Date().toISOString(),
      payload: {}
    };

    await processEvent(baseEvent);
    await processEvent({ ...baseEvent });

    expect(store.count()).toBe(1);
    expect(store.has('event-1')).toBe(true);
  });

  test('stores multiple distinct events', async () => {
    const store = createProcessedEventsStore();
    const processEvent = createEventProcessor(store);

    await processEvent({
      eventId: 'event-1',
      userId: 'user-1',
      eventType: 'LOGIN',
      timestamp: new Date().toISOString(),
      payload: {}
    });

    await processEvent({
      eventId: 'event-2',
      userId: 'user-2',
      eventType: 'LOGOUT',
      timestamp: new Date().toISOString(),
      payload: {}
    });

    expect(store.count()).toBe(2);
    expect(store.getAll().map((event) => event.eventId)).toEqual(['event-1', 'event-2']);
  });
});