import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';

/*---------------------------------*/
// GAMEPLAY VARIABLES
/*---------------------------------*/

// Player dimensions
const playerHeight = 1.8;
const cameraHeight = 1.3;
const cameraHeightFromCapsuleCenter = cameraHeight-playerHeight/2;
const playerRadius = 0.4;
const halfHeight = (playerHeight / 2) - playerRadius;

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
//max height
//kinetic e = potential e
//(1/2)mv^2=mgh
//v=sqrt(2gh)
// const jumpSpeed     = 3.5;
// const maxJumpHeight = 0.75;
const maxJumpHeight = 1;
const jumpSpeed     = Math.sqrt(2*Shared.gravity*maxJumpHeight);
let   verticalSpeed = 0;
// let isJumping = false;
let jumpPressed = false;

//inventory
const playerState = {
    "health": 100,
    "maxHealth": 100,
    "inventory": {},
};

// actions variables
export let Actions={};
let gameId = null;
let hasInteracted = false;

export let ActionToKeyMap = {
    moveCamRight   : { key: 'KeyD' },
    moveCamLeft    : { key: 'KeyA' },
    moveCamFront   : { key: 'KeyW' },
    moveCamBack: { key: 'KeyS' },
    startGame      : { key: 'KeyG', OnPress: true },
    jump           : { key: 'Space', OnPress: true },
    interact       : { key: 'KeyE', OnPress: true },
    hideCol        : { key: 'KeyH', OnPress: true },
};

/*---------------------------------*/
// startGameLoop
/*---------------------------------*/
let firstInit = true;
let playerBody = null;
let playerColliderDesc = null;
let playerCollider = null;
export function startGameLoop() {
    Shared.resetAllActions();
    Shared.editorState.gameRunning = true;
    // Shared.editorState.pause = false;
    Shared.setPause(false);
    gameId = requestAnimationFrame(gameLoop);
    // Shared.resetCamera();
    Shared.clock.start();
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTGAMECOLOR);
    verticalSpeed = 0;

    document.addEventListener("mousedown", onMouseClick, false);
    document.addEventListener("mouseup", onMouseUp, false);
    // document.addEventListener("wheel", onMouseWheel, { passive: false });




    firstFrame = true;


    const campos = Shared.yawObject.position;
    if (firstInit){
        firstInit = false;
        // --- Create kinematic body ---
        const playerBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(campos.x, campos.y+cameraHeightFromCapsuleCenter, campos.z); // initial position where camera is
        // .setTranslation(2, halfHeight+playerRadius, 2); // initial position

        playerBody = Shared.physWorld.createRigidBody(playerBodyDesc);

        // --- Create capsule collider ---
        playerColliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, playerRadius)
        .setFriction(0.9)
        .setRestitution(0);

        playerCollider = Shared.physWorld.createCollider(playerColliderDesc, playerBody);
        Shared.colliderNameMap.set(playerCollider,"playerCollider");

        // Store reference
        // Shared.playerBody = playerBody;
    } else {
        playerBody.setNextKinematicTranslation(
            campos.x, campos.y+cameraHeightFromCapsuleCenter, campos.z
        );
        // myworldstep();
        // Shared.physWorld.step();//so that the rigidbody reposition is taken in account
        // skipOneFrame = true;//the first frame is needed to reposition the player rigidbody 
    }

    // Shared.rapierDebug.dispose();

}

/*---------------------------------*/
// stopGameLoop
/*---------------------------------*/
export function stopGameLoop() {
    Shared.editorState.gameRunning = false;
    cancelAnimationFrame(gameId);


    document.removeEventListener("mousedown", onMouseClick, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    // document.removeEventListener("wheel", onMouseWheel, { passive: false });
}

/*---------------------------------*/
// gameLoop
/*---------------------------------*/
let lastUVUpdate = 0;
let firstFrame = true;
let isTouchingGround = false;
// let skipOneFrame = false;
const uvUpdateInterval = 0.07; // seconds between updates
function gameLoop(now) {
    const scene = Shared.scene;
    
    // console.log("player rigidbody position:", playerBody.translation());
    // console.log("camera position:", Shared.yawObject.position);

    if (!Shared.editorState.gameRunning) return;

    //reset move vector
    moveVector.set(0,0,0);

    //execute actions
    executeActions();

    if (!Shared.editorState.pause) { // && !skipOneFrame) {

        //fps counter
        Stats.stats.begin();

        //initialize gameplay variables this loop
        const deltaTime  = Shared.clock.getDelta();       // Time elapsed since last frame

        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        Shared.releaseSingleEventActions();

        //calculate move vector
        moveVector.normalize();
        moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));

        // console.log(moveVector);

        //move player along vector, record previous position
        // let prevpos = Shared.yawObject.position.clone();

        // 1️⃣ Get the current body translation
        const currentPos = playerBody.translation();
        if (firstFrame){
            const campos = Shared.yawObject.position;
            currentPos.x = campos.x,
            currentPos.y = campos.y - cameraHeightFromCapsuleCenter,
            currentPos.z = campos.z
        }

        // 2️⃣ Compute the target position
        const newPos = {
            x: currentPos.x,
            y: currentPos.y,
            z: currentPos.z
        };


        // 3️⃣ Compute rotation quaternion from yaw
        const q = new THREE.Quaternion();
        q.setFromEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));



        if (!firstFrame) {

            /*------------------*/
            /* GROUND DETECTION */
            /*------------------*/
            
            // check ground, update vertical speed and snap to floor if close  
            let result = groundCheck();
            let moveCam    = Shared.moveSpeed;
            isTouchingGround = result.hit;

            if (!isTouchingGround){
                moveCam *= 0.5; //slower lateral moves when in Air
                verticalSpeed -= Shared.gravity * deltaTime;
                // Clamp to max fall speed
                if (verticalSpeed < -Shared.maxFallSpeed) verticalSpeed = -Shared.maxFallSpeed;
            } else {
                if (jumpPressed){
                    verticalSpeed = jumpSpeed;
                    jumpPressed = false;
                } else {
                    verticalSpeed = 0; //cancel speed
                    newPos.y -= result.distance; //snap to floor with small skin distance
                }
            }


            moveCam *= deltaTime;
            newPos.x += moveVector.x * moveCam;
            newPos.y += moveVector.y * moveCam;
            newPos.z += moveVector.z * moveCam;


            // verticalSpeed = 0;
            newPos.y += verticalSpeed * deltaTime;

            /*----------------*/
            // WALL DETECTION //
            /*----------------*/


            const newPosv = newPos;
            const currentPosv = currentPos;
            const newPos2 = collisionCheck(newPosv,currentPosv, q);

            // newPos.x = newPos2.x;
            // newPos.y = newPos2.y;
            // newPos.z = newPos2.z;

            // const newPosv2 = newPos2;
            //second successive collision check to avoid "sliding" through another wall as a result of the first collision check
            const newPos3 = collisionCheck(newPos2,currentPosv, q); 

            newPos.x = newPos3.x;
            newPos.y = newPos3.y;
            newPos.z = newPos3.z;            


            // // Vector from current to new
            // const movement = {
            // x: newPos.x - currentPos.x,
            // y: newPos.y - currentPos.y,
            // z: newPos.z - currentPos.z,
            // };
            // // Raycast-like shape movement
            // const movementLength = Math.hypot(movement.x, movement.y, movement.z);
            // const direction = {
            // x: movement.x / (movementLength || 1),
            // y: movement.y / (movementLength || 1),
            // z: movement.z / (movementLength || 1),
            // };

            // const maxToi = movementLength; // maximum distance to check
            // const filterFlags = RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC; // ignore dynamic bodies
            // const hit = Shared.physWorld.castShape(
            // { x: currentPos.x, y: currentPos.y, z: currentPos.z },
            // q, // your capsule rotation
            // direction,
            // playerColliderDesc.shape,
            // maxToi,
            // undefined, // no complex filter
            // filterFlags
            // );

            // const colDist = 1.0;
            // // const colDist = movementLength;
            // if (hit && hit.toi < colDist) {
            // // if (hit && hit.toi < 0.5) {

            //     let collidername = Shared.colliderNameMap.get(hit.collider);
            //     // console.log("hit ", collidername ,"at distance",hit.toi);

            //     // We hit something before full movement!
            //     // Slide along the wall
            //     const normal = hit.normal1;

            //     // remaining distance vector = (desired move) * (1 - toi)
            //     // direction is assumed normalized and movementLength is the full desired distance
            //     const remainingDist = movementLength * (colDist - hit.toi);
            //     // const remainingDist =  hit.toi * movementLength;
            //     // console.log(remainingDist);
            //     const remainingVec = {
            //         x: direction.x * remainingDist,
            //         y: direction.y * remainingDist,
            //         z: direction.z * remainingDist
            //     };

            //     // Project remainingVec onto plane (remove component along normal)
            //     const dotRem = (remainingVec.x * normal.x + remainingVec.y * normal.y + remainingVec.z * normal.z);
            //     let slideVec = {
            //         x: remainingVec.x - (normal.x * dotRem),
            //         y: remainingVec.y - (normal.y * dotRem),
            //         z: remainingVec.z - (normal.z * dotRem)
            //     };

            //     // Decide if the surface is too steep (a wall) using upDot
            //     const upDot = normal.y; // Y is up
            //     // Only cancel upward movement on steep surfaces (we still want to fall when jumping on walls)
            //     if (
            //         slideVec.y > 0 && 
            //         upDot < Shared.maxSlopeCos
            //     ) {
            //         // console.log("TOOSTEEP");
            //         if (!isTouchingGround) console.log("Y CANCEL BUT WAS FALLING");
            //         // Too steep — disallow vertical motion for sliding
            //         slideVec.y = 0;
            //     }

            //     const skin = 0.001;
            //     const slideLenMi = 1e-6;
            //     // const slideLenMi = Infinity;
            //     // let correction = skin - dotRem;
            //     let correction = 1e-4 ;
            //     // if (correction < 0.001) correction = 0 ;
            //     // if (correction < 0.1) correction = 0 ;
            //     // correction*=0.01;
            //     const slideLen = Math.hypot(slideVec.x, slideVec.y, slideVec.z);
            //     // if (slideLen > 1e-6) {
            //     if (slideLen > slideLenMi) {
            //         // const pushAway = 1e-3;
            //         const pushAway = correction;
            //         // const pushAway = skin - dotRem;
            //         // const pushAway = dotRem;
            //         // const pushAway = 0;
            //         newPos.x = currentPos.x + slideVec.x + normal.x * pushAway;
            //         newPos.y = currentPos.y + slideVec.y + normal.y * pushAway;
            //         newPos.z = currentPos.z + slideVec.z + normal.z * pushAway;
            //     } else {
            //         console.log("BACKOFF");
            //         // const backOff = 1e-3;
            //         const backOff = correction;
            //         // newPos.x = currentPos.x + direction.x * (hit.toi * movementLength - backOff);
            //         // newPos.y = currentPos.y + direction.y * (hit.toi * movementLength - backOff);
            //         // newPos.z = currentPos.z + direction.z * (hit.toi * movementLength - backOff);

            //         newPos.x = currentPos.x + direction.x * (remainingDist - backOff);
            //         newPos.y = currentPos.y + direction.y * (remainingDist - backOff);
            //         newPos.z = currentPos.z + direction.z * (remainingDist - backOff);                    
            //     }
            //     // console.log(newPos.z);

            // } else {
            //     console.log("NOHIT");
            // }

        }



        // 4️⃣ Apply rotation first
        playerBody.setNextKinematicRotation(q);

        // 5️⃣ Then apply translation
        playerBody.setNextKinematicTranslation(newPos);

        // isTouchingGround();

        //check if touching ground

        //check for collision
        // const { isCollidingX, isCollidingZ } = isColliding(Shared.yawObject,moveVector);

        //if colliding revert to previous position
        // if (isCollidingX) Shared.yawObject.position.x = prevpos.x;
        // if (isCollidingZ) Shared.yawObject.position.z = prevpos.z;
        


        //TOIMPROVE: call it in a recursive scheduled on next frame function
        //update animated textures
        // convert ms → seconds
        const t = now * 0.001;
        // only update if enough time has passed
        if (t - lastUVUpdate >= uvUpdateInterval) {
            Shared.updateAnimatedTextures();
            lastUVUpdate = t;
        }

        //raycast against actionnables
        raycastActionnables();

        //render scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);//TODO: you just need to do that once?
        Shared.renderer.render(Shared.scene, Shared.camera);

        //calculate/display stats
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

        if (Shared.physWorld){
            // Shared.physWorld.step(Shared.physEventQueue);
            // Shared.physWorld.step();
            updateDoorsPhysics();

            myworldstep();

            syncCameraToPlayer();                   // camera follows capsule


            Shared.rapierDebug.update();
            
            // Update Rapier's debug data
            // Shared.physWorld.debugRender.clear();
            // Shared.physWorld.debugRender.render(Shared.physWorld);
            // // Get debug vertices
            // const vertices = Shared.physWorld.debugRender.vertices;
            // Shared.debugGeometry.setAttribute(
            // "position",
            // new THREE.Float32BufferAttribute(vertices, 3)
            // );
            // Shared.debugGeometry.computeBoundingSphere();
            // Shared.debugGeometry.attributes.position.needsUpdate = true;

        }

    }
    // skipOneFrame = false;

    neednewframe = false;
    if (firstFrame) firstFrame = false;
    //repeat loop at next frame
    gameId = requestAnimationFrame(gameLoop);

}


//wrapper around world step to check its not called twice within the same frame
//otherwise the physics go crazy
let neednewframe = false;
function myworldstep(){
    if (neednewframe){
        throw new Error("world.step has been called more than once within the same frame, this is forbidden.");
    }
    Shared.physWorld.step();
    neednewframe = true;
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
        if (Actions.hideCol) toggleHideCollider();
    } else {
        //unpauseable actions
    }
}

/*---------------------------------*/
// IsColliding
// /*---------------------------------*/
// function isColliding(actor, moveVectorv) {

//     let isCollidingX = false;
//     let isCollidingZ = false;
//     // let colliderX1 = null;
//     // let colliderX2 = null;
//     // let colliderZ1 = null;
//     // let colliderZ2 = null;
//     const posx = Math.floor(actor.position.x);
//     const posz = Math.floor(actor.position.z);
//     const csize = Shared.cellSize;
//     let k,k2;
    
//     if (moveVectorv.x < 0) //camera moving towards decreasing X
//     {
//         k = Shared.getGridKey(posx, 0, posz);
//         k2 = Shared.getGridKey(posx-1, 0, posz);
//         const cell = Shared.gridMap.XZ.get(k2);
//         if (Shared.gridMap.YZ.has(k) || ((cell && Object.keys(cell).some(key => key.startsWith("PILLAR"))))) {
//             isCollidingX = ((actor.position.x - posx) % csize) <= minDistancefromWalls;
//             // colliderX1 = Shared.gridMapYZ.get(k);
//         } 
//     } else {//camera moving towards increasing X
//         k = Shared.getGridKey(posx + 1, 0, posz);
//         const cell = Shared.gridMap.XZ.get(k);
//         if (Shared.gridMap.YZ.has(k) || ((cell && Object.keys(cell).some(key => key.startsWith("PILLAR"))))) {
//             isCollidingX = ((actor.position.x - posx) % csize) >= (csize - minDistancefromWalls);
//             // colliderX2 = Shared.gridMapYZ.get(k);
//         }
//     }

