// myFunctions.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';


//TODO: this needs lot more work
//editor functionality needs to be placed in editor.js
//game functionality here
//they need to both import from a shared.js or this main.js
//to avoid circular dependency

// game.js
let gameRunning = false;
let gameId = null;


let scene;
let camera;
let yawObject;
let renderer;
let container;
let gameActions;
const clock = new THREE.Clock();


export function startGameLoop(scenev, camerav, yawObjectv, rendererv, containerv, gameActionsv) {
    scene = scenev;
    camera = camerav;
    yawObject = yawObjectv;
    renderer = rendererv;
    container = containerv;
    gameRunning = true;
    gameActions = gameActionsv;
    gameId = requestAnimationFrame(gameLoop);
        clock.start();
}

export function stopGameLoop() {
    gameRunning = false;
    cancelAnimationFrame(gameId);
}

function gameLoop() {
    if (!gameRunning) return;
    console.log("gameLoop");



    const deltaTime = clock.getDelta(); // Time elapsed since last frame
    const moveSpeed = 5;
    const moveVector = new THREE.Vector3();
    const moveCam = moveSpeed * deltaTime;
    if (gameActions.moveCamUp) moveVector.y += 1;
    if (gameActions.moveCamDown) moveVector.y -= 1;
    if (gameActions.moveCamLeft) moveVector.x -= 1;
    if (gameActions.moveCamRight) moveVector.x += 1;
    if (gameActions.moveCamFront) moveVector.z -= 1;
    if (gameActions.moveCamBack) moveVector.z += 1;
    // camera.lookAt(chara);


    //clear the onpress/onrelease actions now that they have been sampled 
    //in that loop to avoid resampling
    releaseSingleEventActions();

    moveVector.normalize();
    moveVector.applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0));
    yawObject.position.addScaledVector(moveVector, moveCam);



















    // game update/render logic
    renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
    // renderer.clear();
    // renderer.setScissorTest(false);
    renderer.render(scene, camera);
    gameId = requestAnimationFrame(gameLoop);
}
