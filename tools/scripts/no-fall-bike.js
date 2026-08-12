(function () {
  const group = nct.ui.group("no fall bike");
  const enabled = group.checkbox("enable", true);

  let interval = null;
  let wasApplied = false;

  function callNative(name) {
    if (!native || typeof native[name] !== "function") return;
    const args = Array.prototype.slice.call(arguments, 1);
    native[name].apply(native, args);
  }

  function getLocalPlayer() {
    if (typeof mp === "undefined" || !mp.players || !mp.players.local) return null;
    return mp.players.local;
  }

  function getVehicleModel(vehicle) {
    if (!vehicle) return 0;
    return vehicle.model || vehicle.getModel && vehicle.getModel() || 0;
  }

  function isBikeVehicle(vehicle) {
    if (!vehicle) return false;

    const model = getVehicleModel(vehicle);
    if (!model) return false;

    if (native && typeof native.isThisModelABike === "function" && native.isThisModelABike(model)) return true;
    if (native && typeof native.isThisModelAQuadbike === "function" && native.isThisModelAQuadbike(model)) return true;

    if (mp && mp.game && mp.game.vehicle) {
      if (typeof mp.game.vehicle.isThisModelABike === "function" && mp.game.vehicle.isThisModelABike(model)) return true;
      if (typeof mp.game.vehicle.isThisModelAQuadbike === "function" && mp.game.vehicle.isThisModelAQuadbike(model)) return true;
    }

    return false;
  }

  function setNoFall(state) {
    const player = getLocalPlayer();
    if (!player || !player.handle) return;

    callNative("setPedCanBeKnockedOffVehicle", player.handle, state ? 1 : 0);
  }

  function applyNoFall() {
    const player = getLocalPlayer();

    if (!enabled.get()) {
      if (wasApplied) {
        setNoFall(false);
        wasApplied = false;
      }
      return;
    }

    if (!player || !player.vehicle || !isBikeVehicle(player.vehicle)) {
      if (wasApplied) {
        setNoFall(false);
        wasApplied = false;
      }
      return;
    }

    setNoFall(true);
    wasApplied = true;
  }

  function start() {
    if (interval) return;
    applyNoFall();
    interval = setInterval(applyNoFall, 100);
  }

  function stop() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    setNoFall(false);
    wasApplied = false;
  }

  function updateState() {
    if (enabled.get()) {
      start();
    } else {
      stop();
    }
  }

  enabled.set_callback(updateState, true);

  if (typeof onUnload === "function") {
    onUnload(function () {
      stop();
    });
  }
})();