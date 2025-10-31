import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import seedrandom from 'https://cdn.skypack.dev/seedrandom';
import {loadResourcesFromJson} from './LoadResources.js';
//OTHER IMPORTS FORBIDDEN! CIRCULAR DEPENDENCIES

// grid and cell dimensions
export const gridSize = 100;
export const gridDivisions = 100;
export const cellSize = gridSize / gridDivisions; //TODO: when not 1 this will break (myfunction load atlas planes are 1,1)
if (cellSize != 1) {
    throw new Error("cellsize", cellSize, "different from 1, this is not supported currently");
}

/*-----------------------------------------------------*/
// PSEUDO RANDOMNESS
/*-----------------------------------------------------*/

// pseudoseed
// const rng = seedrandom('666'); // Create a seeded random generator
// export const rng = seedrandom(); // Create a seeded random generator
export let rng = seedrandom(); // Create a seeded random generator

// Reset RNG with a new seed
export function setSeed(newSeed) {
    rng = seedrandom(newSeed);
}

// Function to generate a random float position between min and max using rng()
export function getRandom(min, max) {
    return rng() * (max - min) + min;
    // const _rng = rng();
    // console.log(_rng);
    // return _rng * (max - min) + min;
}

// Random int in [min, max] inclusive
export function getRandomInt(min, max) {
    return Math.floor(getRandom(min, max + 1));
}

export function branchChance(p) {
    return getRandomInt(0, 100) < p * 100;
}

/*-----------------------------------------------------*/
// GAMEPLAY CONSTANTS
/*-----------------------------------------------------*/
export const EPSILON = 0.01;

// speeds
export const moveSpeed = 5;

// camera offset position
const cameraOffsetX = 2;
const cameraOffsetZ = 2;
export const cameraOffsetY = 1.3+0.1; //see camera height in game.js

// floor/wall height
export const WALLHEIGHTDEFAULT = 2;
export const WALLHEIGHTMAX = 4;
export const WALLHEIGHTMIN = 1;
export const FLOORHEIGHTDEFAULT = 0;
export const FLOORHEIGHTMAX = 4;
export const FLOORHEIGHTMIN = 0;
export const CEILINGHEIGHTMAX = WALLHEIGHTMAX + FLOORHEIGHTMAX;
export let wallHeight = WALLHEIGHTDEFAULT;
export let floorHeight = 0;

// undo max capacity
export const MAXUNDOACTIONS = 10;

// Chunk size
export const CHUNKSIZE = 8;

// modes
export const MODEMENU = 0;
export const MODEEDITOR = 1;
export const MODEGAME = 2;

// ambient light in editor and game mode
export const AMBIENTLIGHTEDITCOLOR =new THREE.Color(1, 1, 1).multiplyScalar(0.45);
// export const AMBIENTLIGHTGAMECOLOR =new THREE.Color(0, 0, 1).multiplyScalar(0.10);
export const AMBIENTLIGHTGAMECOLOR =new THREE.Color(0.5, 0.5, 1).multiplyScalar(0.30);

// editor variables
export const editorState = {
    mode          : MODEEDITOR,
    editorRunning : false,        //TODO: maybe make it one running variable only
    gameRunning   : false,
    pause         : true,
    renderOneFrame: true,
    hasClicked    : false,
    mouseIsDown   : false
};

const keys = {};

// resources dictionaries
export let resourcesDict = {};  //resources dictionary
export let matDict       = {};  //material dictionary
export let atlasDict     = {};  //atlas dictionary
export let atlasUVsArray = [];  //material array (from dictionary)
export let atlasUVsidx   = {};  //UV to index map (for fast lookup)
export let atlasMat;
export let atlasMatTransp;
export let atlasUVs;
export let atlasMesh;
export let atlasMeshArray      = [];
export let atlasMeshidx        = {};
export let uvidBits            = 8;          //default
export let meshidBits          = 8;          //default
export let rotationBits        = 4;          //default
export let uvmeshidBits        = rotationBits + meshidBits + uvidBits;
export let uvmeshidHexWidth    = uvmeshidBits/4;
export const sceneGeometryDict = new Map();
export let thumbDict           = {};         //thumbnail dictionary
export let thumbDictUVsArray   = [];         //mesh array (from dictionary)

