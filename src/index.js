const config = require('./config');
const { bootstrap } = require('./bootstrap');

async function startServer() {
  let httpServer;
  let producer;
  let consumer;

  try {
    const boot = await bootstrap();
    producer = boot.producer;
    consumer = boot.consumer;

    httpServer = boot.app.listen(config.port, () => {
      console.log(`Service listening on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start service', error);
    process.exit(1);
  }

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down...`);

    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    if (consumer) {
      await consumer.disconnect();
    }

    if (producer) {
      await producer.disconnect();
    }

    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer();