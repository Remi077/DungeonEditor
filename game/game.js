import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from './gameHUD.js';

/*---------------------------------*/
// GAMEPLAY VARIABLES
/*---------------------------------*/

// Player physical and camera setup

const playerHeight = 1.8; // total player height in meters
const cameraHeight = 1.3; // desired camera (eye) height above the floor
// const cameraHeight = Shared.cameraOffsetY; // desired camera (eye) height above the floor
const playerRadius = 0.4; // radius of the capsule collider

// Distance from capsule center (which is halfway up the capsule) to the camera position.
// Needed because Rapier places the capsule's origin at its center, not at the feet.
const cameraHeightFromCapsuleCenter = cameraHeight - playerHeight / 2;

// Half-height of the *cylindrical part* of the capsule.
// The capsule’s total height = 2 * halfHeight + 2 * radius = playerHeight
// halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
const halfHeight = (playerHeight / 2) - playerRadius;


// move variables
let moveVector = new THREE.Vector3();

// jump variables
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


// max slope in degrees you want to treat as "floor"
const maxSlopeDeg = 55;
const maxSlopeRad = THREE.MathUtils.degToRad(maxSlopeDeg);
// vertical threshold = cosine of slope
const verticalThreshold = Math.cos(maxSlopeRad);

//inventory
const playerState = {
    "health": 100,
    "maxHealth": 100,
    "inventory": {},
};

// actions variables
export let Actions={};
let gameId = null;