//     if (moveVectorv.z < 0) //camera moving towards decreasing Z
//     {
//         k = Shared.getGridKey(posx, 0, posz);
//         k2 = Shared.getGridKey(posx, 0, posz-1);
//         const cell = Shared.gridMap.XZ.get(k2);
//         if (Shared.gridMap.XY.has(k) || (cell && Object.keys(cell).some(key => key.startsWith("PILLAR")))) {
//             isCollidingZ = ((actor.position.z - posz) % csize) <= minDistancefromWalls;
//             // colliderZ1 = Shared.gridMapXY.get(k);
//         }
//     } else {//camera moving towards increasing Z
//         k = Shared.getGridKey(posx, 0, posz + 1);
//         const cell = Shared.gridMap.XZ.get(k);
//         if (Shared.gridMap.XY.has(k) || (cell && Object.keys(cell).some(key => key.startsWith("PILLAR")))) {
//             isCollidingZ = ((actor.position.z - posz) % csize) >= (csize - minDistancefromWalls);
//             // colliderZ2 = Shared.gridMapXY.get(k);
//         }
//     }
    
//     // console.log("playerpos", Math.floor(Shared.yawObject.position.x),Math.floor(Shared.yawObject.position.z));
//     // console.log("isColliding", isCollidingX,isCollidingZ);
//     // console.log("colliderX", colliderX1?.position,colliderX2?.position);
//     // console.log("colliderZ", colliderZ1?.position,colliderZ2?.position);

