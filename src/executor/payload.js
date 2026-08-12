// payload guard
(function () {
const UNLOAD_KEY = '__n' + 'b' + 'u';
if (typeof globalThis[UNLOAD_KEY] === 'function') {
  try { globalThis[UNLOAD_KEY](); } catch (e) {}
}

const WS_URL = 'ws://127.0.0.1:8080';
let socket = null;
let reconnectTimer = null;
let helloTimer = null;
let unloading = false;
const scriptCleanups = new Map();
const menuCallbacks = new Map();
const menuSnapshots = new Map();
const bridgeConfig = {};
const SERVER_CODE_TO_ID = {
  RU1: 'new york',
  RU2: 'detroit',
  RU3: 'chicago',
  RU4: 'san francisco',
  RU5: 'atlanta',
  RU6: 'san diego',
  RU7: 'los angeles',
  RU8: 'miami',
  RU9: 'las vegas',
  RU10: 'washington',
  RU11: 'dallas',
  RU12: 'boston',
  RU13: 'houston',
  RU14: 'seattle',
  RU15: 'phoenix',
  RU16: 'denver',
  RU17: 'portland',
  RU18: 'orlando',
  RU19: 'memphis',
};
let payloadServerInfo = null;
let payloadServerInfoLocked = false;
let configReceived = false;

function stopSocket() {
  if (helloTimer) {
    alt.clearInterval(helloTimer);
    helloTimer = null;
  }
  if (socket) {
    try { socket.stop(); } catch (e) {}
    socket = null;
  }
}

function clearReconnect() {
  if (reconnectTimer) {
    alt.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (unloading || reconnectTimer) return;
  reconnectTimer = alt.setTimeout(function () {
    reconnectTimer = null;
    connect();
  }, 1000);
}

function applyConfig(message) {
  configReceived = true;
  if (helloTimer) {
    alt.clearInterval(helloTimer);
    helloTimer = null;
  }
}

function normalizeServerCode(value) {
  return value === undefined || value === null ? '' : String(value).trim().toUpperCase().replace(/\s+/g, '');
}

function readPayloadServerInfo() {
  const code = normalizeServerCode(globalThis.server);
  const server = SERVER_CODE_TO_ID[code] || '';
  return {
    op: 2,
    source: 'payload',
    code: code,
    server: server,
    recognized: server.length > 0,
  };
}

function currentPayloadServerInfo() {
  if (!payloadServerInfoLocked) {
    payloadServerInfo = readPayloadServerInfo();
    if (payloadServerInfo.recognized) payloadServerInfoLocked = true;
  }
  return payloadServerInfo || readPayloadServerInfo();
}

function lockPayloadServerInfo() {
  if (!payloadServerInfoLocked) {
    payloadServerInfo = readPayloadServerInfo();
    if (payloadServerInfo.recognized) payloadServerInfoLocked = true;
  }
  sendBridgeMessage(payloadServerInfo);
}

function sendPayloadServerInfo() {
  sendBridgeMessage(currentPayloadServerInfo());
}

function sendBridgeMessage(message) {
  try { if (socket && socket.readyState === 1) socket.send(JSON.stringify(message)); } catch (e) {}
}

globalThis.noctuaBridgeSend = sendBridgeMessage;

function sendBridgeHello() {
  try {
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({ type: 'BRIDGE_HELLO', session: globalThis.noctuaBridgeSession || '', proof: globalThis.noctuaBridgeProof || '' }));
    }
  } catch (e) {}
}

function menuKey(script, id) {
  return script + '\x1f' + id;
}

function normalizeMenuId(label) {
  return String(label || 'item').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
}

function clamp01(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  if (number < 0) return 0;
  if (number > 1) return 1;
  return number;
}

function normalizeColor(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    r: clamp01(source.r, 1),
    g: clamp01(source.g, 1),
    b: clamp01(source.b, 1),
    a: clamp01(source.a, 1),
  };
}

function normalizeHotkey(value) {
  const source = value && typeof value === 'object' ? value : {};
  const mode = source.mode === 'toggle' || source.mode === 'always' ? source.mode : 'hold';
  return {
    key: Number(source.key) || 0,
    mode: mode,
    active: source.active === true,
  };
}

function normalizeOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map(function (option) {
    if (option && typeof option === 'object') {
      const id = option.id !== undefined ? String(option.id) : String(option.label || '');
      return { id: id, label: String(option.label !== undefined ? option.label : id) };
    }
    const id = String(option);
    return { id: id, label: id };
  }).filter(function (option) { return option.id.length > 0; });
}

function normalizeSelection(value, options) {
  const ids = new Set(options.map(function (option) { return option.id; }));
  if (Array.isArray(value)) {
    return value.map(String).filter(function (id, index, all) {
      return ids.has(id) && all.indexOf(id) === index;
    });
  }
  return [];
}

function normalizeItemValue(kind, value, extra) {
  if (kind === 'checkbox') return value === true;
  if (kind === 'slider') {
    const number = Number(value);
    return Number.isFinite(number) ? number : Number(extra && extra.min) || 0;
  }
  if (kind === 'combo') return Number.isInteger(value) ? value : 0;
  if (kind === 'input') return value === undefined || value === null ? '' : String(value);
  if (kind === 'color_picker') return normalizeColor(value);
  if (kind === 'multi_select') return normalizeSelection(value, extra && extra.options ? extra.options : []);
  if (kind === 'hotkey') return normalizeHotkey(value);
  if (kind === 'label') return String(value || '');
  return value;
}

