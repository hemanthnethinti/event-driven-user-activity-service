function createEventProcessor(processedEventsStore) {
  return async function processEvent(event) {
    const isNew = processedEventsStore.addIfNew(event);

    if (isNew) {
      console.log(`Processed event: eventId=${event.eventId}, userId=${event.userId}, eventType=${event.eventType}`);
    } else {
      console.log(`Duplicate event ignored: eventId=${event.eventId}`);
    }
  };
}

module.exports = {
  createEventProcessor
};