function createProcessedEventsStore() {
  const processedById = new Map();
  const orderedEvents = [];

  function addIfNew(event) {
    if (processedById.has(event.eventId)) {
      return false;
    }

    processedById.set(event.eventId, event);
    orderedEvents.push(event);
    return true;
  }

  function getAll() {
    return [...orderedEvents];
  }

  function has(eventId) {
    return processedById.has(eventId);
  }

  function clear() {
    processedById.clear();
    orderedEvents.length = 0;
  }

  function count() {
    return orderedEvents.length;
  }

  return {
    addIfNew,
    getAll,
    has,
    clear,
    count
  };
}

module.exports = {
  createProcessedEventsStore
};