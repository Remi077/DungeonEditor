/*-----------------------------------------------------*/
// IMPORTS //
/*-----------------------------------------------------*/

// import * as THREE from 'three';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import {
    createPlane,
    updateAnimations,
    loadResourcesFromJson,
    waitFor,
    createLight,
    getGridKey
} from './myFunctions.js'
import seedrandom from 'https://cdn.skypack.dev/seedrandom';
import { DecalGeometry } from './DecalGeometry.js'
import { GLTFLoader } from './GLTFLoader.js'
import { mergeBufferGeometries } from './BufferGeometryUtils.js'



// import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js';
// import { DecalGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/geometries/DecalGeometry.js';
// import { DecalGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/geometries/DecalGeometry.js';
// import { startGameLoop } from './game.js';

/*-----------------------------------------------------*/
// REVISION NUMBER
/*-----------------------------------------------------*/

// revision hash
const revision = "0.1"; // Replace with actual Git hash

// Add it to the div
document.getElementById('revision-info').innerText = `Version: ${revision}`;


//pick params passed from url
const params = new URLSearchParams(window.location.search);
const compressed = params.get("level");
console.log("compressed", compressed);

/*-----------------------------------------------------*/
// PSEUDO RANDOMNESS
/*-----------------------------------------------------*/

// pseudoseed
// const rng = seedrandom('666'); // Create a seeded random generator
const rng = seedrandom(); // Create a seeded random generator

// Function to generate a random position between min and max using rng()
export function getRandom(min, max) {
    return rng() * (max - min) + min; // Random number between min and max
}

/*-----------------------------------------------------*/
// PLATFORM MANAGEMENT
/*-----------------------------------------------------*/

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
// Usage
if (isMobile()) {
    console.log("You're on a mobile device!");
} else {
    console.log("You're on a desktop!");
}


// DISPLAY BROWSER FPS

const stats = new Stats();
stats.dom.style.position = 'relative'; // <-- remove fixed position
stats.dom.style.top = 'auto';
stats.dom.style.left = 'auto';
stats.dom.style.marginTop = '10px';
stats.dom.style.transform = 'scale(2)';
stats.dom.style.transformOrigin = 'top left';
document.getElementById('ui-panel').appendChild(stats.dom);


/*-----------------------------------------------------*/
// DEBUG VARIABLES
/*-----------------------------------------------------*/

let debug = false;
let freeCam = false;

if (1) {
    debug = true;
    freeCam = true;
}

/*-----------------------------------------------------*/
// GAMEPLAY CONSTANTS
/*-----------------------------------------------------*/

// let previousPoint = new THREE.Vector3(0, 0, 0);
let prevSelectX = 99999;
let prevSelectZ = 99999;
const EPSILON = 0.01;

let drawcalls = 0;

const MODEXZ = 0;
const MODEYZ = 1;
const MODEXY = 2;
const MODEW = 3;
const MODEA = 4;
const NUMMODES = 5;

const scaleY = 2;
let hasClicked = false;
let prevWallModeSelect = MODEA;
let mouseIsDown = false;
let selectValid = false;
let prevSelectValid = false;
let selectX = 0;
let selectZ = 0;
let tilecount = 0;
let boxSelectMode = false;
let boxselectModestartX = 0;
let boxselectModestartZ = 0;
let boxselectModeendX = 0;
let boxselectModeendZ = 0;
let wallModeSelect = MODEXZ; //0: xz 1:yz 2:xy 3: walls 4: all
let showMarkerXZ = true;
let showMarkerYZ = false;
let showMarkerXY = false;
let eraserMode = false;

let tileXZGroup = new THREE.Group(); tileXZGroup.name = "tileXZGroup";
let tileXYGroup = new THREE.Group(); tileXYGroup.name = "tileXYGroup";
let tileYZGroup = new THREE.Group(); tileYZGroup.name = "tileYZGroup";
let lightGroup = new THREE.Group(); lightGroup.name = "lightGroup";
let lightHelperGroup = new THREE.Group(); lightHelperGroup.name = "lightHelperGroup";

const numPlat = 8
const numPlatToTheLeft = 4
const groundLength = 6;
const groundGap = 2;

//speeds
const moveSpeed = 5;
const groundSpeed = debug ? 0 : (isMobile() ? 9 * 0.9 : 9);
const gravitySpeedDecrement = isMobile() ? 50 * 0.95 : 50;
const jumpInitVerticalSpeed = 15;

//ground variables
const groundInitPos = (numPlat - numPlatToTheLeft) * (groundLength + groundGap);
const groundLimit = -numPlatToTheLeft * (groundLength + groundGap);
const groundMinY = -1.5;
const groundMaxz = 1.5;
const groundHeightMaxDiff = groundMaxz - groundMinY
const groundLengthRatioMin = 0.35;
const groundLengthRatioMax = 1;
const groundHeight = 30;
const groundCenterY = -0.5 - (groundHeight / 2);
const deathPlaneHeight = -10;

// camera offset position
const cameraOffsetZ = 2;
const cameraOffsetY = 1;

// background variables
const numCitySprites = 4;
const numCitySpritesToTheLeft = 1;
const citySpriteScale = 50;
const bgSpeed = groundSpeed * 0.75;
const bgLimit = -(numCitySpritesToTheLeft + 1) * citySpriteScale;

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/
let running = false;
let editorId = null;

let resourcesDict = {}; //resources dictionary
let matDict = {}; //material dictionary
let atlasDict = {}; //atlas dictionary
let charaDict = {}; //meshes dictionary
let animDict = {}; //meshes dictionary
// let matArray = []; //material array (from dictionary)
let atlasArray = []; //material array (from dictionary)
let atlasMat;
let atlasUVs;
let defaultGeom;
let markerGeom;

let bakedGeometry;

//any new geometry/uv generate a new draw call
//optimize it by tracking the already used geometry+uv ones
let geometryCache = {};
geometryCache["Plane"] = {};

// let atlasTex;
// let currentMatIndex = 1;
// let currentMat = null;
let currentGeomIndex = 1;
let currentGeom = null;
let player;
let grounds = [];
let citySprites = [];
let groundSprites = [];
let doorSprites = [];
let doorPosition = [];
const keys = {};
let playerVerticalSpeed = 0;
let isTouchingGround = null;
let isTouchingGroundPrev = null;
let citySpriteLeftIdx = 0;
let frameCount = 0;
let deltaTime;
let deltaHUDTime;
let pause = false;
let renderOneFrame = true;
let nextColIdx = 0;
let hasJumped = false;
let hasInteracted = false;
let doorRotCur = 0;
let doorRotTarget = 0;
let doorRotTime = 0;
let movingDoor = false;
let score = 0;
let newgroundSpeed = groundSpeed;
let newbgSpeed = bgSpeed;
let lives = 3;
let messageScreen = "";
let gameOver = false;
let gameActions = {}
let startJumpHeight, endJumpHeight;
let ts = 70; //speed tweak variable
let ms = isMobile() ? 0.15 : 0.3; //max speed gain
//TODO create a game state + game state manager

let messageScale = 0;
let messageTargetScale = 1;
let messageScaleDuration = 0.8; //in seconds
let messageScaleSpeed = messageTargetScale / messageScaleDuration;

/*-----------------------------------------------------*/
// GAME ACTIONS TO KEY MAPPING AND REVERSE
/*-----------------------------------------------------*/
let gameActionToKeyMap = {
    //camera actions (debug)
    moveCamUp: { key: 'ShiftLeft' },
    moveCamDown: { key: 'Space' },
    moveCamRight: { key: 'KeyD' },
    moveCamLeft: { key: 'KeyA' },
    moveCamFront: { key: 'KeyW' },
    moveCamBack: { key: 'KeyS' },
    setAddPlaneMode: { key: 'Digit1', OnPress: true },
    setAddLightMode: { key: 'Digit2', OnPress: true },
    // toggleWall: { key: 'KeyQ', OnPress: true },
    // setEraser: { key: 'KeyF', OnPress: true },
    // shift:  { key: 'Shift' },
    //debug actions
    // moveByOneFrame: { key: 'KeyA', OnPress: true }, //triggered once only at keydown
    //pause
    pause: { key: 'KeyP', OnRelease: true }, //triggered once only at release
    //gameplay actions
    // jump: { key: 'Space', OnPress: true },
    // interact: { key: 'KeyE', OnPress: true },
    prevMaterial: { key: 'KeyQ', OnPress: true },
    nextMaterial: { key: 'KeyE', OnPress: true },
    forceGameOver: { key: 'KeyO', OnPress: true },
    saveLevel: { key: 'KeyT', OnPress: true },
    bakeLevel: { key: 'KeyB', OnPress: true },
    loadLevel: { key: 'KeyL', OnPress: true },
    startGame: { key: 'KeyG', OnPress: true },
};
// Reverse the mapping to get the action from the key (press or release)
let keyPressToGameActionMap = {};
let keyPressOnceToGameActionMap = {};
let keyReleaseToGameActionMap = {};
for (let gameAction in gameActionToKeyMap) {
    let mapping = gameActionToKeyMap[gameAction]
    if (mapping.OnRelease) {
        keyReleaseToGameActionMap[mapping.key] = gameAction;
    } else if (mapping.OnPress) {
        keyPressOnceToGameActionMap[mapping.key] = gameAction;
    } else {
        keyPressToGameActionMap[mapping.key] = gameAction;
    }
}

/*-----------------------------------------------------*/
// PRELIMINARIES
// create scene, camera and renderer
// HUB overlay
// clock and input listeners
/*-----------------------------------------------------*/

// Dynamically create a canvas element
// const canvas = document.createElement('canvas');
// document.body.appendChild(canvas);
const canvas = document.getElementById('three-canvas');
const container = document.getElementById('canvas-container');

// Scene, Camera, Renderer
const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

// raycast floor
let grid;
let axes;
const gridSize = 100;
const gridDivisions = 100;
const gridMapXZ = new Map(); // key = "x,z" or "x,y,z", value = mesh or true
const gridMapYZ = new Map(); // key = "x,z" or "x,y,z", value = mesh or true
const gridMapXY = new Map(); // key = "x,z" or "x,y,z", value = mesh or true
const gridLight = new Map();

const cellSize = gridSize / gridDivisions; //TODO: when not 1 this will break (myfunction load atlas planes are 1,1)
if (cellSize != 1) {
    throw new Error("cellsize", cellSize, "different from 1, this is not supported currently");
}
const floorGeo = new THREE.PlaneGeometry(gridSize, gridSize); floorGeo.name = "floorGeo";
// const floorMat = new THREE.MeshBasicMaterial(); // invisible
const floorMat = new THREE.MeshBasicMaterial({ visible: false, name: "floorMat" }); // invisible
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.name = "floor";

//raycaster
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

let loadingTile;
//marker materials
// const markerxzmaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
// const markeryzmaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
// const markerxymaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
// const markerremovematerial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
let markerxzmaterial;
let markeryzmaterial;
let markerxymaterial;
let markerremovematerial;
let markergroupxz;
let markergroupyz;
let markergroupxy;
let markerxz;
let markeryz;
let markerxy;
let markergroupxzDict;
let markergroupyzDict;
let markergroupxyDict;

