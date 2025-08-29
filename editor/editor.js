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

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/

let editorId = null;
export let Actions = {};

// let defaultGeom;
let markerGeom;
let currentUVIndex = 0;
let currentMeshIndex = 0;

// groups holding plane tiles
let tileXZGroup = new THREE.Group(); tileXZGroup.name = "tileXZGroup";
let tileXYGroup = new THREE.Group(); tileXYGroup.name = "tileXYGroup";
let tileYZGroup = new THREE.Group(); tileYZGroup.name = "tileYZGroup";
// let tilecount = 0; //holds total number of tiles

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

let markerxzmaterial;
let markeryzmaterial;
let markerxymaterial;

let markerremovematerial;

let showMarkerXZ = true;
let showMarkerYZ = false;
let showMarkerXY = false;

let eraserMode     = false;

// holds baked geometry
let bakedGeometry;
let bakedMesh;

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
    setAddPlaneMode: { key: 'Digit1', OnPress: true },
    setAddLightMode: { key: 'Digit2', OnPress: true },
    setAddMeshMode : { key: 'Digit3', OnPress: true },
    pause          : { key: 'KeyP', OnRelease: true },     //triggered once only at release
    prevMaterial   : { key: 'KeyQ', OnPress: true },
    nextMaterial   : { key: 'KeyE', OnPress: true },
    nextMesh       : { key: 'Tab', OnPress: true },
    saveLevel      : { key: 'KeyT', OnPress: true },
    bakeLevel      : { key: 'KeyB', OnPress: true },
    loadLevel      : { key: 'KeyL', OnPress: true },
    startGame      : { key: 'KeyG', OnPress: true },
    floorUp        : { key: 'PageUp', OnPress: true },
    floorDown      : { key: 'PageDown', OnPress: true },
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
let gridMapXZ; 
let gridMapYZ; 
let gridMapXY; 
export function setupEditor() {

    //setup local references to be able to watch them
    //in debugger
    scene = Shared.scene;
    sceneGeometryDict = Shared.sceneGeometryDict;
    gridMapXZ = Shared.gridMapXZ;
    gridMapYZ = Shared.gridMapYZ;
    gridMapXY = Shared.gridMapXY;

    Shared.sceneGeometryDict.clear();

    //start in add plane mode
    setAddMode(ADDPLANEMODE);

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
    markerremovematerial = new THREE.MeshBasicMaterial(
        {
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
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
    axes.visible                 = false;
    lightHelperGroup.visible     = false;
}

/*---------------------------------*/
// setEraser
/*---------------------------------*/
function setEraser(enabled) {
    eraserMode = enabled;

    if (eraserMode) {
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
    currentUVIndex = (((currentUVIndex + increment) % l) + l) % l;
    let currentName = Shared.atlasUVsArray[currentUVIndex][0];
    setMesh(currentUVIndex,currentMeshIndex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MaterialChange", value: currentName },
        bubbles: true // optional, allows event to bubble up
    });
    document.dispatchEvent(event);
}

/*---------------------------------*/
// setMesh
/*---------------------------------*/
function nextMesh(){
    toggleMesh(1);
}

export function setCurrentMeshIndex(i){currentMeshIndex = i;}
export function getCurrentMeshIndex(){return currentMeshIndex;}

function toggleMesh(increment){
    let l = Shared.atlasMeshArray.length;
    currentMeshIndex = (((currentMeshIndex + increment) % l) + l) % l;
    let currentName = Shared.atlasMeshArray[currentMeshIndex][0];
    setMesh(currentUVIndex,currentMeshIndex);
    //notify the UI back to update the selected combobox
    const event = new CustomEvent("UIChange", {
        detail: { field: "MeshChange", value: currentName },
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
            child.position.y -= Shared.EPSILON;//remove Shared.EPSILON vertical offset
            if (material)
                child.material = material;//apply material without transparency/tint
        }
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
    if (eraserMode) return;

    lightGroup.add(lightv);
    lightHelperGroup.add(lighthelperv);
    Shared.gridLight.set(key, { light: lightv, helper: lighthelperv });

}

/*---------------------------------*/
// placeTile
/*---------------------------------*/

const worldPos = new THREE.Vector3();
function placeTile(tile, gridmap, group) {

    tile.getWorldPosition(worldPos);
    let wx = Math.floor(worldPos.x / Shared.cellSize);
    let wy = Math.floor(worldPos.y / Shared.cellSize);
    let wz = Math.floor(worldPos.z / Shared.cellSize);
    const key = Shared.getGridKey(wx, wy, wz);
    const meshname = tile.geometry.userData?.meshname || "Plane";

    if (gridmap.has(key)) {
        const gridtiles = gridmap.get(key);
        if (eraserMode) {
            // Remove all tiles at this grid cell
            for (const tiletoremove of gridtiles.values()) {
                if (tiletoremove) {
                    group.remove(tiletoremove);
                    tiletoremove.geometry.dispose();
                    tiletoremove.material.dispose();
                }
            }
            gridtiles.clear();
        } else {
            if (gridtiles.has(meshname)) {
                const tiletoremove = gridtiles.get(meshname);
                if (tiletoremove) {
                    group.remove(tiletoremove);
                    tiletoremove.geometry.dispose();
                    tiletoremove.material.dispose();
                }
                gridtiles.delete(meshname);
            }
        }
        if (gridtiles.size === 0)
            gridmap.delete(key);
    }

    //if eraser mode we finished our work here
    if (eraserMode
        || tile.userData?.todelete
    ) return;

    //otherwise add tile now
    uniquifyGeometry(tile);
    group.add(tile); // This automatically removes it from sourceGroup
    tile.position.copy(worldPos);

    //update the gridmap
    let newgridtiles = gridmap.get(key);
    if (!newgridtiles) {
        newgridtiles = new Map();
        gridmap.set(key, newgridtiles);
    }
    newgridtiles.set(meshname,tile);

}

/*---------------------------------*/
// uniquifyGeometry
/*---------------------------------*/
function uniquifyGeometry(mesh) {
    const g = mesh.geometry;
    const id = g.userData?.uvmeshid;

    if (!id) {
        console.error("uvmeshid not defined for mesh");
        return;
    }

    // If we already have a cached geometry with this id
    if (Shared.sceneGeometryDict.has(id)) {
        const cachedg = Shared.sceneGeometryDict.get(id);

        // Reuse the cached one
        mesh.geometry = cachedg;

    } else {
        // Otherwise clone this geometry to make it unique and store it in the dict
        const clonedg = g.clone();
        // reassign userData as we dont want to hold on a shared reference
        clonedg.userData = { ...g.userData };
        mesh.geometry = clonedg;
        Shared.sceneGeometryDict.set(id, clonedg);
    }
}



/*---------------------------------*/
// onMouseClick
/*---------------------------------*/
export function onMouseClick(event) {

    if (!Shared.editorState.editorRunning) return;

    if (!selectValid) return;

    if (currentAddMode == ADDLIGHTMODE) {
        let { light: newlight, helper: newlighthelper } = Shared.createLight(new THREE.Vector3(selectX + 0.5, selectY + 0.5, selectZ + 0.5));
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
    Shared.editorState.mouseIsDown = true;

    if (event.button == 2)
        setEraser(true);//eraser on right click

}

/*---------------------------------*/
// onMouseUp
/*---------------------------------*/
export function onMouseUp(event) {

    if (!Shared.editorState.editorRunning) return;

    Shared.editorState.mouseIsDown = false;

    if (currentAddMode != ADDPLANEMODE) {
        return;
    }

    if (!selectValid) {
        reinitMarker();
        return;
    }

    //find material
    let materialToApply = Shared.atlasMat;
    if (showMarkerXY) placeGroup(markergroupxy, tileXYGroup, Shared.gridMapXY, materialToApply);
    if (showMarkerXZ) placeGroup(markergroupxz, tileXZGroup, Shared.gridMapXZ, materialToApply);
    if (showMarkerYZ) placeGroup(markergroupyz, tileYZGroup, Shared.gridMapYZ, materialToApply);

    boxselectModeendX = boxselectModestartX;
    boxselectModeendZ = boxselectModestartZ;

    //update tilecount
    // updateTileCount();

    if (event.button == 2)
        setEraser(false);

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
    markergroupxz.position.set(selectX, selectY+Shared.EPSILON, selectZ);

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
    markergroupyz.position.set(selectX, selectY+Shared.EPSILON, selectZ);

    //BLUE
    markergroupxy.clear();
    markergroupxy.add(markerxy.clone());
    for (let y = 1; y < Shared.wallHeight; y++) {
        const t = markerxy.clone();
        t.position.y += y;
        markergroupxy.add(t);
    }
    markergroupxy.position.set(selectX, selectY+Shared.EPSILON, selectZ);

    //reinit bbox
    boxselectModeendX = boxselectModestartX;
    boxselectModeendZ = boxselectModestartZ;
}

/*---------------------------------*/
// onMouseWheel
/*---------------------------------*/
export function onMouseWheel(event) {
    if (!Shared.editorState.editorRunning) return;
    if (event.deltaY < 0) {
        nextWall();
    } else {
        prevWall();
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

    if (Actions.jump) jump();
    if (Actions.nextMaterial) nextMaterial();
    if (Actions.prevMaterial) prevMaterial();
    if (Actions.nextMesh) nextMesh();
    if (Actions.saveLevel) saveLevel();
    if (Actions.bakeLevel) bakeLevel();
    if (Actions.loadLevel) loadLevel();
    if (Actions.startGame) Shared.toggleGameMode();
    if (Actions.setAddPlaneMode) {
        const event = new CustomEvent("UIChange", {
            detail: { field: "modeChange", value: ADDPLANEMODE },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
        setAddMode(ADDPLANEMODE)
    };
    if (Actions.setAddLightMode) {
        const event = new CustomEvent("UIChange", {
            detail: { field: "modeChange", value: ADDLIGHTMODE },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
        setAddMode(ADDLIGHTMODE);
    };
    if (Actions.setAddMeshMode) {
        const event = new CustomEvent("UIChange", {
            detail: { field: "modeChange", value: ADDMESHMODE },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
        setAddMode(ADDMESHMODE);
    };
    if (Actions.floorUp || Actions.floorDown) {
        const inc = Actions.floorDown ? -1 : 1;
        const newFloorHeight = Math.max(Math.min((Shared.floorHeight + inc),Shared.FLOORHEIGHTMAX),0);
        const event = new CustomEvent("UIChange", {
            detail: { field: "FloorChange", value: newFloorHeight.toString() },
            bubbles: true // optional, allows event to bubble up
        });
        document.dispatchEvent(event);
        setFloorHeight(newFloorHeight);
    }

}

/*---------------------------------*/
// editorLoop
/*---------------------------------*/
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
                    markergroupxz.position.set(selectX * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                    markergroupyz.position.set(selectX * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                    markergroupxy.position.set(selectX * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, selectZ * Shared.cellSize);
                } else {

                    //UPDATE SELECTION BBOX
                    boxselectModeendX = selectX;
                    boxselectModeendZ = selectZ;

                    //UPDATE MARKER POSITION
                    markergroupxz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                    markergroupyz.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);
                    markergroupxy.position.set(Math.min(boxselectModeendX, boxselectModestartX) * Shared.cellSize, (selectY * Shared.cellSize) + Shared.EPSILON, Math.min(boxselectModeendZ, boxselectModestartZ) * Shared.cellSize);

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
                                for (let y = 0; y < Shared.wallHeight; y++) {
                                    const copytile = markeryz.clone();
                                    copytile.userData.todelete = todelete;
                                    // copytile.userData = {
                                        // todelete: todelete
                                    // };
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
                                for (let y = 0; y < Shared.wallHeight; y++) {
                                    const copytile = markerxy.clone();
                                    markergroupxy.add(copytile);
                                    copytile.userData.todelete = todelete;
                                    // copytile.userData = {
                                        // todelete: todelete
                                    // };
                                    copytile.visible = !todelete;
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

        // Simulate heavy computation
        if (0) Stats.simulateBlockingWait(200); // 200ms delay
        Stats.updateTextStatsThrottled();
        //clear the onpress/onrelease actions now that they have been sampled 
        //in that loop to avoid resampling
        Shared.releaseSingleEventActions();
        Stats.stats.end();
    }

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
    //helper gizmo
    axes = new THREE.AxesHelper(3); // size
    axes.name = "AxesHelper";
    Shared.scene.add(axes);

    //raycast floor
    floor.rotation.x = -Math.PI / 2; // face up
    Shared.scene.add(floor);

    Shared.scene.add(tileXZGroup);
    Shared.scene.add(tileXYGroup);
    Shared.scene.add(tileYZGroup);
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
// bakeLevel
/*---------------------------------*/
export function bakeLevel() {
    console.log("BAKELEVEL");
    bakeGroup(tileXYGroup);
    bakeGroup(tileYZGroup);
    bakeGroup(tileXZGroup);
}

/*---------------------------------*/
// bakeGroup
/*---------------------------------*/
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
    bakedMesh = new THREE.Mesh(bakedGeometry, Shared.atlasMat);
    Shared.scene.add(bakedMesh);
    group.clear();
}

/*---------------------------------*/
// resetLevel
/*---------------------------------*/
export function resetLevel() {
    //meshes removed from group loses ref and will be garbage collected
    //however they all share materials and geometry these should not be disposed
    //and should persist after reset
    tileXYGroup.clear();
    tileXZGroup.clear();
    tileYZGroup.clear();
    lightGroup.clear();
    lightHelperGroup.clear();
    clearGridMap(Shared.gridMapXY);
    clearGridMap(Shared.gridMapXZ);
    clearGridMap(Shared.gridMapYZ);
    Shared.gridLight.clear();
    reinitMarker();
    Shared.resetCamera();
    Shared.editorState.renderOneFrame = true;//simply update once the Shared.canvas

    Shared.sceneGeometryDict.clear();

    if (bakedMesh) bakedMesh.clear();//temp
}

/*---------------------------------*/
// clearGridMap
// clear nested maps
/*---------------------------------*/
function clearGridMap(gridMapv) {
    for (const innerMap of gridMapv.values()) {
        if (innerMap instanceof Map) {
            innerMap.clear(); // Clear the inner Map
        }
    }
    gridMapv.clear(); // Clear the outer Map
}

/*---------------------------------*/
// setAddMode
/*---------------------------------*/
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

    eraserMode = false;

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

    const planetoinfo = {
        XZ: { g: gridMapXZ, m: markerxz, t: tileXZGroup },
        YZ: { g: gridMapYZ, m: markeryz, t: tileYZGroup },
        XY: { g: gridMapXY, m: markerxy, t: tileXYGroup }
    };

    for (const key of ["XZ", "YZ", "XY"]) {
        const _hstr = jsondata[key];
        const _bb = bb["BB" + key];
        const { g: _gridmap, m: _marker, t: _tilegroup } = planetoinfo[key];
        if (!_hstr || !_bb) continue;
        loadFlattenedMap(_hstr,_bb,_gridmap,_marker,_tilegroup,sceneGeometryDictArray);
    }


    return;


    //this tile will be cloned during load
    loadingTile = new THREE.Mesh(
        markerGeom,
        Shared.atlasMat,
    );

    await loadPlaneIntoScene(jsondata, "XY", Shared.gridMapXY, markerxy, tileXYGroup);
    await loadPlaneIntoScene(jsondata, "XZ", Shared.gridMapXZ, markerxz, tileXZGroup);
    await loadPlaneIntoScene(jsondata, "YZ", Shared.gridMapYZ, markeryz, tileYZGroup);
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
async function loadPlaneIntoScene(jsondata, label, grid, marker, group) {
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
export function flattenGridMap(gridMap, bbox) {
    const { min, max } = bbox;
    const result = [];

    if (gridMap.size === 0) return [];

    // raster order is x,z,y (horizontal plane is XZ, up axis is Y)
    for (let y = min.y; y <= max.y; y++) {
        for (let z = min.z; z <= max.z; z++) {
            for (let x = min.x; x <= max.x; x++) {
                const key = Shared.getGridKey(x, y, z);
                const cell = gridMap.get(key); // might be undefined if empty

                if (cell) {
                    const entries = Array.from(cell.entries());
                    const cellData = []; // start fresh per cell

                    for (let i = 0; i < entries.length; i++) {
                        const [meshName, mesh] = entries[i];
                        const index = sceneGeometryDictID[mesh.geometry.userData.uvmeshid]; // 11-bit value

                        cellData.push(index);
                    }

                    result.push(cellData);
                } else {
                    // empty cell → push null (or [] if you prefer)
                    result.push(null);
                }
            }
        }
    }

    return result; // array of arrays (or nulls)
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
            const encoded = cell[i];

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
    const bbxz = calculateBoundingBox(gridMapXZ);
    const bbyz = calculateBoundingBox(gridMapYZ);
    const bbxy = calculateBoundingBox(gridMapXY);

    const gridMapXZflattened = flattenGridMap(gridMapXZ,bbxz);
    const gridMapYZflattened = flattenGridMap(gridMapYZ,bbyz);
    const gridMapXYflattened = flattenGridMap(gridMapXY,bbxy);

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
// groupPlanesByMaterial
/*---------------------------------*/
function groupPlanesByMaterial(group) {
    const grouped = {};

    group.traverse((child) => {
        if (
            child.isMesh &&
            child.geometry instanceof THREE.PlaneGeometry
        ) {
            const geomName = child.geometry?.name || "Unnamed";

            if (!grouped[geomName]) {
                grouped[geomName] = [];
            }

            grouped[geomName].push({
                position: child.position.toArray(),
            });
        }
    });

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
// loadFlattenedMap
/*---------------------------------*/
function loadFlattenedMap(hstr, bb, gridmap, marker, tilegroup, sceneGeometryDictArray) {
    const sizeX = bb.max.x - bb.min.x + 1;
    const sizeY = bb.max.y - bb.min.y + 1;
    const sizeZ = bb.max.z - bb.min.z + 1;

    let flatIndex = 0; // linear index across all tiles

    let geomArray = [];
    let p = 0;
    while (p < hstr.length){

        const encoded = parseInt(hstr.slice(p, p + sceneGeometryHexWidth), 16);
        p += sceneGeometryHexWidth;
        const last = (encoded >> sceneGeometryBitWidth) & 1;  // MSB (bit 12)
        const geomIdx = encoded & (sceneGeometryMax - 1); 

        if (geomIdx !== 0){
            const geom    = sceneGeometryDictArray[geomIdx-1][1];//geomidx-1 because 0 is reserved to notile
            geomArray.push(geom);
            if (!last) continue;
        }

        const count   = parseInt(hstr.slice(p, p + repeatCountHexWidth), 16);
        p+=repeatCountHexWidth;
        if (geomIdx === 0) {//0 = no tiles
            flatIndex+=count;
            continue;
        }

        for (let c = 0; c < count; c++, flatIndex++) {
            // Compute 3D coordinates from flat index
            // raster order is x,z,y
            const y = Math.floor(flatIndex / (sizeX * sizeZ));
            const z = Math.floor((flatIndex % (sizeX * sizeZ)) / sizeX);
            const x = flatIndex % sizeX;

            geomArray.forEach(geom => {
                const mesh = new THREE.Mesh(geom, Shared.atlasMat);

                mesh.position.set(
                    (x + bb.min.x) * Shared.cellSize + marker.position.x,
                    (y + bb.min.y) * Shared.cellSize + marker.position.y,
                    (z + bb.min.z) * Shared.cellSize + marker.position.z
                );

                mesh.rotation.copy(marker.rotation);

                placeTile(mesh, gridmap, tilegroup);
            })
        }
        geomArray = [];
    }
}

/*---------------------------------*/
// setWallHeight
/*---------------------------------*/
export function setWallHeight(height){
    Shared.setWallHeight(height);
    reinitMarker();
    Shared.editorState.renderOneFrame = true;
}

/*---------------------------------*/
// setFloorHeight
/*---------------------------------*/
export function setFloorHeight(height){
    Shared.setFloorHeight(height);
    floor.position.y = height;
    reinitMarker();
    Shared.editorState.renderOneFrame = true;
}