export let ActionToKeyMap = {
    moveCamRight: { key: 'KeyD' },
    moveCamLeft : { key: 'KeyA' },
    moveCamFront: { key: 'KeyW' },
    moveCamBack : { key: 'KeyS' },
    startGame   : { key: 'KeyG', OnPress: true },
    jump        : { key: 'Space', OnPress: true },
    interact    : { key: 'KeyE', OnPress: true },
    hideCol     : { key: 'KeyH', OnPress: true },
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

        playerBody = Shared.physWorld.createRigidBody(playerBodyDesc);
        playerBody.userData = { name: "playerBody" };

        // --- Create capsule collider ---
        playerColliderDesc = RAPIER.ColliderDesc.capsule(halfHeight, playerRadius)
        .setFriction(0.9)
        .setRestitution(0);

        playerCollider = Shared.physWorld.createCollider(playerColliderDesc, playerBody);
        Shared.colliderNameMap.set(playerCollider,"playerCollider");
        playerCollider.userData = { name: "playerCollider" };

        initHighlightPool(Shared.scene);

    } else {
        playerBody.setNextKinematicTranslation(
            campos.x, campos.y+cameraHeightFromCapsuleCenter, campos.z
        );
        playerBody.userData = { name: "playerBody" };
    }

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
const verbose = false;
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

        //debug only: clear visibility of colliding meshes
        hideAllHighlights();

        //calculate move vector
        moveVector.normalize();
        moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));

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
            } else if (result.distance < 0.05) {
                if (jumpPressed){
                    verticalSpeed = jumpSpeed;
                    jumpPressed = false;
                } else {
                    verticalSpeed = 0; //cancel speed
                    if (verbose) 
                        console.log("STICKING from ", newPos.y ,"to ",newPos.y - result.distance, " (distance:",result.distance,")" );
                    newPos.y -= result.distance; //snap to floor with small skin distance
                    newPos.y += 0.02; //small skin distance
                    // console.log("STICKING at ",newPos.y, " ",result.distance );
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

            if (verbose) console.log("newPos",newPos, "currentPos",currentPos,"moveVector",moveVector);
            const newPosv = newPos;
            const currentPosv = currentPos;
            const newPos2 = collisionCheck(newPosv,currentPosv, q,1);

            //second successive collision check to avoid "sliding" through another wall as a result of the first collision check
            const newPos3 = collisionCheck(newPos2,currentPosv, q,2); 

            newPos.x = newPos3.x;
            newPos.y = newPos3.y;
            newPos.z = newPos3.z;            

        }

        // 4️⃣ Apply rotation first
        playerBody.setNextKinematicRotation(q);

        // 5️⃣ Then apply translation
        playerBody.setNextKinematicTranslation(newPos);


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

            updateDoorsPhysics();

            myworldstep();

            syncCameraToPlayer(); // camera follows capsule

            Shared.rapierDebug.update();
            
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
// groundCheck
/*---------------------------------*/
let debugArrow = null;
let firstTimeArrow = true;
let debugCapsuleBottom = null;
function groundCheck() {

    const bodyPos = playerBody.translation();
    // Y position of the *bottom* of the capsule (the player's feet).
    // The capsule's center is at bodyPos.y, so we subtract the cylinder half-height
    // plus the spherical cap radius to reach the very bottom of the capsule.
    // halfHeight is a bit misleading because it’s not half of the total capsule height, it’s half of the cylindrical part only
    const capsuleBottomY = bodyPos.y - (halfHeight + playerRadius);

    const aboveFeetDistance = 0.4;
    const skinDistance = 0.01;
    const rayLength = 0.2; // small margin
    const totalrayLength = aboveFeetDistance+rayLength; // small margin
    const rayOrigin = {
        x: bodyPos.x,
        y: capsuleBottomY + aboveFeetDistance, // just above feet
        z: bodyPos.z
    };

    const rayDir = { x: 0, y: -1, z: 0 };
    const ray = new RAPIER.Ray(rayOrigin, rayDir);

    const groundHit = Shared.physWorld.castRay(
        ray, 
        totalrayLength, 
        true,              // solid
        undefined,         // filterFlags
        undefined,         // filterGroups
        playerCollider,    // exclude this collider
        undefined,         // exclude rigidbody (optional)
        undefined          // filterPredicate (optional)
    );

    /*---------------*/
    /*---------------*/
    /*---------------*/
    /*---------------*/
    // DRAW A DEBUG LINE
    /*---------------*/
    /*---------------*/
    /*---------------*/
    if (firstTimeArrow){
        // console.log("FIRSTTIMEARROW");
        firstTimeArrow = false;
        const origin = new THREE.Vector3(rayOrigin.x, rayOrigin.y, rayOrigin.z);
        const direction = new THREE.Vector3(rayDir.x, rayDir.y, rayDir.z).normalize();
        const length = totalrayLength;
        const color = groundHit ? 0x00ff00 : 0xff0000;
        debugArrow = new THREE.ArrowHelper(direction, origin, length, color);
        Shared.colliderDebugGroup.add(debugArrow);
        // Sphere for capsule bottom
        const sphereGeometry = new THREE.SphereGeometry(0.05, 8, 8); // radius 5 cm
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        debugCapsuleBottom = new THREE.Mesh(sphereGeometry, sphereMaterial);
        debugCapsuleBottom.position.set(rayOrigin.x, capsuleBottomY, rayOrigin.z);
        Shared.colliderDebugGroup.add(debugCapsuleBottom);
    } else {
        // move/update the arrow
        debugArrow.position.set(rayOrigin.x, rayOrigin.y, rayOrigin.z);
        debugArrow.setDirection(new THREE.Vector3(rayDir.x, rayDir.y, rayDir.z).normalize());
        debugArrow.setLength(totalrayLength);
        debugArrow.setColor(groundHit ? 0x00ff00 : 0xff0000);
        // Update capsule bottom sphere
        debugCapsuleBottom.position.set(rayOrigin.x, capsuleBottomY, rayOrigin.z);
    }
    /*---------------*/
    /*---------------*/
    /*---------------*/
    /*---------------*/

    let distanceToGround = 0;
    if (groundHit != null) {
        const name = Shared.colliderNameMap.get(groundHit.collider);
        distanceToGround = groundHit.toi - aboveFeetDistance;
        updateHighlight(groundHit.collider,0);
        if (verbose) 
            console.log("CONTACT hit ", name, "at distance", distanceToGround);
        // console.log("Collider", groundHit.collider, "hit at distance", groundHit.toi, "shape", groundHit.collider.shape);
        if (Math.abs(distanceToGround) <= skinDistance) distanceToGround = 0;//discard small distances to avoid jitter
    } else {
        if (verbose) 
            console.log("NOCONTACT from origin ", rayOrigin);
    }

    return {
        hit: (groundHit != null),
        distance: distanceToGround
    };

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
            // console.log("CLICKHIT",selectObject.name);
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


function collisionCheck(newPos, currentPos, currentRot, idx = 1) {

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
    const shapeVel = {
        x: direction.x * movementLength,
        y: direction.y * movementLength,
        z: direction.z * movementLength
    };

    const hit = Shared.physWorld.castShape(
        { x: currentPos.x, y: currentPos.y, z: currentPos.z }, // shapePos
        currentRot,                                           // shapeRot
        shapeVel,                                             // shapeVel
        playerColliderDesc.shape,                             // shape
        1.0,                                                  // maxToi (distance multiplier)
        true,                                                 // stopAtPenetration
        null,                                                 // filterFlags
        null,                                                 // filterGroups
        playerCollider,                                       // exclude this collider ✅
        playerBody,                                           // exclude this rigidbody ✅
    );

    const colDist = 1.0; //any hit returning less than 1 is considered collision within the movement
    if (hit && hit.toi < colDist) {

        let collidername = Shared.colliderNameMap.get(hit.collider);
        // if (verbose) 
        console.log("check" + idx + " hit", collidername, "at fractional distance", hit.toi);

        updateHighlight(hit.collider,idx);

        // We hit something before full movement!
        // Slide along the wall
        const normal = hit.normal1;

        // Project remainingVec onto plane (remove component along normal)
        if (moveVector.z < -0.5) {
            if (verbose) console.log("THISMOVE"); //useful line for breakpoint
        }

        const dotRem = (movement.x * normal.x + movement.y * normal.y + movement.z * normal.z);
        let slideVec = {
            x: movement.x - (normal.x * dotRem),
            y: movement.y - (normal.y * dotRem),
            z: movement.z - (normal.z * dotRem)
        };

        const pushAway = 1e-4;
        if (verbose) 
            console.log("SLIDE ",
                "slideVec", slideVec,
                "x:", slideVec.x + normal.x * pushAway,
                "y:", slideVec.y + normal.y * pushAway,
                "z:", slideVec.z + normal.z * pushAway
            )
        newPos.x = currentPos.x + slideVec.x + normal.x * pushAway;
        newPos.y = currentPos.y + slideVec.y + normal.y * pushAway;
        newPos.z = currentPos.z + slideVec.z + normal.z * pushAway;

    } else {
        if (verbose)
            console.log("NOHIT");
    }

    return newPos;

}

function toggleHideCollider(){
    // Shared.rapierDebug.toggle();
    Shared.colliderDebugGroup.visible = !Shared.colliderDebugGroup.visible;
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






/*-----------------------------------*/
// HIGHLIGHT COLLIDERS               //
/*-----------------------------------*/

// outside update loop
const highlightCollidingMeshes = [];
const highlightColors = [0xFFFF00, 0xFFA500, 0xFF0000]; // yellow, orange, red
const MAX_HIGHLIGHTS = 4; // slightly more than expected collisions

function initHighlightPool(scene) {
    for (let i = 0; i < MAX_HIGHLIGHTS; i++) {
        const color = highlightColors[i % highlightColors.length]; // cycle if more than 3
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            // wireframe: true,      // show edges
            // depthTest: false,
            // depthWrite: false
        });

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material);
        mesh.name = "highlightCollidingMeshes_"+i;
        mesh.renderOrder = 999;   // always in front
        mesh.visible = false;
        highlightCollidingMeshes.push(mesh);
        Shared.colliderDebugGroup.add(mesh);
    }
}

