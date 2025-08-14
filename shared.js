import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
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
export const rng = seedrandom(); // Create a seeded random generator

// Function to generate a random position between min and max using rng()
export function getRandom(min, max) {
    return rng() * (max - min) + min; // Random number between min and max
}

/*-----------------------------------------------------*/
// GAMEPLAY CONSTANTS
/*-----------------------------------------------------*/
export const EPSILON = 0.01;

// speeds
export const moveSpeed = 5;

// camera offset position
const cameraOffsetZ = 2;
export const cameraOffsetY = 1;

// ceiling height
export const SCALEY = 2;

// modes
export const MODEEDITOR = 0;
export const MODEGAME = 1;

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
export let atlasArray    = [];  //material array (from dictionary)
export let atlasMat;
export let atlasUVs;

// Dynamically create a canvas element
export const canvas    = document.getElementById('three-canvas');
export const container = document.getElementById('canvas-container');

// Scene, Camera, Renderer
export const scene    = new THREE.Scene();
export const camera   = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
export const renderer = new THREE.WebGLRenderer({ canvas:canvas, alpha: true });                                     // important

// Maps tracking tile/lights positions per PLANE
export const gridMapXZ = new Map();
export const gridMapYZ = new Map();
export const gridMapXY = new Map();
export const gridLight = new Map();

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
    let online = true;
    if (online)
        resourcesDict = await loadResourcesFromJson('./assets/resourcesonline.json');
    else
        resourcesDict = await loadResourcesFromJson('./assets/resources.json');
    matDict    = resourcesDict.IMAGES;
    atlasDict  = resourcesDict.ATLAS.ATLAS0;
    atlasMat   = atlasDict.ATLASMATERIAL;
    atlasUVs   = atlasDict.UVS;
    atlasArray = Object.entries(atlasUVs);
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
        case MODEGAME:
            StartBtn.textContent = "Stop Game";
            stopEditorLoop();
            ActionToKeyMap = gameActionToKeyMap;
            Actions = GameActions;
            // Actions = {};
            generateKeyToActionMaps();
            startGameLoop();
            break;
        case MODEEDITOR:
            StartBtn.textContent = "Start Game";
            stopGameLoop();
            ActionToKeyMap = editorActionToKeyMap;
            Actions = EditorActions;
            // Actions = {};
            generateKeyToActionMaps();
            startEditorLoop();
            editorState.renderOneFrame = true;
            break;
    }
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
    yawObject.position.set(0, cameraOffsetY, cameraOffsetZ);
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
    if (keyPressToActionMap[event.code])   //if mapping exists
        Actions[keyPressToActionMap[event.code]] = true;
    else if (keyPressOnceToActionMap[event.code])
        Actions[keyPressOnceToActionMap[event.code]] = !keys[event.code];

    keys[event.code] = true;//true all the time when key is pressed
}

/*---------------------------------*/
// onKeyUpEvent
/*---------------------------------*/
export function onKeyUpEvent(event){
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
// getGridKey
/*---------------------------------*/
export function getGridKey(x, y = 0, z) {
    return `${x},${y},${z}`;
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
export function onMouseMove(event) {
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