//holds geometry with animated uvs
export const UVToUpdate = [];

//uv info
export const uvInfo = {};

// Dynamically create a canvas element
export const canvas               = document.getElementById('three-canvas');
export const container            = document.getElementById('canvas-container');
export const uipanel              = document.getElementById('ui-panel');

export const matpopup             = document.getElementById("matpopup");
export const meshpopup            = document.getElementById("meshpopup");
export const mazewallpopup        = document.getElementById("mazewallpopup");
export const mazefloorpopup       = document.getElementById("mazefloorpopup");

export const matpopupCanvas       = document.getElementById("matpopupCanvas");
export const meshpopupCanvas      = document.getElementById("meshpopupCanvas");
export const mazewallpopupCanvas  = document.getElementById("mazewallpopupCanvas");
export const mazefloorpopupCanvas = document.getElementById("mazefloorpopupCanvas");

// Scene, Camera, Renderer
export const scene    = new THREE.Scene();
export const camera   = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ canvas:canvas, alpha: true });                                     // important

//Rapier collider world
export let physWorld = null;
export let rapierDebug = null;
export let mainRigidBody = null;
export let mainKinematicBody = null;
// export let debugRender = null;
// export let debugGeometry = null;
// export let debugLines = null;
// export const rigidBodies = [];
export const colliderNameMap = new Map();
export const pendingBodyUpdates = [];
// collider debug group
export const colliderDebugGroup = new THREE.Group();
colliderDebugGroup.name = "colliderDebugGroup";


export const gravity       = 9.81;
export const maxFallSpeed = 50; // meters per second, adjust as needed
// Define how steep is "walkable"
export const maxSlopeCos = Math.cos(45 * Math.PI / 180); // walkable if < 45°

export let physEventQueue = null;



//ambient light
export let ambientLight = new THREE.AmbientLight(AMBIENTLIGHTEDITCOLOR); // Soft light;

// Maps tracking tile/lights positions per PLANE
export const gridMapChunk = new Map();
export const chunksGroup = new THREE.Group(); chunksGroup.name = "chunksGroup";

// export const gridMapSprites = {};
// gridMapSprites.XZ = new Map();
// gridMapSprites.YZ = new Map();
// gridMapSprites.XY = new Map();
export const spritesGroup = new THREE.Group(); spritesGroup.name = "spritesGroup";
export const gridMapSpriteChunk = new Map();

export const gridMap   = {};
gridMap.XZ = new Map();
gridMap.YZ = new Map();
gridMap.XY = new Map();

export const gridLight = new Map();

// holds baked chunk geometry
export const chunksInScene = {};
export const spritesInScene = {};

//actionnable meshes in scene grouped by chunk
export const actionnablesInScene = {};

//colliders grouped by chunks
export const colliderInScene = {};

// camera holder: FPS-style rotation system
export const pitchObject = new THREE.Object3D(); // Up/down rotation (X axis)
export const yawObject = new THREE.Object3D();   // Left/right rotation (Y axis)

// clock
export const clock = new THREE.Clock();

//load progress, written by editor so cannot be in editorUI (dependent of editor)
export const LoadBtnTxt = document.getElementById('LoadBtnText');
export const LoadBtnProgress = document.getElementById('LoadBtnProgress');

