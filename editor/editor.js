import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as Shared from '../shared.js';
import * as Stats from '../Stats.js';
import * as GameHUD from '../game/gameHUD.js';
import {mergeBufferGeometries} from '../utils/BufferGeometryUtils.js';

/*-----------------------------------------------------*/
// EDITOR CONSTANTS
/*-----------------------------------------------------*/

// addition modes
export const ADDPLANEMODE = 0;
export const ADDLIGHTMODE = 1;
export const ADDMESHMODE = 2;
export const NUMADDMODES = 3;

// tile addition modes
const MODEXZ = 0;
const MODEYZ = 1;
const MODEXY = 2;
const MODEW = 3;
const MODEA = 4;
const NUMMODES = 5;

// rotation and offset per plane
const RotOffsetPerSlice = {
    XZ: { pos: new THREE.Vector3(0.5, 0, 0.5), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, Math.PI, 0)) },
    YZ: { pos: new THREE.Vector3(0, 0.5, 0.5), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2)) },
    XY: { pos: new THREE.Vector3(0.5, 0.5, 0), rot: new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)) }
};

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
let boxselectModestartX = 0;
let boxselectModestartZ = 0;
let boxselectModeendX   = 0;
let boxselectModeendZ   = 0;
let prevWallModeSelect  = MODEA;
let wallModeSelect      = MODEXZ;  //0: xz 1:yz 2:xy 3: walls 4: all
let currentAddMode = ADDPLANEMODE;

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

let eraserMode     = false;

// holds baked chunk geometry
let chunksInScene = {};

/*-----------------------------------------------------*/
// EDITOR ACTIONS TO KEY MAPPING AND REVERSE
/*-----------------------------------------------------*/
export let ActionToKeyMap = {
    moveCamUp   : { key: 'ShiftLeft' },
    moveCamDown : { key: 'Space' },
    moveCamRight: { key: 'KeyD' },
    moveCamLeft : { key: 'KeyA' },
    moveCamFront: { key: 'KeyW' },
    moveCamBack : { key: 'KeyS' },
    // setAddPlaneMode: { key: 'Digit1', OnPress: true },
    // setAddLightMode: { key: 'Digit2', OnPress: true },
    // setAddMeshMode : { key: 'Digit3', OnPress: true },
    pause       : { key: 'KeyP', OnRelease: true },  //triggered once only at release
    prevMaterial: { key: 'KeyQ', OnPress: true },
    nextMaterial: { key: 'KeyE', OnPress: true },
    toggleEraser: { key: 'KeyR', OnPress: true },
    nextMesh    : { key: 'KeyC', OnPress: true },
    prevMesh    : { key: 'KeyZ', OnPress: true },
    saveLevel   : { key: 'KeyT', OnPress: true },
    loadLevel   : { key: 'KeyL', OnPress: true },
    startGame   : { key: 'KeyG', OnPress: true },
    nextMode    : { key: 'PageUp', OnPress: true },
    prevMode    : { key: 'PageDown', OnPress: true },
    undo        : { key: 'Ctrl+KeyZ', OnPress: true },
    showXZ      : { key: 'Digit1', OnPress: true },
    showYZ      : { key: 'Digit2', OnPress: true },
    showXY      : { key: 'Digit3', OnPress: true },
    showW       : { key: 'Digit4', OnPress: true },
    showA       : { key: 'Digit5', OnPress: true },
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
    markerxz.rotation.y = Math.PI;  //relative x,y,z
    markerxz.position.set(0.5, 0, 0.5);  //relative x,y,z

    markeryz.rotation.x = -Math.PI/2;   //left plane
    markeryz.rotation.z = Math.PI / 2;   //left plane
    markeryz.position.set(0, 0.5, 0.5);   

    markerxy.rotation.x = -Math.PI / 2;   //left plane
    markerxy.position.set(0.5, 0.5, 0);  //front plane (facing you)
}

