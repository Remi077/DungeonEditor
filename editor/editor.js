import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from '../game/gameHUD.js';
// import {mergeBufferGeometries} from '../utils/BufferGeometryUtils.js';
import {mergeGeometries} from '../utils/BufferGeometryUtils.js';


// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';



/*-----------------------------------------------------*/
// EDITOR CONSTANTS
/*-----------------------------------------------------*/

// addition modes
export const ADDPLANEMODE = 0;
export const ADDLIGHTMODE = 1;
// export const ADDGAMEPMODE = 2;
export const ADDRANDMODE = 2;
export const NUMADDMODES = 3;

// tile addition modes
const MODEXZ = 0;
const MODEYZ = 1;
const MODEXY = 2;
const MODEW = 3;
const MODEA = 4;
const NUMMODES = 5;

// rotation and offset per plane
// const RotOffsetPerSlice = {
//     XZ: { pos: new THREE.Vector3(0.5, 0, 0.5), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, Math.PI, 0)) },
//     YZ: { pos: new THREE.Vector3(0, 0.5, 0.5), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2)) },
//     XY: { pos: new THREE.Vector3(0.5, 0.5, 0), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) }
// };


// A THREE.Euler uses Euler order "XYZ" (unless you specify otherwise).
function RotOffsetPerSlice(dir,rot){
    const curRotRadians = rot*(Math.PI/2);
    switch (dir) {
        case "XZ":
            return{
                pos: new THREE.Vector3(0.5, 0, 0.5),
                rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, curRotRadians, 0))
            };
        case "YZ":
            return{
                pos: new THREE.Vector3(0, 0.5, 0.5),
                rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2 + curRotRadians, 0, -Math.PI / 2))
            };
        case "XY":
            return{
                pos: new THREE.Vector3(0.5, 0.5, 0),
                rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.PI / 2, curRotRadians, 0))
            };
    }
}

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/

let editorId = null;
export let Actions = {};

// let defaultGeom;
let markerGeom;
let currentUVIndex = 0;
let currentMeshIndex = 0;

// groups holding lights and helpers
let lightGroup = new THREE.Group(); lightGroup.name = "lightGroup";
let lightHelperGroup = new THREE.Group(); lightHelperGroup.name = "lightHelperGroup";

// selection variables
let selectValid         = false;
let prevSelectValid     = false;
let selectX             = 0;
let selectY             = 0;
let selectZ             = 0;
let prevSelectX         = 99999;
let prevSelectZ         = 99999;
let prevRot             = 0;
let boxselectModestartX = 0;
let boxselectModestartZ = 0;
let boxselectModeendX   = 0;
let boxselectModeendZ   = 0;
let prevWallModeSelect  = MODEA;
let wallModeSelect      = MODEXZ;        //0: xz 1:yz 2:xy 3: walls 4: all
let currentAddMode      = ADDPLANEMODE;

// marker variables
let markerxz;
let markeryz;
let markerxy;

let markergroupxz;
let markergroupyz;
let markergroupxy;

const undogroups = [];
let undogroup = [];

let markerxzmaterial;
let markeryzmaterial;
let markerxymaterial;

let markerremovematerial;

let showMarkerXZ = true;
let showMarkerYZ = false;
let showMarkerXY = false;

//eraser mode
let eraserMode     = false;

//light marker helper
let lightMarker;
let lightMarkerHelper;
let lightMarkerGroup;

//holds geometry with animated uvs
// let UVToUpdate = [];

// maze variables
let mazeWallUvMeshId = "0000";
let mazeFloorUvMeshId = "0000";

/*-----------------------------------------------------*/
// EDITOR ACTIONS TO KEY MAPPING AND REVERSE
/*-----------------------------------------------------*/
export let ActionToKeyMap = {
    moveCamUp      : { key: 'ShiftLeft' },
    moveCamDown    : { key: 'Space' },
    moveCamRight   : { key: 'KeyD' },
    moveCamLeft    : { key: 'KeyA' },
    moveCamFront   : { key: 'KeyW' },
    moveCamBack    : { key: 'KeyS' },
    // setAddPlaneMode: { key: 'Digit1', OnPress: true },
    // setAddLightMode: { key: 'Digit2', OnPress: true },
    // setAddGamepMode: { key: 'Digit3', OnPress: true },
    // setAddRandMode : { key: 'Digit3', OnPress: true },
    // pause          : { key: 'KeyP', OnRelease: true },   //triggered once only at release
      // prevMaterial: { key: 'KeyQ', OnPress: true },
      // nextMaterial: { key: 'KeyE', OnPress: true },
    // nextWall    : { key: 'KeyQ', OnPress: true },
    // prevWall    : { key: 'KeyE', OnPress: true },
    rotLeft     : { key: 'KeyQ', OnPress: true },
    rotRight    : { key: 'KeyE', OnPress: true },
    toggleEraser: { key: 'KeyR', OnPress: true },
    selectMesh  : { key: 'Tab', OnPress: true },
    selectTex   : { key: 'KeyT', OnPress: true },
    nextMesh    : { key: 'KeyC', OnPress: true },
    prevMesh    : { key: 'KeyZ', OnPress: true },
    // saveLevel   : { key: 'KeyT', OnPress: true },
    saveLevel   : { key: 'Ctrl+KeyS', OnPress: true },
    loadLevel   : { key: 'Ctrl+KeyL', OnPress: true },
    resetLevel  : { key: 'Ctrl+KeyR', OnPress: true },
    startGame   : { key: 'KeyG', OnPress: true },
    nextMode    : { key: 'PageUp', OnPress: true },
    prevMode    : { key: 'PageDown', OnPress: true },
    undo        : { key: 'Ctrl+KeyZ', OnPress: true },
    showXZ      : { key: 'Digit1', OnPress: true },
    showYZ      : { key: 'Digit2', OnPress: true },
    showXY      : { key: 'Digit3', OnPress: true },
    showW       : { key: 'Digit4', OnPress: true },
    showA       : { key: 'Digit5', OnPress: true },
    hideCol     : { key: 'KeyH', OnPress: true },
};

/*-----------------------------------------------------*/
// PRELIMINARIES
// create scene, camera and renderer
// grid + axes helpers
// floor object for raycast
// mini scene for axis helper
// camera holder
// HUB overlay
// clock and input listeners
/*-----------------------------------------------------*/

// grid and axes helpers
let grid;
// let gridtwo;
let axes;

// raycast floor
const floorGeo = new THREE.PlaneGeometry(Shared.gridSize, Shared.gridSize); floorGeo.name = "floorGeo";
const floorMat = new THREE.MeshBasicMaterial({ visible: false, name: "floorMat" }); // invisible
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.name = "floor";

//raycaster
const raycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0); // Center of screen in NDC (Normalized Device Coordinates)

// Mini scene for axis helper
const axesScene = new THREE.Scene();
axesScene.background = new THREE.Color(0x000000);
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
const axesHelper = new THREE.AxesHelper(2);

// camera holder: FPS-style rotation system
// pitch
Shared.pitchObject.name = "pitchObject";
Shared.pitchObject.add(Shared.camera);

// yaw
Shared.yawObject.name = "yawObject";
Shared.yawObject.add(Shared.pitchObject);
const pointLight = new THREE.PointLight(new THREE.Vector3(0, 0, 0), 1, 100);
Shared.yawObject.add(pointLight);
// Add Shared.yawObject to scene instead of camera directly
Shared.scene.add(Shared.yawObject);

Shared.resetCamera();

// renderer
Shared.renderer.setClearColor(0x000000, 0); // transparent background
Shared.scene.background = new THREE.Color(0x000000);
Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);

/*---------------------------------*/
// setMeshPosition
/*---------------------------------*/
function setMeshPosition() {
    // markerxz.rotation.y = Math.PI;  //relative x,y,z
    markerxz.position.set(0.5, 0, 0.5);  //relative x,y,z

    markeryz.rotation.x = Math.PI/2;   //left plane
    markeryz.rotation.z = -Math.PI / 2;   
    markeryz.position.set(0, 0.5, 0.5);   

    markerxy.rotation.x = Math.PI / 2;   
    markerxy.position.set(0.5, 0.5, 0);  //front plane (facing you)
}