/*-----------------------------------------------------*/
// loadResources
/*-----------------------------------------------------*/
export async function loadResources() {
    // load all resources into dictionaries from JSON
    let online = false;
    if (online)
        resourcesDict = await loadResourcesFromJson('./assets/resourcesonline.json');
    else
        resourcesDict = await loadResourcesFromJson('./assets/resources.json');
    matDict    = resourcesDict.IMAGES;
    atlasDict  = resourcesDict.ATLAS.ATLAS0;
    thumbDict  = resourcesDict.ATLAS.MESHTHUMBNAIL;
    atlasMat   = atlasDict.ATLASMATERIAL;
    atlasMatTransp   = atlasDict.ATLASMATERIALTRANSP;
    atlasUVs   = atlasDict.UVS;
    atlasUVsArray = Object.entries(atlasUVs);
    atlasUVsArray.forEach(([key], idx) => {
        atlasUVsidx[key] = idx;// key -> index map for fast lookup
    });
    thumbDictUVsArray = Object.entries(thumbDict.UVS);
    atlasMesh  = resourcesDict.MESHATLAS.ATLAS0;
    atlasMeshArray = Object.entries(atlasMesh);
    atlasMeshArray.forEach(([key], idx) => {
        atlasMeshidx[key] = idx;// key -> index map for fast lookup
    });
    // uvidBits   = Math.ceil(Math.log2(atlasUVsArray.length));
    // meshidBits = Math.ceil(Math.log2(atlasMeshArray.length));
    //support up to 256 textures and 256 meshes
    //64k combinations
    uvidBits = 8;
    meshidBits = 8;
    if(atlasUVsArray.length > 256) console.error("max textures supported is 256")
    if(atlasMeshArray.length > 256) console.error("max meshes supported is 256")

    uvInfo.uvtilesPerRow = atlasDict?.NUMX || 8;
    uvInfo.uvtilesPerCol = atlasDict?.NUMY || 8;
    uvInfo.uvscalex = 1 / uvInfo.uvtilesPerRow; // 0.125
    uvInfo.uvscaley = 1 / uvInfo.uvtilesPerCol; // 0.125
        
}

/*-----------------------------------------------------*/
// initRapier
/*-----------------------------------------------------*/
export async function initRapier(){
    await RAPIER.init();
    physWorld = new RAPIER.World({ x: 0, y: -gravity, z: 0 });
    console.log('Rapier initialized', physWorld);

    rapierDebug = addRapierDebug(physWorld);

// Create an event queue (for collision/contact events)
    physEventQueue = new RAPIER.EventQueue(true); // "true" = auto drain    

    mainRigidBody = physWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    mainRigidBody.userData = { name: "mainRigidBody"};

    mainKinematicBody = physWorld.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
    mainKinematicBody.userData = { name: "mainKinematicBody"};

    //add collider debug group to scene
    scene.add(colliderDebugGroup);

    // debugRender = new RAPIER.DebugRenderPipeline();
    // physWorld.debugRender = debugRender;    
    // debugGeometry = new THREE.BufferGeometry();
    // const debugMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    // debugLines = new THREE.LineSegments(debugGeometry, debugMaterial);
}

/*---------------------------------------------------------*/
// proxies to editor/game loop
// set through setters by main.js to avoid circular dependencies
/*---------------------------------------------------------*/
let stopEditorLoop = null;
let startEditorLoop = null;
let startGameLoop = null;
let stopGameLoop = null;

export function setStartEditorLoop(startEditorLoopv) {
    startEditorLoop = startEditorLoopv;
}
export function setStopEditorLoop(stopEditorLoopv) {
    stopEditorLoop = stopEditorLoopv;
}
export function setStartGameLoop(startGameLoopv) {
    startGameLoop = startGameLoopv;
}
export function setStopGameLoop(EdistopGameLoopv) {
    stopGameLoop = EdistopGameLoopv;
}

export function setEditorActions(Actionsv) {
    EditorActions = Actionsv;
    EditorActions["name"] = "EditorActions";
}
export function setGameActions(Actionsv) {
    GameActions = Actionsv;
    GameActions["name"] = "GameActions";
}

export function setEditorActionsMap(ActionsMap) {
    editorActionToKeyMap = ActionsMap;
}
export function setGameActionsMap(ActionsMap) {
    gameActionToKeyMap = ActionsMap;
}
        
/*---------------------------------------------------------*/
// toggleGameMode
/*---------------------------------------------------------*/
export function toggleGameMode() {
    if (editorState.editorRunning) {
        setMode(MODEGAME);
    } else {
        setMode(MODEEDITOR);
    }
}

