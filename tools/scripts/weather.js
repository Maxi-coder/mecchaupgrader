(function () {
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

  const group = nct.ui.group("weather");
  const enabled = group.checkbox("enable", true);
  const weather = group.combo("weather", WEATHER_LIST, 1);

  function callNative(name) {
    if (!native || typeof native[name] !== "function") return;
    const args = Array.prototype.slice.call(arguments, 1);
    native[name].apply(native, args);
  }

  function clearWeather() {
    callNative("clearOverrideWeather");
    callNative("clearWeatherTypePersist");
    callNative("setRainLevel", -1.0);
    callNative("setSnowLevel", 0.0);
    callNative("setWindSpeed", 0.0);
  }

  function applyWeather() {
    if (!enabled.get()) {
      weather.setDisabled(true);
      clearWeather();
      return;
    }

    weather.setDisabled(false);

    const selected = WEATHER_LIST[weather.get()] || "clear";
    const nativeWeather = selected.toUpperCase();
    callNative("clearOverrideWeather");
    callNative("clearWeatherTypePersist");
    callNative("setOverrideWeather", nativeWeather);
    callNative("setWeatherTypeNowPersist", nativeWeather);
    callNative("setWeatherTypeNow", nativeWeather);
    callNative("setRainLevel", selected === "rain" || selected === "thunder" ? 1.0 : 0.0);
    callNative("setSnowLevel", selected === "snow" || selected === "blizzard" || selected === "snowlight" || selected === "xmas" ? 1.0 : 0.0);
    callNative("setWindSpeed", selected === "thunder" || selected === "blizzard" ? 10.0 : 0.0);
  }

  enabled.set_callback(applyWeather, true);
  weather.set_callback(applyWeather);

  if (typeof onUnload === "function") {
    onUnload(function () {
      clearWeather();
    });
  }
})();