/*---------------------------------*/
// setupEditor
/*---------------------------------*/
let scene;
let sceneGeometryDict;
let gridMapChunk;
// let gridMapSprites;
let gridMap;
export function setupEditor() {

    //setup local references to be able to watch them
    //in debugger
    scene             = Shared.scene;
    sceneGeometryDict = Shared.sceneGeometryDict;
    gridMapChunk      = Shared.gridMapChunk;
    // gridMapSprites    = Shared.gridMapSprites;
    gridMap           = Shared.gridMap;

    Shared.sceneGeometryDict.clear();

    /*-----------------------------*/
    // MARKERS SETUP
    // In Three.js, the coordinate system is a right-handed Cartesian system, and the axes are organized like this:
    //       Y+ (up) (green)
    //        |
    //        |
    //        |_____ X+ (right) (red)
    //       /
    //      /
    //    Z+ (toward you) (blue)
    /*-----------------------------*/

    // MARKER MATERIALS
    markerxzmaterial = Shared.atlasMat.clone();
    Object.assign(markerxzmaterial,
        {
            side: THREE.DoubleSide,
            //note: a transparent plane adds 2 draw calls per plane instead of 1.
            transparent: false,
            // opacity: 0.5,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
    markeryzmaterial = markerxzmaterial.clone();
    markerxymaterial = markerxzmaterial.clone();
    markerremovematerial = Shared.atlasMat.clone();
    // markerremovematerial = new THREE.MeshBasicMaterial(
    Object.assign(markerremovematerial,
        {
            side: THREE.DoubleSide,
            // transparent: true,
            // opacity: 0.5,
            transparent: false,
            // wireframe: true,
            // linewidth: 100,//wireframe thickness, doesnt work on windows
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });

    markerxzmaterial.color.set(0x00ff00);  //XZ: horizontal plane, green
    markeryzmaterial.color.set(0xff0000);  //YZ: left plane,       red
    markerxymaterial.color.set(0x0000ff);  //XY: front plane,      blue
    markerremovematerial.color.set(0xffff00);  //eraser:               yellow

    markerxzmaterial.name = "markerxzmaterial";
    markeryzmaterial.name = "markeryzmaterial";
    markerxymaterial.name = "markerxymaterial";
    markerremovematerial.name = "markerremovematerial";

    // MARKER MESH
    markerGeom = generateDefaultGeometry();

    //by default
    // markerxz = new THREE.Mesh(markerGeom, markerxzmaterial);
    // markeryz = new THREE.Mesh(markerGeom, markeryzmaterial);
    // markerxy = new THREE.Mesh(markerGeom, markerxymaterial);
    markerxz = markerGeom.clone(true)
    markeryz = markerGeom.clone(true)
    markerxy = markerGeom.clone(true)
    markerxz.traverse((child) => {if (child.isMesh) child.material = markerxzmaterial;});
    markeryz.traverse((child) => {if (child.isMesh) child.material = markeryzmaterial;});
    markerxy.traverse((child) => {if (child.isMesh) child.material = markerxymaterial;});

    setMeshPosition();

    markerxz.name = "markerxz"
    markeryz.name = "markeryz"
    markerxy.name = "markerxy"

    // MARKER GROUP
    markergroupxz = new THREE.Group(); markergroupxz.name = "markergroupxz";
    markergroupyz = new THREE.Group(); markergroupyz.name = "markergroupyz";
    markergroupxy = new THREE.Group(); markergroupxy.name = "markergroupxy";

    markergroupxz.visible = showMarkerXZ;
    markergroupyz.visible = showMarkerYZ;
    markergroupxy.visible = showMarkerXY;

    markergroupxz.add(markerxz.clone(true));
    markergroupyz.add(markeryz.clone(true));
    markergroupxy.add(markerxy.clone(true));

    Shared.scene.add(markergroupxz);
    Shared.scene.add(markergroupyz);
    Shared.scene.add(markergroupxy);

    //light marker helper
    const { light: lightMarkerv, helper: lightMarkerHelperv } = Shared.createLight(new THREE.Vector3(0 + 0.5, 0 + 0.5, 0 + 0.5));
    lightMarker=lightMarkerv; 
    // lightMarkerHelper=lightMarkerHelperv;
    const lightmarkerGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const lightmarkerMat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
    lightMarkerHelper = new THREE.Mesh(lightmarkerGeom, lightmarkerMat);
    lightMarkerHelper.position.set(0.5, 0.5, 0.5);   // local offset zero
    lightMarkerGroup= new THREE.Group(); lightMarkerGroup.name = "lightMarkerGroup";
    lightMarkerGroup.add(lightMarker);
    lightMarkerGroup.add(lightMarkerHelper);
    lightMarkerGroup.position.set(0,0,0);

    // lightMarker.add(lightMarkerHelper);//light follows helper
    // lightMarkerHelper.updateMatrixWorld();     // force recalculation
    // lightMarker.visible = false;//both becomes invisible
    // lightMarkerHelper.visible = false;//both becomes invisible
    lightMarkerGroup.visible = false;
    Shared.scene.add(lightMarkerGroup);
    // Shared.scene.add(lightMarkerHelper);
    
    //chunks group
    Shared.scene.add(Shared.chunksGroup);
    Shared.scene.add(Shared.spritesGroup);

    //start in add plane mode
    //expand add plane
    const event = new CustomEvent("UIChange", {
        detail: { field: "modeChange", value: ADDPLANEMODE },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);    
    // setAddMode(ADDPLANEMODE);
    setWallMode(MODEA);
    setMaterial(0);
    // setMeshFromMeshName("PLANE");
    setMeshFromMeshindex(0);
    setMazeWallMaterial(0);
    setMazeFloorMaterial(1);

    // create the scene
    createScene();

    //initialize scene
    initializeScene();

    // Reset the clock to start from 0
    Shared.clock.start();

}

/*---------------------------------*/
// startEditorLoop
/*---------------------------------*/
export function startEditorLoop() {
    Shared.editorState.editorRunning = true;
    editorId = requestAnimationFrame(editorLoop);

    //markers
    reinitMarker();
    markergroupxz.visible = showMarkerXZ;
    markergroupyz.visible = showMarkerYZ;
    markergroupxy.visible = showMarkerXY;    
    // markeryzmaterial.visible     = true;
    // markerxzmaterial.visible     = true;
    // markerxymaterial.visible     = true;
    // markerremovematerial.visible = true;

    //grid
    grid.visible                 = true;
    // gridtwo.visible              = false;
    axes.visible                 = true;

    //lights
    lightHelperGroup.visible     = false;
    Shared.ambientLight.color.set(Shared.AMBIENTLIGHTEDITCOLOR);

    //back to addmode
    setAddMode(ADDPLANEMODE);//by default


    document.addEventListener("mousedown", onMouseClick, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("wheel", onMouseWheel, { passive: false });


    //test RAPIER
    // rapierinit();
    // Shared.rapierDebug = Shared.addRapierDebug(Shared.scene,Shared.physWorld);






    // Shared.addRapierDebugExp();

}   

// let world;
// let rigidBodies = [];
// async function rapierinit() {
//     await RAPIER.init();
//     world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

    // let cubeMesh;
    // // Rapier ground
    // const groundRigidBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    // const groundCollider = RAPIER.ColliderDesc.cuboid(10, 0, 10);
    // world.createCollider(groundCollider, groundRigidBody);

    // // Cube
    // const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    // const cubeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
    // cubeMesh.position.y = 2;
    // cubeMesh.name="rapiertest";
    // Shared.scene.add(cubeMesh);

    // // Rapier cube
    // const cubeBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 5, 0));
    // const cubeCollider = RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
    // .setRestitution(2)   // make it bouncy
    // .setFriction(0.5);      // optional: adjust friction

    // world.createCollider(cubeCollider, cubeBody);

    // rigidBodies.push({ mesh: cubeMesh, body: cubeBody });

//     console.log('Rapier initialized', world);
// }


/*---------------------------------*/
// stopEditorLoop
/*---------------------------------*/
export function stopEditorLoop() {
    Shared.editorState.editorRunning = false;

    cancelAnimationFrame(editorId);

    //markers
    setEraser(false);
    // reinitMarker();
    markergroupxz.visible = false;
    markergroupyz.visible = false;
    markergroupxy.visible = false;
    // markeryzmaterial.visible     = false;
    // markerxzmaterial.visible     = false;
    // markerxymaterial.visible     = false;
    // markerremovematerial.visible = false;

    //grid
    grid.visible                 = false;
    // gridtwo.visible              = false;
    axes.visible                 = false;

    //lights
    lightHelperGroup.visible     = false;
    lightMarkerGroup.visible     = false;

    document.removeEventListener("mousedown", onMouseClick, false);
    document.removeEventListener("mouseup", onMouseUp, false);
    document.removeEventListener("wheel", onMouseWheel, { passive: false });

    Stats.stats.end();

    // Shared.rapierDebug.dispose();

}

/*---------------------------------*/
// setEraser
/*---------------------------------*/
function toggleEraser() {
    setEraser(!eraserMode);
}


function setEraser(enabled) {
    console.log("set eraserMode to ",enabled);
    eraserMode = enabled;

    if (eraserMode) {
        markergroupxz.visible = false;
        markergroupyz.visible = false;
        markergroupxy.visible = false;        
    } else {
        if (selectObj) {
            selectObj.geometry.dispose();
            Shared.scene.remove(selectObj);
            selectObj=null;
        }
        selectInfo = null;
        prevSelectInfo = null;
        markergroupxz.visible = showMarkerXZ;
        markergroupyz.visible = showMarkerYZ;
        markergroupxy.visible = showMarkerXY;
    }
    reinitMarker();
}

/*---------------------------------*/
// nextWall
/*---------------------------------*/
function nextWall() {
    toggleWall(1);
}

function prevWall() {
    toggleWall(-1);
}

function toggleWall(increment = 1) {
    let newWallModeSelect = (((wallModeSelect + increment) % NUMMODES) + NUMMODES) % NUMMODES;
    setWallMode(newWallModeSelect);
}

export function setWallMode(newWallModeSelect) {
    wallModeSelect = newWallModeSelect;
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
    //update UI
    const event = new CustomEvent("UIChange", {
        detail: { field: "WallModeChange", value: newWallModeSelect },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);

}

function nextMaterial() {
    toggleMaterial(1);
}

function prevMaterial() {
    toggleMaterial(-1);
}

export function setCurrentUVIndex(i){currentUVIndex = i;}
export function getCurrentUVIndex(){return currentUVIndex;}

function toggleMaterial(increment) {
    let l = Shared.atlasUVsArray.length;
    let newUvIndex = (((currentUVIndex + increment) % l) + l) % l;
    setMaterial(newUvIndex);
}

export function setMaterial(uvIndex){
    currentUVIndex = uvIndex;
    let currentName = Shared.atlasUVsArray[uvIndex][0];
    setMesh(currentRot,uvIndex,currentMeshIndex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MaterialChange", value: uvIndex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

export function setMazeWallMaterial(uvIndex){
    const meshid = Shared.atlasMeshidx["PLANE"];
    mazeWallUvMeshId = Shared.encodeID(uvIndex,meshid);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MazeWallChange", value: uvIndex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

export function setMazeFloorMaterial(uvIndex){
    const meshid = Shared.atlasMeshidx["PLANE"];
    mazeFloorUvMeshId = Shared.encodeID(uvIndex,meshid);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MazeFloorChange", value: uvIndex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

/*---------------------------------*/
// setMesh
/*---------------------------------*/
function nextMesh() { toggleMesh(1); }
function prevMesh() { toggleMesh(-1); }

export function setCurrentMeshIndex(i){currentMeshIndex = i;}
export function getCurrentMeshIndex(){return currentMeshIndex;}

function toggleMesh(increment){
    let l = Shared.atlasMeshArray.length;
    let newmeshindex = (((currentMeshIndex + increment) % l) + l) % l;
    setMeshFromMeshindex(newmeshindex);
}

export function setMeshFromMeshindex(meshindex){
    currentMeshIndex = meshindex;
    // let currentName = Shared.atlasMeshArray[meshindex][0];
    setMesh(currentRot,currentUVIndex,meshindex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MeshChange", value: meshindex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

export function setMeshFromMeshName(meshname){
    const meshindex = Shared.atlasMeshidx[meshname];

    if (!meshindex === undefined) {
        throw new Error("meshname", meshname, "is not defined");
    }

    currentMeshIndex = meshindex;

    //If there is a material which matches the mesh name
    //set it immediately there
    for (const [name,id] of Object.entries(Shared.atlasUVsidx)){
        if (name.startsWith(meshname)){
            setMaterial(id);
            break;
        }
    }


    setMesh(currentRot,currentUVIndex,meshindex);
    const event = new CustomEvent("UIChange", {
        detail: { field: "MeshChange", value: meshindex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

export function setMesh(rotid, uvid, meshid) {

    // Dispose old geometries in markerGeom
    markerGeom.traverse((child) => {
        if (child.isMesh && child.geometry) {
            child.geometry.dispose();
        }
    });

    // Generate new geometry hierarchy
    markerGeom = generateGeometry(rotid, uvid, meshid);

    [["markerxz", markerxz], ["markeryz", markeryz], ["markerxy", markerxy]].forEach(([name, marker]) => {
        const pos   = marker.position.clone();
        const rot   = marker.rotation.clone();
        const scale = marker.scale.clone();

        // Save material from first mesh
        const firstMesh = marker.getObjectByProperty('isMesh', true);
        const oldMaterial = firstMesh ? firstMesh.material : null;

        // Replace with cloned geometry
        const newMarker = markerGeom.clone(true);

        // Restore transform
        newMarker.position.copy(pos);
        newMarker.rotation.copy(rot);
        newMarker.scale.copy(scale);

        // Restore materials
        newMarker.traverse(child => {
            if (child.isMesh && oldMaterial) {
                child.material = oldMaterial;
            }
        });

        // Update the global variable
        if (name === "markerxz") markerxz = newMarker;
        if (name === "markeryz") markeryz = newMarker;
        if (name === "markerxy") markerxy = newMarker;
    });

    // Reinit and render
    reinitMarker();
    Shared.editorState.renderOneFrame = true;
}

/*---------------------------------*/
// placeGroup
/*---------------------------------*/
function placeGroup(group, direction) {
    while (group.children.length > 0) {
        let child = group.children[0];
        placeTileFromMesh(child, direction);
        group.remove(child);
    }
}


/*---------------------------------*/
// placeLight
/*---------------------------------*/
function placeLight(lightv, lighthelperv) {

    let worldPos = new THREE.Vector3();
    lightv.getWorldPosition(worldPos);
    let wx = Math.floor(worldPos.x / Shared.cellSize);
    let wy = Math.floor(worldPos.y / Shared.cellSize);
    let wz = Math.floor(worldPos.z / Shared.cellSize);
    const key = Shared.getGridKey(wx, wy, wz);

    if (Shared.gridLight.has(key)) {
        let lighttoremove = Shared.gridLight.get(key).light;
        if (lighttoremove) {
            lightGroup.remove(lighttoremove);
            lighttoremove.dispose();
        }
        let lighhelpertoremove = Shared.gridLight.get(key).helper;
        if (lighhelpertoremove) {
            lightHelperGroup.remove(lighhelpertoremove);
            lighhelpertoremove.dispose();
        }
    }

    //if eraser mode we finished our work here
    // if (eraserMode) return;

    lightGroup.add(lightv);
    lightHelperGroup.add(lighthelperv);
    Shared.gridLight.set(key, { light: lightv, helper: lighthelperv });

}

/*---------------------------------*/
// placeTile
/*---------------------------------*/

const worldPos = new THREE.Vector3();
function placeTileFromMesh(tilemesh, direction, erase=false) {

    tilemesh.getWorldPosition(worldPos);
    // let uvmeshid = tilemesh.geometry.userData.uvmeshid;
    let uvmeshid = tilemesh.userData.uvmeshid;
    let wx = Math.floor(worldPos.x / Shared.cellSize);
    let wy = Math.floor(worldPos.y / Shared.cellSize);
    let wz = Math.floor(worldPos.z / Shared.cellSize);

    placeTile(wx,wy,wz,direction,uvmeshid,erase);

}

function placeTile(wx,wy,wz,direction,uvmeshid,erase=false,undoable=true) {


    const { rotid, uvid, meshid } = Shared.decodeID(uvmeshid);
    const meshname = Shared.atlasMeshArray[meshid][0];

    const isSprite = meshname.startsWith("SPRITE");

    const undoitem = {
            wx:wx,
            wy:wy,
            wz:wz,
            direction:direction,
            uvmeshid:uvmeshid,
            meshname:meshname,
            erase:!erase //erase undoes add and vice versa
        };

    const chunkkey = Shared.getGridChunkKey(wx, wy, wz);
    const tilekey = Shared.getGridKey(wx, wy, wz);

    let tile = gridMap[direction].get(tilekey);
    let chunk = null;
    let mapChunk = null;
    mapChunk = gridMapChunk;
    chunk = mapChunk.get(chunkkey);

    // Eraser mode
    if (tile && (meshname in tile || meshname === "")) {
        //if a tile is replaced, do not mark as erase and record the erased tile instead
        undoitem.uvmeshid = tile[meshname];
        undoitem.erase = false;
        if (meshname === ""){
            //if no name given delete any mesh found here
            // tile = {};
            Object.keys(tile).forEach(k => delete tile[k]);
        } else {
            delete tile[meshname];
        }
        if (chunk) chunk.dirty = true;
        //handle the mapping update (deletion) in rebuildDirtyChunk
        
        // cleanup: remove empty tiles
        if (Object.keys(tile).length === 0) {
            gridMap[direction].delete(tilekey);
            tile=null;
        }
    
    }

    if (undoable) undogroup.push(undoitem);

    if (erase) return;

    // Add/update tile
    if (!tile) {

        tile = {};
        gridMap[direction].set(tilekey, tile);

        if (!chunk) {
            chunk = {
                dirty: true,
                XZ: new Map(),
                YZ: new Map(),
                XY: new Map()
            };
            mapChunk.set(chunkkey, chunk);
        }

        chunk[direction].set(tilekey, tile);

    }

    tile[meshname] = uvmeshid;

    chunk.dirty = true;

}


/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
function onMouseClick(event) {

    if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;
    // console.log("editor mouseclick");

    if (event.button == 0) {

        Shared.editorState.hasClicked  = true;
        Shared.editorState.mouseIsDown = true;

        switch (currentAddMode) {

            case ADDPLANEMODE:

                if (eraserMode) {
                    //TOCOMPLETE
                } else {

                    if (!selectValid) return;

                    markergroupxz.visible = false;
                    markergroupxy.visible = false;
                    markergroupyz.visible = false;

                    // if (event.shiftKey) { // console.log("Shift + Click detected");
                    boxselectModestartX = selectX;
                    boxselectModestartZ = selectZ;
                    boxselectModeendX   = selectX;
                    boxselectModeendZ   = selectZ;
                }
                break;

            case ADDLIGHTMODE:

                let { light: newlight, helper: newlighthelper } = Shared.createLight(new THREE.Vector3(selectX + 0.5, Shared.floorHeight + 0.5, selectZ + 0.5));
                placeLight(newlight, newlighthelper, Shared.gridLight, lightGroup, lightHelperGroup);
                break;
        }

    }

    //right click
    // if (event.button == 2){
    // setEraser(true);//eraser on right click
    // }

}

/*---------------------------------*/
// onMouseUp
/*---------------------------------*/
function onMouseUp(event) {

    if (!Shared.editorState.editorRunning || !Shared.getIsMouseOverCanvas()) return;

    // console.log("editor mouseup");

    if (event.button == 0) {

        Shared.editorState.mouseIsDown = false;

        switch (currentAddMode) {

            case ADDPLANEMODE:

                if (eraserMode) {
                    if (selectObj && selectInfo) {

                        placeTileFromMesh(selectObj, selectInfo.direction, true);

                        enqueueundo(undogroup);
                        undogroup = [];

                        if (selectObj) {
                            selectObj.geometry.dispose();
                            Shared.scene.remove(selectObj);
                            selectObj = null;
                        }
                        selectInfo = null;
                        selectObj = null;

                    }
                } else {

                    if (!selectValid) {
                        reinitMarker();
                        return;
                    }

                    //find material
                    if (showMarkerXZ) placeGroup(markergroupxz, "XZ");
                    if (showMarkerYZ) placeGroup(markergroupyz, "YZ");
                    if (showMarkerXY) placeGroup(markergroupxy, "XY");

                    enqueueundo(undogroup);
                    undogroup = [];

                    boxselectModeendX = boxselectModestartX;
                    boxselectModeendZ = boxselectModestartZ;
                }

                //reinitialize marker
                reinitMarker();
                break;

            // case ADDGAMEPMODE:
            //     placeGamep();

            default:
                return;
        }
    } //else if (event.button == 2) {



        // let popup;
        // if (event.altKey) {
        //     openPopup(Shared.meshpopup)
        // } else {
        //     openPopup(Shared.matpopup)
        // }

    //}

}

function openPopup(popup){
    //update the UI
    const cevent = new CustomEvent("UIChange", {
        detail: { field: "openPopup", value: popup },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(cevent);
}

/*---------------------------------*/
// reinitMarker
/*---------------------------------*/
function reinitMarker() {

    //reinit marker
    //RED
    markergroupxz.clear();
    markergroupxz.add(markerxz.clone(true));
    markergroupxz.position.set(selectX, Shared.floorHeight, selectZ);

    //GREEN
    markergroupyz.clear();
    //idea: to fake AO: 
    //create AO png decal (dark bottom gradient with transparency)
    //create a second atlasMat based on standard or lambertmaterial (better perf)
    //drive ao map field with ao texture
    //leave the UV non scaled for the mandatory uv2 field
    //based on height swap material from atlasMat to atlasMapAO
    //this enables better separation
    markergroupyz.add(markeryz.clone(true));
    for (let y = 1; y < Shared.wallHeight; y++) {
        const t = markeryz.clone(true);
        t.position.y += y;
        markergroupyz.add(t);
    }
    markergroupyz.position.set(selectX, Shared.floorHeight, selectZ);

    //BLUE
    markergroupxy.clear();
    markergroupxy.add(markerxy.clone(true));
    for (let y = 1; y < Shared.wallHeight; y++) {
        const t = markerxy.clone(true);
        t.position.y += y;
        markergroupxy.add(t);
    }
    markergroupxy.position.set(selectX, Shared.floorHeight, selectZ);

    //reinit bbox
    boxselectModeendX = boxselectModestartX;
    boxselectModeendZ = boxselectModestartZ;
}

/*---------------------------------*/
// onMouseWheel
/*---------------------------------*/
export function onMouseWheel(event) {

    //prevent browser zoom when ctrl+mouse wheel
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
    }
    
    if (!Shared.editorState.editorRunning) return;

    if (event.ctrlKey){
        if (event.deltaY < 0) {
            nextFloorHeight();
        } else {
            prevFloorHeight();
        }
        
        //update the UI
        const cevent = new CustomEvent("UIChange", {
            detail: { field: "FloorChange", value: Shared.floorHeight.toString() },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(cevent);

    }else{
        if (event.deltaY < 0) {
            nextWallHeight();
        } else {
            prevWallHeight();
        }

        //update the UI
        const cevent = new CustomEvent("UIChange", {
            detail: { field: "WallChange", value: Shared.wallHeight.toString() },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(cevent);        
    }
}

/*---------------------------------*/
// executeUnpausableActions
/*---------------------------------*/
function executeUnpausableActions(delta) {
    // Create a local movement vector based on input
    // console.log("executeUnpausableActions",Actions.moveCamUp);
    const moveVector = new THREE.Vector3();
    const moveCam = Shared.moveSpeed * delta;
    if (Actions.moveCamUp) moveVector.y    += 1;
    if (Actions.moveCamDown) moveVector.y  -= 1;
    if (Actions.moveCamLeft) moveVector.x  -= 1;
    if (Actions.moveCamRight) moveVector.x += 1;
    if (Actions.moveCamFront) moveVector.z -= 1;
    if (Actions.moveCamBack) moveVector.z  += 1;
    // camera.lookAt(chara);

    moveVector.normalize();
    moveVector.applyEuler(new THREE.Euler(0, Shared.yawObject.rotation.y, 0));
    Shared.yawObject.position.addScaledVector(moveVector, moveCam);

    if (Actions.pause)  Shared.doPause();
}

/*---------------------------------*/
// executePausableActions
/*---------------------------------*/
function executePausableActions(delta) {

    //always possible whatever the add mode
    if (Actions.setAddPlaneMode) {setAddMode(ADDPLANEMODE)};
    if (Actions.setAddLightMode) {setAddMode(ADDLIGHTMODE)};
    if (Actions.setAddRandMode) {setAddMode(ADDRANDMODE)};
    // if (Actions.setAddGamepMode) {setAddMode(ADDGAMEPMODE)};
    if (Actions.setAddPlaneMode
        || Actions.setAddLightMode
        || Actions.setAddRandMode
        // || Actions.setAddGamepMode
    ) {
        const event = new CustomEvent("UIChange", {
            detail: { field: "modeChange", value: currentAddMode },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
    };
    // if (Actions.nextMode) nextMode();
    // if (Actions.prevMode) prevMode();    

    //only in addplane mode
    if (currentAddMode == ADDPLANEMODE) {
        if (Actions.nextMaterial) nextMaterial();
        if (Actions.prevMaterial) prevMaterial();
        if (Actions.nextWall) nextWall();
        if (Actions.prevWall) prevWall();
        if (Actions.toggleEraser) toggleEraser();
        if (Actions.rotLeft) rotLeft();
        if (Actions.rotRight) rotRight();
        if (Actions.selectMesh) openPopup(Shared.meshpopup);
        if (Actions.selectTex) openPopup(Shared.matpopup);
        if (Actions.nextMesh) nextMesh();
        if (Actions.prevMesh) prevMesh();
        if (Actions.saveLevel) saveLevel();
        if (Actions.loadLevel) loadLevel();
        if (Actions.resetLevel) resetLevel();
        // if (Actions.startGame) toggleGameMode();
        if (Actions.undo) undo();
        if (Actions.showXZ) setWallMode(MODEXZ);
        if (Actions.showYZ) setWallMode(MODEYZ);
        if (Actions.showXY) setWallMode(MODEXY);
        if (Actions.showW) setWallMode(MODEW);
        if (Actions.showA) setWallMode(MODEA);
        if (Actions.hideCol) toggleHideCollider();
    }

}

function executeLastActionsBeforeLoop(){
    if (Actions.startGame) toggleGameMode();
}

/*---------------------------------*/
// editorLoop
/*---------------------------------*/
let raycastChunkArray = [];
let selectObj = null;
let selectInfo = null;
let prevSelectInfo = null;

let lastUVUpdate = 0;
const uvUpdateInterval = 0.07; // seconds between updates
function editorLoop(now) {

    if (!Shared.editorState.editorRunning) return;

    //fps counter
    Stats.stats.begin();

    const deltaTime = Shared.clock.getDelta(); // Time elapsed since last frame
    GameHUD.drawHUD();

    // if (!Shared.editorState.pause || Shared.editorState.renderOneFrame) {
    // if (true) {
    if (Shared.getIsMouseOverCanvas()) {
        executeUnpausableActions(deltaTime);

        // console.log("incanvas");

        //clear that flag
        Shared.editorState.renderOneFrame = false;

        //sample and execute the actions available when not in pause
        executePausableActions(deltaTime);

        switch (currentAddMode) {
            case ADDPLANEMODE:
                if (eraserMode) {
                    
                    //highlight the mesh to delete from a given selected chunk
                    highlightMeshToDelete();
                    
                } else {

                    //raycast against the floor
                    floorRaycast();
                    //maintain a group of marker tiles that show the current add selection
                    updateMarker();

                }
                break;
            case ADDLIGHTMODE:
                    floorRaycast();
                    updateLightMarker();
                break;
            // case ADDGAMEPMODE:
            //         //raycast against the floor
            //         floorRaycast();
            //         //maintain a group of marker tiles that show the current add selection
            //         // updateGamepMarker();
            default:
                break;
    }

        //RENDER GIZMO HELPER in BOTTOM LEFT CORNER
        //TODO: main renderer is in there too
        //move before the end of loop?
        render_gizmo();

        //rebuild dirty chunks
        rebuildDirtyChunks();


        // convert ms → seconds
        const t = now * 0.001;
        // only update if enough time has passed
        if (t - lastUVUpdate >= uvUpdateInterval) {
            Shared.updateAnimatedTextures();
            lastUVUpdate = t;
        }

        //
        // buildSprites();


        // Simulate heavy computation
        if (0) Stats.simulateBlockingWait(200); // 200ms delay
        Stats.updateTextStatsThrottled();
        Stats.stats.end();



        // Step Rapier physics
        if (Shared.physWorld){

            Shared.physWorld.step();
            // Shared.rapierDebug.dispose();
            Shared.rapierDebug.update();

            // // Update Rapier's debug data
            // Shared.physWorld.debugRender.clear();
            // Shared.physWorld.debugRender.render(Shared.physWorld);
            // // Get debug vertices
            // const vertices = Shared.debugRender.vertices;
            // Shared.debugGeometry.setAttribute(
            // "position",
            // new THREE.Float32BufferAttribute(vertices, 3)
            // );
            // Shared.debugGeometry.computeBoundingSphere();
            // Shared.debugGeometry.attributes.position.needsUpdate = true;

        //     console.log("step");
        //     // world.step();

        //     // Update Three.js meshes from physics
        //     for (const obj of rigidBodies) {
        //         const pos = obj.body.translation();
        //         const rot = obj.body.rotation();
        //         obj.mesh.position.set(pos.x, pos.y, pos.z);
        //         obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        //     }
        }



    }

    executeLastActionsBeforeLoop();

    //clear the onpress/onrelease actions now that they have been sampled 
    //in that loop to avoid resampling
    Shared.releaseSingleEventActions();

    editorId = requestAnimationFrame(editorLoop); //call animate recursively on next frame 

}


function render_gizmo() {
    if (1) {
        // 1. Render main scene
        Shared.renderer.setViewport(0, 0, Shared.container.clientWidth, Shared.container.clientHeight);
        Shared.renderer.clear();
        Shared.renderer.render(Shared.scene, Shared.camera);
        // console.log("draw calls main scene", renderer.info.render.calls);
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;

        // 2. Render mini viewport (e.g., bottom-left corner)
        const vpSize = 100;
        Shared.renderer.setViewport(10, 10, vpSize, vpSize);
        Shared.renderer.setScissor(10, 10, vpSize, vpSize);
        Shared.renderer.setScissorTest(true);
        Shared.renderer.clearDepth();
        Shared.renderer.render(axesScene, axesCamera);
        // console.log("draw calls mini viewport", renderer.info.render.calls);
        Stats.renderStats.drawcalls += Shared.renderer.info.render.calls;

        // 3. Reset to full Shared.canvas
        Shared.renderer.setScissorTest(false);

        //To sync the mini gizmo with your main camera orientation:
        const worldQuat = new THREE.Quaternion();
        Shared.camera.getWorldQuaternion(worldQuat);
        axesHelper.quaternion.copy(worldQuat).invert();

    } else {
        Shared.renderer.render(Shared.scene, Shared.camera);
        // console.log("draw calls main scene", renderer.info.render.calls);
        Stats.renderStats.drawcalls = Shared.renderer.info.render.calls;
        Shared.renderer.info.reset(); //it auto resets normally
    }
}

function highlightMeshToDelete(){

    //If eraser mode set raycast against any geometry
    raycastChunkArray = Object.values(Shared.chunksInScene);
    // all sprite meshes (flattened)
    const spriteMeshesArray = Object.values(Shared.spritesInScene).flat();
    const actionnableMeshesArray = Object.values(Shared.actionnablesInScene).flat();
    // merge both
    const raycastTargets = raycastChunkArray.concat(spriteMeshesArray);
    raycastTargets.concat(actionnableMeshesArray);
    //TO OPTIMIZE: only raycast against chunks in front of Shared.camera instead of all the chunks

    //perform the raycast
    const mouse = Shared.getMouse();
    // raycaster.setFromCamera(screenCenter, Shared.camera);
    raycaster.setFromCamera(mouse, Shared.camera);
    let doesIntersect = false;
    // const hits = raycaster.intersectObjects(raycastChunkArray, false);
    const hits = raycaster.intersectObjects(raycastTargets, false);

    let closestHit = null;

    for (const hit of hits) {
        if (!closestHit || hit.distance < closestHit.distance) {
            closestHit = hit;
        }
    }

    if (closestHit && closestHit.distance < 12) {
        doesIntersect = true;
    }

    if (doesIntersect) {

        const hitType = closestHit.object?.userData?.type;

        switch (hitType) {
            case "mesh": {
                const facehit = closestHit.faceIndex;
                const facetotilerange = closestHit.object?.userData?.facetotilerange;
                if (!facetotilerange) throw new Error(`Mesh userData.facetotilerange missing.`);
                
                const entry = facetotilerange.find(r => facehit >= r.start && facehit <= r.end);
                if (!entry) throw new Error(`No facetotilerange entry found for faceIndex ${facehit}`);
                
                selectInfo = entry.info;
                break;
            }
            case "sprite":
                selectInfo = closestHit.object?.userData?.info;
                if (!selectInfo) throw new Error(`Sprite userData.info missing.`);
                break;
            case "actionnable":
                selectInfo = closestHit.object?.userData?.info;
                if (!selectInfo) throw new Error(`Sprite userData.info missing.`);
                break;
            default:
                throw new Error(`Raycasted geometry has no type or unknown hitType: ${hitType}`);
        }

        if (!prevSelectInfo || prevSelectInfo !== selectInfo) {
            // console.log(selectInfo.direction,selectInfo.tilexyz,selectInfo.uvmeshid);

            if (selectObj) {
                selectObj.geometry.dispose();
                Shared.scene.remove(selectObj);
                selectObj = null;
            }

            prevSelectInfo = selectInfo;

            const { rotid, uvid, meshid } = Shared.decodeID(selectInfo.uvmeshid);
            // const uvmeshidrot0 = Shared.encodeID(uvid,meshid);
            const uvmeshidrot0 = selectInfo.uvmeshid; //TEMP: find a way to optimize this, ie only register
            //unique geometries indepedently from rotation. pb is that this breaks save/load at the moment 
            if (Shared.sceneGeometryDict.has(uvmeshidrot0)) {
                // selectObj = new THREE.Mesh(Shared.sceneGeometryDict.get(uvmeshidrot0).clone(true), markerremovematerial);
                selectObj = Shared.sceneGeometryDict.get(uvmeshidrot0).clone(true);
                selectObj.traverse((child) => {if (child.isMesh) child.material = markerremovematerial;});
            } else {
                //should not go there normally but support it just in case
                // const { rotid, uvid, meshid } = Shared.decodeID(selectInfo.uvmeshid);
                selectObj = generateGeometry(rotid, uvid, meshid);
            }
            // const { rot, pos: offset } = RotOffsetPerSlice[selectInfo.direction];
            const { rot, pos: offset } = RotOffsetPerSlice(selectInfo.direction,rotid);
            const { x, y, z } = Shared.parseGridKey(selectInfo.tilexyz);
            const selectObjPos = new THREE.Vector3();
            selectObjPos.set(
                offset.x + Shared.cellSize * x,
                offset.y + Shared.cellSize * y,
                offset.z + Shared.cellSize * z
            );
            const m = new THREE.Matrix4().copy(rot).setPosition(selectObjPos);
            // Apply matrix to the mesh's transform
            m.decompose(selectObj.position, selectObj.quaternion, selectObj.scale);

            selectObj.name = "removeMarker";
            Shared.scene.add(selectObj);

        }

    } else {

        if (selectObj) {
            selectObj.geometry.dispose();
            Shared.scene.remove(selectObj);
            selectObj = null;
        }
        selectInfo = null;
        prevSelectInfo = null;
        // console.log("no intersection found");
    }
}

function floorRaycast() {

    //FLOOR RAYCAST TEST
    const mouse = Shared.getMouse();
    // console.log("mouse",mouse);
    raycaster.setFromCamera(mouse, Shared.camera);
    // raycaster.setFromCamera(screenCenter, Shared.camera);
    const intersects = raycaster.intersectObject(floor);

    selectValid = false;

    let doesIntersect = false;
    if (intersects.length > 0) {
        doesIntersect = intersects[0].distance < 12;
    }

    if (doesIntersect) {
        const point = intersects[0].point;
        // console.log("intersectpoint",point);
        selectValid = true;
        // Convert world position to grid cell
        selectX = Math.floor(point.x / Shared.cellSize);
        selectY = Shared.floorHeight;
        selectZ = Math.floor(point.z / Shared.cellSize);
        // console.log(selectX,selectZ)
    }

}


function updateMarker(){

    markergroupxz.visible = false;
    markergroupyz.visible = false;
    markergroupxy.visible = false;

    if (selectValid) {

        markergroupxz.visible = showMarkerXZ;
        markergroupyz.visible = showMarkerYZ;
        markergroupxy.visible = showMarkerXY;

        //UPDATE ONLY WHEN NEW CELL SELECTED
        if (
            (selectX != prevSelectX) ||
            (selectZ != prevSelectZ) ||
            (currentRot != prevRot)  ||
            wallModeSelect != prevWallModeSelect ||
            Shared.editorState.hasClicked
        ) {
            Shared.editorState.hasClicked = false;
            // console.log("newpoint");

            if (!Shared.editorState.mouseIsDown) {
                markergroupxz.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), selectZ * Shared.cellSize);
                markergroupyz.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), selectZ * Shared.cellSize);
                markergroupxy.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), selectZ * Shared.cellSize);
                
                // markergroupxz.rotation.y=currentRot;
            } else {

                //UPDATE SELECTION BBOX
                boxselectModeendX = selectX;
                boxselectModeendZ = selectZ;

                //UPDATE MARKER POSITION
                markergroupxz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                markergroupyz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                markergroupxy.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);

                //CLEAR MARKER MESHES
                markergroupxz.clear();
                markergroupyz.clear();
                markergroupxy.clear();

                //CALCULATE MARKER SIZE
                let scaleX = Math.abs(boxselectModeendX - boxselectModestartX);
                let scaleZ = Math.abs(boxselectModeendZ - boxselectModestartZ);

                //GENERATE MARKER MESHES
                //RED
                if (showMarkerXZ) {
                    for (let x = 0; x <= scaleX; x++) {
                        for (let z = 0; z <= scaleZ; z++) {
                            const copytile = markerxz.clone(true);
                            markergroupxz.add(copytile);
                            copytile.position.set(x + Shared.cellSize / 2, 0, z + Shared.cellSize / 2);
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
                            if (wallModeSelect == MODEW || wallModeSelect == MODEA) {
                                if (x > 0 && x < scaleX + 1) todelete = true;
                            } else {
                                if (x > 0) continue;
                            }
                            for (let y = 0; y < Shared.wallHeight; y++) {
                                if (todelete) continue;
                                const copytile = markeryz.clone(true);
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
                            if (wallModeSelect == MODEW || wallModeSelect == MODEA) {
                                if (z > 0 && z < scaleZ + 1) todelete = true;
                            } else {
                                if (z > 0) continue;
                            }
                            for (let y = 0; y < Shared.wallHeight; y++) {
                                if (todelete) continue;
                                const copytile = markerxy.clone(true);
                                markergroupxy.add(copytile);
                                copytile.position.copy(markerxy.position);
                                copytile.position.x += x;
                                copytile.position.z += z;
                                copytile.position.y += y;
                            }
                        }
                    }
                }
            }
        }

        //KEEP TRACK OF LAST SELECTED CELL
        prevSelectX = selectX;
        prevSelectZ = selectZ;
        prevRot     = currentRot;
        prevWallModeSelect = wallModeSelect;

    } else {

        //NO CELL SELECTED, REINIT MARKER AND BBOX
        Shared.editorState.mouseIsDown = false;
        //reinit marker only when it was valid before and
        //it is not anymore
        if (prevSelectValid)
            reinitMarker();

    }

    prevSelectValid = selectValid;

}

function updateLightMarker(){
    if (selectValid){
        //UPDATE ONLY WHEN NEW CELL SELECTED
        if (
            (selectX != prevSelectX) ||
            (selectZ != prevSelectZ) ||
            Shared.editorState.hasClicked
        ) {
            Shared.editorState.hasClicked = false;
            lightMarkerGroup.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize), selectZ * Shared.cellSize);
        }
        //KEEP TRACK OF LAST SELECTED CELL
        prevSelectX = selectX;
        prevSelectZ = selectZ;
    } else {
        //NO CELL SELECTED
        Shared.editorState.mouseIsDown = false;
    }
    prevSelectValid = selectValid;
}

/*---------------------------------*/
// createScene
/*---------------------------------*/
function createScene() {

    //miniscene
    axesCamera.up = Shared.camera.up;
    axesCamera.position.set(0, 0, 5);
    axesScene.add(axesHelper);


    //helper grid

    grid = new THREE.GridHelper(Shared.gridSize, Shared.gridDivisions);
    grid.name = "GridHelper";
    Shared.scene.add(grid);
    //second helper grid to show the floor current height
    // gridtwo = new THREE.GridHelper(Shared.gridSize, Shared.gridDivisions,
    //     new THREE.Color(0,1,0), new THREE.Color(0,1,0)
    // );
    // gridtwo.name = "GridTwoHelper";
    // Shared.scene.add(gridtwo);
    // gridtwo.visible=false;
    //helper gizmo
    axes = new THREE.AxesHelper(3); // size
    axes.name = "AxesHelper";
    Shared.scene.add(axes);

    //raycast floor
    floor.rotation.x = -Math.PI / 2; // face up
    Shared.scene.add(floor);

    Shared.scene.add(lightGroup);
    Shared.scene.add(lightHelperGroup);

    Shared.scene.add(Shared.ambientLight);



    // Shared.scene.add(Shared.debugLines);

}

/*---------------------------------*/
// initializeScene
/*---------------------------------*/
function initializeScene() {

    //reset pause
    // Shared.editorState.pause = true;
    Shared.setPause(true);

    //clear all game actions
    Actions = {};

    //reset message
    GameHUD.setMessageScreen("");

}

/*---------------------------------*/
// resetLevel
/*---------------------------------*/
export function resetLevel() {
    //meshes removed from group loses ref and will be garbage collected
    //however they all share materials and geometry be careful about disposing them
    //check if they should persist after reset
    lightGroup.clear();
    lightHelperGroup.clear();
    deleteAllchunksInScene();
    undogroup = [];
    undogroups.length = 0;
    clearGridMap();
    clearAllGridMapChunks();
    clearAnimatedTextures();
    Shared.gridLight.clear();
    reinitMarker();
    // Shared.resetCamera();
    Shared.editorState.renderOneFrame = true;//simply update once the Shared.canvas


    const sceneGeometryDictArray = Array.from(Shared.sceneGeometryDict.entries());
    for (const i of sceneGeometryDictArray){
        let obj = i[1];
        obj.traverse((child) => {if (child.isMesh) child.geometry.dispose();})
    }
    Shared.sceneGeometryDict.clear();
}

/*---------------------------------*/
// clearGridMap
// clear nested maps
/*---------------------------------*/
function clearGridMap() {
    Shared.gridMap.XZ.clear();
    Shared.gridMap.YZ.clear();
    Shared.gridMap.XY.clear();
}

/*---------------------------------*/
// setAddMode
/*---------------------------------*/
function nextMode() { incMode(1);
}
function prevMode() { incMode(-1);
}
function incMode(inc){
    const  newMode = (((currentAddMode + inc) % NUMADDMODES) + NUMADDMODES) % NUMADDMODES;
    setAddMode(newMode);
}
export function setAddMode(mode) {
    console.log("setmode",mode);
    switch (mode) {
        case ADDPLANEMODE:
            currentAddMode = ADDPLANEMODE;
            markergroupxz.visible = showMarkerXZ;
            markergroupyz.visible = showMarkerYZ;
            markergroupxy.visible = showMarkerXY;
            lightMarkerGroup.visible=false;
            // lightMarkerHelper.visible=false;
            Shared.editorState.renderOneFrame = true;
            break;
        case ADDLIGHTMODE:
            // console.log("ADDLIGHTMODE");
            currentAddMode = ADDLIGHTMODE;
            setEraser(false);
            markergroupxz.visible = false;
            markergroupyz.visible = false;
            markergroupxy.visible = false;
            lightMarkerGroup.visible=true;
            // lightMarkerHelper.visible=true;
            Shared.editorState.renderOneFrame = true;
            break;
        case ADDRANDMODE:
            currentAddMode = ADDRANDMODE;
            setEraser(false);
            markergroupxz.visible = false;
            markergroupyz.visible = false;
            markergroupxy.visible = false;
            lightMarkerGroup.visible=false;
            // lightMarkerHelper.visible=true;
            Shared.editorState.renderOneFrame = true;
            break;
        // case ADDGAMEPMODE:
        //     currentAddMode = ADDGAMEPMODE;
        //     setEraser(false);
        //     markergroupxz.visible = false;
        //     markergroupyz.visible = false;
        //     markergroupxy.visible = false;
        //     lightMarkerGroup.visible=false;
        //     // lightMarkerHelper.visible=true;
        //     Shared.editorState.renderOneFrame = true;
        //     break;
    }
}

///LOAD SAVE

/*---------------------------------*/
// loadLevel
/*---------------------------------*/
export async function loadLevel() {
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

/*---------------------------------*/
// loadPlanesIntoScene
/*---------------------------------*/
let totalElements = 1;
let loadedElements = 0;
let loadingTile;
async function loadPlanesIntoScene(jsondata) {
    resetLevel();

    // eraserMode = false;

    totalElements = Object.values(jsondata)
        .flatMap(axis => Object.values(axis))
        .reduce((sum, arr) => sum + arr.length, 0);
    loadedElements = 0;

    if (totalElements == 0) return;//popup alert here. catch format error too

    // load the scene dictionary
    let geomdata;
    if ("GEOM" in jsondata) geomdata=jsondata["GEOM"];
    if (geomdata.length % Shared.uvmeshidHexWidth !== 0) {
        throw new Error(`geomdata length must be a multiple of ${Shared.uvmeshidHexWidth}.`);
    }
    for (let i = 0; i < geomdata.length; i += Shared.uvmeshidHexWidth) {
        const uvmeshid_ = geomdata.slice(i, i + Shared.uvmeshidHexWidth); // 5 hex nibbles (20 bits)
        const { rotid, uvid, meshid } = Shared.decodeID(uvmeshid_);
        //create the geometry for given uv+mesh and put it in the dict
        const newgeom = generateGeometry(rotid,uvid,meshid);
        Shared.sceneGeometryDict.set(uvmeshid_,newgeom);

        let uvname = Shared.atlasUVsArray[uvid][0]; // actual string key
        let isFirstFrame = uvname?.endsWith("_FRAME0");
        if (isFirstFrame) {
            const uvframes = generateAnimatedTextures(uvname,meshid);
            Shared.UVToUpdate.push({
                geomToUpdate: newgeom,
                uvs: uvframes,
                curidx: 0
            });
        }
    }
    const sceneGeometryDictArray = Array.from(Shared.sceneGeometryDict.entries());

    // load the bounding box
    const bb = {};
    for (const key of ["BBXZ", "BBYZ", "BBXY"]) {
        const c = jsondata[key];
        if (c) bb[key] = hexToBB(c);
    }

    const planetoorder = {
        XZ: ["y","z","x"],
        YZ: ["x","z","y"],
        XY: ["z","y","x"]
    };

    for (const dir of ["XZ", "YZ", "XY"]) {
        const _hstr = jsondata[dir];
        const _bb = bb["BB" + dir];
        const _order  = planetoorder[dir];
        if (!_hstr || !_bb) continue;
        loadFlattenedMap(_hstr,_bb,dir,sceneGeometryDictArray,_order);
    }


    rebuildDirtyChunks();

    return;

    await loadPlaneIntoScene(jsondata, "XZ", Shared.gridMapXZ, Shared.gridMapChunkXZ, markerxz);
    await loadPlaneIntoScene(jsondata, "YZ", Shared.gridMapYZ, Shared.gridMapChunkYZ, markeryz);
    await loadPlaneIntoScene(jsondata, "XY", Shared.gridMapXY, Shared.gridMapChunkXY, markerxy);
    await loadLightIntoScene(jsondata);

    updateLoadProgression(1);
    await new Promise(requestAnimationFrame);

    // updateTileCount();
    Shared.editorState.renderOneFrame = true;

}

/*---------------------------------*/
// loadPlaneIntoScene
/*---------------------------------*/
let updateInterval = 10;  // update every 2 planes
async function loadPlaneIntoScene(jsondata, label, grid, gridchunk, marker, group) {
    if (label in jsondata) {
        const jsonplanedata = jsondata[label];

        for (const geomName in jsonplanedata) {

            const planes = jsonplanedata[geomName];
            const tiletoclone = loadingTile;
            for (const data of planes) {

                const tile = tiletoclone.clone();
                tile.position.fromArray(data.position);
                tile.rotation.copy(marker.rotation);
                // setUVsByName(tile.geometry, geomName);
                placeTile(tile, grid, gridchunk, group);
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

/*---------------------------------*/
// loadLightIntoScene
/*---------------------------------*/
async function loadLightIntoScene(jsondata) {
    if ("LIGHTS" in jsondata) {
        const jsonlightsdata = jsondata["LIGHTS"];
        for (const lightname in jsonlightsdata) {

            let { light: lightToClone, helper: lightHelperToClone } =
                Shared.createLight(new THREE.Vector3(0, 0, 0), undefined, undefined, undefined, false);

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

/*---------------------------------*/
// updateLoadProgression
/*---------------------------------*/
function updateLoadProgression(ratio) {
    const percent = Math.floor(ratio * 100);
    Shared.LoadBtnTxt.textContent = `Loading... ${percent}%`;

    Shared.LoadBtnProgress.style.width = (ratio * 100) + '%';

    if (ratio >= 1) {
        // Wait 1 second then reset button
        setTimeout(() => {
            Shared.LoadBtnProgress.style.width = '0%';
            Shared.LoadBtnTxt.textContent = 'Load Planes (L)';
        }, 1000); // 1000ms = 1 second

    }
}

/*---------------------------------*/
// calculateBoundingBox
/*---------------------------------*/
export function calculateBoundingBox(gridMap) {
    const halfDiv = Math.ceil(Shared.gridDivisions / 2);

    let minX = halfDiv; // start at max possible index
    let minY = 0;       // assuming Y goes 0..gridDivisions
    let minZ = halfDiv;

    let maxX = -halfDiv; // start at min possible index
    let maxY = 0;
    let maxZ = -halfDiv;

    if (gridMap.size === 0) {
        minX = -halfDiv;  // start at max possible index
        minY = 0;        // assuming Y goes 0..gridDivisions
        minZ = -halfDiv;
        maxX = halfDiv;  // start at min possible index
        maxY = Shared.CEILINGHEIGHTMAX;
        maxZ = halfDiv;
    }

    for (const key of gridMap.keys()) {
        const { x, y, z } = Shared.parseGridKey(key);

        // clamp to grid helper boundaries
        const cx = Math.max(-halfDiv, Math.min(halfDiv, x));
        const cy = Math.max(0, Math.min(Shared.CEILINGHEIGHTMAX, y));
        const cz = Math.max(-halfDiv, Math.min(halfDiv, z));

        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        minZ = Math.min(minZ, cz);

        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);
        maxZ = Math.max(maxZ, cz);
    }

    return {
        min: { x: minX, y: minY, z: minZ },
        max: { x: maxX, y: maxY, z: maxZ },
    };

}

/*---------------------------------*/
// bbToHex using two's complement
/*---------------------------------*/
function bbToHex(bb) {
    const { min, max } = bb;

    // encode a signed 8-bit integer into 2-digit hex
    const toHex = (v) => {
        if (v < -128 || v > 127) {
            throw new RangeError(`Value ${v} is out of range for signed 8-bit integer (-128..127)`);
        }
        // force into range -128..255 and wrap with two's complement
        let n = (v & 0xFF); 
        return n.toString(16).padStart(2, '0');
    };

    return [
        toHex(min.x), toHex(min.y), toHex(min.z),
        toHex(max.x), toHex(max.y), toHex(max.z)
    ].join('');
}

/*---------------------------------*/
// hexToBB
/*---------------------------------*/
function hexToBB(hex) {
    if (hex.length < 12) {
        throw new Error("Hex string too short: need 12 chars for min+max (x,y,z)");
    }

    // helper: parse 2-digit hex into signed int8
    const toSigned = (h) => {
        const n = parseInt(h, 16);
        return n > 127 ? n - 256 : n; // convert to signed 8-bit
    };

    return {
        min: {
            x: toSigned(hex.slice(0, 2)),
            y: toSigned(hex.slice(2, 4)),
            z: toSigned(hex.slice(4, 6)),
        },
        max: {
            x: toSigned(hex.slice(6, 8)),
            y: toSigned(hex.slice(8, 10)),
            z: toSigned(hex.slice(10, 12)),
        }
    };
}

/*---------------------------------*/
// flattenGridMap
/*---------------------------------*/
function flattenGridMap(thisGridMap, bbox, order) {
    const { min, max } = bbox;
    const result = [];

    if (thisGridMap.size === 0) return result;

    const [a, b, c] = order; // axis order (e.g. ["x","z","y"])

    for (let ai = min[a]; ai <= max[a]; ai++) {
        for (let bi = min[b]; bi <= max[b]; bi++) {
            for (let ci = min[c]; ci <= max[c]; ci++) {
                const coords = { x: 0, y: 0, z: 0 };
                coords[a] = ai;
                coords[b] = bi;
                coords[c] = ci;
                const key = Shared.getGridKey(coords.x, coords.y, coords.z);

                const cell = thisGridMap.get(key);

                if (cell) {
                    const cellData = [];
                    for (const uvmeshid of Object.values(cell)) {
                        const index = sceneGeometryDictID[uvmeshid];
                        cellData.push(index);
                    }
                    result.push(cellData);
                } else {
                    result.push(null); // empty cell
                }
            }
        }
    }

    return result;
}

/*---------------------------------*/
// Specific orientations
/*---------------------------------*/
export function flattenXZGridMap(thisGridMap, bbox) {
    return flattenGridMap(thisGridMap, bbox, ["y", "z", "x"]);
}

export function flattenYZGridMap(thisGridMap, bbox) {
    return flattenGridMap(thisGridMap, bbox, ["x", "z", "y"]);
}

export function flattenXYGridMap(thisGridMap, bbox) {
    return flattenGridMap(thisGridMap, bbox, ["z", "y", "x"]);
}


/*---------------------------------*/
// compressFlattenedGrid
/*---------------------------------*/
export function compressFlattenedGrid(flatArray) {
    if (!flatArray || flatArray.length === 0) return "";

    const result = [];
    let lastCell = null;
    let count = 0;

    const stringifyCell = (cell) => {
        if (!cell || cell.length === 0) {
            // 0 means null/empty cell
            return (0).toString(16).padStart(sceneGeometryHexWidth, "0");
        }

        let str = "";
        for (let i = 0; i < cell.length; i++) {
            const encoded = parseInt(cell[i],16);

            // extract geometry ID only
            let geomId = encoded & (sceneGeometryMax - 1);

            // if this is the last element of the cell, set MSB
            if (i === cell.length - 1) {
                geomId |= (1 << sceneGeometryBitWidth);
            }

            // append geometry ID as hex
            str += geomId.toString(16).padStart(sceneGeometryHexWidth, "0");
        }
        return str;
    };

    for (let i = 0; i <= flatArray.length; i++) {
        const cell = flatArray[i] || null; // include final iteration
        const cellStr = stringifyCell(cell);

        if (cellStr === lastCell && count < (repeatCountMax-1)) {
            count++;
        } else {
            if (count >= repeatCountMax){
                console.log("repeatcountmax");
            }
            if (lastCell !== null) {
                // push previous cell with repeat count
                result.push(
                    `${lastCell}${count.toString(16).padStart(repeatCountHexWidth, "0")}`
                );
            }
            lastCell = cellStr;
            count = 1;
        }
    }

    return result.join("");
}


/*---------------------------------*/
// saveLevel
/*---------------------------------*/
let sceneGeometryDictID = {};
const sceneGeometryBitWidth = 11;//2^11=2000 possible geometries, reserve one bit at the top to indicate "last" cell entry
const sceneGeometryHexWidth = Math.ceil(sceneGeometryBitWidth/4);//2^11=2000 possible geometries, reserve one bit at the top to indicate "last" cell entry
const sceneGeometryMax = 1<<sceneGeometryBitWidth;
// const repeatCountMax = 256;
const repeatCountMax = 256;
const repeatCountHexWidth = Math.log2(repeatCountMax)/4;
export function saveLevel() {

    //0) build a uvmeshid->idx dict for fast lookup
    if (Shared.sceneGeometryDict.size > 256){
        console.error("sceneGeometryDict has more than 256 entries!");
        return;
    }
    sceneGeometryDictID = {};
    let idx = 1;//0 is reserved to null object
    for (const key of Shared.sceneGeometryDict.keys()) {
        if (idx >= sceneGeometryMax) {
            throw new RangeError("sceneGeometryDict has more than 255 entries (2-hex limit exceeded)");
        }
        sceneGeometryDictID[key] = idx.toString(16).padStart(sceneGeometryHexWidth, "0");//3 hex, 11 bits, 2k possible
        idx++;
    }
    // store the sceneGeometryDict
    const keys = Array.from(Shared.sceneGeometryDict.keys());
    // concatenate into one long hex string
    const hexString = keys.join("");
    //TODO: convert to bytes then to base64?

    //1) calculate bounding box
    const bbxz = calculateBoundingBox(gridMap.XZ);
    const bbyz = calculateBoundingBox(gridMap.YZ);
    const bbxy = calculateBoundingBox(gridMap.XY);

    const gridMapXZflattened = flattenXZGridMap(gridMap.XZ,bbxz);
    const gridMapYZflattened = flattenYZGridMap(gridMap.YZ,bbyz);
    const gridMapXYflattened = flattenXYGridMap(gridMap.XY,bbxy);

    const mergedData = {};
    const gridMapXZcompressed = compressFlattenedGrid(gridMapXZflattened);
    const gridMapYZcompressed = compressFlattenedGrid(gridMapYZflattened);
    const gridMapXYcompressed = compressFlattenedGrid(gridMapXYflattened);

    mergedData["GEOM"] = hexString;
    mergedData["BBXZ"] = bbToHex(bbxz);
    mergedData["BBYZ"] = bbToHex(bbyz);
    mergedData["BBXY"] = bbToHex(bbxy);
    if (gridMapXZcompressed) mergedData["XZ"] = gridMapXZcompressed;
    if (gridMapYZcompressed) mergedData["YZ"] = gridMapYZcompressed;
    if (gridMapXYcompressed) mergedData["XY"] = gridMapXYcompressed;
    // let json = JSON.stringify(mergedData);
    let json = JSON.stringify(mergedData, null, 2);

    console.log(json);
    downloadJson(json, "grouped_planes.json");

}

/*---------------------------------*/
// groupLights
/*---------------------------------*/
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
            });
        }
    })
    return grouped;
}

/*---------------------------------*/
// saveFile helper
/*---------------------------------*/
async function saveFile(blob, suggestedName, mimeType) {
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: mimeType,
                        accept: { [mimeType]: [`.${suggestedName.split('.').pop()}`] }
                    }
                ]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            console.warn("Save cancelled or failed:", err);
            return; // don’t fallback if the user cancels
        }
    }

    // Fallback for browsers without FS API
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = suggestedName;
    link.click();
    URL.revokeObjectURL(url);
}

/*---------------------------------*/
// downloadJson (refactored)
/*---------------------------------*/
async function downloadJson(data, filename = "data.json") {
    const blob = new Blob([data], { type: "application/json" });
    await saveFile(blob, filename, "application/json");
}


function generateDefaultGeometry(){
    return generateGeometry(0,0,0);
}

/*---------------------------------*/
// generateUV
/*---------------------------------*/

function generateUV(uv,uvid){
    const xt = (Shared.atlasUVsArray[uvid][1]?.x || 0);
    const yt = (Shared.atlasUVsArray[uvid][1]?.y || 0);    
    const offsetX = xt * Shared.uvInfo.uvscalex;
    const offsetY = yt * Shared.uvInfo.uvscaley;
    for (let i = 0; i < uv.count; i++) {
        let x = uv.getX(i);
        let y = uv.getY(i);
        // Scale down to tile size
        //important, x should be initialized before
        //ie the same geometry cannot go twice through this same function
        x = x * Shared.uvInfo.uvscalex;
        y = y * Shared.uvInfo.uvscaley;
        // Offset to desired tile
        x += offsetX;
        y += offsetY;
        uv.setXY(i, x, y);
        uv.name = uvid;
    }
    uv.needsUpdate = true;
    return uv;    
}

/*---------------------------------*/
// generateGeometry
/*---------------------------------*/

function generateGeometry(rotid,uvid,meshid) {
    // Clone the parent object (deep clone)
    const parent = Shared.atlasMeshArray[meshid][1].MESH.clone(true);

    // Traverse all children in the hierarchy and scale/offset their UV to the desired atlas location
    parent.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.attributes.uv) {
            // Clone the geometry so each mesh has independent UVs
            child.geometry = child.geometry.clone();

            // Clone the UV attribute
            const geomuv = child.geometry.attributes.uv.clone();

            // Generate your modified UVs
            const uv = generateUV(geomuv, uvid);

            // Assign back and flag for update
            child.geometry.setAttribute('uv', uv);
            child.geometry.attributes.uv.needsUpdate = true;
        }
    });

    const newmeshname = Shared.atlasMeshArray[meshid][0];
    const newuvname = Shared.atlasUVsArray[uvid][0];
    const newuvmeshid = Shared.encodeID(uvid,meshid,rotid);
    parent.userData = {
        uvname: newuvname,
        meshname: newmeshname,
        uvmeshid: newuvmeshid
    };

    return parent;
}

/*---------------------------------*/
// indexToCoords
/*---------------------------------*/
// Helper: convert flat index to 3D coordinates
// order is an array like ["x", "z", "y"] (raster order)
function indexToCoords(flatIndex, sizeX, sizeY, sizeZ, order, bb) {
    const sizes = { x: sizeX, y: sizeY, z: sizeZ };
    const coords = { x: 0, y: 0, z: 0 };

    // Compute strides
    const stride0 = sizes[order[1]] * sizes[order[2]]; // how many to skip when order[0] increments
    const stride1 = sizes[order[2]];                   // how many to skip when order[1] increments

    // Flatten index expansion
    const i0 = Math.floor(flatIndex / stride0);
    const i1 = Math.floor((flatIndex % stride0) / stride1);
    const i2 = flatIndex % stride1;

    coords[order[0]] = i0 + bb.min[order[0]];
    coords[order[1]] = i1 + bb.min[order[1]];
    coords[order[2]] = i2 + bb.min[order[2]];

    return coords;
}

/*---------------------------------*/
// loadFlattenedMap
// Generic loader
/*---------------------------------*/
function loadFlattenedMap(hstr, bb, direction, sceneGeometryDictArray, order = ["x", "z", "y"]) {
    
    const sizeX = bb.max.x - bb.min.x + 1;
    const sizeY = bb.max.y - bb.min.y + 1;
    const sizeZ = bb.max.z - bb.min.z + 1;

    let flatIndex = 0; // linear index across all tiles
    let geomArray = [];
    let p = 0;

    while (p < hstr.length) {
        const encoded = parseInt(hstr.slice(p, p + sceneGeometryHexWidth), 16);
        p += sceneGeometryHexWidth;

        const last = (encoded >> sceneGeometryBitWidth) & 1; // MSB (bit 12)
        const geomIdx = encoded & (sceneGeometryMax - 1);

        if (geomIdx !== 0) {
            const geom = sceneGeometryDictArray[geomIdx - 1][1]; // geomidx-1 because 0 is reserved
            geomArray.push({meshname : geom.userData.meshname, uvmeshid: geom.userData.uvmeshid });
            if (!last) continue;
        }

        const count = parseInt(hstr.slice(p, p + repeatCountHexWidth), 16);
        p += repeatCountHexWidth;

        if (geomIdx === 0) {
            flatIndex += count; // skip empty cells
            continue;
        }

        for (let c = 0; c < count; c++, flatIndex++) {
            const coords = indexToCoords(flatIndex, sizeX, sizeY, sizeZ, order, bb);

            geomArray.forEach(geom => {

                let wx = coords.x * Shared.cellSize;// + offset.x;
                let wy = coords.y * Shared.cellSize;// + offset.y;
                let wz = coords.z * Shared.cellSize;// + offset.z;
                
                placeTile(wx,wy,wz,direction,geom.uvmeshid,false,false);
            });
        }
        geomArray = [];
    }
}

/*---------------------------------*/
// setWallHeight
/*---------------------------------*/
export function prevWallHeight(){
    incWallHeight(-1);
}
export function nextWallHeight(){
    incWallHeight(1);
}
export function incWallHeight(inc){
    const min = Shared.WALLHEIGHTMIN;
    const max = Shared.WALLHEIGHTMAX;

    let newHeight = Shared.wallHeight + inc;
    newHeight = Math.max(min, Math.min(max, newHeight));
    setWallHeight(newHeight);
}
export function setWallHeight(height){
    Shared.setWallHeight(height);
    reinitMarker();
    Shared.editorState.renderOneFrame = true;
}

/*---------------------------------*/
// setFloorHeight
/*---------------------------------*/
export function prevFloorHeight(){
    incFloorHeight(-1);
}
export function nextFloorHeight(){
    incFloorHeight(1);
}
export function incFloorHeight(inc){
    const min = Shared.FLOORHEIGHTMIN;
    const max = Shared.FLOORHEIGHTMAX;

    let newHeight = Shared.floorHeight + inc;
    newHeight = Math.max(min, Math.min(max, newHeight));
    setFloorHeight(newHeight);
}
export function setFloorHeight(height){
    Shared.setFloorHeight(height);

    switch (currentAddMode) {
        case ADDPLANEMODE: reinitMarker(); break;
        case ADDLIGHTMODE: lightMarkerGroup.position.set(selectX, Shared.floorHeight, selectZ); break;
    }

    // if (height != Shared.FLOORHEIGHTDEFAULT){
    //     // gridtwo.visible = true;
    //     gridtwo.position.y = height;
    // } else {
    //     gridtwo.visible = false;
    // }


    Shared.editorState.renderOneFrame = true;
}

function toggleGameMode() {
    setEraser(false);
    Shared.toggleGameMode();
}

function undo() {
    // console.log("UNDO");
    if (undogroups.length > 0) {
        const thisundogroup = undogroups.pop();
        for (const u of thisundogroup) {
            placeTile(u.wx,u.wy,u.wz,u.direction,u.uvmeshid,u.erase,false);
        }
    }
}


function enqueueundo(undoarray){
    undogroups.push(undoarray);
    if (undogroups.length > Shared.MAXUNDOACTIONS) undogroups.shift();//clear oldest entry
}


const chunkpos = new THREE.Vector3();
const chunkmatrix = new THREE.Matrix4();

function rebuildDirtyChunks() {
    for (const [chunkKey, chunk] of gridMapChunk.entries()) {
        if (!chunk.dirty) continue;

        // remove old mesh if exists
        deleteChunkInScene(chunkKey);

        const tileGeometries    = [];
        const facetotilerange   = [];
        let   faceOffset        = 0;
        const spriteMeshes      = [];
        const actionnableMeshes = [];

        for (const direction of ["XZ", "YZ", "XY"]) {
            const chunkslice = chunk[direction];

            for (const [tilexyz, tilemeshes] of chunkslice.entries()) {
                const { x, y, z } = Shared.parseGridKey(tilexyz);

                for (const [meshname,uvmeshid] of Object.entries(tilemeshes)) {

                    const { rotid, uvid, meshid } = Shared.decodeID(uvmeshid);
                    const uvmeshidrot0 = uvmeshid; //TEMP: find a way to optimize this, ie only register
                    //unique geometries independently from rotation. pb is that this breaks save/load at the moment 

                    let sharedgeom;
                    let newgeom;
                    //clone from cache if 
                    if (Shared.sceneGeometryDict.has(uvmeshidrot0)) {
                        sharedgeom = Shared.sceneGeometryDict.get(uvmeshidrot0);
                    } else {
                        sharedgeom = generateGeometry(0, uvid, meshid);
                        Shared.sceneGeometryDict.set(uvmeshidrot0, sharedgeom);

                        // check anim
                        let uvname = Shared.atlasUVsArray[uvid][0]; // actual string key
                        let isFirstFrame = uvname?.endsWith("_FRAME0");
                        if (isFirstFrame) {
                            const uvframes = generateAnimatedTextures(uvname,meshid);

                            Shared.UVToUpdate.push({
                                geomToUpdate: sharedgeom,
                                uvs: uvframes,
                                curidx: 0
                            });
                        }

                    }

                    const { rot, pos: offset } = RotOffsetPerSlice(direction,rotid);
                    chunkpos.set(
                        offset.x + Shared.cellSize * x,
                        offset.y + Shared.cellSize * y,
                        offset.z + Shared.cellSize * z
                    );


                    if (meshname.startsWith("SPRITE")){
                        // const spriteMesh = new THREE.Mesh(sharedgeom, Shared.atlasMatTransp);
                        const spriteMesh = sharedgeom.clone(true);
                        spriteMesh.traverse((child) => {if (child.isMesh) child.material = Shared.atlasMatTransp;});
                        // spriteMesh.rotation.copy(rot);
                        spriteMesh.position.copy(chunkpos);
                        spriteMesh.setRotationFromMatrix(rot);
                        const info = {direction,tilexyz,uvmeshid};
                        spriteMesh.userData = {type:"sprite",info};
                        spriteMeshes.push(spriteMesh);
                    } else if (
                        meshname.startsWith("DOOR") ||
                        meshname.startsWith("ITEM") ||
                        meshname.startsWith("CHEST")
                    ){
                        // const actionnableMesh = new THREE.Mesh(sharedgeom, Shared.atlasMat);
                        const actionnableMesh = sharedgeom.clone(true);
                        actionnableMesh.traverse((child) => {if (child.isMesh) child.material = Shared.atlasMat;});
                        // if (meshname.startsWith("DOOR")){
                        //     //TOFIX!!
                        //     const thischild = Shared.atlasMeshArray[meshid][1]?.children[0]?.clone();
                        //     actionnableMesh.add(thischild);
                        // }
                        // spriteMesh.rotation.copy(rot);
                        actionnableMesh.position.copy(chunkpos);
                        actionnableMesh.setRotationFromMatrix(rot);
                        const info = {direction,tilexyz,uvmeshid};
                        //add function pointer in userdata
                        // actionnableMesh.userData = {type:"actionnable",info,action:Shared.doSomething};
                        if (meshname.startsWith("DOOR")){
                            actionnableMesh.traverse((child) => {child.userData = {type:"actionnable",info,action:Shared.openDoor};});
                            // actionnableMesh.userData = {type:"actionnable",info,action:Shared.openDoor};
                        }else if (meshname.startsWith("ITEM")){
                            actionnableMesh.traverse((child) => {child.userData = {type:"actionnable",info,action:Shared.takeItem};});
                            // actionnableMesh.userData = {type:"actionnable",info,action:Shared.takeItem};
                        }else if (meshname.startsWith("CHEST")){
                            actionnableMesh.traverse((child) => {child.userData = {type:"actionnable",info,action:Shared.openChest};});
                            // actionnableMesh.userData = {type:"actionnable",info,action:Shared.takeItem};
                        }
                        actionnableMesh.name = meshname;
                        actionnableMeshes.push(actionnableMesh);                        
                    } else {
                        // we are going to transform the geometry to chunk it together
                        //so clone it from sharedgeom to be safe
                        //verify here that its only one mesh with no child!!

                        // newgeom=sharedgeom.clone(true);
                        // chunkmatrix.copy(rot).setPosition(chunkpos);
                        // newgeom.applyMatrix4(chunkmatrix);
                        if (!(sharedgeom.isMesh && sharedgeom.children.length === 0)) {
                            console.error("sharedgeom is not a single mesh or has children!");
                        } else {
                            // Safe to clone and apply matrix
                            newgeom = sharedgeom.geometry.clone();
                            chunkmatrix.copy(rot).setPosition(chunkpos);
                            newgeom.applyMatrix4(chunkmatrix);
                        }



                        // how many triangles does this tile contribute?
                        const triCount = newgeom.index
                            ? newgeom.index.count / 3
                            : newgeom.attributes.position.count / 3;

                        let start=faceOffset;
                        let end=faceOffset+triCount-1;
                        const info = {direction,tilexyz,uvmeshid};
                        facetotilerange.push({start,end,info});

                        faceOffset += triCount;

                        tileGeometries.push(newgeom);
                    }


                    // 1️⃣ Retrieve collider template
                    const def = Shared.atlasMesh[meshname].COLLIDER;
                    // def = { halfExtents: Vector3, localOffset: Vector3, localRotation: Quaternion? }

                    if (!def) {
                        console.log("warning: ", meshname, "has no collider defined.");
                    } else {


                        // 2️⃣ Use existing chunk/world transform
                        const worldPos = chunkpos;      // THREE.Vector3
                        const worldQuat = new THREE.Quaternion();
                        rot.decompose(new THREE.Vector3(), worldQuat, new THREE.Vector3());

                        // 3️⃣ Compute the collider world position by applying the local offset
                        const offsetWorld = def.localOffset.clone().applyQuaternion(worldQuat);
                        const colliderWorldPos = worldPos.clone().add(offsetWorld);

                        // 4️⃣ Combine rotations if the collider has a local rotation (optional)
                        let colliderWorldQuat = worldQuat.clone();
                        if (def.localRotation) {
                            colliderWorldQuat.multiply(def.localRotation);
                        }

                        // 5️⃣ Create the Rapier collider
                        const colliderDesc = RAPIER.ColliderDesc.cuboid(
                            def.halfExtents.x,
                            def.halfExtents.y,
                            def.halfExtents.z
                        )
                            .setTranslation(colliderWorldPos.x, colliderWorldPos.y, colliderWorldPos.z)
                            .setRotation(colliderWorldQuat);

                        // 6️⃣ Create a fixed rigid body and attach collider
                        // const body = Shared.physWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed());
                        const collider = Shared.physWorld.createCollider(colliderDesc, Shared.mainRigidBody);

                        // body.userData = { name: "ChunkBody"+tilexyz};
                        collider.userData = { name: "Collider"+tilexyz};

                        Shared.colliderNameMap.set(collider, meshname+"("+tilexyz+")");
                        if (!Shared.colliderInScene[chunkKey]) Shared.colliderInScene[chunkKey] = [];
                        Shared.colliderInScene[chunkKey].push(collider);

                    }
                
                }







                // cleanup: remove empty tiles
                if (Object.keys(tilemeshes).length === 0) {
                    chunkslice.delete(tilexyz);
                    // gridMap[direction].delete(tilexyz);
                }
            }
        }

        if (tileGeometries.length > 0) {
            // const bakedGeometry = mergeBufferGeometries(tileGeometries, false);
            const bakedGeometry = mergeGeometries(tileGeometries, false);
            for (const geom of tileGeometries) geom.dispose();//we dont need these anymore after chunking

            bakedGeometry.name = "ChunkGeometry_"+chunkKey;
            const bakedMesh = new THREE.Mesh(bakedGeometry, Shared.atlasMat);

            bakedMesh.userData = {type: "mesh", facetotilerange : facetotilerange}; //store mapping
            Shared.chunksInScene[chunkKey] = bakedMesh;
            bakedMesh.name = "Chunk_"+chunkKey;
            Shared.chunksGroup.add(bakedMesh);
        }
        for (const spriteMesh of spriteMeshes){
            if (!Shared.spritesInScene[chunkKey]) Shared.spritesInScene[chunkKey] = [];
            Shared.spritesInScene[chunkKey].push(spriteMesh);
            spriteMesh.name = "Sprite_"+Shared.spritesInScene[chunkKey].length.toString()+"_"+spriteMesh.userData.uvmeshid;
            Shared.chunksGroup.add(spriteMesh);
        }
        for (const actionnableMesh of actionnableMeshes){
            if (!Shared.actionnablesInScene[chunkKey]) Shared.actionnablesInScene[chunkKey] = [];
            Shared.actionnablesInScene[chunkKey].push(actionnableMesh);
            // actionnableMesh.name = "Actionnable_"+Shared.actionnablesInScene[chunkKey].length.toString()+"_"+actionnableMesh.userData.uvmeshid;
            Shared.chunksGroup.add(actionnableMesh);
        }


        chunk.dirty = false;
    }
}

function deleteChunkInScene(chunkKey){
    if (chunkKey in Shared.chunksInScene) {
        Shared.chunksGroup.remove(Shared.chunksInScene[chunkKey]);
        Shared.chunksInScene[chunkKey].geometry.dispose();
        delete Shared.chunksInScene[chunkKey];
    }
    if (chunkKey in Shared.spritesInScene) {
        for (const spriteMesh of Shared.spritesInScene[chunkKey]){
            Shared.chunksGroup.remove(spriteMesh);
        }
        //do not call geometry.dispose here as the spritemeshes share them
        delete Shared.spritesInScene[chunkKey];
    }   
    if (chunkKey in Shared.actionnablesInScene) {
        for (const actionnableMesh of Shared.actionnablesInScene[chunkKey]){
            Shared.chunksGroup.remove(actionnableMesh);
        }
        //do not call geometry.dispose here as the actionnableMeshes share them
        delete Shared.actionnablesInScene[chunkKey];
    }
    if (chunkKey in Shared.colliderInScene) {
        for (const collider of Shared.colliderInScene[chunkKey]) {
            // const bodyHandle = collider.parent();
            // if (bodyHandle) {
            //     const body = Shared.physWorld.getRigidBody(bodyHandle);
            //     if (body) {
            //         Shared.physWorld.removeRigidBody(body); // removes collider(s) too
            //     }
            // } else {
            //     // fallback if collider has no body
            //     Shared.physWorld.removeCollider(collider, true);
            // }
            Shared.physWorld.removeCollider(collider, true);
            Shared.colliderNameMap.delete(collider);
        }
        delete Shared.colliderInScene[chunkKey];
    }
}

function deleteAllchunksInScene(){
    for (const chunkKey of gridMapChunk.keys()) {
        deleteChunkInScene(chunkKey);
    }
}

function clearGridMapChunk(chunkKey) {
    const chunkMap = gridMapChunk.get(chunkKey);
    if (chunkMap){
        chunkMap.XZ.clear(); 
        chunkMap.YZ.clear(); 
        chunkMap.XY.clear(); 
    }
    gridMapChunk.delete(chunkKey);
}

function clearAllGridMapChunks(){
    for (const chunkKey of gridMapChunk.keys()) {
        clearGridMapChunk(chunkKey);
    }
    gridMapChunk.clear();
}

export function randLevel(){
    console.log("randLevel");
    resetLevel();

    const seedValue = parseInt(document.getElementById("SeedField").value, 10);
    Shared.setSeed(seedValue);
    buildMaze();

    rebuildDirtyChunks();
} 

function getUvMeshId(uvname,meshname){
    const uvid = Shared.atlasUVsidx[uvname];
    const meshid = Shared.atlasMeshidx[meshname];
    return Shared.encodeID(uvid,meshid);
}

function buildMaze() {

    // const wooduvmeshid = getUvMeshId("FLOORBOARD", "PLANE");
    // const walluvmeshid = getUvMeshId("WALL", "PLANE");
    const { rotid, uvid, meshid } = Shared.decodeID(mazeWallUvMeshId);
    const matname = Shared.atlasUVsArray[uvid][0];
    const pillaruvmeshid = getUvMeshId(matname, "ARCHBASE");
    
    const sidel = parseInt(document.getElementById("MazeSize").value, 10);
    const minX = -sidel, maxX = sidel;
    const minZ = -sidel, maxZ = sidel;
    const minY = 0, maxY = parseInt(document.getElementById("MazeHeight").value, 10);
    const minCorrLength = Math.max(2,parseInt(document.getElementById("MazeSecLMin").value, 10));
    const maxCorrLength = Math.max(minCorrLength,parseInt(document.getElementById("MazeSecLMax").value, 10));
    const branchProba = parseInt(document.getElementById("MazeBranchProba").value, 10)/100;

    const mazeGridMap = new Map(); // key → "floor" | "wall"

    function isFloor(x,z){
        const k = Shared.getGridKey(x, 0, z);
        let cell = mazeGridMap.get(k)
        return cell?.floor || false;
    }

    function isOpenedRoom(x,z){
        const k = Shared.getGridKey(x, 0, z);
        let cell = mazeGridMap.get(k)
        if (cell?.room){
            if (cell.roomid){
                if (roomHasDoor[cell.roomid]){
                    return true;
                } else {
                    roomHasDoor[cell.roomid]=true;
                    return false;
                }
            }
        }
        return true;
    }

    function placeFloor(x,z){
        mark(x,0,z,"floor",true);
    }

    function placeWall(x, z, dir) {
        // for (let y = 0; y <= maxY; y++) {
        mark(x, 0, z, dir, true);
        // }
    }
    function placeWallIfNoAdjacentFloor(x, z, dir) {
        switch (dir) {
            case "north": if (!isFloor(x,z-1)) placeWall(x,z,"north"); break;
            case "south": if (!isFloor(x,z+1)) placeWall(x,z,"south"); break;
            case "west" : if (!isFloor(x-1,z)) placeWall(x,z,"west"); break;
            case "east" : if (!isFloor(x+1,z)) placeWall(x,z,"east"); break;
        }
    }

    function canBePlaced(x,z){
        // boundary?
        return (!(x < minX || x > maxX || z < minZ || z > maxZ || 
            // corridor already exists?
                isFloor(x,z)));
    }

    function mark(x, y, z, key,value) {
        const k = Shared.getGridKey(x, y, z);
        let cell = mazeGridMap.get(k)
        if (!cell) {
            cell = {
                "floor": false,
                "north": false,
                "south": false,
                "west": false,
                "east": false,
            };
        }
        cell[key]=value;
        mazeGridMap.set(k,cell);
    }

    function dirToDelta(dir) {
        switch (dir) {
            case "north": return [0, -1];
            case "south": return [0, 1];
            case "west":  return [-1, 0];
            case "east":  return [1, 0];
        }
    }

    const OPPOSITE = { north: "south", south: "north", east: "west", west: "east" };

    function carveStep(x, z, dir) {

        const length = Shared.getRandomInt(minCorrLength, maxCorrLength);
        const [dx, dz] = dirToDelta(dir);

        let currx = x, currz = z;
        // let nextx,nextz;
        for (let step = 0; step < length; step++) {
            currx = x + dx * step;
            currz = z + dz * step;

            placeFloor(currx, currz);

            const nextx = x + dx * (step + 1);
            const nextz = z + dz * (step + 1);

            if (canBePlaced(nextx, nextz) && step<length-1) {

                switch (dir) {
                    case "north":
                    case "south":
                        placeWallIfNoAdjacentFloor(currx, currz, "west");
                        placeWallIfNoAdjacentFloor(currx, currz, "east");
                        break;
                    case "west":
                    case "east":
                        placeWallIfNoAdjacentFloor(currx, currz, "north");
                        placeWallIfNoAdjacentFloor(currx, currz, "south");
                        break;
                }

            } else {
                break;
            }
        }
        // x=currx;
        // z=currz;

        // intersection expansion
        const validDirs = [];
        const stuckDirs = [];
        const shuffled = shuffle(["north", "south", "west", "east"]);

        // first, collect all valid directions ignoring branchChance
        for (const newdir of shuffled) {
            if (newdir === OPPOSITE[dir]) continue;
            const [dx, dz] = dirToDelta(newdir);
            const nx = currx + dx, nz = currz + dz;

            if (canBePlaced(nx, nz)) {
                validDirs.push({ x: nx, z: nz, dir: newdir });
            } else {
                stuckDirs.push(newdir);
            }
        }

        // then apply branchChance only if more than one valid branch
        const newBranches = [];
        if (validDirs.length === 0) {
            // nothing to branch, all directions stuck
        } else if (validDirs.length === 1) {
            // only one option → always keep it
            newBranches.push(validDirs[0]);
        } else {
            // multiple options → apply branchChance but guarantee at least one survives
            const guaranteed = validDirs[Shared.getRandomInt(0, validDirs.length - 1)];
            newBranches.push(guaranteed); // always keep one

            for (const branch of validDirs) {
                if (branch === guaranteed) continue; // skip the guaranteed one
                if (Shared.branchChance(branchProba)) newBranches.push(branch);
                else stuckDirs.push(branch.dir);
            }
        }

        for (const stuck of stuckDirs) placeWallIfNoAdjacentFloor(currx, currz, stuck);
        // for (const stuck of stuckDirs) placeWall(x,z,stuckdir);
        return newBranches;
        // for (const {newdir,nx,nz} of newdirections) {
        //     carve(nx,nz,newdir)
        // }
    }

    //place a couple rooms
    const numrooms = 3;
    const roomHasDoor = [];
    const sizeroomx = 8;
    const sizeroomz = 8;
    for (let r = 0; r < numrooms; r++) {
        roomHasDoor.push(false);
        const brx = Shared.getRandomInt(minX, maxX);
        const brz = Shared.getRandomInt(minZ, maxZ);
        const tlx = brx + Shared.getRandomInt(2, sizeroomx);
        const tlz = brz + Shared.getRandomInt(2, sizeroomz);
        for (let x = brx; x < tlx; x++) {
            for (let z = brz; z < tlz; z++) {
                // placeFloor(x, z);
                mark(x,0,z,"floor",true);
                mark(x,0,z,"room",true);
                mark(x,0,z,"roomid",roomHasDoor.length-1);
            }
        }
    }
    //add walls around rooms
    for (const [key, cell] of mazeGridMap.entries()) {
        const { x, y, z } = Shared.parseGridKey(key);
        const { floor, north, south, west, east, room } = cell;
        if (floor){
            const fnorth = mazeGridMap.has(Shared.getGridKey(x,y,z-1));
            const fsouth = mazeGridMap.has(Shared.getGridKey(x,y,z+1));
            const feast  = mazeGridMap.has(Shared.getGridKey(x+1,y,z));
            const fwest  = mazeGridMap.has(Shared.getGridKey(x-1,y,z));
            if (!fnorth) placeWall(x,z,"north");
            if (!fsouth) placeWall(x,z,"south");
            if (!feast) placeWall(x,z,"east");
            if (!fwest) placeWall(x,z,"west");
        }
    }

    //create maze around rooms
    const frontier = [{ x: 0, z: 0, dir: "north" }];
    while (frontier.length > 0) {
        // pick random frontier branch
        const idx = Shared.getRandomInt(0, frontier.length - 1);
        const { x, z, dir } = frontier.splice(idx, 1)[0];
        const newBranches = carveStep(x, z, dir);
        frontier.push(...newBranches);
    }

    //leave at least one entry to each room
    for (const [key, cell] of mazeGridMap.entries()) {
        const { x, y, z } = Shared.parseGridKey(key);
        const { floor, north, south, west, east, room, roomid } = cell;
        if (room && !roomHasDoor[roomid] && (north || south || west || east)){
            if (north && mazeGridMap.has(Shared.getGridKey(x, 0, z-1))) {cell.north = false; roomHasDoor[roomid]=true; continue;}
            if (south && mazeGridMap.has(Shared.getGridKey(x, 0, z+1))) {cell.south = false; roomHasDoor[roomid]=true;continue;}
            if (east && mazeGridMap.has(Shared.getGridKey(x+1, 0, z)))  {cell.east = false; roomHasDoor[roomid]=true;continue;}
            if (west && mazeGridMap.has(Shared.getGridKey(x-1, 0, z)))  {cell.west = false; roomHasDoor[roomid]=true;continue;}
        }
    }


    //now parse mazegridmap to build the walls and floors
    for (const [key, cell] of mazeGridMap.entries()) {
        const { x, y, z } = Shared.parseGridKey(key);
        const { floor, north, south, west, east, room } = cell;
        if (floor) {
            placeTile(x, 0, z, "XZ", mazeFloorUvMeshId, false, false);
            // placeTile(x, maxY, z, "XZ", mazeFloorUvMeshId, false, false);
        }
        for (let y = 0; y <= maxY; y++) {
            if (!room) placeTile(x,y,z,"XZ",pillaruvmeshid,false,false);
            if (north) placeTile(x, y, z, "XY", mazeWallUvMeshId, false, false);
            if (south) placeTile(x, y, z + 1, "XY", mazeWallUvMeshId, false, false);
            if (west) placeTile(x, y, z, "YZ", mazeWallUvMeshId, false, false);
            if (east) placeTile(x + 1, y, z, "YZ", mazeWallUvMeshId, false, false);
        }
    }

}

function shuffle(array){
    // make a shallow copy so we don’t mutate the original
    const arr = array.slice();

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Shared.getRandomInt(0, i); // using your seeded RNG
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

let currentRot = 0;
function rotLeft(){
    // currentRot += 1;
    // currentRot %= 4;
    const newrot=(currentRot+1)%4;
    const newRotRadians = newrot*(Math.PI/2);
    markerxz.rotation.y=newRotRadians;
    markeryz.rotation.x=Math.PI/2+newRotRadians;
    markerxy.rotation.y=newRotRadians;
    setRotation(newrot);
    reinitMarker();
}
function rotRight(){
    const newrot=(currentRot+(4-1))%4;
    const newRotRadians = newrot*(Math.PI/2);
    markerxz.rotation.y=newRotRadians;
    markeryz.rotation.x=Math.PI/2+newRotRadians;
    markerxy.rotation.y=newRotRadians;
    setRotation(newrot);
    reinitMarker();
}

function setRotation(rotid){
    currentRot=rotid;
    // let currentName = Shared.atlasMeshArray[meshindex][0];
    setMesh(rotid,currentUVIndex,currentMeshIndex);
    //notify the UI back to update the selected combobox
    // const event = new CustomEvent("UIChange", {
    //     detail: { field: "MeshChange", value: meshindex },
    //     bubbles: true // optional, allows event to bubble up
    // });
    // document.dispatchEvent(event);
}



// function buildSprites(){
//     for (const [chunkKey, chunk] of Shared.gridMapSpriteChunk.entries()) {
//         if (!chunk.dirty) continue;

//         for (const direction of ["XZ", "YZ", "XY"]) {
//             const chunkslice = chunk[direction];
//             for (const [tilexyz, tilemeshes] of chunkslice.entries()) {
//                 const { x, y, z } = Shared.parseGridKey(tilexyz);
//                 for (const [meshname,uvmeshid] of Object.entries(tilemeshes)) {
//                     if (!meshname.startsWith("SPRITE")) continue;
//                     //unique geometries indepedently from rotation. pb is that this breaks save/load at the moment 
//                     const { rotid, uvid, meshid } = Shared.decodeID(uvmeshid);
//                     let newgeom;
//                     //clone from cache if 
//                     if (Shared.sceneGeometryDict.has(uvmeshid)) {
//                         newgeom = Shared.sceneGeometryDict.get(uvmeshid).clone();
//                     } else {
//                         newgeom = generateGeometry(0, uvid, meshid);
//                         Shared.sceneGeometryDict.set(uvmeshid, newgeom.clone());
//                     }
//                     const { rot, pos: offset } = RotOffsetPerSlice(direction,rotid);
//                     chunkpos.set(
//                         offset.x + Shared.cellSize * x,
//                         offset.y + Shared.cellSize * y,
//                         offset.z + Shared.cellSize * z
//                     );
//                     chunkmatrix.copy(rot);//.setPosition(chunkpos);
//                     newgeom.applyMatrix4(chunkmatrix);
//                     const newmesh = new THREE.Mesh(newgeom, Shared.atlasMat);
//                     newmesh.position.copy(chunkpos);

//                     newmesh.userData = {direction:direction,tilexyz:tilexyz,uvmeshid:uvmeshid}; //store mapping
//                     Shared.spritesInScene[chunkKey] = newmesh;
//                     newmesh.name = "Sprite_"+chunkKey;
//                     Shared.spritesGroup.add(newmesh);


//                 }
//             }
//         }

//         chunk.dirty = false;
//     }
// }


// let maxiterations=200;


function generateAnimatedTextures(uvname,meshid){
    const prefix = uvname.replace(/_FRAME\d+$/, "");

    // find all frame keys
    const frames = Shared.atlasUVsArray
        .map(([key]) => key) // get the string names
        .filter(key => key.startsWith(prefix) && /_FRAME\d+$/.test(key))
        .sort((a, b) => {
            const na = parseInt(a.match(/_FRAME(\d+)$/)[1], 10);
            const nb = parseInt(b.match(/_FRAME(\d+)$/)[1], 10);
            return na - nb;
        });

    // now convert keys -> uvids
    const uvframes = frames.map(fkey => {
        const frameuvid = Shared.atlasUVsidx[fkey]; // lookup index by key
        let newuv = Shared.atlasMeshArray[meshid][1]?.MESH.geometry.attributes.uv.clone();
        return generateUV(newuv,frameuvid);
    });

    return uvframes;

}

function clearAnimatedTextures() {
    // for (const obj of Shared.UVToUpdate) {
    //     const { geomToUpdate, uvs } = obj;
    //     if (!uvs) continue;
    //     // Remove references from the geometry
    //     if (geomToUpdate && geomToUpdate.attributes) {
    //         for (const attrName of uvs.map((_, i) => Object.keys(geomToUpdate.attributes)[i])) {
    //             delete geomToUpdate.attributes[attrName];
    //         }
    //     }
    // }
    Shared.UVToUpdate.length = 0; // clear in place
}


function toggleHideCollider(){
    Shared.rapierDebug.toggle();
}