/*---------------------------------*/
// setMode
/*---------------------------------*/
export function setMode(mode) {
    switch (mode) {
        case MODEMENU:
            break;
        case MODEGAME:
            StartBtn.textContent = "Stop Game";
            stopEditorLoop();
            stopEditorUI();
            ActionToKeyMap = gameActionToKeyMap;
            Actions = GameActions;
            // Actions = {};
            generateKeyToActionMaps();
            startGameLoop();
            startGameLoopUI();
            break;
        case MODEEDITOR:
            StartBtn.textContent = "Start Game (G)";
            stopGameLoop();
            stopGameLoopUI();
            ActionToKeyMap = editorActionToKeyMap;
            Actions = EditorActions;
            // Actions = {};
            generateKeyToActionMaps();
            startEditorLoop();
            startEditorUI();
            editorState.renderOneFrame = true;
            break;
    }

    //update the UI
    const cevent = new CustomEvent("UIChange", {
        detail: { field: "gameModeChange", value: mode },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(cevent);
}



let onMouseDown, onMouseUp;

function startEditorUI() {
    console.log("startEditorUI");

    // Lock on right mouse button down
    onMouseDown = (e) => {
        if (e.button === 2 && document.pointerLockElement !== canvas) {
            canvas.requestPointerLock();
            setRightMouseDown(true);
        }
    };
    canvas.addEventListener("mousedown", onMouseDown);

    // Unlock on right mouse button up
    onMouseUp = (e) => {
        if (e.button === 2 && document.pointerLockElement === canvas) {
            document.exitPointerLock();
            setRightMouseDown(false);
        }
    };
    document.addEventListener("mouseup", onMouseUp);

    document.addEventListener("mousemove", onMouseMoveEditor, false);

}

function stopEditorUI() {
    if (onMouseDown) canvas.removeEventListener("mousedown", onMouseDown);
    if (onMouseUp) document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("mousemove", onMouseMoveEditor, false);
}

function startGameLoopUI(){
    canvas.requestPointerLock();
    document.addEventListener("mousemove", onMouseMoveGame, false);
    canvas.addEventListener("mousedown", onMouseDown);
}
function stopGameLoopUI(){
    document.exitPointerLock();
    document.removeEventListener("mousemove", onMouseMoveGame, false);
}


/*---------------------------------*/
// doPause
/*---------------------------------*/
export function doPause() {
    setPause(!editorState.pause);
    // editorState.pause = !editorState.pause;
}

/*---------------------------------*/
// setPause
/*---------------------------------*/
export function setPause(value) {
    console.log("Pause",value);
    editorState.pause = value;
}

/*---------------------------------*/
// resetCamera
/*---------------------------------*/
export function resetCamera() {
    pitchObject.rotation.set(0, 0, 0);
    yawObject.position.set(cameraOffsetX, cameraOffsetY, cameraOffsetZ);
    yawObject.rotation.set(0, 0, 0);
}

/*---------------------------------*/
// actions variables
/*---------------------------------*/
let Actions=null;
let EditorActions=null;
let GameActions=null;
let editorActionToKeyMap = null;//wired in main
let gameActionToKeyMap = null;//wired in main

/*---------------------------------*/
// generateKeyToActionMaps
// Reverse the mapping to get the action from the key (press or release)
/*---------------------------------*/
let keyPressToActionMap = {};
let keyPressOnceToActionMap = {};
let keyReleaseToActionMap = {};
let ActionToKeyMap = null;//wired in main
export function generateKeyToActionMaps(){
    keyPressToActionMap = {};
    keyPressOnceToActionMap = {};
    keyReleaseToActionMap = {};
    for (let Action in ActionToKeyMap) {
        let mapping = ActionToKeyMap[Action]
        if (mapping.OnRelease) {
            keyReleaseToActionMap[mapping.key] = Action;
        } else if (mapping.OnPress) {
            keyPressOnceToActionMap[mapping.key] = Action;
        } else {
            keyPressToActionMap[mapping.key] = Action;
        }
    }
}

/*---------------------------------*/
// onKeyDownEvent
/*---------------------------------*/
export function onKeyDownEvent(event){

    let eventcode = event.code
    // Only prepend "Ctrl+" if the pressed key is NOT a modifier
    if ((event.ctrlKey || event.metaKey) &&
        event.code !== "ControlLeft" && event.code !== "ControlRight") {
        eventcode = "Ctrl+" + eventcode;
    }

    if (keyPressToActionMap[eventcode])   //if mapping exists
        Actions[keyPressToActionMap[eventcode]] = true;
    else if (keyPressOnceToActionMap[eventcode])
        Actions[keyPressOnceToActionMap[eventcode]] = !keys[eventcode];

    if (eventcode === "Tab" 
        || eventcode === "Ctrl+KeyS"
        || eventcode === "Ctrl+KeyL"
        || eventcode === "Ctrl+KeyR"
        || eventcode === "Ctrl+KeyA"
    ) {
        event.preventDefault(); // stop browser from changing focus
    }

    keys[eventcode] = true;//true all the time when key is pressed
}

/*---------------------------------*/
// onKeyUpEvent
/*---------------------------------*/
export function onKeyUpEvent(event){
    // if key up is control set the ctrl+ keys to false
    if (event.code === "ControlLeft" || event.code === "ControlRight") {
        for (const key in keys) if (key.startsWith("Ctrl+")) keys[key] = false;
    } else {
        if (keys["Ctrl+"+event.code]) keys["Ctrl+"+event.code] = false;
    }

    keys[event.code] = false;
    if (keyPressToActionMap[event.code])  //if mapping exists
        Actions[keyPressToActionMap[event.code]] = false;
    else if (keyPressOnceToActionMap[event.code])
        Actions[keyPressOnceToActionMap[event.code]] = false;
    else if (keyReleaseToActionMap[event.code]) //if mapping exists
        Actions[keyReleaseToActionMap[event.code]] = true;
}

/*---------------------------------*/
// releaseSingleEventActions
/*---------------------------------*/
export function releaseSingleEventActions() {
    for (const [action, actionValue] of Object.entries(Actions)) {
        if (actionValue) {
            let mapping = ActionToKeyMap[action];
            if (mapping)
                if (mapping.OnPress || mapping.OnRelease) {
                    Actions[action] = false
                }
        }
    }
}

/*---------------------------------*/
// resetAllActions
/*---------------------------------*/
export function resetAllActions(){
    for (const [action, ] of Object.entries(Actions)) {
        Actions[action] = false
    }
}

/*---------------------------------*/
// encodeID
/*---------------------------------*/
//[ rotation | uvid | meshid ] 4 + 8 + 8 bits = 20 bits = 5 nibbles
export function encodeID(uvid, meshid, rotation=0) {
    const encoded =
        ((rotation << (uvidBits + meshidBits)) |  // rotation at top
         (uvid << meshidBits) |
         meshid) + 1; // reserve 0, 0 is reserved to null
    return encoded.toString(16).padStart(uvmeshidHexWidth, "0"); // use 5 hex digits (20 bits)
}

/*---------------------------------*/
// decodeID
/*---------------------------------*/
export function decodeID(hexStr) {
    const encoded = parseInt(hexStr, 16); // back to integer
    if (encoded === 0) return null; // reserved null

    const shifted = encoded - 1;

    const meshidMask = (1 << meshidBits) - 1;
    const uvidMask   = (1 << uvidBits) - 1;
    const rotationMask = (1 << rotationBits) - 1;

    const meshid   = shifted & meshidMask;
    const uvid     = (shifted >> meshidBits) & uvidMask;
    const rotid    = (shifted >> (uvidBits + meshidBits)) & rotationMask;

    return { rotid, uvid, meshid };
}

/*---------------------------------*/
// getGridChunkKey
/*---------------------------------*/
export function getGridChunkKey(x, y = 0, z) {
    const nx = Math.floor(x/CHUNKSIZE);
    const ny = Math.floor(y/CHUNKSIZE);
    const nz = Math.floor(z/CHUNKSIZE);
    return `${nx},${ny},${nz}`;
}

/*---------------------------------*/
// getGridKey
/*---------------------------------*/
export function getGridKey(x, y = 0, z) {
    return `${x},${y},${z}`;
}

/*---------------------------------*/
// parseGridKey
/*---------------------------------*/
export function parseGridKey(key) {
    const [x, y, z] = key.split(',').map(Number);
    return { x, y, z };
}

/*---------------------------------*/
// createLight
/*---------------------------------*/
export function createLight(pos, range = 100, intensity = 1, color = 0xffffff, helper = true) {

    //light
    const pointLight = new THREE.PointLight(color, intensity, range); // white light, intensity 1, range 100
    // Set position from passed Vector3
    pointLight.position.copy(pos);  // ✅ use copy() to assign from a Vector3

    let lightHelper = null;
    if (helper) {
        // Optional: add helper to visualize light
        lightHelper = new THREE.PointLightHelper(pointLight, 0.5);
        // scene.add(lightHelper);
    }

    return { light: pointLight, helper: lightHelper };
}

/*---------------------------------*/
// onMouseMove
/*---------------------------------*/
export let isMouseOverCanvas = false;
export function setIsMouseOverCanvas(val) { isMouseOverCanvas = val; }
export function getIsMouseOverCanvas() { return isMouseOverCanvas; }
export const mouse = new THREE.Vector2();
export function getMouse() {return mouse;}
export let rightMouseDown = false;
export function setRightMouseDown(val) { rightMouseDown = val; }

export function onMouseMoveEditor(event) {

    // console.log("onMouseMove");  

    if (!isMouseOverCanvas) return;
    if (rightMouseDown) {
        const dx = event.movementX;
        const dy = event.movementY;

        // Use dx and dy to rotate camera/player
        //   console.log("Mouse moved:", dx, dy);

        const sensitivity = 0.002;

        yawObject.rotation.y -= event.movementX * sensitivity;  // Y-axis (left/right)
        pitchObject.rotation.x -= event.movementY * sensitivity; // X-axis (up/down)

        // Clamp pitch to prevent flipping
        const maxPitch = Math.PI / 2;
        pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchObject.rotation.x));

    } else {

        //store mouse coordinates on screen
        const rect = canvas.getBoundingClientRect();

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        // console.log("mouse",mouse);
    }
}

export function onMouseMoveGame(event) {
    const dx = event.movementX;
    const dy = event.movementY;

    // Use dx and dy to rotate camera/player
    //   console.log("Mouse moved:", dx, dy);

    const sensitivity = 0.002;

    yawObject.rotation.y -= event.movementX * sensitivity;  // Y-axis (left/right)
    pitchObject.rotation.x -= event.movementY * sensitivity; // X-axis (up/down)

    // Clamp pitch to prevent flipping
    const maxPitch = Math.PI / 2;
    pitchObject.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchObject.rotation.x));
}


/*---------------------------------*/
// setWallHeight
/*---------------------------------*/
export function setWallHeight(height){
    // console.log("wall height is",height);
    wallHeight = height;
}

/*---------------------------------*/
// setFloorHeight
/*---------------------------------*/
export function setFloorHeight(height){
    // console.log("floor height is",height);
    floorHeight = height;
}

export function updateAnimatedTextures() {

    for (const obj of UVToUpdate) {

        // const probesprite = spritesInScene;
        // if (maxiterations<=0)return;
        // maxiterations--;

        let { geomToUpdate, uvs, curidx } = obj;
        obj.curidx = (curidx + 1) % uvs.length; // advance safely in loop
        // console.log(obj.curidx);
        // geomToUpdate.attributes.uv = uvs[obj.curidx];
        // geomToUpdate.attributes.uv.needsUpdate = true; // <-- required

        geomToUpdate.traverse((child) => {
            if (child.isMesh && child.geometry && child.geometry.attributes.uv) {
                child.geometry.attributes.uv = uvs[obj.curidx];
                child.geometry.attributes.uv.needsUpdate = true;
            }
        })

        // geomToUpdate.userData["uvupdateiter"]=maxiterations;
    }

}



