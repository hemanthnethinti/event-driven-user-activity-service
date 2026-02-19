# Architecture

## Overview

This is a single-process Node.js microservice that acts as both a Kafka **producer** and **consumer** for user activity events. It exposes a REST API via Express and communicates asynchronously through Apache Kafka.

```
┌──────────────────────────────────────────────────────────────┐
│                      app-service                             │
│                                                              │
│  ┌────────────┐      ┌──────────┐      ┌────────────────┐   │
│  │ Express API │─────▶│ Producer │─────▶│  Kafka Topic   │   │
│  │            │      └──────────┘      │ user-activity-  │   │
│  │ POST /events│                       │   events        │   │
│  │   /generate │                       └───────┬────────┘   │
│  │            │                                │             │
│  │ GET /events │      ┌──────────┐             │             │
│  │  /processed │◀─────│  Store   │◀────────────┤             │
│  └────────────┘      │ (in-mem) │      ┌──────┴─────┐      │
│                       └──────────┘      │  Consumer  │      │
│                                         │  (group:   │      │
│                                         │  user-     │      │
│                                         │  activity- │      │
│                                         │  consumer) │      │
│                                         └────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### API Layer (`src/app.js`)

- **POST /events/generate** — Validates incoming requests, generates a `UserEvent` (UUID + ISO timestamp), publishes to Kafka, returns the `eventId`.
- **GET /events/processed** — Returns all events that the consumer has stored in memory.
- **GET /health** — Simple liveness probe used by Docker health checks.

### Kafka Producer (`src/kafka/producer.js`)

- Publishes events to the `user-activity-events` topic.
- Implements retry with incremental backoff (configurable via `KAFKA_PRODUCER_RETRIES` and `KAFKA_PRODUCER_RETRY_BACKOFF_MS`).
- On exhausted retries, the error propagates to the API handler which returns HTTP 500.

### Kafka Consumer (`src/kafka/consumer.js`)

- Subscribes to `user-activity-events` in group `user-activity-consumer-group`.
- Defensively handles malformed messages (`JSON.parse` errors are caught and logged, message is skipped).
- Validates event schema before processing (rejects structurally invalid events).
- Delegates valid events to the Event Processor.

### Event Processor (`src/services/eventProcessor.js`)

- Accepts a parsed event and delegates to the store using `addIfNew`.
- Logs processed events (eventId, userId, eventType) to stdout.
- Logs duplicate events as skipped.

### In-Memory Store (`src/store/processedEventsStore.js`)

- Uses a `Map` keyed by `eventId` for O(1) deduplication lookups.
- Maintains an ordered array of events for the `/events/processed` response.
- Provides `addIfNew`, `getAll`, `has`, `clear`, `count` operations.

### Configuration (`src/config.js`)

- All Kafka and app settings loaded from environment variables with sensible defaults.
- Uses `dotenv` for local development outside Docker.

## Idempotency Strategy

Duplicate detection is performed at the store level. Before inserting an event, the store checks whether its `eventId` already exists in the `Map`. If it does, the event is silently discarded and the consumer moves on. This guarantees that even if the same event is delivered multiple times by Kafka (e.g., consumer rebalance, `fromBeginning: true` re-read), it will only be stored and counted once.

## Error Handling

| Scenario                            | Behavior                                                              |
| ----------------------------------- | --------------------------------------------------------------------- |
| Producer send fails                 | Retries up to N times with incremental backoff, then returns HTTP 500 |
| Consumer receives malformed JSON    | Logs error, skips message, continues consuming                        |
| Consumer receives invalid schema    | Logs error, skips message, continues consuming                        |
| Event processing throws             | Logs error, skips message, continues consuming                        |
| Startup failure (Kafka unreachable) | Logs error, `process.exit(1)`                                         |
| Graceful shutdown (SIGINT/SIGTERM)  | Disconnects consumer, producer, closes HTTP server                    |

## Docker Orchestration

`docker-compose.yml` defines three services:

1. **zookeeper** — Required by Kafka, health-checked via `ruok` four-letter command.
2. **kafka** — Single-broker setup, health-checked via `kafka-broker-api-versions`.
3. **app-service** — Waits for Kafka to be healthy before starting, health-checked via `/health` endpoint.

All services include `start_period`, `interval`, `timeout`, and `retries` in their health checks.

## Production Considerations

If this service were deployed to production, the following enhancements would be applied:

- **Persistent storage** (PostgreSQL/Redis) instead of in-memory store.
- **Dead Letter Queue (DLQ)** for events that fail processing after retries.
- **Schema Registry** (Confluent or custom) for forward/backward compatible schema evolution.
- **Observability** — structured logging, distributed tracing (OpenTelemetry), Prometheus metrics.
- **Horizontal scaling** — multiple consumer instances in the same group, partitioned by `userId` key.
- **Security** — TLS for Kafka connections, API authentication/authorization.
