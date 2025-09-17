import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';

/*---------------------------------*/
// GAMEPLAY VARIABLES
/*---------------------------------*/

// door variables
let doorSprites   = [];
let doorPosition  = [];
let doorRotCur    = 0;
let doorRotTarget = 0;
let doorRotTime   = 0;
let movingDoor    = false;
const minDistancefromWalls = 0.2 * Shared.cellSize;

// move variables
let moveVector = new THREE.Vector3();

// jump variables
const groundLevel   = Shared.cameraOffsetY;
const gravity       = 9.81;
//max height
//kinetic e = potential e
//(1/2)mv^2=mgh
//v=sqrt(2gh)
// const jumpSpeed     = 3.5;
const maxJumpHeight = 0.75;
const jumpSpeed     = Math.sqrt(2*gravity*maxJumpHeight);
let   verticalSpeed = 0;

// actions variables
export let Actions={};
let gameId = null;
let hasInteracted = false;

export let ActionToKeyMap = {
    moveCamRight   : { key: 'KeyD' },
    moveCamLeft    : { key: 'KeyA' },
    moveCamFront   : { key: 'KeyW' },
    moveCamBack    : { key: 'KeyS' },
    startGame      : { key: 'KeyG', OnPress: true },
    jump           : { key: 'Space', OnPress: true },
    interact       : { key: 'KeyE', OnPress: true },
};

/*---------------------------------*/
// startGameLoop
/*---------------------------------*/
export function startGameLoop() {
    Shared.editorState.gameRunning = true;
    // Shared.editorState.pause = false;
    Shared.setPause(false);
    gameId = requestAnimationFrame(gameLoop);
    Shared.resetCamera();
    Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);

}

/*---------------------------------*/
// stopGameLoop
/*---------------------------------*/
export function stopGameLoop() {
    Shared.editorState.gameRunning = false;
    cancelAnimationFrame(gameId);
}

/*---------------------------------*/
// gameLoop
/*---------------------------------*/
function gameLoop() {
    const scene = Shared.scene;
    
    if (!Shared.editorState.gameRunning) return;

    //reset move vector
    moveVector.set(0,0,0);

    //execute actions
    executeActions();

    if (!Shared.editorState.pause) {

        //fps counter
        Stats.stats.begin();

        //initialize gameplay variables this loop
        const deltaTime  = Shared.clock.getDelta();       // Time elapsed since last frame
        const moveCam    = Shared.moveSpeed * deltaTime;

        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        Shared.releaseSingleEventActions();

        //calculate move vector
        moveVector.normalize();
        moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));

        //move player along vector, record previous position
        let prevpos = Shared.yawObject.position.clone();
        Shared.yawObject.position.addScaledVector(moveVector, moveCam);

        //check for collision
        const { isCollidingX, isCollidingZ } = isColliding(Shared.yawObject,moveVector);

        //if colliding revert to previous position
        if (isCollidingX) Shared.yawObject.position.x = prevpos.x;
        if (isCollidingZ) Shared.yawObject.position.z = prevpos.z;
        
        //update vertical position
        verticalUpdate(deltaTime);

        //render scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);//TODO: you just need to do that once?
        Shared.renderer.render(Shared.scene, Shared.camera);

        //calculate/display stats
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Stats.updateTextStatsThrottled();
        Stats.stats.end();
    }

    //repeat loop at next frame
    gameId = requestAnimationFrame(gameLoop);

}

/*---------------------------------*/
// executeActions
/*---------------------------------*/
function executeActions() {
    if (!Shared.editorState.pause) {
        //pauseable actions
        if (Actions.moveCamLeft) moveVector.x  -= 1;
        if (Actions.moveCamRight) moveVector.x += 1;
        if (Actions.moveCamFront) moveVector.z -= 1;
        if (Actions.moveCamBack) moveVector.z  += 1;
        if (Actions.startGame) Shared.toggleGameMode();
        if (Actions.jump)      jump();
        if (Actions.interact)  interact();
    } else {
        //unpauseable actions
    }
}

