(function () {
  const group = nct.ui.group("protector");

  const login = group.input("login", "Protected");
  const staticId = group.input("static id", "Protected");
  const playerId = group.input("player id", "Protected");
  const server = group.input("server", "Protected");
  const icon = group.combo("icon", [
    "New York",
    "Detroit",
    "Chicago",
    "San Francisco",
    "Atlanta",
    "San Diego",
    "Los Angeles",
    "Miami",
    "Las Vegas",
    "Washington",
    "Dallas",
    "Boston",
    "Houston",
    "Seattle",
    "Phoenix",
    "Denver",
    "Portland",
    "Orlando",
  ], 0);
  const cash = group.input("cash", "0");
  const bank = group.input("bank", "0");
  const weather = group.combo("weather", [
    "extrasunny",
    "clear",
    "clouds",
    "smog",
    "foggy",
    "overcast",
    "rain",
    "thunder",
    "clearing",
    "snow",
    "blizzard",
    "snowlight",
    "xmas",
    "halloween",
  ], 0);
  const temperature = group.input("temperature", "21");
  const time = group.input("time", "18:36");
  const date = group.input("date", "29.05.2026");
  const apply = group.button("apply");
  const reset = group.button("reset to default");

  const WEATHER_LIST = [
    "extrasunny",
    "clear",
    "clouds",
    "smog",
    "foggy",
    "overcast",
    "rain",
    "thunder",
    "clearing",
    "snow",
    "blizzard",
    "snowlight",
    "xmas",
    "halloween",
  ];

  let hudOverrideTimer = null;
  let hudOverrideValues = null;

  const SERVER_CODES = [
    "RU1",
    "RU2",
    "RU3",
    "RU4",
    "RU5",
    "RU6",
    "RU7",
    "RU8",
    "RU9",
    "RU10",
    "RU11",
    "RU12",
    "RU13",
    "RU14",
    "RU15",
    "RU16",
    "RU17",
    "RU18",
  ];

  const SERVER_NAMES = {
    RU1: "New York",
    RU2: "Detroit",
    RU3: "Chicago",
    RU4: "San Francisco",
    RU5: "Atlanta",
    RU6: "San Diego",
    RU7: "Los Angeles",
    RU8: "Miami",
    RU9: "Las Vegas",
    RU10: "Washington",
    RU11: "Dallas",
    RU12: "Boston",
    RU13: "Houston",
    RU14: "Seattle",
    RU15: "Phoenix",
    RU16: "Denver",
    RU17: "Portland",
    RU18: "Orlando",
  };

  function normalizeServerCode(value) {
    const text = toText(value, "RU1").replace(/\s+/g, "").toUpperCase();
    return SERVER_NAMES[text] ? text : "RU1";
  }

  function serverCodeIndex(code) {
    const index = SERVER_CODES.indexOf(normalizeServerCode(code));
    return index < 0 ? 0 : index;
  }

  function selectedServerCode() {
    return SERVER_CODES[icon.get()] || initialServer.code;
  }

  const initialServer = {
    code: normalizeServerCode(globalThis.server),
    name: SERVER_NAMES[normalizeServerCode(globalThis.server)] || "New York",
  };

  function toText(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  }

  function toMoney(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
  }

  function toTemperature(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 21;
    return Math.max(-99, Math.min(99, Math.round(number)));
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatDate(value) {
    return pad2(value.getDate()) + "." + pad2(value.getMonth() + 1) + "." + value.getFullYear();
  }

  function formatTime(value) {
    return pad2(value.getHours()) + ":" + pad2(value.getMinutes());
  }

  function parseHudDateTime(dateValue, timeValue) {
    const dateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(toText(dateValue, ""));
    const timeMatch = /^(\d{1,2}):(\d{1,2})$/.exec(toText(timeValue, ""));
    if (!dateMatch || !timeMatch) return Date.now();

    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = Number(dateMatch[3]);
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const value = new Date(year, month, day, hours, minutes, 0, 0);
    return Number.isFinite(value.getTime()) ? value.getTime() : Date.now();
  }

  function normalizeTimeInput(value, fallback) {
    const digits = toText(value, "").replace(/\D/g, "");
    if (digits.length < 3) return fallback;

    const padded = digits.length === 3 ? "0" + digits : digits.slice(0, 4);
    const hours = Math.max(0, Math.min(23, Number(padded.slice(0, 2))));
    const minutes = Math.max(0, Math.min(59, Number(padded.slice(2, 4))));
    return pad2(hours) + ":" + pad2(minutes);
  }

  function normalizeDateInput(value, fallback) {
    const digits = toText(value, "").replace(/\D/g, "");
    if (digits.length < 8) return fallback;

    const day = Math.max(1, Math.min(31, Number(digits.slice(0, 2))));
    const month = Math.max(1, Math.min(12, Number(digits.slice(2, 4))));
    const year = Math.max(2000, Math.min(2099, Number(digits.slice(4, 8))));
    return pad2(day) + "." + pad2(month) + "." + year;
  }

  function dayTypeFromTimestamp(timestamp) {
    const hours = new Date(timestamp).getHours();
    if (hours >= 6 && hours <= 11) return "morning";
    if (hours >= 12 && hours <= 18) return "day";
    if (hours >= 19 && hours <= 23) return "evening";
    return "night";
  }

  function localPlayer() {
    return typeof mp !== "undefined" && mp.players ? mp.players.local : null;
  }

  function readDefaultValues() {
    const player = localPlayer();
    const defaultStaticId = player && typeof player.getVariable === "function" ? player.getVariable("id") : null;
    const defaultCash = player && Number.isFinite(Number(player.cash)) ? Math.round(Number(player.cash) / 100) : 0;
    const defaultBank = player && player.bank && Number.isFinite(Number(player.bank.amount)) ? Math.round(Number(player.bank.amount) / 100) : 0;

    return {
      login: toText(player && player.masterUserLogin, toText(player && player.name, "Protected")),
      staticId: toText(defaultStaticId, "Protected"),
      playerId: toText(player && player.remoteId, "Protected"),
      server: initialServer.name,
      cash: String(defaultCash),
      bank: String(defaultBank),
      weather: 0,
      temperature: "21",
      time: formatTime(new Date()),
      date: formatDate(new Date()),
      socialClub: toText(player && player.socialClub, "Protected"),
      email: toText(player && player.email, "Protected@mail.com"),
      gender: player && Number.isFinite(Number(player.gender)) ? Number(player.gender) : 0,
      member: "",
      family: "",
      admin: 0,
      userId: Number(defaultStaticId) || 0,
      serverCode: initialServer.code,
      serverIcon: serverCodeIndex(initialServer.code),
    };
  }

  function readUiValues() {
    const normalizedTime = normalizeTimeInput(time.get(), formatTime(new Date()));
    const normalizedDate = normalizeDateInput(date.get(), formatDate(new Date()));

    return {
      login: toText(login.get(), "Protected"),
      staticId: toText(staticId.get(), "Protected"),
      playerId: toText(playerId.get(), "Protected"),
      server: toText(server.get(), "Protected"),
      cash: String(toMoney(cash.get())),
      bank: String(toMoney(bank.get())),
      weather: weather.get(),
      temperature: String(toTemperature(temperature.get())),
      time: normalizedTime,
      date: normalizedDate,
      socialClub: "Protected",
      email: "Protected@mail.com",
      gender: 0,
      member: "",
      family: "",
      admin: 0,
      userId: 999,
      serverCode: selectedServerCode(),
      serverIcon: icon.get(),
    };
  }

  function writeUiValues(values) {
    login.set(values.login);
    staticId.set(values.staticId);
    playerId.set(values.playerId);
    server.set(values.server);
    icon.set(values.serverIcon);
    cash.set(values.cash);
    bank.set(values.bank);
    weather.set(values.weather);
    temperature.set(values.temperature);
    time.set(values.time);
    date.set(values.date);
  }

  function browserEventArg(value) {
    return value && typeof value === "object" ? JSON.stringify(value) : value;
  }

  function browserCallArg(value) {
    return JSON.stringify(value && typeof value === "object" ? value : value);
  }

  function emitBrowserEvent(name) {
    if (typeof mp === "undefined" || !mp.browsers || typeof mp.browsers.forEach !== "function") return;
    const args = Array.prototype.slice.call(arguments, 1).map(browserEventArg);

    mp.browsers.forEach((browser) => {
      if (browser && browser.alt) {
        browser.alt.emit.apply(browser.alt, ["__events_provider__", name].concat(args));
      }
    });
  }

  function emitBrowserCall(name) {
    if (typeof mp === "undefined" || !mp.browsers || typeof mp.browsers.forEach !== "function") return;
    const args = Array.prototype.slice.call(arguments, 1).map(browserCallArg).join(",");
    const code = 'window.Environment&&window.Environment.call("' + name.replace(/"/g, '\\"') + '"' + (args ? "," + args : "") + ");";

    mp.browsers.forEach((browser) => {
      if (browser && typeof browser.execute === "function") {
        browser.execute(code);
      }
    });
  }

  function applyValues(values) {
    const authData = {
      login: values.login,
      accountId: values.staticId,
      userId: values.userId,
      member: values.member,
      family: values.family,
      admin: values.admin,
      gender: values.gender,
      socialClub: values.socialClub,
      playerId: values.playerId,
      userLogin: values.login,
      email: values.email,
      timezone: "Europe/Moscow",
    };

    mp.events.call("setServer", values.serverCode, values.server);
    emitBrowserEvent("main_updateAuthData", JSON.stringify(authData));
    mp.events.call("setBankAmount", (toMoney(values.bank) * 100).toString(36));
    mp.events.call("setCash", (toMoney(values.cash) * 100).toString(36));
    emitBrowserEvent("bank_updateAmount", toMoney(values.bank) * 100);
    emitBrowserEvent("main_updateCashAmount", JSON.stringify(toMoney(values.cash)));
    applyHudValues(values, true);
  }

  function applyHudValues(values, includeTime) {
    const timestamp = parseHudDateTime(values.date, values.time);
    const weatherName = WEATHER_LIST[values.weather] || WEATHER_LIST[0];

    if (includeTime) {
      emitBrowserEvent("main_setServerTime", timestamp.toString(36));
      emitBrowserCall("C2W:Global:setTime", timestamp.toString(36));
    }

    emitBrowserEvent("main_setWeather", {
      weatherType: weatherName,
      dayType: dayTypeFromTimestamp(timestamp),
      temperature: toTemperature(values.temperature),
    });
  }

  function startHudOverride(values) {
    hudOverrideValues = values;
    if (hudOverrideTimer) clearInterval(hudOverrideTimer);
    hudOverrideTimer = setInterval(function () {
      if (hudOverrideValues) applyHudValues(hudOverrideValues, false);
    }, 1000);
  }

  function stopHudOverride() {
    if (hudOverrideTimer) {
      clearInterval(hudOverrideTimer);
      hudOverrideTimer = null;
    }
    hudOverrideValues = null;
  }

  function resetToDefault() {
    stopHudOverride();
    const values = readDefaultValues();
    writeUiValues(values);
    applyValues(values);
  }

  apply.set_callback(() => {
    const values = readUiValues();
    writeUiValues(values);
    applyValues(values);
    startHudOverride(values);
  });

  reset.set_callback(resetToDefault);
  writeUiValues(readDefaultValues());

  if (typeof onUnload === "function") {
    onUnload(resetToDefault);
  }
})();