//     return {
//         isCollidingX: isCollidingX,
//         isCollidingZ: isCollidingZ
//     };
// }


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
    // if (isTouchingGround()){
    if (isTouchingGround){
        // verticalSpeed = jumpSpeed;
        jumpPressed = true;
    }
}

/*---------------------------------*/
// isTouchingGround
/*---------------------------------*/
// function isTouchingGround() {
//     const posfeet=(Shared.yawObject.position.y-Shared.cameraOffsetY);
//     const posy = Math.floor(posfeet/Shared.cellSize);
//     const posx = Math.floor(Shared.yawObject.position.x/Shared.cellSize);
//     const posz = Math.floor(Shared.yawObject.position.z/Shared.cellSize);
//     const k = Shared.getGridKey(posx, posy, posz);
//     const thiscell = Shared.gridMap.XZ.get(k);
//     const thisCellIsPlane = ((thiscell && Object.keys(thiscell).some(key => key.startsWith("PLANE"))));

//     if (!thisCellIsPlane) return false;
//     return ((posfeet%Shared.cellSize) < 0.1);
    
//     return (Shared.yawObject.position.y - groundLevel) < Shared.EPSILON;
// }



// function isTouchingGround() {

//     const contacts = [];
//     Shared.physWorld.contactsWith(playerColliderDesc, (otherCollider) => {
//         contacts.push(otherCollider);
//     });
//     if (contacts.length > 0) {
//         console.log("Player is currently in contact with", contacts.length, "objects");
//         return true;
//     } else {
//         return false;
//     }

// }

function groundCheck() {

    const bodyPos = playerBody.translation();
    const capsuleBottomY = bodyPos.y - (halfHeight + playerRadius);

    const aboveFeetDistance = 0.4;
    // const aboveFeetDistance = 0.1;
    const skinDistance = 0.01;
    const rayLength = 0.05; // small margin
    const totalrayLength = aboveFeetDistance+rayLength; // small margin
    const rayOrigin = {
        x: bodyPos.x,
        y: capsuleBottomY + aboveFeetDistance, // just above feet
        // y: capsuleBottomY + 0.01 , // just above feet
        z: bodyPos.z
    };

    const rayDir = { x: 0, y: -1, z: 0 };
    const ray = new RAPIER.Ray(rayOrigin, rayDir);

    const isGrounded = Shared.physWorld.castRay(
        ray, 
        totalrayLength, 
        true,              // solid
        undefined,         // filterFlags
        undefined,         // filterGroups
        playerCollider,    // exclude this collider
        undefined,         // exclude rigidbody (optional)
        undefined          // filterPredicate (optional)
    );

    let distanceToGround = 0;
    if (isGrounded != null) {
        const name = Shared.colliderNameMap.get(isGrounded.collider);
        // console.log("contact with", name, "at distance", isGrounded.toi);
        // console.log("Collider", isGrounded.collider, "hit at distance", isGrounded.toi, "shape", isGrounded.collider.shape);
        distanceToGround = isGrounded.toi - aboveFeetDistance;
        if (Math.abs(distanceToGround) <= skinDistance) distanceToGround = 0;//discard small distances to avoid jitter
    } else {
        console.log("NOCONTACT");
    }

    return {
        hit: (isGrounded != null),
        distance: distanceToGround
    };

}


/*---------------------------------*/
// updateVerticalSpeed
/*---------------------------------*/
// function groundCheck(deltaTime){
//     let groundCheck = isTouchingGround();

//     if (!groundCheck.hit){
//         verticalSpeed -= Shared.gravity * deltaTime;
//         // Clamp to max fall speed
//         if (verticalSpeed < -Shared.maxFallSpeed) verticalSpeed = -Shared.maxFallSpeed;
//     } else {
//         verticalSpeed = 0;
//     }
//     return groundCheck.distance;
// }

