const CURRENT_EVENT_KEY = "rede-da-festa.current-event-id";

export function setCurrentEventId(eventId: string) {
  window.localStorage.setItem(CURRENT_EVENT_KEY, eventId);
}

export function getCurrentEventId() {
  return window.localStorage.getItem(CURRENT_EVENT_KEY) ?? "";
}

export function clearCurrentEventId() {
  window.localStorage.removeItem(CURRENT_EVENT_KEY);
}