function createNctApi(scriptName, resources) {
  let nextMenuId = 0;

  function registerItem(groupName, kind, label, value, extra) {
    const options = normalizeOptions(extra && extra.options);
    const id = (extra && extra.id) || normalizeMenuId(groupName + '_' + label) + '_' + (++nextMenuId);
    const state = {
      id: id,
      kind: kind,
      group: String(groupName || ''),
      label: String(label || id),
      value: normalizeItemValue(kind, value, { min: extra && extra.min, options: options }),
      visible: !extra || extra.visible !== false,
      disabled: extra && extra.disabled === true,
      tooltip: extra && extra.tooltip ? String(extra.tooltip) : '',
      parent: extra && extra.parent ? String(extra.parent) : '',
      options: options,
      min: extra && Number.isFinite(extra.min) ? extra.min : undefined,
      max: extra && Number.isFinite(extra.max) ? extra.max : undefined,
    };
    let callback = null;
    const handle = {
      get: function () { return state.value; },
      set: function (nextValue) {
        state.value = normalizeItemValue(kind, nextValue, { min: state.min, options: state.options || [] });
        sendBridgeMessage({ type: 'MENU_UPDATE', script: scriptName, id: id, patch: { value: state.value } });
        return handle;
      },
      setVisible: function (visible) {
        state.visible = visible === true;
        sendBridgeMessage({ type: 'MENU_UPDATE', script: scriptName, id: id, patch: { visible: state.visible } });
        return handle;
      },
      setDisabled: function (disabled) {
        state.disabled = disabled === true;
        sendBridgeMessage({ type: 'MENU_UPDATE', script: scriptName, id: id, patch: { disabled: state.disabled } });
        return handle;
      },
      setTooltip: function (text) {
        state.tooltip = text === undefined || text === null ? '' : String(text);
        sendBridgeMessage({ type: 'MENU_UPDATE', script: scriptName, id: id, patch: { tooltip: state.tooltip } });
        return handle;
      },
      set_callback: function (nextCallback, forceCall) {
        callback = typeof nextCallback === 'function' ? nextCallback : null;
        if (callback && forceCall === true) {
          try { callback(state.value); } catch (e) {}
        }
        return handle;
      },
      unset_callback: function () {
        callback = null;
        return handle;
      },
      color_picker: function (label, initial) {
        return registerItem(groupName, 'color_picker', label || 'color', initial || { r: 1, g: 1, b: 1, a: 1 }, { parent: id });
      },
      remove: function () {
        menuCallbacks.delete(menuKey(scriptName, id));
        sendBridgeMessage({ type: 'MENU_REMOVE', script: scriptName, id: id });
      },
    };
    menuCallbacks.set(menuKey(scriptName, id), {
      state: state,
      call: function (nextValue) {
        state.value = normalizeItemValue(kind, nextValue, { min: state.min, options: state.options || [] });
        if (callback) {
          try { callback(state.value); } catch (e) {}
        }
      },
    });
    resources.menuItems.push(id);
    sendBridgeMessage({ type: 'MENU_REGISTER', script: scriptName, item: state });
    return handle;
  }

  function createBuiltinHandle(item) {
    if (!item || !item.id) return null;
    const script = '__builtin';
    const id = String(item.id);
    const kind = String(item.kind || '');
    const state = {
      id: id,
      kind: kind,
      label: String(item.label || id),
      value: item.value,
      visible: item.visible !== false,
      disabled: item.disabled === true,
      tooltip: item.tooltip ? String(item.tooltip) : '',
      options: normalizeOptions(item.options || []),
    };
    let callback = null;
    const handle = {
      get: function () { return state.value; },
      set: function (nextValue) {
        state.value = normalizeItemValue(kind, nextValue, { options: state.options || [] });
        sendBridgeMessage({ type: 'MENU_UPDATE', script: script, id: id, patch: { value: state.value } });
        return handle;
      },
      setVisible: function (visible) {
        state.visible = visible === true;
        sendBridgeMessage({ type: 'MENU_UPDATE', script: script, id: id, patch: { visible: state.visible } });
        return handle;
      },
      setDisabled: function (disabled) {
        state.disabled = disabled === true;
        sendBridgeMessage({ type: 'MENU_UPDATE', script: script, id: id, patch: { disabled: state.disabled } });
        return handle;
      },
      setTooltip: function (text) {
        state.tooltip = text === undefined || text === null ? '' : String(text);
        sendBridgeMessage({ type: 'MENU_UPDATE', script: script, id: id, patch: { tooltip: state.tooltip } });
        return handle;
      },
      set_callback: function (nextCallback, forceCall) {
        callback = typeof nextCallback === 'function' ? nextCallback : null;
        if (callback && forceCall === true) {
          try { callback(state.value); } catch (e) {}
        }
        return handle;
      },
      unset_callback: function () {
        callback = null;
        return handle;
      },
      color_picker: function () { return null; },
      remove: function () {
        return handle;
      },
    };
    menuCallbacks.set(menuKey(script, id), {
      state: state,
      call: function (nextValue) {
        state.value = normalizeItemValue(kind, nextValue, { options: state.options || [] });
        if (callback) {
          try { callback(state.value); } catch (e) {}
        }
      },
    });
    return handle;
  }

  function group(groupName) {
    return {
      checkbox: function (label, initial, options) { return registerItem(groupName, 'checkbox', label, initial === true, options || {}); },
      slider: function (label, min, max, initial, options) {
        const minValue = Number(min);
        const maxValue = Number(max);
        const initialValue = Number.isFinite(Number(initial)) ? Number(initial) : minValue;
        const extra = options || {};
        extra.min = minValue;
        extra.max = maxValue;
        return registerItem(groupName, 'slider', label, initialValue, extra);
      },
      combo: function (label, options, initial, itemOptions) { return registerItem(groupName, 'combo', label, Number.isInteger(initial) ? initial : 0, Object.assign({}, itemOptions || {}, { options: options || [] })); },
      input: function (label, initial, options) { return registerItem(groupName, 'input', label, initial || '', options || {}); },
      color_picker: function (label, initial, options) { return registerItem(groupName, 'color_picker', label, normalizeColor(initial), options || {}); },
      multi_select: function (label, options, initial, itemOptions) { return registerItem(groupName, 'multi_select', label, initial || [], Object.assign({}, itemOptions || {}, { options: options || [] })); },
      button: function (label, options) { return registerItem(groupName, 'button', label, false, options || {}); },
      hotkey: function (label, initial, options) { return registerItem(groupName, 'hotkey', label, normalizeHotkey(initial), options || {}); },
      label: function (label, options) { return registerItem(groupName, 'label', label, String(label || ''), options || {}); },
    };
  }

  function find(tab, child, control) {
    const key = [tab, child, control].map(function (part) {
      return normalizeMenuId(part);
    }).join('/');
    const item = menuSnapshots.get(key);
    return item ? createBuiltinHandle(item) : null;
  }

  return { ui: { group: group, find: find } };
}

