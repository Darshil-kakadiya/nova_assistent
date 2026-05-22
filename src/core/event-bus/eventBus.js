class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, cb) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(cb);
  }

  emit(event, data) {
    if (this.events.has(event)) {
      for (const cb of this.events.get(event)) {
        try { cb(data); } catch (e) { /* silent */ }
      }
    }
  }

  off(event, cb) {
    if (this.events.has(event)) {
      const arr = this.events.get(event);
      const i = arr.indexOf(cb);
      if (i > -1) arr.splice(i, 1);
    }
  }
}

export default EventBus;
