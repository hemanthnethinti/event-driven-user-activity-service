const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { validateGenerateEventRequest } = require('./events/userEvent');

function createApp({ eventProducer, processedEventsStore }) {
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/events/generate', async (req, res) => {
    const validationErrors = validateGenerateEventRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Invalid request payload',
        errors: validationErrors
      });
    }

    const event = {
      eventId: uuidv4(),
      userId: req.body.userId,
      eventType: req.body.eventType,
      timestamp: new Date().toISOString(),
      payload: req.body.payload || {}
    };

    try {
      await eventProducer.publishEvent(event);
      return res.status(201).json({ eventId: event.eventId });
    } catch (error) {
      console.error('Failed to publish event', error.message);
      return res.status(500).json({ message: 'Failed to publish event' });
    }
  });

  app.get('/events/processed', (_req, res) => {
    return res.status(200).json(processedEventsStore.getAll());
  });

  app.use((err, _req, res, _next) => {
    console.error('Unhandled server error', err);
    return res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}

module.exports = {
  createApp
};