/*---------------------------------*/
// updateVerticalPosition
/*---------------------------------*/
function updateVerticalPosition(deltaTime){
    // Shared.yawObject.position.y += verticalSpeed * deltaTime;
    const pt = playerBody.translation();

    // 2️⃣ Compute the target position
    const newPos = {
    x: pt.x ,
    y: pt.y + verticalSpeed * deltaTime,
    z: pt.z 
    };
    playerBody.setNextKinematicRotation(newPos);

}

/*---------------------------------*/
// verticalUpdate
/*---------------------------------*/
function verticalUpdate(deltaTime){
    // updateVerticalPosition(deltaTime);
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


let raycastChunkArray = [];
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

let selectObject = null;

function raycastActionnables(){
    // console.log("raycastActionnables");
    selectObject = null;
    raycastChunkArray = Object.values(Shared.chunksInScene);//to optimize only load nearby chunks
    const actionnableChunkArray = Object.values(Shared.actionnablesInScene).flat();
    const raycastTargets = raycastChunkArray.concat(actionnableChunkArray);
    // const raycastTargets = raycastChunkArray;
    raycaster.setFromCamera(screenCenter, Shared.camera);
    let doesIntersect = false;
    const visibleTargets = raycastTargets.filter(obj => obj.visible);
    const hits = raycaster.intersectObjects(visibleTargets, true);//true means recursive raycast, it parses children too

    let closestHit = null;

    for (const hit of hits) {
        if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = hit;
        }
    }

    if (closestHit && closestHit.distance < 3) {
        doesIntersect = true;
    }

    if (doesIntersect) {

        if(closestHit.object?.userData?.type=="actionnable"){
            selectObject = closestHit.object;
            let parentActionnable = selectObject;
            while (parentActionnable && !actionnableChunkArray.includes(parentActionnable)) {
                parentActionnable = parentActionnable.parent;
            }
            selectObject = parentActionnable || selectObject;
            console.log("HIT",selectObject.name);
        }
        // console.log("HIT");
        // console.log(closestHit.object?.userData);
        // closestHit.object?.userData?.action();
    }

}

function onMouseClick(event) {
    // console.log("game click");
    if (selectObject){
        selectObject?.userData?.action(selectObject, playerState);
    }
}

function onMouseUp(event) {
    // console.log("game mouseup");
}


function syncCameraToPlayer() {
    const t = playerBody.translation();
    Shared.yawObject.position.set(t.x, t.y + cameraHeightFromCapsuleCenter, t.z);//
}



// // Move player capsule in the physics world
// function updatePlayerKinematic(moveVec, delta) {
//   const body = playerBody;

//   // Get current position
//   const t = body.translation();
//   const pos = new THREE.Vector3(t.x, t.y, t.z);

//   // Gravity (manual)
//   Shared.playerVelocity.y -= 9.81 * delta;

//   // Apply input movement (already rotated by yaw)
//   pos.addScaledVector(moveVec, Shared.playerSpeed * delta);
//   pos.y += Shared.playerVelocity.y * delta;

//   // Prevent falling below the floor (optional)
//   if (pos.y < 1) {
//     pos.y = 1;
//     Shared.playerVelocity.y = 0;
//   }

//   // Update Rapier body
//   body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
// }