/*---------------------------------*/
// setupEditor
/*---------------------------------*/
let scene;
let sceneGeometryDict;
let gridMapChunk;
let gridMap;
export function setupEditor() {

    //setup local references to be able to watch them
    //in debugger
    scene = Shared.scene;
    sceneGeometryDict = Shared.sceneGeometryDict;
    gridMapChunk   = Shared.gridMapChunk;
    gridMap = Shared.gridMap;

    Shared.sceneGeometryDict.clear();

    //start in add plane mode
    setAddMode(ADDPLANEMODE);
    setWallMode(MODEA);

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
            opacity: 0.5
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
    markerxz = new THREE.Mesh(markerGeom, markerxzmaterial);
    markeryz = new THREE.Mesh(markerGeom, markeryzmaterial);
    markerxy = new THREE.Mesh(markerGeom, markerxymaterial);
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

    markergroupxz.add(markerxz.clone());
    markergroupyz.add(markeryz.clone());
    markergroupxy.add(markerxy.clone());

    Shared.scene.add(markergroupxz);
    Shared.scene.add(markergroupyz);
    Shared.scene.add(markergroupxy);

    //chunks group
    Shared.scene.add(Shared.chunksGroup);

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
    reinitMarker();
    markeryzmaterial.visible     = true;
    markerxzmaterial.visible     = true;
    markerxymaterial.visible     = true;
    markerremovematerial.visible = true;
    grid.visible                 = true;
    // gridtwo.visible              = false;
    axes.visible                 = true;
    lightHelperGroup.visible     = true;
}

