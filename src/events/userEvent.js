const ALLOWED_EVENT_TYPES = ['LOGIN', 'LOGOUT', 'PRODUCT_VIEW'];

function validateGenerateEventRequest(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return ['Request body must be a JSON object'];
  }

  if (!input.userId || typeof input.userId !== 'string' || input.userId.trim().length === 0) {
    errors.push('userId is required and must be a non-empty string');
  }

  if (!input.eventType || typeof input.eventType !== 'string') {
    errors.push('eventType is required and must be a string');
  } else if (!ALLOWED_EVENT_TYPES.includes(input.eventType)) {
    errors.push(`eventType must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}`);
  }

  if (input.payload !== undefined && (typeof input.payload !== 'object' || input.payload === null || Array.isArray(input.payload))) {
    errors.push('payload must be a JSON object when provided');
  }

  return errors;
}

function isValidUserEvent(event) {
  if (!event || typeof event !== 'object') {
    return false;
  }

  return Boolean(
    event.eventId &&
    typeof event.eventId === 'string' &&
    event.userId &&
    typeof event.userId === 'string' &&
    event.eventType &&
    ALLOWED_EVENT_TYPES.includes(event.eventType) &&
    event.timestamp &&
    typeof event.timestamp === 'string' &&
    event.payload &&
    typeof event.payload === 'object' &&
    !Array.isArray(event.payload)
  );
}

module.exports = {
  ALLOWED_EVENT_TYPES,
  validateGenerateEventRequest,
  isValidUserEvent
};