function collisionCheck(newPos, currentPos, currentRot) {

    // Vector from current to new
    const movement = {
        x: newPos.x - currentPos.x,
        y: newPos.y - currentPos.y,
        z: newPos.z - currentPos.z,
    };
    // Raycast-like shape movement
    const movementLength = Math.hypot(movement.x, movement.y, movement.z);
    const direction = {
        x: movement.x / (movementLength || 1),
        y: movement.y / (movementLength || 1),
        z: movement.z / (movementLength || 1),
    };

    const maxToi = movementLength; // maximum distance to check
    const filterFlags = RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC; // ignore dynamic bodies
    const hit = Shared.physWorld.castShape(
        { x: currentPos.x, y: currentPos.y, z: currentPos.z },
        currentRot, // your capsule rotation
        direction,
        playerColliderDesc.shape,
        maxToi,
        undefined, // no complex filter
        filterFlags
    );

    const colDist = 1.0;
    // const colDist = movementLength;
    if (hit && hit.toi < colDist) {
        // if (hit && hit.toi < 0.5) {

        let collidername = Shared.colliderNameMap.get(hit.collider);
        // console.log("hit ", collidername ,"at distance",hit.toi);

        // We hit something before full movement!
        // Slide along the wall
        const normal = hit.normal1;

        // remaining distance vector = (desired move) * (1 - toi)
        // direction is assumed normalized and movementLength is the full desired distance
        const remainingDist = movementLength * (colDist - hit.toi);
        // const remainingDist =  hit.toi * movementLength;
        // console.log(remainingDist);
        const remainingVec = {
            x: direction.x * remainingDist,
            y: direction.y * remainingDist,
            z: direction.z * remainingDist
        };

        // Project remainingVec onto plane (remove component along normal)
        const dotRem = (remainingVec.x * normal.x + remainingVec.y * normal.y + remainingVec.z * normal.z);
        let slideVec = {
            x: remainingVec.x - (normal.x * dotRem),
            y: remainingVec.y - (normal.y * dotRem),
            z: remainingVec.z - (normal.z * dotRem)
        };

        // Decide if the surface is too steep (a wall) using upDot
        const upDot = normal.y; // Y is up
        // Only cancel upward movement on steep surfaces (we still want to fall when jumping on walls)
        // if (
        //     slideVec.y > 0 &&
        //     upDot < Shared.maxSlopeCos
        // ) {
        //     // console.log("TOOSTEEP");
        //     if (!isTouchingGround) console.log("Y CANCEL BUT WAS FALLING");
        //     // Too steep — disallow vertical motion for sliding
        //     slideVec.y = 0;
        // }

        const skin = 0.001;
        const slideLenMi = 1e-6;
        // const slideLenMi = Infinity;
        // let correction = skin - dotRem;
        let correction = 1e-4;
        // if (correction < 0.001) correction = 0 ;
        // if (correction < 0.1) correction = 0 ;
        // correction*=0.01;
        const slideLen = Math.hypot(slideVec.x, slideVec.y, slideVec.z);
        // if (slideLen > 1e-6) {
        if (slideLen > slideLenMi) {
            // const pushAway = 1e-3;
            const pushAway = correction;
            // const pushAway = skin - dotRem;
            // const pushAway = dotRem;
            // const pushAway = 0;
            newPos.x = currentPos.x + slideVec.x + normal.x * pushAway;
            newPos.y = currentPos.y + slideVec.y + normal.y * pushAway;
            newPos.z = currentPos.z + slideVec.z + normal.z * pushAway;
        } else {
            console.log("BACKOFF");
            // const backOff = 1e-3;
            const backOff = correction;
            // newPos.x = currentPos.x + direction.x * (hit.toi * movementLength - backOff);
            // newPos.y = currentPos.y + direction.y * (hit.toi * movementLength - backOff);
            // newPos.z = currentPos.z + direction.z * (hit.toi * movementLength - backOff);

            newPos.x = currentPos.x + direction.x * (remainingDist - backOff);
            newPos.y = currentPos.y + direction.y * (remainingDist - backOff);
            newPos.z = currentPos.z + direction.z * (remainingDist - backOff);
        }
        // console.log(newPos.z);

    } else {
        // console.log("NOHIT");
    }

    return newPos;

}

function toggleHideCollider(){
    Shared.rapierDebug.toggle();
}



function updateDoorsPhysics() {
  for (const update of Shared.pendingBodyUpdates) {

    // const position =  update.body.translation(); // returns a Rapier.Vector (x, y, z)
    // const rotation =  update.body.rotation();   // returns a Rapier.Quaternion (x, y, z, w)
    // console.log("Body position:", position.x, position.y, position.z);
    // console.log("Body rotation:", rotation.x, rotation.y, rotation.z, rotation.w);

    update.body.setNextKinematicTranslation(update.pivotPos);
    update.body.setNextKinematicRotation(update.pivotQuat);

    }
  Shared.pendingBodyUpdates.length = 0; // clear for next frame
}