// Mini scene
const axesScene = new THREE.Scene();
// axesScene.background = null;
axesScene.background = new THREE.Color(0x000000);
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
const axesHelper = new THREE.AxesHelper(2);

// FPS-style rotation system
const pitchObject = new THREE.Object3D(); // Up/down rotation (X axis)
pitchObject.name = "pitchObject";
pitchObject.add(camera);

const yawObject = new THREE.Object3D();   // Left/right rotation (Y axis)
yawObject.name = "yawObject";
yawObject.add(pitchObject);
// Add yawObject to scene instead of camera directly
const pointLight = new THREE.PointLight(new THREE.Vector3(0, 0, 0), 1, 100);
// pointLight.position.copy(pos);
yawObject.add(pointLight);
scene.add(yawObject);

// const cameraOffsetY = 5;
function resetCamera() {
    console.log("reset yawobject");
    pitchObject.rotation.set(0, 0, 0);
    yawObject.position.set(0, cameraOffsetY, cameraOffsetZ);
    yawObject.rotation.set(0, 0, 0);
    // yawObject.position.z = cameraOffsetZ;
    // yawObject.position.y = cameraOffsetY;
}
resetCamera();
// const renderer = new THREE.WebGLRenderer({ canvas });

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true }); // important
renderer.setClearColor(0x000000, 0); // transparent background
scene.background = new THREE.Color(0x000000);

// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setSize(container.clientWidth, container.clientHeight);
// document.body.appendChild(renderer.domElement);

// Create a 2D canvas for overlay
const hudCanvas = document.getElementById('hud-canvas');
// hudCanvas.width = window.innerWidth;
// hudCanvas.height = window.innerHeight;
hudCanvas.width = container.clientWidth;
hudCanvas.height = container.clientHeight;

const hudContext = hudCanvas.getContext('2d');

// Clear the canvas (transparent background)
hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

// Example: Draw a simple text overlay (debugging HUD)
hudContext.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white
hudContext.font = '20px Arial';
// hudContext.fillText('HUD Overlay', 10, 30);

// clock
const clock = new THREE.Clock();



// Add event listener on your start button or canvas to request pointer lock:
// canvas.addEventListener('click', () => {
// canvas.focus();
// canvas.requestPointerLock();
// });
const AddBtn = document.getElementById('AddBtn');
const AddLBtn = document.getElementById('AddLBtn');
const LoadBtn = document.getElementById('LoadBtn');
const LoadBtnTxt = document.getElementById('LoadBtnText');
const LoadBtnProgress = document.getElementById('LoadBtnProgress');
const SaveBtn = document.getElementById('SaveBtn');
const BakeBtn = document.getElementById('BakeBtn');
const ResetBtn = document.getElementById('ResetBtn');
const StartBtn = document.getElementById('StartBtn');


const ADDPLANEMODE = 0;
const ADDLIGHTMODE = 1;
const NUMADDMODES = 2;
let currentAddMode = ADDPLANEMODE;

AddBtn.addEventListener('click', () => {
    canvas.focus();
    canvas.requestPointerLock();
    setAddMode(ADDPLANEMODE);
    // currentAddMode = ADDPLANEMODE;
});
AddLBtn.addEventListener('click', () => {
    canvas.focus();
    canvas.requestPointerLock();
    setAddMode(ADDLIGHTMODE);
    // currentAddMode = ADDLIGHTMODE;
    // showMarkerXY = false;
    // showMarkerYZ = false;
    // showMarkerXZ = false;
});
LoadBtn.addEventListener('click', () => { loadLevel(); });
SaveBtn.addEventListener('click', () => { saveLevel(); });
BakeBtn.addEventListener('click', () => { bakeLevel(); });
ResetBtn.addEventListener('click', () => { resetLevel(); });
StartBtn.addEventListener('click', () => {
    toggleGameMode();
    // stopEditorLoop();         // Pause/stop editor
    // startGameLoop();
    // startGameLoop(scene, camera, yawObject, renderer, container, gameActions);          // Start game
});




canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== canvas) {
        // console.log("Pointer locked");
        canvas.requestPointerLock(); // First click: lock pointer
        // document.addEventListener("mousedown", onMouseClick, false);
        // document.addEventListener("mouseup", onMouseUp, false);
        // document.addEventListener("wheel", onMouseWheel, false);
        //   } else {
        // onMouseClick();
        // console.log("Click1");
    }
});

//start paused
pause = true;
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === canvas) {
        pause = false;
        console.log("Pointer locked");
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('pointer-lock-hint').style.display = 'block';
        document.addEventListener("mousemove", onMouseMove, false);

        document.addEventListener("mousedown", onMouseClick, false);
        document.addEventListener("mouseup", onMouseUp, false);
        document.addEventListener("wheel", onMouseWheel, false);

    } else {
        pause = true;
        console.log("Pointer unlocked");
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('pointer-lock-hint').style.display = 'none';
        document.removeEventListener("mousemove", onMouseMove, false);

        document.removeEventListener("mousedown", onMouseClick, false);
        document.removeEventListener("mouseup", onMouseUp, false);
        document.removeEventListener("wheel", onMouseWheel, false);
    }
});

// Handle keyboard input
document.addEventListener('keydown', (event) => {
    // keysOnPress[event.code] = !keys[event.code];
    if (keyPressToGameActionMap[event.code])   //if mapping exists
        gameActions[keyPressToGameActionMap[event.code]] = true;
    else if (keyPressOnceToGameActionMap[event.code])
        gameActions[keyPressOnceToGameActionMap[event.code]] = !keys[event.code];

    keys[event.code] = true;//true all the time when key is pressed
});
document.addEventListener('keyup', (event) => {
    // keysOnRelease[event.code] = keys[event.code];//true only once when key is released
    keys[event.code] = false;
    if (keyPressToGameActionMap[event.code])  //if mapping exists
        gameActions[keyPressToGameActionMap[event.code]] = false;
    else if (keyPressOnceToGameActionMap[event.code])
        gameActions[keyPressOnceToGameActionMap[event.code]] = false;
    else if (keyReleaseToGameActionMap[event.code]) //if mapping exists
        gameActions[keyReleaseToGameActionMap[event.code]] = true;
});
document.addEventListener('touchstart', () => {
    keys['touchstart'] = true;
    if (!pause && !gameOver) {
        jump();
    }
});
document.addEventListener('touchend', () => {
    keys['touchstart'] = false;
});
document.addEventListener('touchcancel', () => {
    keys['touchstart'] = false; // Ensure touch key resets on cancel
});
window.addEventListener('resize', () => {
    // Resize the 3D canvas
    // renderer.setSize(window.innerWidth, window.innerHeight);
    // camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(container.clientWidth, container.clientHeight);
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    // Resize the HUD canvas
    // hudCanvas.width = window.innerWidth;
    // hudCanvas.height = window.innerHeight;
    hudCanvas.width = container.clientWidth;
    hudCanvas.height = container.clientHeight;
});


/*-----------------------------------------------------*/
// SETUP AND START GAME
/*-----------------------------------------------------*/

setupAndStartGame();

/*-----------------------------------------------------*/
/*-----------------------------------------------------*/
/*FUNCTIONS--------------------------------------------*/
/*-----------------------------------------------------*/
/*-----------------------------------------------------*/


/*-----------------------------------------------------*/
// SETUP AND START GAME function
/*-----------------------------------------------------*/

let meshMap = {};
async function setupAndStartGame() {
    try {

        //test load glb
        // const loader = new GLTFLoader();
        // loader.load('assets/Meshes.glb', (gltf) => {
        //     const scene = gltf.scene;

        //     // Object to store meshes by name

        //     scene.traverse((child) => {
        //         if (child.isMesh) {
        //             meshMap[child.name] = child;
        //         }
        //     });

        //     console.log(meshMap);
        //     // Now you can access meshMap['Plane'], meshMap['Sphere'], etc.
        //     // scene.add(meshMap["Sphere"]);
        // });







        // console.log("HELLOWORLD");  

        // load all resources into dictionaries from JSON
        let online=true;
        if (online)
            resourcesDict = await loadResourcesFromJson('resourcesonline.json');
        else
            resourcesDict = await loadResourcesFromJson('resources.json');
        matDict = resourcesDict.IMAGES;
        atlasDict = resourcesDict.ATLAS.ATLAS0;
        atlasMat = atlasDict.ATLASMATERIAL;
        atlasUVs = atlasDict.UVS;
        // atlasTex = atlasMat.map;
        // matArray = Object.entries(matDict);
        atlasArray = Object.entries(atlasUVs);
        // charaDict = resourcesDict.MESHES.CHARA;
        // animDict = charaDict.ANIMATIONS;

        // defaultGeom = 'WALL' in atlasDict ? atlasDict.WALL.geometry : Object.values(atlasDict)[0];
        defaultGeom = new THREE.PlaneGeometry(1, 1);
        markerGeom = defaultGeom.clone();

        // let s = meshMap["Plane"];
        // s.material = atlasMat;
        // // const tilesPerRow = 8;
        // // const tilesPerCol = 8;
        // const tilesPerRow = 8;
        // const tilesPerCol = 8;
        // const uvScaleX = 1 / tilesPerRow; // 0.125
        // const uvScaleY = 1 / tilesPerCol; // 0.125
        // const offsetX = 1 * uvScaleX;
        // const offsetY = 5 * uvScaleY;
        // const uv = s.geometry.attributes.uv;
        // for (let i = 0; i < uv.count; i++) {
        //     let x = uv.getX(i);
        //     let y = uv.getY(i);
        //     // Scale down to tile size
        //     x = x * uvScaleX;
        //     y = y * uvScaleY;
        //     // Offset to desired tile
        //     x += offsetX;
        //     y += offsetY;
        //     uv.setXY(i, x, y);
        // }
        // uv.needsUpdate = true;
        // scene.add(s);

        //start in add plane mode
        setAddMode(ADDPLANEMODE);


        //setup markers
        // In Three.js, the coordinate system is a right-handed Cartesian system, and the axes are organized like this:
        //       Y+ (up)
        //        |
        //        |
        //        |_____ X+ (right)
        //       /
        //      /
        //    Z+ (toward you)


        markerxzmaterial = atlasMat.clone();
        markerxzmaterial.name = "markerxzmaterial";
        // Object.assign(markerxzmaterial, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        //TEMP: a transparent plane adds 2 draw calls per plane instead of 1.
        Object.assign(markerxzmaterial, { side: THREE.DoubleSide, transparent: false, opacity: 0.5 });
        markerxzmaterial.color.set(0xff0000);
        markeryzmaterial = markerxzmaterial.clone();
        markeryzmaterial.color.set(0x00ff00);
        markeryzmaterial.name = "markeryzmaterial";
        markerxymaterial = markerxzmaterial.clone();
        markerxymaterial.color.set(0x0000ff);
        markerxymaterial.name = "markerxymaterial";
        markerremovematerial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
        markerremovematerial.name = "markerremovematerial";

        //selected cell
        //XZ : horizontal plane, RED
        markergroupxz = new THREE.Group(); markergroupxz.name = "markergroupxz";
        markergroupxz.visible = false;
        markerxz = new THREE.Mesh(
            // new THREE.PlaneGeometry(cellSize, cellSize),
            // atlasDict.WALL.geometry,//TODO, this is 1,1 not cellsize, maybe rescale here?
            markerGeom,
            markerxzmaterial,
            name = "markerxz"
        );
        markerxz.position.set(0.5, 0, 0.5);
        markerxz.rotation.x = Math.PI / 2;
        markergroupxz.add(markerxz.clone());
        scene.add(markergroupxz);
        markergroupxz.visible = showMarkerXZ;
        markergroupxzDict = new Map();
        // setUVsByName(defaultGeom,"WALL");
        // setUVsByName(defaultGeom,0,7);
        // setUVsByName(defaultGeom,0,7);
        // setUVs(markerxz.geometry.attributes.uv,0,7);
        // setUVsByName(markerxz.geometry.attributes.uv,"WALL");
        setUVsByName(markerGeom, "WALL");

        //YZ : left plane, GREEN
        markergroupyz = new THREE.Group(); markergroupyz.name = "markergroupyz";
        markeryz = new THREE.Mesh(
            // atlasDict.WALL.geometry,
            markerGeom,
            // new THREE.PlaneGeometry(cellSize, cellSize),
            markeryzmaterial,
            name = "markeryz"
        );
        markeryz.position.set(0, 0.5, 0.5);//relative x,y,z
        markeryz.rotation.y = Math.PI / 2;//plane starts with z normal (facing you)
        markergroupyz.add(markeryz.clone());
        scene.add(markergroupyz);
        markergroupyz.visible = showMarkerYZ;
        markergroupyzDict = new Map();
        // setUVsByName(markeryz.geometry.attributes.uv,"WALL");

        //XY : front plane, BLUE
        markergroupxy = new THREE.Group(); markergroupxy.name = "markergroupxy";
        markerxy = new THREE.Mesh(
            // atlasDict.WALL.geometry,
            markerGeom,
            // new THREE.PlaneGeometry(cellSize, cellSize),
            markerxymaterial,
            name = "markerxy"
        );
        markerxy.position.set(0.5, 0.5, 0);//in scene gizmo: x red axis, y green axis, z blue axis
        markergroupxy.add(markerxy.clone());
        scene.add(markergroupxy);
        markergroupxy.visible = showMarkerXY;
        markergroupxyDict = new Map();
        // setUVsByName(markerxy.geometry.attributes.uv,"WALL");
        // setUVsByName(defaultGeom,0,7);


        //setup marker materials
        // markerxzmaterial.map = matDict.WALL.map;
        // markeryzmaterial.map = matDict.WALL.map;
        // markerxymaterial.map = matDict.WALL.map;
        // markerxzmaterial.name = matDict.WALL.name;
        // markeryzmaterial.name = matDict.WALL.name;
        // markerxymaterial.name = matDict.WALL.name;

        // charaMixer = charaDict.MIXER;

        // levelDict = await loadLevelFromJson('level.json');

        // create the scene
        createScene();
        // let loopcount = 0;
        // while (loopcount < 100) { //for the moment allow 100 replays
        // loopcount++;
        //initializeScene
        initializeScene();

        // run the intro
        // await intro();

        // Reset the clock to start from 0
        clock.start();

        // Start animation loop
        // editorId = requestAnimationFrame(animate);
        startEditorLoop();

        // await waitForGameOver();
        // stopAllActions();

        // await gameOverSequence();
        // }
        // console.error("max replay reached: refresh your browser", error);

    } catch (error) {
        console.error("Error in scene setup or animation:", error);
    }
}

async function promptToRestart() {
    return new Promise(resolve => {
        const checkRestartKey = () => {
            const anyTrue = Object.values(keys).some(value => value === true);
            if (anyTrue) {
                resolve();
            } else {
                requestAnimationFrame(checkRestartKey); // Keep checking on each frame
            }
        };
        //reset keys in case some keyUp were made out of scope and not tracked correctly
        Object.keys(keys).forEach(key => {
            delete keys[key];
        });
        checkRestartKey(); // Start checking
    });
};

/*-----------------------------------------------------*/
// intro function
/*-----------------------------------------------------*/

async function intro() {
    messageScreen = "Get Ready...";
    await animateHUD(2, 0.6);
    await waitFor(0.5);
    messageScreen = "Go!";
    await animateHUD(2, 0.4);
    await waitFor(0.5);
    messageScreen = "";
}

/*-----------------------------------------------------*/
// gameOver function
/*-----------------------------------------------------*/
async function waitForGameOver() {
    // Wait for the game over flag to be set
    await new Promise(resolve => {
        const checkGameOverInterval = setInterval(() => {
            if (gameOver) {
                clearInterval(checkGameOverInterval);  // Stop checking
                resolve();  // Resolve the promise
            }
        }, 100);  // Check every 100ms if the game is over
    });
}

async function gameOverSequence() {
    console.log("GAMEOVER")
    messageScreen = "GAMEOVER";
    await animateHUD(2, 0.6);
    await waitFor(0.5);
    messageScale = 1;
    messageTargetScale = 1;
    messageScreen = isMobile() ? "Tap to replay" : "press any key to replay";
    drawHUD();
    renderer.render(scene, camera);
    // wait for input
    await promptToRestart();
    messageScreen = "";
    drawHUD();
    renderer.render(scene, camera);
    await waitFor(0.5);
}

/*-----------------------------------------------------*/
// GAMEPLAY FUNCTIONS
/*-----------------------------------------------------*/

// isDead function

function isDead() {
    if (player.position.y <= deathPlaneHeight) {
        gameOver = true;
    }
}

// doPause function

function doPause() {
    console.log("PAUSE");
    pause = !pause;
}

// collision detection

function isCollidingGrounds() {
    let result = null;
    let numCalculations = 0;
    // if (frameCount < 3) return true;
    for (let i = 0; i < 2; i++) { //only check current and next platform
        let idx = (i + nextColIdx) % numPlat;//start from current platform
        let ground = grounds[idx];
        result = isColliding(player, ground);
        numCalculations++;
        if (result != null) {
            if (nextColIdx != idx)
                score++;//we landed on new platform, score goes up
            nextColIdx = idx;//remember last collided platform
            break; // Exit the loop as soon as a collision is detected
        }
    }
    // console.info('numCalculations',numCalculations);
    return result;
}

function isColliding(object1, object2) {
    const box1 = new THREE.Box3().setFromObject(object1); // Bounding box of object1
    const box2 = new THREE.Box3().setFromObject(object2); // Bounding box of object2
    // Check if bounding boxes intersect
    if (box1.intersectsBox(box2)) {
        // Ensure the collision is specifically from the bottom of box1 to the top of box2
        if (box1.min.y <= box2.max.y && box1.max.y > box2.max.y) {
            // The bottom of box1 is colliding with the top of box2
            const overlapBox = box1.intersect(box2); // Calculate the overlap area

            // Get the top Y coordinate of the overlapBox
            const topY = overlapBox.max.y;
            // console.info('Collision detected. Overlap top Y:', topY);

            return topY; // Return the top Y coordinate of the overlap
        }

    }

    return null; // No collision
}

// jump function

function jump() {
    if (isTouchingGround != null) {
        console.log('JUMP');
        hasJumped = true;
        startJumpHeight = player.position.y;
        playerVerticalSpeed += jumpInitVerticalSpeed;
        playThisAction("JUMPING", true);
    }
}

function setEraser(enabled) {
    console.log("setEraser", enabled);
    eraserMode = enabled;

    if (eraserMode) {
        // console.log("change");
        markerxz.material = markerremovematerial;
        markeryz.material = markerremovematerial;
        markerxy.material = markerremovematerial;
    } else {
        markerxz.material = markerxzmaterial;
        markeryz.material = markeryzmaterial;
        markerxy.material = markerxymaterial;
    }
    reinitMarker();
}

function nextWall() {
    toggleWall(1);
}
function prevWall() {
    toggleWall(-1);
}
function toggleWall(increment = 1) {
    // console.log("ToggleWall");
    wallModeSelect = (((wallModeSelect + increment) % NUMMODES) + NUMMODES) % NUMMODES;
    showMarkerXZ = false;
    showMarkerYZ = false;
    showMarkerXY = false;
    switch (wallModeSelect) {
        case MODEXZ:
            showMarkerXZ = true;
            break;
        case MODEYZ:
            showMarkerYZ = true;
            break;
        case MODEXY:
            showMarkerXY = true;
            break;
        case MODEW:
            showMarkerYZ = true;
            showMarkerXY = true;
            break;
        case MODEA:
            showMarkerXZ = true;
            showMarkerYZ = true;
            showMarkerXY = true;
            break;
    }
}

// function interact() {
//     hasInteracted = true;
//     console.log('INTERACT');
// }

function nextMaterial() {
    toggleMaterial(1);
}

function prevMaterial() {
    toggleMaterial(-1);
}

function setUVsByName(geom, uvname) {
    const tilecoordx = (atlasUVs[uvname]?.x || 0);
    const tilecoordy = (atlasUVs[uvname]?.y || 0);
    setUVs(geom, tilecoordx, tilecoordy, uvname);
}

function setUVs(geom, xt, yt, name) {

    // const geomName=mesh.geometry.name;
    // if (!geometryCache[geomName]){
    //     geometryCache[geomName]={};
    // } else{
    //     if (geometryCache[geomName][uvname] !== undefined){
    //         mesh.geometry=geometryCache[geomName][uvname];
    //         return;
    //     } else {
    //         geometryCache[geomName][uvname] = mesh.geometry;
    //     }
    // }

    let uv = defaultGeom.attributes.uv.clone();//reinit the uvs
    // let uv = mesh.geometry.attributes.uv;

    const tilesPerRow = atlasDict?.NUMX || 8;
    const tilesPerCol = atlasDict?.NUMY || 8;
    const scalex = 1 / tilesPerRow; // 0.125
    const scaley = 1 / tilesPerCol; // 0.125

    const offsetX = xt * scalex;
    const offsetY = yt * scaley;
    // const offsetX = (currentGeomIndex%tilesPerRow) * uvScaleX;
    // const offsetY = (tilesPerCol-Math.floor(currentGeomIndex/tilesPerRow)) * uvScaleY;
    // const uv = markerxz.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
        let x = uv.getX(i);
        let y = uv.getY(i);
        // Scale down to tile size
        x = x * scalex;
        y = y * scaley;
        // Offset to desired tile
        x += offsetX;
        y += offsetY;
        uv.setXY(i, x, y);
    }
    uv.needsUpdate = true;

    // Make sure UVs are an independent BufferAttribute
    geom.name = name;
    geom.setAttribute('uv', uv);

}

function toggleMaterial(increment) {
    // reinitMarker();
    let l = atlasArray.length;
    currentGeomIndex = (((currentGeomIndex + increment) % l) + l) % l;
    // currentGeom = atlasArray[currentGeomIndex][1].geometry;
    // let currentTex = currentMat.map;
    // let currentName = currentMat.name;
    let currentName = atlasArray[currentGeomIndex][0];

    // const uv = markerxz.geometry.attributes.uv;
    // setMaterial(markerGeom,currentName);
    setUVsByName(markerGeom, currentName);
    reinitMarker();
}