/*---------------------------------*/
// IsColliding
/*---------------------------------*/
function isColliding(actor, moveVectorv) {

    let isCollidingX = false;
    let isCollidingZ = false;
    // let colliderX1 = null;
    // let colliderX2 = null;
    // let colliderZ1 = null;
    // let colliderZ2 = null;
    const posx = Math.floor(actor.position.x);
    const posz = Math.floor(actor.position.z);
    const csize = Shared.cellSize;
    let k,k2;
    
    if (moveVectorv.x < 0) //camera moving towards decreasing X
    {
        k = Shared.getGridKey(posx, 0, posz);
        k2 = Shared.getGridKey(posx-1, 0, posz);
        const cell = Shared.gridMap.XZ.get(k2);
        if (Shared.gridMap.YZ.has(k) || ((cell && Object.keys(cell).some(key => key.startsWith("Pillar"))))) {
            isCollidingX = ((actor.position.x - posx) % csize) <= minDistancefromWalls;
            // colliderX1 = Shared.gridMapYZ.get(k);
        } 
    } else {//camera moving towards increasing X
        k = Shared.getGridKey(posx + 1, 0, posz);
        const cell = Shared.gridMap.XZ.get(k);
        if (Shared.gridMap.YZ.has(k) || ((cell && Object.keys(cell).some(key => key.startsWith("Pillar"))))) {
            isCollidingX = ((actor.position.x - posx) % csize) >= (csize - minDistancefromWalls);
            // colliderX2 = Shared.gridMapYZ.get(k);
        }
    }

    if (moveVectorv.z < 0) //camera moving towards decreasing Z
    {
        k = Shared.getGridKey(posx, 0, posz);
        k2 = Shared.getGridKey(posx, 0, posz-1);
        const cell = Shared.gridMap.XZ.get(k2);
        if (Shared.gridMap.XY.has(k) || (cell && Object.keys(cell).some(key => key.startsWith("Pillar")))) {
            isCollidingZ = ((actor.position.z - posz) % csize) <= minDistancefromWalls;
            // colliderZ1 = Shared.gridMapXY.get(k);
        }
    } else {//camera moving towards increasing Z
        k = Shared.getGridKey(posx, 0, posz + 1);
        const cell = Shared.gridMap.XZ.get(k);
        if (Shared.gridMap.XY.has(k) || (cell && Object.keys(cell).some(key => key.startsWith("Pillar")))) {
            isCollidingZ = ((actor.position.z - posz) % csize) >= (csize - minDistancefromWalls);
            // colliderZ2 = Shared.gridMapXY.get(k);
        }
    }
    
    // console.log("playerpos", Math.floor(Shared.yawObject.position.x),Math.floor(Shared.yawObject.position.z));
    // console.log("isColliding", isCollidingX,isCollidingZ);
    // console.log("colliderX", colliderX1?.position,colliderX2?.position);
    // console.log("colliderZ", colliderZ1?.position,colliderZ2?.position);

    return {
        isCollidingX: isCollidingX,
        isCollidingZ: isCollidingZ
    };
}


/*---------------------------------*/
// moveDoor
/*---------------------------------*/
function moveDoor(delta) {
    return;
    if (hasInteracted) {

        let d = doorPosition[0].position.distanceTo(Shared.yawObject.position);
        let withinReach = d < 1.8;
        if (!withinReach) {
            hasInteracted = false;
            return;
        }

        doorRotCur = doorSprites[0].rotation.y;
        if (doorRotCur > 1)
            doorRotTarget = 0;
        else
            doorRotTarget = (Math.PI / 2);
        doorRotTime = 0;
        hasInteracted = false;
        movingDoor = true;
    }
    if (movingDoor) {
        doorSprites.forEach(door => {
            doorRotTime += deltaTime;
            door.rotation.y = doorRotCur + (doorRotTarget - doorRotCur) * doorRotTime / 2;
            if (doorRotTime > 2) {
                door.rotation.y = doorRotTarget;
                movingDoor = false;
            }
        }
        );
    }
}

/*---------------------------------*/
// jump related functions 
/*---------------------------------*/

/*---------------------------------*/
// jump
/*---------------------------------*/
function jump(){
    if (isTouchingGround()){
        verticalSpeed = jumpSpeed;
    }
}

/*---------------------------------*/
// isTouchingGround
/*---------------------------------*/
function isTouchingGround() {
    return (Shared.yawObject.position.y - groundLevel) < Shared.EPSILON;
}

/*---------------------------------*/
// updateVerticalSpeed
/*---------------------------------*/
function updateVerticalSpeed(deltaTime){
    if (!isTouchingGround()){
        verticalSpeed -= gravity * deltaTime;
    } else {
        verticalSpeed = 0;
    }
}

/*---------------------------------*/
// updateVerticalPosition
/*---------------------------------*/
function updateVerticalPosition(deltaTime){
    Shared.yawObject.position.y += verticalSpeed * deltaTime;
}

/*---------------------------------*/
// verticalUpdate
/*---------------------------------*/
function verticalUpdate(deltaTime){
    updateVerticalPosition(deltaTime);
    updateVerticalSpeed(deltaTime);
}

/*---------------------------------*/
// interact related functions 
/*---------------------------------*/
/*---------------------------------*/
// interact
/*---------------------------------*/
function interact(){
    console.log("interact");
}