// update per frame
// update a single highlight at a given index
function updateHighlight(collider, index, highlightBody = false) {
    if (!Shared.rapierDebug.isVisible()) return;
    if (!collider) return;
    if (index >= highlightCollidingMeshes.length) return;

    const mesh = highlightCollidingMeshes[index];
    mesh.visible = true;

    const rigidBody = collider.parent(); // optional: get parent rigid body
    const position = highlightBody ? rigidBody.translation() : collider.translation();
    const rotation = highlightBody ? rigidBody.rotation() : collider.rotation();

    mesh.position.set(position.x, position.y, position.z);
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    const shape = collider.shape;
    if (shape instanceof RAPIER.Cuboid) {
        const hx = shape.halfExtents.x;
        const hy = shape.halfExtents.y;
        const hz = shape.halfExtents.z;
        mesh.scale.set(hx*2, hy*2, hz*2);
    } else if (shape instanceof RAPIER.Capsule) {
        const r = shape.radius;
        const hh = shape.halfHeight;
        mesh.scale.set(r*2, hh*2+r*2, r*2);
    } else if (shape instanceof RAPIER.Ball) {
        const r = shape.radius;
        mesh.scale.set(r*2, r*2, r*2);
    } else {
        mesh.scale.set(1,1,1);
    }
}

function hideAllHighlights() {
    highlightCollidingMeshes.forEach(m => m.visible = false);
}