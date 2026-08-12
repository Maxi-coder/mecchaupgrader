 const emitskills = "538782633";
 const skills = ["stamina", "strength", "lung_capacity",
 "wheelie_ability", "shooting_ability", "stealth_ability", "flying_ability"];

function start(){
       skills.forEach((element) => alt.emitServer(emitskills, element));
}
start();
setInterval(()=>start(),75000);