//game actionnable functions
export function doSomething(self){
    console.log("do something");
}

export function takeItem(self, playerState){
    self.visible = false;

    const key = self.name;
    if (!playerState.inventory[key]) {
        playerState.inventory[key] = 0;
    }

    playerState.inventory[key]++;
}

// export const sceneObjToUpdate = [];

export function openDoor(self, playerState) {
    console.log("openDoor");
    if (!self?.userData) return;

    //if player has key open door
    const haskey = playerState.inventory["ITEM_KEY"]
    if (!haskey){
        console.log("NOKEY");
        // return;
    }

    // Toggle the door state
    self.userData.isOpen = !self.userData.isOpen;


    // Define 90 degrees in radians
    const dir = self.userData.isOpen ? 1 : -1;
    const ninetyDeg = Math.PI / 2;


    const doorPivot = self.children[0];
    const doorBody = self.userData?.body;

    const pivotToCenterOffset = doorPivot.position.clone().negate(); // invert the pivot position
    const centerToColliderOffset = atlasMesh["DOOR"].COLLIDER.collideroffset;

    const pivotOffset = pivotToCenterOffset.clone().add(centerToColliderOffset);

    rotatePivot(doorPivot, new THREE.Vector3(0, 0, 1),dir * ninetyDeg, 0.6, doorBody, pivotOffset); //local rotation axis

}