function applyMenuSnapshot(message) {
  menuSnapshots.clear();
  const items = Array.isArray(message.items) ? message.items : [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !Array.isArray(item.path) || item.path.length < 3) continue;
    const key = item.path.slice(0, 3).map(function (part) {
      return normalizeMenuId(part);
    }).join('/');
    menuSnapshots.set(key, item);
  }
}

function dispatchMenuEvent(message) {
  const key = menuKey(message.script || '', message.id || '');
  const entry = menuCallbacks.get(key);
  if (!entry) return;
  entry.call(message.value);
}

function executeScript(message) {
  lockPayloadServerInfo();
  const name = message.name || 'script';
  const code = message.code || '';
  if (scriptCleanups.has(name)) {
    try { scriptCleanups.get(name)(); } catch (e) {}
    scriptCleanups.delete(name);
  }
  const resources = { handlers: [], intervals: [], timeouts: [], everyTicks: [], onUnloadCallbacks: [], menuItems: [] };
  const altProxy = new Proxy(alt, {
    get(target, prop) {
      if (prop === 'on') return function (eventName, handler) {
        resources.handlers.push({ eventName: eventName, handler: handler });
        return target.on(eventName, handler);
      };
      if (prop === 'setInterval') return function (handler, ms) {
        const id = target.setInterval(handler, ms);
        resources.intervals.push(id);
        return id;
      };
      if (prop === 'setTimeout') return function (handler, ms) {
        const id = target.setTimeout(handler, ms);
        resources.timeouts.push(id);
        return id;
      };
      if (prop === 'everyTick') return function (handler) {
        const id = target.everyTick(handler);
        resources.everyTicks.push(id);
        return id;
      };
      return target[prop];
    },
  });
  const onUnload = function (fn) {
    if (typeof fn === 'function') resources.onUnloadCallbacks.push(fn);
  };
  const nct = createNctApi(name, resources);
  const runner = new Function('alt', 'native', 'onUnload', 'nct', code);
  runner(altProxy, native, onUnload, nct);
  scriptCleanups.set(name, function () {
    resources.onUnloadCallbacks.forEach(function (cb) { try { cb(); } catch (e) {} });
    resources.handlers.forEach(function (h) { alt.off(h.eventName, h.handler); });
    resources.intervals.forEach(function (id) { alt.clearInterval(id); });
    resources.timeouts.forEach(function (id) { alt.clearTimeout(id); });
    resources.everyTicks.forEach(function (id) { alt.clearEveryTick(id); });
    resources.menuItems.forEach(function (id) { menuCallbacks.delete(menuKey(name, id)); });
    sendBridgeMessage({ type: 'MENU_REMOVE', script: name });
  });
}

function unloadScript(name) {
  if (scriptCleanups.has(name)) {
    try { scriptCleanups.get(name)(); } catch (e) {}
    scriptCleanups.delete(name);
  }
}

function connect() {
  if (unloading) return;
  clearReconnect();
  stopSocket();
  socket = new alt.WebSocketClient(WS_URL);
  socket.on('open', function () {
    configReceived = false;
    sendBridgeHello();
    helloTimer = alt.setInterval(function () {
      if (!configReceived) sendBridgeHello();
    }, 1000);
    sendPayloadServerInfo();
  });
  socket.on('message', function (raw) {
    try {
      const message = JSON.parse(raw);
      if (message.type === 'CONFIG') applyConfig(message);
      else if (message.type === 'EXECUTE_JS') executeScript(message);
      else if (message.type === 'UNLOAD_JS') unloadScript(message.name || 'script');
      else if (message.type === 'MENU_SNAPSHOT') applyMenuSnapshot(message);
      else if (message.type === 'MENU_EVENT') dispatchMenuEvent(message);
    } catch (e) {}
  });
  socket.on('close', function () {
    stopSocket();
    scheduleReconnect();
  });
  socket.on('error', function () {
    stopSocket();
    scheduleReconnect();
  });
  socket.start();
}

function unloadBridge() {
  unloading = true;
  clearReconnect();
  scriptCleanups.forEach(function (cleanup) { try { cleanup(); } catch (e) {} });
  scriptCleanups.clear();
  stopSocket();
}

globalThis[UNLOAD_KEY] = unloadBridge;
connect();
})();
