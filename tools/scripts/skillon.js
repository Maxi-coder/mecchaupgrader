let isBoomActive = false;
let targetPlayer = null;
let targetID = null;
let vehicle = null;
let tickHandle = null;

function findPlayerByID(id) {
    for (const player of alt.Player.streamedIn) {
        if (player && player.remoteID === id) {
            return player;
        }
    }
    return null;
}

function attachToHead() {
    if (!vehicle || !targetPlayer || !targetPlayer.valid) return;

    const boneIndex = native.getPedBoneIndex(targetPlayer.scriptID, 12844);

    native.attachEntityToEntity(
        vehicle.scriptID,
        targetPlayer.scriptID,
        boneIndex,
        0, 0, 0.5,    
        0, 0, 0,      
        false,        
        false,        
        false,        
        false,        
        2,            
        true,         
        false         
    );
}


function detachVehicle() {
    if (vehicle && native.doesEntityExist(vehicle.scriptID)) {
        native.detachEntity(vehicle.scriptID, true, true);
        alt.log("Vehicle detached from head.");
    }
}

function stopBoom() {
    if (!isBoomActive) return;

    isBoomActive = false;
    detachVehicle();
    targetPlayer = null;
    targetID = null;

    if (tickHandle !== null) {
        alt.clearEveryTick(tickHandle);
        tickHandle = null;
    }

    alt.emit("api.longNotify", "Boom режим отключён", "error");
    alt.log("Boom режим остановлен");
}

function startBoom(id) {
    if (isBoomActive) stopBoom();

    const localPlayer = alt.Player.local;
    vehicle = localPlayer.vehicle;

    if (!vehicle || !native.isPedInAnyVehicle(localPlayer.scriptID, false)) {
        alt.emit("api.longNotify", "Сначала сядь в транспорт", "error");
        alt.log("Ты не в транспорте.");
        return;
    }

    targetID = id;
    targetPlayer = findPlayerByID(id);

    if (!targetPlayer || !targetPlayer.valid) {
        alt.emit("api.longNotify", `Игрок с ID ${id} не найден поблизости`, "error");
        alt.log(`Игрок с ID ${id} не найден в streamedIn.`);
        return;
    }

    isBoomActive = true;
    alt.log(`Прикрепляем транспорт к голове игрока ID ${id}`);
    attachToHead();

    tickHandle = alt.everyTick(() => {
        if (!targetPlayer || !targetPlayer.valid) {
            stopBoom();
            return;
        }
        attachToHead();
    });

    alt.emit("api.longNotify", `Ты прикрепился к голове игрока ID ${id}`, "success");
    alt.log("Boom режим активирован");
}

alt.on('consoleCommand', (command, ...args) => {
    if (command === 'boom') {
        alt.log(`Команда: boom ${args.join(' ')}`);
        if (args.length < 1) {
            alt.log("Использование: boom [id]");
            return;
        }

        const id = parseInt(args[0], 10);
        if (isNaN(id)) {
            alt.log("ID должен быть числом.");
            return;
        }

        startBoom(id);
        return;
    }

    if (command === 'boomoff') {
        alt.log("Команда: boomoff");
        stopBoom();
        return;
    }
});