/*---------------------------------*/
// stopEditorLoop
/*---------------------------------*/
export function stopEditorLoop() {
    Shared.editorState.editorRunning = false;

    cancelAnimationFrame(editorId);

    reinitMarker();

    markeryzmaterial.visible     = false;
    markerxzmaterial.visible     = false;
    markerxymaterial.visible     = false;
    markerremovematerial.visible = false;
    grid.visible                 = false;
    // gridtwo.visible              = false;
    axes.visible                 = false;
    lightHelperGroup.visible     = false;
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
    newWallModeSelect = (((wallModeSelect + increment) % NUMMODES) + NUMMODES) % NUMMODES;
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
    setMesh(uvIndex,currentMeshIndex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MaterialChange", value: uvIndex },
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
    let currentName = Shared.atlasMeshArray[meshindex][0];
    setMesh(currentUVIndex,meshindex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MeshChange", value: meshindex },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

export function setMesh(uvid, meshid) {

    markerGeom.dispose();
    markerGeom = generateGeometry(uvid,meshid);

    markerxz.geometry = markerGeom;
    markeryz.geometry = markerGeom;
    markerxy.geometry = markerGeom;

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
    let uvmeshid = tilemesh.geometry.userData.uvmeshid;
    let wx = Math.floor(worldPos.x / Shared.cellSize);
    let wy = Math.floor(worldPos.y / Shared.cellSize);
    let wz = Math.floor(worldPos.z / Shared.cellSize);
    const meshname = tilemesh.geometry.userData?.meshname || "Plane";

    placeTile(wx,wy,wz,direction,uvmeshid,meshname,erase);

}

function placeTile(wx,wy,wz,direction,uvmeshid,meshname,erase=false,undoable=true) {

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
    let chunk = gridMapChunk.get(chunkkey);

    // Eraser mode
    if (tile && meshname in tile) {
        //if a tile is replaced, do not mark as erase and record the erased tile instead
        undoitem.uvmeshid = tile[meshname];
        undoitem.erase = false;
        delete tile[meshname];
        if (chunk) chunk.dirty = true;
        //handle the mapping update (deletion) in rebuildDirtyChunk
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
            gridMapChunk.set(chunkkey, chunk);
        }

        chunk[direction].set(tilekey, tile);
    }

    tile[meshname] = uvmeshid;
    chunk.dirty = true;

}


/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
export function onMouseClick(event) {

    if (!Shared.editorState.editorRunning) return;

    if (event.button == 0) {

        if (eraserMode) { 
            //TOCOMPLETE
        } else {
            if (!selectValid) return;

            if (currentAddMode == ADDLIGHTMODE) {
                let { light: newlight, helper: newlighthelper } = Shared.createLight(new THREE.Vector3(selectX + 0.5, Shared.floorHeight + 0.5, selectZ + 0.5));
                placeLight(newlight, newlighthelper, Shared.gridLight, lightGroup, lightHelperGroup);
                return;
            }

            Shared.editorState.hasClicked = true;

            markergroupxz.visible = false;
            markergroupxy.visible = false;
            markergroupyz.visible = false;

            // if (event.shiftKey) { // console.log("Shift + Click detected");
            boxselectModestartX = selectX;
            boxselectModestartZ = selectZ;
            boxselectModeendX = selectX;
            boxselectModeendZ = selectZ;
        }
        Shared.editorState.mouseIsDown = true;
    }

    //right click
    // if (event.button == 2){
        // setEraser(true);//eraser on right click
    // }

}

/*---------------------------------*/
// onMouseUp
/*---------------------------------*/
export function onMouseUp(event) {

    if (!Shared.editorState.editorRunning) return;


    if (event.button == 0) {

        Shared.editorState.mouseIsDown = false;

        if (eraserMode) {
            if(selectObj && selectInfo){

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
            if (currentAddMode != ADDPLANEMODE) {
                return;
            }

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
    }

    //reinitialize marker
    reinitMarker();
}

/*---------------------------------*/
// reinitMarker
/*---------------------------------*/
function reinitMarker() {
    //reinit marker
    //RED
    markergroupxz.clear();
    markergroupxz.add(markerxz.clone());
    markergroupxz.position.set(selectX, Shared.floorHeight+Shared.EPSILON, selectZ);

    //GREEN
    markergroupyz.clear();
    //idea: to fake AO: 
    //create AO png decal (dark bottom gradient with transparency)
    //create a second atlasMat based on standard or lambertmaterial (better perf)
    //drive ao map field with ao texture
    //leave the UV non scaled for the mandatory uv2 field
    //based on height swap material from atlasMat to atlasMapAO
    //this enables better separation
    markergroupyz.add(markeryz.clone());
    for (let y = 1; y < Shared.wallHeight; y++) {
        const t = markeryz.clone();
        t.position.y += y;
        markergroupyz.add(t);
    }
    markergroupyz.position.set(selectX, Shared.floorHeight+Shared.EPSILON, selectZ);

    //BLUE
    markergroupxy.clear();
    markergroupxy.add(markerxy.clone());
    for (let y = 1; y < Shared.wallHeight; y++) {
        const t = markerxy.clone();
        t.position.y += y;
        markergroupxy.add(t);
    }
    markergroupxy.position.set(selectX, Shared.floorHeight+Shared.EPSILON, selectZ);

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
// pauseAndDebug
/*---------------------------------*/
function pauseAndDebug(delta) {
    // Create a local movement vector based on input
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
// movePlayer
/*---------------------------------*/
function movePlayer(delta) {

    if (Actions.nextMaterial) nextMaterial();
    if (Actions.prevMaterial) prevMaterial();
    if (Actions.toggleEraser) toggleEraser();
    if (Actions.nextMesh) nextMesh();
    if (Actions.prevMesh) prevMesh();
    if (Actions.saveLevel) saveLevel();
    if (Actions.loadLevel) loadLevel();
    if (Actions.startGame) toggleGameMode();
    if (Actions.nextMode) nextMode();
    if (Actions.prevMode) prevMode();
    if (Actions.undo) undo();
    // if (Actions.setAddPlaneMode) {
    if (Actions.nextMode || Actions.prevMode) {
        const event = new CustomEvent("UIChange", {
            detail: { field: "modeChange", value: currentAddMode },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
    };
    if (Actions.showXZ) setWallMode(MODEXZ);
    if (Actions.showYZ) setWallMode(MODEYZ);
    if (Actions.showXY) setWallMode(MODEXY);
    if (Actions.showW) setWallMode(MODEW);
    if (Actions.showA) setWallMode(MODEA);

}

/*---------------------------------*/
// editorLoop
/*---------------------------------*/
let raycastChunkArray = [];
let selectObj = null;
let selectInfo = null;
let prevSelectInfo = null;

function editorLoop() {

    if (!Shared.editorState.editorRunning) return;

    //fps counter
    Stats.stats.begin();

    const deltaTime = Shared.clock.getDelta(); // Time elapsed since last frame
    GameHUD.drawHUD();
    pauseAndDebug(deltaTime);

    if (!Shared.editorState.pause || Shared.editorState.renderOneFrame) {
        Shared.editorState.renderOneFrame = false;
        movePlayer(deltaTime);

        //If eraser mode set raycast against any geometry
        if (eraserMode) {

            raycastChunkArray = Object.values(chunksInScene);

            //perform the raycast
            raycaster.setFromCamera(screenCenter, Shared.camera);
            let doesIntersect = false;
            const hits = raycaster.intersectObjects(raycastChunkArray, false);

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

                let facehit = closestHit.faceIndex;
                let facetotilerange = closestHit.object?.userData?.facetotilerange;
                selectInfo = facetotilerange.find(r => facehit >= r.start && facehit <= r.end);
                
                if (!prevSelectInfo || prevSelectInfo !== selectInfo ){
                    // console.log(selectInfo.direction,selectInfo.tilexyz,selectInfo.uvmeshid);

                    if (selectObj) {
                        selectObj.geometry.dispose();
                        Shared.scene.remove(selectObj);
                        selectObj = null;
                    }

                    prevSelectInfo = selectInfo;

                    if (Shared.sceneGeometryDict.has(selectInfo.uvmeshid)) {
                        selectObj = new THREE.Mesh(Shared.sceneGeometryDict.get(selectInfo.uvmeshid).clone(), markerremovematerial);
                    } else {
                        //should not go there normally but support it just in case
                        const { uvid, meshid } = Shared.decodeID(selectInfo.uvmeshid);
                        selectObj = generateGeometry(uvid, meshid);
                    }
                    const { rot, pos: offset } = RotOffsetPerSlice[selectInfo.direction];
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
            
        } else {

            //FLOOR RAYCAST TEST
            raycaster.setFromCamera(screenCenter, Shared.camera);
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
                const point = intersects[0].point;
                // console.log("intersectpoint",point);
                selectValid = true;
                markergroupxz.visible = showMarkerXZ;
                markergroupyz.visible = showMarkerYZ;
                markergroupxy.visible = showMarkerXY;
                // Convert world position to grid cell
                selectX = Math.floor(point.x / Shared.cellSize);
                selectY = Shared.floorHeight;
                selectZ = Math.floor(point.z / Shared.cellSize);

                //UPDATE ONLY WHEN NEW CELL SELECTED
                if (
                    (selectX != prevSelectX) ||
                    (selectZ != prevSelectZ) ||
                    wallModeSelect != prevWallModeSelect ||
                    Shared.editorState.hasClicked
                ) {
                    Shared.editorState.hasClicked = false;
                    // console.log("newpoint");

                    if (!Shared.editorState.mouseIsDown) {
                        // slightly above floor to prevent z-fighting
                        markergroupxz.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                        markergroupyz.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                        markergroupxy.position.set(selectX * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                    } else {

                        //UPDATE SELECTION BBOX
                        boxselectModeendX = selectX;
                        boxselectModeendZ = selectZ;

                        //UPDATE MARKER POSITION
                        markergroupxz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                        markergroupyz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                        markergroupxy.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (Shared.floorHeight * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);

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
                                    const copytile = markerxz.clone();
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
                                        const copytile = markeryz.clone();
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
                                        const copytile = markerxy.clone();
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

        //RENDER GIZMO HELPER in BOTTOM LEFT CORNER
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

        //rebuild dirty chunks
        rebuildDirtyChunks();

        // Simulate heavy computation
        if (0) Stats.simulateBlockingWait(200); // 200ms delay
        Stats.updateTextStatsThrottled();
        Stats.stats.end();

    }

    //clear the onpress/onrelease actions now that they have been sampled 
    //in that loop to avoid resampling
    Shared.releaseSingleEventActions();

    editorId = requestAnimationFrame(editorLoop); //call animate recursively on next frame 

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

    const ambientLight = new THREE.AmbientLight(new THREE.Color(1, 1, 1).multiplyScalar(0.45)); // Soft light
    Shared.scene.add(ambientLight);

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
    deleteAllChunksInScene();
    undogroup = [];
    undogroups.length = 0;
    clearGridMap();
    clearAllGridMapChunks();
    Shared.gridLight.clear();
    reinitMarker();
    // Shared.resetCamera();
    Shared.editorState.renderOneFrame = true;//simply update once the Shared.canvas
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
            showMarkerXZ = true;
            break;
        case ADDLIGHTMODE:
            currentAddMode = ADDLIGHTMODE;
            showMarkerXY = false;
            showMarkerYZ = false;
            showMarkerXZ = false;
            break;
        case ADDMESHMODE:
            currentAddMode = ADDMESHMODE;
            showMarkerXY = false;
            showMarkerYZ = false;
            showMarkerXZ = false;
            break;
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
    if (geomdata.length % 4 !== 0) {
        throw new Error("geomdata length must be a multiple of 4 (2 bytes per key).");
    }
    for (let i = 0; i < geomdata.length; i += 4) {
        const uvmeshid_ = geomdata.slice(i, i + 4); // 4 hex nibbles (16 bits)
        const { uvid, meshid } = Shared.decodeID(uvmeshid_);
        //create the geometry for given uv+mesh and put it in the dict
        const newgeom = generateGeometry(uvid,meshid);
        Shared.sceneGeometryDict.set(uvmeshid_,newgeom);
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

        if (cellStr === lastCell && count < repeatCountMax) {
            count++;
        } else {
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
// downloadJson
/*---------------------------------*/
function downloadJson(data, filename) {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

function generateDefaultGeometry(){
    return generateGeometry(0,0);
}

/*---------------------------------*/
// generateGeometry
/*---------------------------------*/
function generateGeometry(uvid,meshid) {
    let m = (Shared.atlasMeshArray[meshid][1]?.geometry).clone();
    let uv = m.attributes.uv.clone();

    const xt = (Shared.atlasUVsArray[uvid][1]?.x || 0);
    const yt = (Shared.atlasUVsArray[uvid][1]?.y || 0);

    const offsetX = xt * Shared.uvInfo.uvscalex;
    const offsetY = yt * Shared.uvInfo.uvscaley;
    for (let i = 0; i < uv.count; i++) {
        let x = uv.getX(i);
        let y = uv.getY(i);
        // Scale down to tile size
        x = x * Shared.uvInfo.uvscalex;
        y = y * Shared.uvInfo.uvscaley;
        // Offset to desired tile
        x += offsetX;
        y += offsetY;
        uv.setXY(i, x, y);
    }
    uv.needsUpdate = true;
    m.attributes.uv = uv;

    const newmeshname = Shared.atlasMeshArray[meshid][0];
    const newuvname = Shared.atlasUVsArray[uvid][0];
    const newuvmeshid = Shared.encodeID(uvid,meshid);
    m.userData = {
        uvname: newuvname,
        meshname: newmeshname,
        uvmeshid: newuvmeshid
    };

    return m;
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
                
                placeTile(wx,wy,wz,direction,geom.uvmeshid,geom.meshname,false,false);
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
    reinitMarker();

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
            placeTile(u.wx,u.wy,u.wz,u.direction,u.uvmeshid,u.meshname,u.erase,false);
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

        const tileGeometries = [];
        const facetotilerange = [];
        let faceOffset = 0;

        for (const direction of ["XZ", "YZ", "XY"]) {
            const chunkslice = chunk[direction];
            const { rot, pos: offset } = RotOffsetPerSlice[direction];

            for (const [tilexyz, tilemeshes] of chunkslice.entries()) {
                const { x, y, z } = Shared.parseGridKey(tilexyz);

                chunkpos.set(
                    offset.x + Shared.cellSize * x,
                    offset.y + Shared.cellSize * y,
                    offset.z + Shared.cellSize * z
                );

                chunkmatrix.copy(rot).setPosition(chunkpos);

                for (const uvmeshid of Object.values(tilemeshes)) {
                    let newgeom;
                    //clone from cache if 
                    if (Shared.sceneGeometryDict.has(uvmeshid)) {
                        newgeom = Shared.sceneGeometryDict.get(uvmeshid).clone();
                    } else {
                        const { uvid, meshid } = Shared.decodeID(uvmeshid);
                        newgeom = generateGeometry(uvid, meshid);
                        Shared.sceneGeometryDict.set(uvmeshid, newgeom.clone());
                    }

                    newgeom.applyMatrix4(chunkmatrix);

                    // how many triangles does this tile contribute?
                    const triCount = newgeom.index
                        ? newgeom.index.count / 3
                        : newgeom.attributes.position.count / 3;

                    let start=faceOffset;
                    let end=faceOffset+triCount-1;
                    facetotilerange.push({start,end,direction,tilexyz,uvmeshid});

                    faceOffset += triCount;

                    tileGeometries.push(newgeom);
                }

                // cleanup: remove empty tiles
                if (Object.keys(tilemeshes).length === 0) {
                    chunkslice.delete(tilexyz);
                    gridMap[direction].delete(tilexyz);
                }
            }
        }

        if (tileGeometries.length > 0) {
            const bakedGeometry = mergeBufferGeometries(tileGeometries, false);
            bakedGeometry.name = "ChunkGeometry_"+chunkKey;
            const bakedMesh = new THREE.Mesh(bakedGeometry, Shared.atlasMat);

            bakedMesh.userData = {facetotilerange : facetotilerange}; //store mapping
            chunksInScene[chunkKey] = bakedMesh;
            bakedMesh.name = "Chunk_"+chunkKey;
            Shared.chunksGroup.add(bakedMesh);
        }

        chunk.dirty = false;
    }
}

function deleteChunkInScene(chunkKey){
    if (chunkKey in chunksInScene) {
        Shared.chunksGroup.remove(chunksInScene[chunkKey]);
        chunksInScene[chunkKey].geometry.dispose();
        delete chunksInScene[chunkKey];
    }
}

function deleteAllChunksInScene(){
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