// function setMaterial(geom,name){
//     const tilecoordx = (atlasUVs[name].x);
//     const tilecoordy = (atlasUVs[name].y);
//     // const tilecoordx = (atlasArray[currentGeomIndex][1].x);
//     // const tilecoordy = (atlasArray[c urrentGeomIndex][1].y);
//     setUVs(geom, tilecoordx, tilecoordy, name);
//     // markerGeom.name = currentName;
//     // setUVs(markeryz.geometry, tilecoordx, tilecoordy);
//     // setUVs(markerxy.geometry, tilecoordx, tilecoordy);

//     // markerxz.geometry = currentGeom;
//     // markeryz.geometry = currentGeom;
//     // markerxy.geometry = currentGeom;

//     // const offsetX = tilecoordx * uvScaleX;
//     // const offsetY = tilecoordy * uvScaleY;
//     // // const offsetX = (currentGeomIndex%tilesPerRow) * uvScaleX;
//     // // const offsetY = (tilesPerCol-Math.floor(currentGeomIndex/tilesPerRow)) * uvScaleY;
//     // const uv = markerxz.geometry.attributes.uv;
//     // for (let i = 0; i < uv.count; i++) {
//     //     let x = uv.getX(i);
//     //     let y = uv.getY(i);
//     //     // Scale down to tile size
//     //     x = x * uvScaleX;
//     //     y = y * uvScaleY;
//     //     // Offset to desired tile
//     //     x += offsetX;
//     //     y += offsetY;
//     //     uv.setXY(i, x, y);
//     // }
//     // uv.needsUpdate = true;

//     reinitMarker();

//     // markerxz.geometry.attributes.uv.needsUpdate=true;
//     // console.log(markerxz.geometry.attributes.uv.array);
//     // markerxz
//     // markerxzmaterial.map = currentTex;
//     // markeryzmaterial.map = currentTex;
//     // markerxymaterial.map = currentTex;
//     // markerxzmaterial.name = currentName;
//     // markeryzmaterial.name = currentName;
//     // markerxymaterial.name = currentName;


//     // let l = matArray.length;
//     // currentMatIndex = (((currentMatIndex + increment) % l) + l) % l;
//     // currentMat = matArray[currentMatIndex][1];
//     // let currentTex = currentMat.map;
//     // let currentName = currentMat.name;
//     // markerxzmaterial.map = currentTex;
//     // markeryzmaterial.map = currentTex;
//     // markerxymaterial.map = currentTex;
//     // markerxzmaterial.name = currentName;
//     // markeryzmaterial.name = currentName;
//     // markerxymaterial.name = currentName;
// }


function onMouseMove(event) {
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



// function placeTileXZ(x, y, z, eraser = false) {
//     const tile = placeTile(x, y, z, gridMapXZ, eraser);
//     if (tile)
//         tile.rotation.x = -(Math.PI / 2);
// }
// function placeTileYZ(x, y, z, eraser = false) {
//     const tile = placeTile(x, y, z, gridMapYZ, eraser);
//     if (tile) {
//         tile.rotation.y = Math.PI / 2;
//         tile.position.y += 0.5;
//         tile.position.x -= 0.5;
//     }
// }
// function placeTileXY(x, y, z, eraser = false) {
//     const tile = placeTile(x, y, z, gridMapXY, eraser);
//     if (tile) {
//         tile.position.z -= 0.5;
//         tile.position.y += 0.5;
//     }
// }


// function placeTile(x, y, z, gridmap, eraser = false) {

//     // return null;
//     const key = getGridKey(x, y, z);

//     if (gridmap.has(key)) {
//         const tile = gridmap.get(key);
//         if (tile) {
//             tileXZGroup.remove(tile);
//             tile.geometry.dispose();
//             tile.material.dispose();
//         }
//     }

//     if (eraser) return null;

//     const newtile = createTile();
//     newtile.position.set(x + 0.5, y, z + 0.5);
//     tileXZGroup.add(newtile);
//     // scene.add(newtile); //TOUNCOMMENT
//     gridmap.set(key, newtile);
//     return newtile;

// }

function placeGroup(group, targetgroup, grid, material) {
    while (group.children.length > 0) {
        let child = group.children[0];
        placeTile(child, grid, targetgroup);
        //child is removed when userData and todelete are defined (?option) and todelete is true
        //for mode MODEW or MODEA we want the scene walls intersecting with the BB to be deleted
        //so the current inner invisible "todelete" walls are tested against these to cull them 
        // in placeTile function
        //then we remove them in following lines
        if (eraserMode || child.userData?.todelete) {
            group.remove(child);
        } else {
            child.position.y -= EPSILON;//remove EPSILON vertical offset
            if (material)
                child.material = material;//apply material without transparency/tint
        }
    }
}

function placeLight(lightv, lighthelperv) {

    let worldPos = new THREE.Vector3();
    lightv.getWorldPosition(worldPos);
    let wx = Math.floor(worldPos.x / cellSize);
    let wy = Math.floor(worldPos.y / cellSize);
    let wz = Math.floor(worldPos.z / cellSize);
    const key = getGridKey(wx, wy, wz);

    if (gridLight.has(key)) {
        let lighttoremove = gridLight.get(key).light;
        if (lighttoremove) {
            lightGroup.remove(lighttoremove);
            lighttoremove.dispose();
        }
        let lighhelpertoremove = gridLight.get(key).helper;
        if (lighhelpertoremove) {
            lightHelperGroup.remove(lighhelpertoremove);
            lighhelpertoremove.dispose();
        }
    }

    //if eraser mode we finished our work here
    if (eraserMode) return;

    lightGroup.add(lightv);
    lightHelperGroup.add(lighthelperv);
    gridLight.set(key, { light: lightv, helper: lighthelperv });

}

function placeTile(tile, gridmap, group) {

    let worldPos = new THREE.Vector3();
    tile.getWorldPosition(worldPos);
    let wx = Math.floor(worldPos.x / cellSize);
    let wy = Math.floor(worldPos.y / cellSize);
    let wz = Math.floor(worldPos.z / cellSize);
    const key = getGridKey(wx, wy, wz);

    if (gridmap.has(key)) {
        const tiletoremove = gridmap.get(key);
        if (tiletoremove) {
            group.remove(tiletoremove);
            tiletoremove.geometry.dispose();
            tiletoremove.material.dispose();
        }
        gridmap.delete(key);
    }

    //if eraser mode we finished our work here
    if (eraserMode
        || tile.userData?.todelete
    ) return;

    //otherwise add tile now
    // console.log(worldPos);
    uniquifyGeometry(tile);
    group.add(tile); // This automatically removes it from sourceGroup
    tile.position.copy(worldPos);
    gridmap.set(key, tile);

    // return tile;

}

function uniquifyGeometry(mesh) {
    // clone the geometry to avoid having all meshes changing uvs with marker
    const originalGeom = mesh.geometry;
    const newGeom = mesh.geometry.clone();

    // still share the original vertex attributes like position/normal/index to minimize memory footprint
    newGeom.setAttribute('position', originalGeom.getAttribute('position'));
    newGeom.setAttribute('normal', originalGeom.getAttribute('normal'));
    newGeom.setIndex(originalGeom.getIndex());

    // Optional: explicitly clone UVs to be extra safe
    // if (mesh.geometry.attributes.uv) {
    //     newGeom.setAttribute('uv', mesh.geometry.attributes.uv.clone());
    // }

    mesh.geometry = newGeom;
}

// function createTile() {
//     let groundSprite;
//     if (currentMat)
//         groundSprite = createPlane(currentMat);
//     else
//         groundSprite = createPlane(matDict.WALL);
//     return groundSprite;
// }


function onMouseClick(event) {

    if (!running) return;

    if (!selectValid) return;
    console.log("CLICK");

    if (currentAddMode == ADDLIGHTMODE) {
        let { light: newlight, helper: newlighthelper } = createLight(new THREE.Vector3(selectX + 0.5, 0.5, selectZ + 0.5));
        placeLight(newlight, newlighthelper, gridLight, lightGroup, lightHelperGroup);
        return;
    }



    hasClicked = true;

    markergroupxz.visible = false;
    markergroupxy.visible = false;
    markergroupyz.visible = false;

    // if (event.shiftKey) { // console.log("Shift + Click detected");
    boxselectModestartX = selectX;
    boxselectModestartZ = selectZ;
    boxselectModeendX = selectX;
    boxselectModeendZ = selectZ;
    mouseIsDown = true;

    if (event.button == 2)
        setEraser(true);//eraser on right click

}

function onMouseUp(event) {

    if (!running) return;

    mouseIsDown = false;
    console.log("onMouseUp", event.button);

    if (currentAddMode == ADDLIGHTMODE) {
        return;
    }

    if (!selectValid) {
        reinitMarker();
        return;
    }



    /*
    let minX = Math.min(boxselectModestartX, boxselectModeendX);
    let maxX = Math.max(boxselectModestartX, boxselectModeendX);
    let minZ = Math.min(boxselectModestartZ, boxselectModeendZ);
    let maxZ = Math.max(boxselectModestartZ, boxselectModeendZ);

    if (showMarkerXZ) {
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
                placeTileXZ(x, 0, z, eraserMode);
            }
        }
    }
    if (showMarkerYZ) {
        //place vertical wall along YZ planes
        //in eraser mode look through all rows
        //in normal mode iterate only through current row
        let safecount = 200;
        for (let x = minX; x <= (eraserMode ? maxX : minX); x++) {
            for (let z = minZ; z <= maxZ; z++) {
                for (let y = 0; y < scaleY; y++) {
                    safecount--;
                    if (safecount <= 0) break;
                    placeTileYZ(x, y, z, eraserMode);
                }
            }
        }
    }
    if (showMarkerXY) {
        let safecount = 200;
        for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= (eraserMode ? maxZ : minZ); z++) {
                for (let y = 0; y < scaleY; y++) {
                    safecount--;
                    if (safecount <= 0) break;
                    placeTileXY(x, y, z, eraserMode);
                }
            }
        }
    }
    */


    //find material
    // let materialToApply = null;
    let materialToApply = atlasMat;
    // let searchGroup;
    // if (markergroupxz.children.length > 0) {
    //     searchGroup = markergroupxz.children[0];
    // } else if (markergroupyz.children.length > 0) {
    //     searchGroup = markergroupyz.children[0];
    // } else {
    //     searchGroup = markergroupxy.children[0];
    // }
    // if (searchGroup) {
    //     // m = findMatchingMaterialByTexture(markergroupxz.children[0].material)
    //     let m = searchGroup.material.name;
    //     materialToApply = matDict[m];
    // }
    if (showMarkerXY) placeGroup(markergroupxy, tileXYGroup, gridMapXY, materialToApply);
    if (showMarkerXZ) placeGroup(markergroupxz, tileXZGroup, gridMapXZ, materialToApply);
    if (showMarkerYZ) placeGroup(markergroupyz, tileYZGroup, gridMapYZ, materialToApply);
    // while (markergroupxz.children.length > 0) {
    //     let child = markergroupxz.children[0];
    //     placeTile(child, gridMapXZ);
    //     if (eraserMode) {
    //         markergroupxz.remove(child);
    //     } else {
    //         child.position.y = 0;//remove EPSILON vertical offset
    //         if (materialToApply)
    //             child.material = materialToApply;//apply material without transparency/tint
    //     }
    // }

    boxselectModeendX = boxselectModestartX;
    boxselectModeendZ = boxselectModestartZ;

    //update tilecount
    updateTileCount();

    if (event.button == 2)
        setEraser(false);

    //reinitialize marker
    reinitMarker();

}

function findMatchingMaterialByTexture(currentMaterial) {
    const currentTexture = currentMaterial.map; // or use another property like normalMap

    for (const [keyMaterial, valueMaterial] of Object.entries(matDict)) {
        if (keyMaterial.map === currentTexture) {
            return valueMaterial;
        }
    }

    return null; // No match found
}


function reinitMarker() {
    //reinit marker
    //RED
    markergroupxz.clear();
    markergroupxz.add(markerxz.clone());
    markergroupxz.position.set(selectX, EPSILON, selectZ);

    //GREEN
    markergroupyz.clear();
    // const tt = markeryz.clone();
    // tt.geometry = atlasDict.WALLDARK.geometry;
    //idea: to fake AO: 
    //create AO png decal (dark bottom gradient with transparency)
    //create a second atlasMat based on standard or lambertmaterial (better perf)
    //drive ao map field with ao texture
    //leave the UV non scaled for the mandatory uv2 field
    //based on height swap material from atlasMat to atlasMapAO
    //this enables better separation

    markergroupyz.add(markeryz.clone());
    // markergroupyz.add(tt);
    for (let y = 1; y < scaleY; y++) {
        const t = markeryz.clone();
        t.position.y += y;
        markergroupyz.add(t);
    }
    markergroupyz.position.set(selectX, EPSILON, selectZ);

    //BLUE
    markergroupxy.clear();
    markergroupxy.add(markerxy.clone());
    for (let y = 1; y < scaleY; y++) {
        const t = markerxy.clone();
        t.position.y += y;
        markergroupxy.add(t);
    }
    markergroupxy.position.set(selectX, EPSILON, selectZ);

    //reinit bbox
    boxselectModeendX = boxselectModestartX;
    boxselectModeendZ = boxselectModestartZ;
}

function assignUserData(tile) {
    let worldPos = new THREE.Vector3();
    tile.getWorldPosition(worldPos);
    worldPos.x = Math.floor(worldPos.x / cellSize);
    worldPos.y = Math.floor(worldPos.y / cellSize);
    worldPos.z = Math.floor(worldPos.z / cellSize);
    tile.userData = getGridKey(worldPos.x, worldPos.y, worldPos.z);
}

function onMouseWheel(event) {
    if (!running) return;
    if (event.deltaY < 0) {
        nextWall();
    } else {
        prevWall();
    }
}

// move Player function
function pauseAndDebug(delta) {
    if (freeCam) {
        // Create a local movement vector based on input
        const moveVector = new THREE.Vector3();
        const moveCam = moveSpeed * delta;
        if (gameActions.moveCamUp) moveVector.y += 1;
        if (gameActions.moveCamDown) moveVector.y -= 1;
        if (gameActions.moveCamLeft) moveVector.x -= 1;
        if (gameActions.moveCamRight) moveVector.x += 1;
        if (gameActions.moveCamFront) moveVector.z -= 1;
        if (gameActions.moveCamBack) moveVector.z += 1;
        // camera.lookAt(chara);

        moveVector.normalize();
        moveVector.applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0));
        yawObject.position.addScaledVector(moveVector, moveCam);

    }
    if (debug) {
        if (gameActions.forceGameOver)
            gameOver = true;
    }

    if (gameActions.pause)
        doPause();
}

