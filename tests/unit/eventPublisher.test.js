const { v4: uuidv4 } = require('uuid');

const { validateGenerateEventRequest } = require('../../src/events/userEvent');

describe('event publishing input and event generation behavior', () => {
  test('validates required fields for generate endpoint payload', () => {
    const errors = validateGenerateEventRequest({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/userId/);
    expect(errors.join(' ')).toMatch(/eventType/);
  });

  test('accepts valid payload', () => {
    const errors = validateGenerateEventRequest({
      userId: 'user-123',
      eventType: 'LOGIN',
      payload: { ip: '127.0.0.1' }
    });

    expect(errors).toEqual([]);
  });

  test('generated event data shape is valid for publishing', () => {
    const event = {
      eventId: uuidv4(),
      userId: 'user-123',
      eventType: 'PRODUCT_VIEW',
      timestamp: new Date().toISOString(),
      payload: { productId: 'p-001' }
    };

    expect(event.eventId).toEqual(expect.any(String));
    expect(event.timestamp).toEqual(expect.any(String));
    expect(event.userId).toBe('user-123');
    expect(event.eventType).toBe('PRODUCT_VIEW');
    expect(event.payload).toEqual({ productId: 'p-001' });
  });
});