export function openChest(self, playerState) {
    console.log("openChest");
    if (!self?.userData) return;

    //if player has key open door
    // const haskey = playerState.inventory["ITEM_KEY"]
    // if (!haskey){
    //     console.log("NOKEY");
    //     // return;
    // }

    // Toggle the door state
    self.userData.isOpen = !self.userData.isOpen;


    // Define 90 degrees in radians
    const dir = self.userData.isOpen ? -1 : 1;
    const ninetyDeg = Math.PI / 2;


    const doorPivot = self.children[0];
    // rotatePivot(doorPivot, new THREE.Vector3(0, 1, 0),dir * ninetyDeg, 0.6);
    rotatePivot(doorPivot, new THREE.Vector3(1, 0, 0),dir * ninetyDeg, 0.6); //local rotation axis

}



function rotatePivot(pivot, axis, targetAngle, duration = 1, body = null, pivotOffset = null) {
    const startTime = performance.now();
    let accumulatedAngle = 0;

    function animate(time) {
        const elapsed = (time - startTime) / 1000; // seconds
        const t = Math.min(elapsed / duration, 1); // normalized [0,1]
        const angleToApply = (targetAngle * t) - accumulatedAngle;

        // Rotate the door by the small delta around the pivot
        pivot.rotateOnAxis(axis, angleToApply);

        accumulatedAngle += angleToApply;

        if (body) {
            //schedule the body physics change
            //this is executed in main loop before world.step
            //if this is done here we can have race conditions with 
            //world.step in the main loop
            const pivotPos = pivot.getWorldPosition(new THREE.Vector3());
            const pivotQuat = pivot.getWorldQuaternion(new THREE.Quaternion());
            // printQuat(pivot);
            const worldOffset = pivotOffset.clone().applyQuaternion(pivotQuat);

            const finalPos = pivotPos.clone().add(worldOffset);
            pendingBodyUpdates.push({
                body,
                pivotPos: finalPos,
                pivotQuat
            });
        }


        if (t < 1) {
            requestAnimationFrame(animate);
        }
    }

    requestAnimationFrame(animate);
}



export function addRapierDebugExp(){
    rapierDebug = addRapierDebug(physWorld);
}