function movePlayer(delta) {

    if (gameActions.jump) jump();
    // if (gameActions.interact) interact();
    if (gameActions.nextMaterial) nextMaterial();
    if (gameActions.prevMaterial) prevMaterial();
    if (gameActions.saveLevel) saveLevel();
    if (gameActions.bakeLevel) bakeLevel();
    if (gameActions.loadLevel) loadLevel();
    if (gameActions.startGame) {
        toggleGameMode();
        // stopEditorLoop();         // Pause/stop editor
        // startGameLoop();
        // startGameLoop(scene, camera, yawObject, renderer, container, gameActions);          // Start game
    }
    // if (gameActions.toggleWall) toggleWall();
    // if (gameActions.setEraser) setEraser();
    if (gameActions.setAddPlaneMode) setAddMode(ADDPLANEMODE);
    if (gameActions.setAddLightMode) setAddMode(ADDLIGHTMODE);

    return;//TEMP
    if (gameActions.moveByOneFrame
        || true
    ) {
        player.position.y += playerVerticalSpeed * delta;
        isTouchingGroundPrev = isTouchingGround;
        isTouchingGround = isCollidingGrounds(); //collision check
        if (isTouchingGroundPrev && !isTouchingGround && !hasJumped) {
            //was touching ground, is not touching anymore and has not jumped
            startJumpHeight = player.position.y;
            playThisAction("FALLING");
        } else if (!isTouchingGroundPrev && isTouchingGround) {
            //was not touching ground, now touching ground
            hasJumped = false;
            endJumpHeight = player.position.y;
            // console.log("difference height:", startJumpHeight - endJumpHeight, "groundHeightMaxDiff", 0.4 * groundHeightMaxDiff)

            if ((startJumpHeight - endJumpHeight) > (0.4 * groundHeightMaxDiff)) {
                // if (true) {
                playThisAction("ROLL", true);
            } else {
                playThisAction("RUNNING");
            }
        }
        // isDead();
        if (isTouchingGround == null) {
            playerVerticalSpeed -= gravitySpeedDecrement * delta;
        } else {
            player.position.y = isTouchingGround; // Calculate top height
            playerVerticalSpeed = 0;
        }
    }

    // let chara = charaDict.MESH;
    // chara.position.y = player.position.y;

}


function moveDoor(delta) {
    return;
    // console.log("doorSprites[0].position", doorSprites[0].position.toArray());
    // console.log("yawObject.position", yawObject.position.toArray());
    // console.log(d);
    // console.log(withinReach);
    if (hasInteracted) {

        let d = doorPosition[0].position.distanceTo(yawObject.position);
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
        console.log("HASINTERACTED");
        // doorSprites.forEach(door=> {/
        // console.log(door.rotation);
        // console.log(door.position);
        // });
        doorSprites.forEach(door => {
            doorRotTime += deltaTime;
            // door.rotation.y+=Math.PI/2;
            door.rotation.y = doorRotCur + (doorRotTarget - doorRotCur) * doorRotTime / 2;
            if (doorRotTime > 2) {
                door.rotation.y = doorRotTarget;
                movingDoor = false;
            }

            // door.rotation.x=-Math.PI/2;
            // door.rotation.z=-Math.PI/2;
            // door.position.x+=-1;
            // console.log(door.rotation);
            // console.log(door.position);
        }
        );
    }
}

