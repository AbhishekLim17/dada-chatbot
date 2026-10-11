function logEvent(event, message, extra = {}) {
  console.log(JSON.stringify({
    event,
    message,
    timestamp: new Date().toISOString(),
    ...extra
  }));
}

function logError(event, message, error, extra = {}) {
  console.error(JSON.stringify({
    event,
    message,
    timestamp: new Date().toISOString(),
    error: error?.message || String(error),
    stack: error?.stack,
    ...extra
  }));
}

function logWarn(event, message, extra = {}) {
  console.warn(JSON.stringify({
    event,
    message,
    timestamp: new Date().toISOString(),
    ...extra
  }));
}

module.exports = { logEvent, logError, logWarn };