// call after Rapier.init() and after you have a world
function addRapierDebug(world) {
    // geometry & material for line segments
    const debugGeo = new THREE.BufferGeometry();
    // start empty; we'll allocate when we get data
    //   const debugMat = new THREE.LineBasicMaterial({ vertexColors: true });

    const debugMat = new THREE.LineBasicMaterial({
        color: 0xffffff,      // white lines
        linewidth: 2,         // ⚠️ only affects some renderers (not WebGL1)
        vertexColors: false,  // ignore Rapier's internal colors
    });


    const debugLines = new THREE.LineSegments(debugGeo, debugMat);
    debugLines.frustumCulled = false;
    colliderDebugGroup.add(debugLines);

    // helper to update per-frame
    function updateDebug() {
        // IMPORTANT: call after world.step() so Rapier buffers are fresh
        const debug = world.debugRender(); // returns vertex buffer and color buffer
        const vertices = debug.vertices || [];
        const colors = debug.colors || [];

        // early exit if no vertices
        if (!vertices.length) {
            debugGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
            debugGeo.setAttribute('color', new THREE.Float32BufferAttribute([], 3));
            return;
        }

        // Ensure vertices contain valid numbers
        const validVertices = vertices.every(v => Number.isFinite(v));
        if (!validVertices) {
            console.warn("Debug vertices contain invalid values; skipping update.");
            return;
        }

        // Recreate attributes if size differs
        if (!debugGeo.attributes.position || debugGeo.attributes.position.count !== vertices.length / 3) {
            debugGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

            let colorAttr;
            if (colors.length === vertices.length) {
                colorAttr = new THREE.Float32BufferAttribute(colors, 3);
            } else if (colors.length === (vertices.length / 3) * 4) {
                const conv = new Float32Array((colors.length / 4) * 3);
                for (let i = 0, j = 0; i < colors.length; i += 4, j += 3) {
                    conv[j + 0] = colors[i + 0] / 255;
                    conv[j + 1] = colors[i + 1] / 255;
                    conv[j + 2] = colors[i + 2] / 255;
                }
                colorAttr = new THREE.Float32BufferAttribute(conv, 3);
            } else {
                // fallback to white
                colorAttr = new THREE.Float32BufferAttribute(new Float32Array(vertices.length).fill(1), 3);
            }
            debugGeo.setAttribute('color', colorAttr);
        } else {
            // update existing attributes
            debugGeo.attributes.position.array.set(vertices);
            debugGeo.attributes.position.needsUpdate = true;

            if (colors.length > 0) {
                const attr = debugGeo.attributes.color;
                if (colors.length === vertices.length) {
                    attr.array.set(colors);
                } else if (colors.length === (vertices.length / 3) * 4) {
                    for (let i = 0, ai = 0; i < colors.length; i += 4, ai += 3) {
                        attr.array[ai + 0] = colors[i + 0] / 255;
                        attr.array[ai + 1] = colors[i + 1] / 255;
                        attr.array[ai + 2] = colors[i + 2] / 255;
                    }
                }
                attr.needsUpdate = true;
            }
        }

        // Only compute bounding sphere if positions are valid
        if (debugGeo.attributes.position && debugGeo.attributes.position.count > 0) {
            debugGeo.computeBoundingSphere();
        }
    }

    // visibility helpers
    function hide() {
        debugLines.visible = false;
    }

    function show() {
        debugLines.visible = true;
    }

    function toggle() {
        debugLines.visible = !debugLines.visible;
    }

    function isVisible() {
        return debugLines.visible;
    }

    return {
        debugLines,
        update: updateDebug,
        hide,
        show,
        toggle,
        isVisible,
        dispose() {
            colliderDebugGroup.remove(debugLines);
            debugGeo.dispose();
            debugMat.dispose();
        }
    };
}


function printQuat(pivot){
const quat = pivot.getWorldQuaternion(new THREE.Quaternion());

// Convert to Euler (THREE uses radians by default)
const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');

// Convert to degrees
const deg = {
  x: THREE.MathUtils.radToDeg(euler.x),
  y: THREE.MathUtils.radToDeg(euler.y),
  z: THREE.MathUtils.radToDeg(euler.z)
};

console.log('World rotation:', deg);}