// Animation loop
function editorLoop() {

    if (!running) return;

    //fps counter
    stats.begin();

    // console.log('frame',frameCount++)
    deltaTime = clock.getDelta(); // Time elapsed since last frame
    drawHUD();
    pauseAndDebug(deltaTime);


    if (!pause || renderOneFrame) {
        renderOneFrame = false;
        movePlayer(deltaTime);
        // moveDoor(deltaTime);
        //     updateAnimations(charaMixer, deltaTime);
        //     updateSpeed();
        // }`




        //FLOOR RAYCAST TEST
        raycaster.setFromCamera(screenCenter, camera);
        const intersects = raycaster.intersectObject(floor);

        selectValid = false;
        markergroupxz.visible = false;
        markergroupyz.visible = false;
        markergroupxy.visible = false;

        let doesIntersect = false;
        if (intersects.length > 0) {
            doesIntersect = intersects[0].distance < 12;
        }

        if (doesIntersect) {
            //         console.log("Distance:", intersects[0].distance);
            // console.log("Hit point:", intersects[0].point);
            // console.log("Camera position:", camera.position.distanceTo(intersects[0].point));
            const point = intersects[0].point;
            selectValid = true;
            markergroupxz.visible = showMarkerXZ;
            markergroupyz.visible = showMarkerYZ;
            markergroupxy.visible = showMarkerXY;
            // Convert world position to grid cell
            selectX = Math.floor(point.x / cellSize);
            selectZ = Math.floor(point.z / cellSize);

            //UPDATE ONLY WHEN NEW CELL SELECTED
            if (
                (selectX != prevSelectX) ||
                (selectZ != prevSelectZ) ||
                wallModeSelect != prevWallModeSelect ||
                hasClicked
            ) {
                hasClicked = false;
                console.log("newpoint");

                if (!mouseIsDown) {
                    // slightly above floor to prevent z-fighting
                    markergroupxz.position.set(selectX * cellSize, EPSILON, selectZ * cellSize);
                    markergroupyz.position.set(selectX * cellSize, EPSILON, selectZ * cellSize);
                    markergroupxy.position.set(selectX * cellSize, EPSILON, selectZ * cellSize);
                } else {

                    //UPDATE SELECTION BBOX
                    boxselectModeendX = selectX;
                    boxselectModeendZ = selectZ;

                    //UPDATE MARKER POSITION
                    markergroupxz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * cellSize, EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * cellSize);
                    markergroupyz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * cellSize, EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * cellSize);
                    markergroupxy.position.set(Math.min(boxselectModeendX, boxselectModestartX) * cellSize, EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * cellSize);

                    //CLEAR MARKER MESHES
                    markergroupxz.clear();
                    markergroupyz.clear();
                    markergroupxy.clear();
                    markergroupxyDict.clear();
                    markergroupxzDict.clear();
                    markergroupyzDict.clear();

                    //CALCULATE MARKER SIZE
                    let scaleX = Math.abs(boxselectModeendX - boxselectModestartX);
                    let scaleZ = Math.abs(boxselectModeendZ - boxselectModestartZ);

                    //GENERATE MARKER MESHES
                    //RED
                    if (showMarkerXZ) {
                        for (let x = 0; x <= scaleX; x++) {
                            for (let z = 0; z <= scaleZ; z++) {
                                const copytile = markerxz.clone();
                                markergroupxz.add(copytile);
                                copytile.position.set(x + cellSize / 2, 0, z + cellSize / 2);
                            }
                        }
                    }


                    //GREEN
                    if (showMarkerYZ) {
                        for (let x = 0; x <= scaleX + 1; x++) {
                            for (let z = 0; z <= scaleZ; z++) {
                                //in normal mode adding walls we want to surround the area with walls
                                //so add them everywhere except "inside" the selection
                                let todelete = false;
                                if (!eraserMode) {
                                    if (wallModeSelect == MODEW || wallModeSelect == MODEA) {
                                        if (x > 0 && x < scaleX + 1) todelete = true;
                                    } else {
                                        if (x > 0) continue;
                                    }
                                } else {
                                    if (wallModeSelect != MODEW && wallModeSelect != MODEA) {
                                        if (x > 0) continue;
                                    }
                                }
                                for (let y = 0; y < scaleY; y++) {
                                    const copytile = markeryz.clone();
                                    copytile.userData = {
                                        todelete: todelete
                                    };
                                    // if (y==0){
                                    // copytile.geometry = atlasDict.WALLDARK.geometry;
                                    // }
                                    copytile.visible = !todelete;
                                    markergroupyz.add(copytile);
                                    copytile.position.copy(markeryz.position);
                                    copytile.position.x += x;
                                    copytile.position.z += z;
                                    copytile.position.y += y;
                                }
                            }
                        }
                    }

                    //BLUE
                    if (showMarkerXY) {
                        for (let x = 0; x <= scaleX; x++) {
                            for (let z = 0; z <= scaleZ + 1; z++) {
                                let todelete = false;
                                if (!eraserMode) {
                                    if (wallModeSelect == MODEW || wallModeSelect == MODEA) {
                                        if (z > 0 && z < scaleZ + 1) todelete = true;
                                    } else {
                                        if (z > 0) continue;
                                    }
                                } else {
                                    if (wallModeSelect != MODEW && wallModeSelect != MODEA) {
                                        if (z > 0) continue;
                                    }
                                }
                                for (let y = 0; y < scaleY; y++) {
                                    const copytile = markerxy.clone();
                                    markergroupxy.add(copytile);
                                    copytile.userData = {
                                        todelete: todelete
                                    };
                                    // if (y==0){
                                    // copytile.geometry = atlasDict.WALLDARK.geometry;
                                    // }                                
                                    copytile.visible = !todelete;
                                    copytile.position.copy(markerxy.position);
                                    copytile.position.x += x;
                                    copytile.position.z += z;
                                    copytile.position.y += y;
                                    // assignUserData(copytile);
                                }
                            }
                        }
                    }


                }
            }

            //KEEP TRACK OF LAST SELECTED CELL
            prevSelectX = selectX;
            prevSelectZ = selectZ;
            prevWallModeSelect = wallModeSelect;

        } else {

            //NO CELL SELECTED, REINIT MARKER AND BBOX
            mouseIsDown = false;
            //reinit marker only when it was valid before and
            //it is not anymore
            if (prevSelectValid)
                reinitMarker();

        }

        prevSelectValid = selectValid;


        //RENDER GIZMO HELPER in BOTTOM LEFT CORNER
        if (1) {
            // 1. Render main scene
            //console.log("debug",9,scene,camera,renderer);
            // renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
            renderer.clear();
            renderer.render(scene, camera);
            // console.log("draw calls main scene", renderer.info.render.calls);
            drawcalls = renderer.info.render.calls;

            // 2. Render mini viewport (e.g., bottom-left corner)
            const vpSize = 100;
            renderer.setViewport(10, 10, vpSize, vpSize);
            renderer.setScissor(10, 10, vpSize, vpSize);
            renderer.setScissorTest(true);
            // renderer.clear();
            renderer.clearDepth();
            renderer.render(axesScene, axesCamera);
            // console.log("draw calls mini viewport", renderer.info.render.calls);
            drawcalls += renderer.info.render.calls;

            // 3. Reset to full canvas
            // renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
            // renderer.setScissor(0, 0, window.innerWidth, window.innerHeight);
            renderer.setScissorTest(false);

            //To sync the mini gizmo with your main camera orientation:
            const worldQuat = new THREE.Quaternion();
            camera.getWorldQuaternion(worldQuat);
            axesHelper.quaternion.copy(worldQuat).invert();

        } else {
            renderer.render(scene, camera);
            // console.log("draw calls main scene", renderer.info.render.calls);
            drawcalls = renderer.info.render.calls;
            renderer.info.reset(); //it auto resets normally
        }

        // Simulate heavy computation
        // simulateBlockingWait(200); // 200ms delay
        // frameCount++;
        updateTextStatsThrottled();
        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        releaseSingleEventActions();
        stats.end();
    }

    // console.log("draw calls1", renderer.info.render.calls);
    // if (!gameOver) {
    editorId = requestAnimationFrame(editorLoop); //call animate recursively on next frame 
    // }
    //   editorId =       await new Promise(requestAnimationFrame);  // wait for next frame

}

// drawHUD loop

function drawHUD(delta = 1) {
    // Clear the canvas for redrawing
    hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

    // Text box styles
    hudContext.font = '20px Arial';
    hudContext.textAlign = 'left';

    // Draw "Score" at the top-left corner with a surrounding rectangle
    const scoreText = `TileCount: ${tilecount}`;
    const scoreMetrics = hudContext.measureText(scoreText);
    const scorePadding = 10; // Padding for the rectangle
    const scoreRectWidth = scoreMetrics.width + scorePadding * 2;
    const scoreRectHeight = 30; // Fixed height for simplicity
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    // hudContext.fillRect(5, 5, scoreRectWidth, scoreRectHeight); // Rectangle for score
    // hudContext.fillStyle = 'black';
    hudContext.fillStyle = 'White';
    hudContext.fillText(scoreText, 10, 25); // Text inside rectangle

    // Draw "Lives" at the top-right corner with a surrounding rectangle
    hudContext.textAlign = 'right';
    const livesText = `Lives: ${lives}`;
    const livesMetrics = hudContext.measureText(livesText);
    const livesRectWidth = livesMetrics.width + scorePadding * 2;
    const livesRectX = hudCanvas.width - livesRectWidth - 5; // Position from the right edge
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    // hudContext.fillRect(livesRectX, 5, livesRectWidth, scoreRectHeight); // Rectangle for lives
    hudContext.fillStyle = 'White';
    hudContext.fillText(livesText, hudCanvas.width - 10, 25); // Text inside rectangle

    // Scaling the "Game Over" message
    if (messageScale < messageTargetScale) {
        messageScale += messageScaleSpeed * delta; // Gradually increase the scale
        if (messageScale > messageTargetScale) {
            messageScale = messageTargetScale; // Clamp to the target scale
        }
    }

    hudContext.save(); // Save the current canvas state
    hudContext.translate(hudCanvas.width / 2, hudCanvas.height / 2); // Move to the center
    hudContext.scale(messageScale, messageScale); // Apply scaling

    // Draw the "Game Over" message
    hudContext.font = '60px Arial';
    hudContext.textAlign = 'center';
    hudContext.fillStyle = 'rgba(255, 0, 0, 0.9)';
    hudContext.fillText(messageScreen, 0, 20); // Text is now centered and scaled
    hudContext.restore(); // Restore the original canvas state

}

async function animateHUD(targetScale = 1, scaleDuration = 0.8) {
    clock.start();//reset time
    messageScale = 0;//reset scale
    messageTargetScale = isMobile() ? targetScale / 2 : targetScale;
    messageScaleDuration = scaleDuration; //in seconds
    messageScaleSpeed = messageTargetScale / messageScaleDuration;
    animateHUDLoop();
    await animateHUDEnd();
}

function animateHUDLoop(targetSize, animTime) {
    deltaHUDTime = clock.getDelta(); // Time elapsed since last frame
    drawHUD(deltaHUDTime);
    renderer.render(scene, camera);
    if (messageScale < messageTargetScale) {
        requestAnimationFrame(animateHUDLoop);
    }
}

async function animateHUDEnd() {
    // Wait for the game over flag to be set
    await new Promise(resolve => {
        const checkanimateHUDInterval = setInterval(() => {
            if (messageScale >= messageTargetScale) {
                clearInterval(checkanimateHUDInterval);  // Stop checking
                resolve();  // Resolve the promise
            }
        }, 100);  // Check every 100ms if the game is over
    });
}

// createScene loop
function createScene() {

    //miniscene
    axesCamera.up = camera.up;
    axesCamera.position.set(0, 0, 5);
    axesScene.add(axesHelper);


    //helper grid

    grid = new THREE.GridHelper(gridSize, gridDivisions);
    grid.name = "GridHelper";
    scene.add(grid);
    //helper gizmo
    axes = new THREE.AxesHelper(3); // size
    axes.name = "AxesHelper";
    scene.add(axes);

    //raycast floor
    floor.rotation.x = -Math.PI / 2; // face up
    scene.add(floor);

    //test scene
    if (0) {
        const groundSprite2 = createPlane(matDict.WALL)
        scene.add(groundSprite2);
        groundSprite2.rotation.x = (Math.PI / 2);
        groundSprite2.position.set(0, 0, 0);
        groundSprite2.material = atlasDict.CHECKER.material
        // groundSprite2.material = matDict.WALL;
        groundSprite2.geometry.attributes.uv = atlasDict.CHECKER.geometry.attributes.uv
    }

    scene.add(tileXZGroup);
    scene.add(tileXYGroup);
    scene.add(tileYZGroup);
    scene.add(lightGroup);
    scene.add(lightHelperGroup);

    /*--------*/
    //grass ground
    /*--------*/
    /*
    let ypos = 0;
    let xpos = 0;
    for (let row = 0; row < 20; row++) {
        for (let col = 0; col < 20; col++) {
            ypos=col;
            xpos=row;
            const groundSprite = createPlane(matDict.WALL)
            scene.add(groundSprite);
            groundSprite.rotation.x = (Math.PI / 2);
            groundSprite.position.set(xpos,0,ypos);
            groundSprites.push(groundSprite);
 
            const groundSpritec = createPlane(matDict.WALL)
            scene.add(groundSpritec);
            groundSpritec.rotation.x = (Math.PI / 2);
            groundSpritec.position.set(xpos,2,ypos);            
        }
 
    }
 
    // walls
    for (let layerZ= 0; layerZ < 2; layerZ++){
    for (let row = 0; row < 20; row++) {
        if (row != 6) {
        const groundSprite = createPlane(matDict.WALL)
        groundSprite.position.set(row,layerZ+0.5,0-0.5); 
        scene.add(groundSprite);
        }
        const groundSprite2 = createPlane(matDict.WALL)
        groundSprite2.position.set(row,layerZ+0.5,20-0.5);
        scene.add(groundSprite2);
    }
    for (let col = 0; col < 20; col++) {
        const groundSprite = createPlane(matDict.WALL)
        groundSprite.position.set(0-0.5,layerZ+0.5,col); 
        groundSprite.rotation.y = (Math.PI / 2);
        scene.add(groundSprite);
        const groundSprite2 = createPlane(matDict.WALL)
        groundSprite2.rotation.y = (Math.PI / 2);
        groundSprite2.position.set(20-0.5,layerZ+0.5,col);
        scene.add(groundSprite2);
    }}
 
    //door
    for (let layerZ= 0; layerZ < 2; layerZ++){
    const doorHole = createPlane(matDict.DOOR)
    const doorGroup = new THREE.Group();
    doorHole.position.set(0.5,0.50,0);//Relative position
    doorGroup.add(doorHole);
 
    const doorRotGroup = new THREE.Group();
    doorRotGroup.position.set(5.5,layerZ,-.5); 
    doorRotGroup.add(doorGroup);
 
    scene.add(doorRotGroup);
    doorSprites.push(doorGroup);
    doorPosition.push(doorRotGroup);
    }
 
    //light
    createLight(new THREE.Vector3( 0,1,0),scene);
    createLight(new THREE.Vector3( 4,1,0),scene);
    createLight(new THREE.Vector3(9,1,0),scene);
    createLight(new THREE.Vector3(14,1,0),scene);
    createLight(new THREE.Vector3(19,1,0),scene);
    */

    // const ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1).multiplyScalar(0.25)); // Soft light
    const ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1).multiplyScalar(1)); // Soft light
    scene.add(ambientLight);

}

function initializeScene() {

    //reset gameOver
    gameOver = false;

    //reset pause
    // pause = false;
    pause = true;

    //clear all game actions
    gameActions = {};

    //clear score and reinitialize lives
    score = 0;
    lives = 3;

    //reset message
    messageScreen = ""

}

// releaseSingleEventActions
function releaseSingleEventActions() {
    for (const [action, actionValue] of Object.entries(gameActions)) {
        if (actionValue) {
            let mapping = gameActionToKeyMap[action];
            if (mapping)
                if (mapping.OnPress || mapping.OnRelease) {
                    gameActions[action] = false
                    // console.log("Releasing gameaction",gameActions[action]);
                }
        }
    }
}

function updateSpeed() {
    // newgroundSpeed = groundSpeed * (1 + Math.abs(Math.sin((score / ts)*(Math.PI/2)))*0.3);
    if ((Math.floor(score / ts) % 2) == 0) {
        // console.log('accelerating', newgroundSpeed);
        newgroundSpeed = groundSpeed * (1 + ((score % ts) / ts) * ms);
    } else {
        // console.log('decelerating', newgroundSpeed);
        newgroundSpeed = groundSpeed * (1 + ((ts - (score % ts)) / ts) * ms);
    }
    newbgSpeed = 0.75 * newgroundSpeed;
}

function playThisAction(thisAction, once = false) {
    for (const [actionName, action] of Object.entries(animDict)) {
        if (actionName == thisAction) {
            if (once) {
                action.reset().setLoop(THREE.LoopOnce, 1).play();
                action.clampWhenFinished = true;  // Prevent roll from looping
                //on finish default back to running always //TODO: doesnt work
                // action.onFinished = () => {
                //     console.log("action.onfinished")
                //     animDict.RUNNING.reset().play();
                // }
            } else {
                action.reset().play();
            }
        } else {
            action.stop();
        }
    }
}

function stopAllActions() {
    for (const [actionName, action] of Object.entries(charaDict.ANIMATIONS)) {
        action.stop();
    }
}

async function loadLevel() {
    const file = await new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";

        input.onchange = (event) => {
            const file = event.target.files[0];
            resolve(file);  // pass file back to the promise
        };

        input.click(); // opens the file dialog
    });

    if (!file) return;

    const json = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });

    //we want to update progression bar at the same time as loading
    //so this function and the parent function needs to be asynchronous
    //so stuff can happen in parallel instead of blocking the main thread
    await loadPlanesIntoScene(json);
}

let totalElements = 1;
let loadedElements = 0;
async function loadPlanesIntoScene(jsondata) {
    resetLevel();
    // tileXZGroup.clear();
    // tileXYGroup.clear();
    // tileYZGroup.clear();
    // lightGroup.clear();

    eraserMode = false;

    totalElements = Object.values(jsondata)
        .flatMap(axis => Object.values(axis))
        .reduce((sum, arr) => sum + arr.length, 0);
    loadedElements = 0;

    if (totalElements == 0) return;//popup alert here. catch format error too
    // console.log(totalElements);
    // return;

    //this tile will be cloned during load
    loadingTile = new THREE.Mesh(
        markerGeom,
        atlasMat,
        // name = "markerxz"
    );

    await loadPlaneIntoScene(jsondata, "XY", gridMapXY, markerxy, tileXYGroup);
    await loadPlaneIntoScene(jsondata, "XZ", gridMapXZ, markerxz, tileXZGroup);
    await loadPlaneIntoScene(jsondata, "YZ", gridMapYZ, markeryz, tileYZGroup);
    await loadLightIntoScene(jsondata);

    updateLoadProgression(1);
    await new Promise(requestAnimationFrame);

    // LoadBtnTxt.textContent = `Load Planes (L)`;//reset
    // LoadBtnProgress.style.width = (0 * 100) + '%';
    // await new Promise(requestAnimationFrame);

    updateTileCount();
    renderOneFrame = true;

}

function updateTileCount() {
    tilecount = tileXZGroup.children.length +
        tileXYGroup.children.length +
        tileYZGroup.children.length;
}



let updateInterval = 10;  // update every 2 planes
async function loadPlaneIntoScene(jsondata, label, grid, marker, group) {
    if (label in jsondata) {
        const jsonplanedata = jsondata[label];
        for (const geomName in jsonplanedata) {
            const planes = jsonplanedata[geomName];
            const tiletoclone = loadingTile;
            // const material = atlasMat;
            // const tiletoclone = atlasDict[geomName];
            // const tiletoclone = defaultGeom;
            // const tiletoclone = new THREE.Mesh(
            //     defaultGeom.clone(),
            //     atlasMat,
            //     // name = "markerxz"
            // );
            // const tiletoclone = markerxy;
            for (const data of planes) {
                const tile = tiletoclone.clone();
                tile.position.fromArray(data.position);
                tile.rotation.copy(marker.rotation);
                // tile.material = material;
                setUVsByName(tile.geometry, geomName);
                placeTile(tile, grid, group);
                loadedElements++;

                //every n planes update UI
                if (loadedElements % updateInterval === 0) {
                    //update button text
                    updateLoadProgression(loadedElements / totalElements);
                    // wait for the UI to render
                    await new Promise(requestAnimationFrame);
                }
            }
        }
    }
}


async function loadLightIntoScene(jsondata) {
    if ("LIGHTS" in jsondata) {
        const jsonlightsdata = jsondata["LIGHTS"];
        for (const lightname in jsonlightsdata) {

            let { light: lightToClone, helper: lightHelperToClone } =
                createLight(new THREE.Vector3(0, 0, 0), undefined, undefined, undefined, false);

            const lightsdata = jsonlightsdata[lightname];

            for (const data of lightsdata) {
                const newlight = lightToClone.clone();
                newlight.position.fromArray(data.position);
                const newlighthelper = new THREE.PointLightHelper(newlight, 0.5);
                newlighthelper.position.copy(newlight);
                placeLight(newlight, newlighthelper);

                loadedElements++;

                //every n planes update UI
                if (loadedElements % updateInterval === 0) {
                    //update button text
                    updateLoadProgression(loadedElements / totalElements);
                    // wait for the UI to render
                    await new Promise(requestAnimationFrame);
                }
            }
        }
    }
}

function updateLoadProgression(ratio) {
    const percent = Math.floor(ratio * 100);
    // const loadBtn = document.getElementById("loadBtn");
    LoadBtnTxt.textContent = `Loading... ${percent}%`;

    LoadBtnProgress.style.width = (ratio * 100) + '%';


    if (ratio >= 1) {
        // Wait 1 second then reset button
        setTimeout(() => {
            LoadBtnProgress.style.width = '0%';
            LoadBtnTxt.textContent = 'Load Planes (L)';
        }, 1000); // 1000ms = 1 second
        // renderOneFrame = true;

    }
}

function bakeLevel() {
    console.log("BAKELEVEL");
    bakeGroup(tileXYGroup);
    bakeGroup(tileYZGroup);
    bakeGroup(tileXZGroup);
    // tileXZGroup.visible=false;//temp to test
}

function bakeGroup(group) {
    const tileGeometries = [];
    group.children.forEach(plane => {
        // Clone geometry to avoid modifying original
        const geom = plane.geometry.clone();

        // Apply world matrix of the mesh to geometry
        geom.applyMatrix4(plane.matrixWorld);

        tileGeometries.push(geom);
    });
    bakedGeometry = mergeBufferGeometries(tileGeometries, false);
    const mesh = new THREE.Mesh(bakedGeometry, atlasMat);
    scene.add(mesh);
    group.clear();
}

function saveLevel() {
    const mergedData = {};
    mergedData["XY"] = groupPlanesByMaterial(tileXYGroup);
    mergedData["XZ"] = groupPlanesByMaterial(tileXZGroup);
    mergedData["YZ"] = groupPlanesByMaterial(tileYZGroup);

    mergedData["LIGHTS"] = groupLights();


    //compress level to a string you  can feed tothe url so 
    //players can share their creations
    //not a priority at the moment
    //(idea dont store the floor+ceiling)
    //(idea store compressed tiles: bounding boxes + tile*iterations
    //instead of every single tile coordinate)
    //(idea store compressed bit formats instead of raw data)
    //(idea final output in base64 6 bits per character)
    //url max length is ~2000 chara so 1500 bytes
    //if one tile is 3 bytes thats 500 tiles more or less
    //not big enough...
    //although position is 0-127 for x/z and 0-2 for Z
    //so 7+7+2=16 bits or 2 bytes so could be ~800 tiles
    // let compressedJsonString = compressJson(mergedData);
    // console.log("compressedJsonString", compressedJsonString);





    let json = JSON.stringify(mergedData, null, 2);
    // return json;

    // Compact all "position": [ ... ] lines to single-line arrays
    json = json.replace(/"position": \[\s*([\s\S]*?)\s*\]/g, (match, content) => {
        const compact = content
            .split(/\s*,?\s*\n\s*/g)  // split lines and trim
            .map(s => s.trim())
            .filter(s => s !== "")    // remove empty lines
            .join(", ");
        return `"position": [${compact}]`;
    });

    json = json.replace(/\{([^{}]*position[^{}]*)\}/g, (match, content) => {
        // Compact inner content: remove newlines + multiple spaces
        const compactContent = content
            .replace(/\s*\n\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return `{${compactContent}}`;
    });


    downloadJson(json, "grouped_planes.json");
}

function resetLevel() {
    //meshes removed from group loses ref and will be garbage collected
    //however they all share materials and geometry these should not be disposed
    //and should persist after reset
    tileXYGroup.clear();
    tileXZGroup.clear();
    tileYZGroup.clear();
    lightGroup.clear();
    lightHelperGroup.clear();
    gridMapXY.clear();
    gridMapXZ.clear();
    gridMapYZ.clear();
    gridLight.clear();
    reinitMarker();
    resetCamera();
    updateTileCount();
    renderOneFrame = true;//simply update once the canvas
}

// function clearGroup(group) {
//     group.traverse((child) => {
//         if (child.geometry) child.geometry.dispose();
//     });
// }

function compressJson(jsonLevelData) {

    const output = [];

    const orientationMap = { XY: 0, XZ: 1, YZ: 2 };
    for (const orientation in jsonLevelData) {
        console.log(orientation);
        const materials = jsonLevelData[orientation];
        if (!materials || Object.keys(materials).length === 0) continue;
        output.push(orientationMap[orientation]);
        for (const material in materials) {
            // let idx = new Uint8Array(getMaterialIndex(material));
            let idx = getMaterialIndex(material);
            output.push(idx);
            const tiles = materials[material];
            for (const tile of tiles) {
                const [x, y, z] = tile.position;
                output.push(Math.floor(x),
                    Math.floor(y), Math.floor(z));
            }
            output.push(",");
        }
    }

    return output;
}

function getMaterialIndex(materialName) {
    return atlasArray.findIndex(([name, _]) => name === materialName);
}

function groupLights() {
    const grouped = {};
    lightGroup.traverse((child) => {
        if (child.isLight) {
            const lightname = "LIGHT0";//TEMP

            if (!grouped[lightname]) {
                grouped[lightname] = [];
            }

            grouped[lightname].push({
                position: child.position.toArray(),
                // color: child.color,
                // intensity: child.intensity,
                // distance: child.distance,
            });
        }
    })
    return grouped;
}

function groupPlanesByMaterial(group) {
    const grouped = {};

    group.traverse((child) => {
        if (
            child.isMesh &&
            child.geometry instanceof THREE.PlaneGeometry
        ) {
            // const matName = child.material?.name || "Unnamed";
            const geomName = child.geometry?.name || "Unnamed";

            if (!grouped[geomName]) {
                grouped[geomName] = [];
            }

            grouped[geomName].push({
                position: child.position.toArray(),
                // rotation: child.rotation.toArray().slice(0, 3), // strip "XYZ"
                // scale: child.scale.toArray(),
                // userData: child.userData || {}
            });
        }
    });

    return grouped;
}

function downloadJson(data, filename) {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

export function assignGeom(plane, atlastex) {
    // plane.geometry.attributes.uv = atlasDict.atlastex.geometry.attributes.uv
    plane.geometry = atlasDict.atlastex.geometry
    // plane.geometry.name = atlasDict.atlastex.name
}





let lastFrameTime = performance.now();
// let frameCount = 0;
let fps = 0;
let lastStatsUpdate = 0;
const statsUpdateInterval = 500; // ms - freq to update stats

function updateTextStatsThrottled() {
    const now = performance.now();
    frameCount++;
    // FPS counter (average over 1 sec)
    if (now - lastFrameTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFrameTime = now;
        document.getElementById('fps').textContent = fps;
    }
    document.getElementById('drawCalls').textContent = drawcalls;

    //update other stats requiring scene traversal every statsUpdateInterval
    if (now - lastStatsUpdate < statsUpdateInterval) return;
    lastStatsUpdate = now;
    updateTextStats();
}

function updateTextStats() {
    // console.log("update", lastStatsUpdate);

    // Mesh count
    let meshCount = 0;
    let lightCount = 0;
    let visibleMeshCount = 0;
    scene.traverse(obj => {
        if (obj.isMesh)
            meshCount++;
        if (obj.isLight)
            lightCount++;
    });
    //floor and masked markers are not counted
    visibleMeshCount = countVisibleMeshes(scene);
    document.getElementById('meshCount').textContent = meshCount;
    document.getElementById('visibleMeshCount').textContent = visibleMeshCount;
    document.getElementById('lightCount').textContent = lightCount;



    // Unique materials
    const materials = new Set();
    scene.traverse(obj => {
        if (obj.isMesh) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => materials.add(mat));
            } else {
                materials.add(obj.material);
            }
        }
    });
    document.getElementById('materialCount').textContent = materials.size;

    // GPU memory info
    const mem = renderer.info.memory;
    document.getElementById('geometryCount').textContent = mem.geometries;
    document.getElementById('textureCount').textContent = mem.textures;
    console.log("Unique BufferAttributes in scene:", countBufferAttributes(scene));
    // renderer.info.reset(); //it auto resets normally
}

function countBufferAttributes(scene) {
    const attributes = new Set();

    scene.traverse(obj => {
        if (obj.isMesh && obj.geometry && obj.geometry.attributes) {
            const geom = obj.geometry;
            // Position / normal / uv / etc
            for (const key in geom.attributes) {
                attributes.add(geom.attributes[key]);
            }
            // Index buffer
            if (geom.index) {
                attributes.add(geom.index);
            }
        }
    });

    return attributes.size;
}




function simulateBlockingWait(durationMs) {
    const start = performance.now();
    while (performance.now() - start < durationMs) {
        // Busy-wait loop (blocks the main thread)
    }
}

function countVisibleMeshes(root = scene) {
    let count = 0;

    root.traverseVisible((obj) => {
        if (obj.isMesh) {
            const mat = obj.material;

            const materialVisible =
                Array.isArray(mat)
                    ? mat.some((m) => m.visible !== false)
                    : (mat?.visible !== false);

            if (materialVisible) {
                count++;
            }
        }
    });

    return count;
}



function startEditorLoop() {
    running = true;
    editorId = requestAnimationFrame(editorLoop);
    reinitMarker();
    markeryzmaterial.visible = true;
    markerxzmaterial.visible = true;
    markerxymaterial.visible = true;
    markerremovematerial.visible = true;
    grid.visible = true;//temp
    axes.visible = true;//temp
    lightHelperGroup.visible = true;
}

function stopEditorLoop() {
    running = false;

    cancelAnimationFrame(editorId);

    reinitMarker();

    markeryzmaterial.visible = false;
    markerxzmaterial.visible = false;
    markerxymaterial.visible = false;
    markerremovematerial.visible = false;
    // markerxz.visible=false;
    // markeryz.visible=false;
    // markerxy.visible=false;
    // markergroupxy.visible = false;
    // markergroupyz.visible = false;
    // markergroupxz.visible = false;
    grid.visible = false;
    axes.visible = false;
    lightHelperGroup.visible = false;
}

function setAddMode(mode) {
    switch (mode) {
        case ADDPLANEMODE:
            console.log("ADDPLANEMODE");
            currentAddMode = ADDPLANEMODE;
            showMarkerXZ = true;
            AddBtn.classList.add("green");
            AddLBtn.classList.remove("green");
            break;
        case ADDLIGHTMODE:
            console.log("ADDLIGHTMODE");
            currentAddMode = ADDLIGHTMODE;
            showMarkerXY = false;
            showMarkerYZ = false;
            showMarkerXZ = false;
            AddBtn.classList.remove("green");
            AddLBtn.classList.add("green");
            break;
    }
}

















/*------*/
/*------*/
// GAME //
/*------*/
/*------*/

// game.js
let gameRunning = false;
let gameId = null;

function toggleGameMode() {
    if (running) {
        console.log("toggleoff");
        //start game
        // setTimeout(() => {
        // StartBtn.textContent = "Stop Game";
        // }, 0);
        // document.getElementById("StartBtn").click();
        StartBtn.textContent = "Stop Game";
        stopEditorLoop();
        startGameLoop();
    } else {
        StartBtn.textContent = "Start Game";
        // document.getElementById('StartBtn').textContent = 'Restart Game';
        //end game
        stopGameLoop();
        startEditorLoop();
        renderOneFrame = true;
    }
}

function startGameLoop() {
    gameRunning = true;
    gameId = requestAnimationFrame(gameLoop);
    resetCamera();
    clock.start();
}

function stopGameLoop() {
    gameRunning = false;
    cancelAnimationFrame(gameId);
}


let minDistancefromWalls = 0.2 * cellSize;
function gameLoop() {
    if (!gameRunning) return;
    // console.log("gameLoop");

    if (!pause) {
        stats.begin();
        const deltaTime = clock.getDelta(); // Time elapsed since last frame
        const moveVector = new THREE.Vector3();
        const moveCam = moveSpeed * deltaTime;
        // if (gameActions.moveCamUp) moveVector.y += 1;
        // if (gameActions.moveCamDown) moveVector.y -= 1;
        if (gameActions.moveCamLeft) moveVector.x -= 1;
        if (gameActions.moveCamRight) moveVector.x += 1;
        if (gameActions.moveCamFront) moveVector.z -= 1;
        if (gameActions.moveCamBack) moveVector.z += 1;
        // camera.lookAt(chara);
        if (gameActions.startGame) toggleGameMode();


        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        releaseSingleEventActions();

        moveVector.normalize();
        moveVector.applyEuler(new THREE.Euler(0, yawObject.rotation.y, 0));

        let prevpos = yawObject.position.clone();
        yawObject.position.addScaledVector(moveVector, moveCam);

        // let x=Math.floor(yawObject.position.x);
        // let y=Math.floor(yawObject.position.y);

        // console.log(yawObject.rotation.y);
        // console.log(moveVector);
        let isCollidingX = false;
        let isCollidingZ = false;
        let colliderX1 = null;
        let colliderX2 = null;
        let colliderZ1 = null;
        let colliderZ2 = null;
        let k;
        if (moveVector.x < 0) //camera moving towards decreasing X
        {
            k = getGridKey(Math.floor(yawObject.position.x), 0, Math.floor(yawObject.position.z));
            if (gridMapYZ.has(k)) {
                isCollidingX = ((yawObject.position.x - Math.floor(yawObject.position.x)) % cellSize) <= minDistancefromWalls;
                // colliderX1 = gridMapYZ.get(k);
            }
        } else {//camera moving towards increasing X
            k = getGridKey(Math.floor(yawObject.position.x) + 1, 0, Math.floor(yawObject.position.z));
            if (gridMapYZ.has(k)) {
                isCollidingX = ((yawObject.position.x - Math.floor(yawObject.position.x)) % cellSize) >= (cellSize - minDistancefromWalls);
                // colliderX2 = gridMapYZ.get(k);
            }
        }

        if (moveVector.z < 0) //camera moving towards decreasing Z
        {
            k = getGridKey(Math.floor(yawObject.position.x), 0, Math.floor(yawObject.position.z));
            if (gridMapXY.has(k)) {
                isCollidingZ = ((yawObject.position.z - Math.floor(yawObject.position.z)) % cellSize) <= minDistancefromWalls;
                // colliderZ1 = gridMapXY.get(k);
            }
        } else {//camera moving towards increasing Z
            k = getGridKey(Math.floor(yawObject.position.x), 0, Math.floor(yawObject.position.z) + 1);
            if (gridMapXY.has(k)) {
                isCollidingZ = ((yawObject.position.z - Math.floor(yawObject.position.z)) % cellSize) >= (cellSize - minDistancefromWalls);
                // colliderZ2 = gridMapXY.get(k);
            }
        }

        if (isCollidingX) yawObject.position.x = prevpos.x;
        if (isCollidingZ) yawObject.position.z = prevpos.z;
        // console.log("playerpos", Math.floor(yawObject.position.x),Math.floor(yawObject.position.z));
        // console.log("isColliding", isCollidingX,isCollidingZ);
        // console.log("colliderX", colliderX1?.position,colliderX2?.position);
        // console.log("colliderZ", colliderZ1?.position,colliderZ2?.position);

        // game update/render logic
        renderer.setViewport(0, 0, container.clientWidth, container.clientHeight);
        // renderer.clear();
        // renderer.setScissorTest(false);
        renderer.render(scene, camera);
        drawcalls = renderer.info.render.calls;
        updateTextStatsThrottled();
        stats.end();
    }
    gameId = requestAnimationFrame(gameLoop);
}















