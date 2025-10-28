
import * as Shared from '../shared.js';
import * as Editor from './editor.js';
import * as GameHUD from '../game/gameHUD.js';
import * as Stats from '../Stats.js';


/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
// const AddBtn   = document.getElementById('AddBtn');
// const AddLBtn  = document.getElementById('AddLBtn');
// const BakeBtn       = document.getElementById('BakeBtn');
const LoadBtn            = document.getElementById('LoadBtn');
const SaveBtn            = document.getElementById('SaveBtn');
const ResetBtn           = document.getElementById('ResetBtn');
const StartBtn           = document.getElementById('StartBtn');
const matSelectBtn       = document.getElementById("matSelectBtn");
const meshSelectBtn      = document.getElementById("meshSelectBtn");
const RandBtn            = document.getElementById('RandBtn');
const mazewallSelectBtn  = document.getElementById("mazewallSelectBtn");
const mazefloorSelectBtn = document.getElementById("mazefloorSelectBtn");

/*-----------------------------------------------------*/
// BUTTON LISTENERS
/*-----------------------------------------------------*/
// AddBtn.addEventListener('click', () => {
//     Shared.canvas.focus();
//     Shared.canvas.requestPointerLock();
//     Editor.setAddMode(ADDPLANEMODE);
// });
// AddLBtn.addEventListener('click', () => {
//     Shared.canvas.focus();
//     Shared.canvas.requestPointerLock();
//     Editor.setAddMode(ADDLIGHTMODE);
// });
LoadBtn.addEventListener('click', () => { Editor.loadLevel(); });
SaveBtn.addEventListener('click', () => { Editor.saveLevel(); });
// BakeBtn.addEventListener('click', () => { Editor.bakeLevel(); });
ResetBtn.addEventListener('click', () => { Editor.resetLevel(); });
StartBtn.addEventListener('click', () => { Shared.toggleGameMode(); });
matSelectBtn.addEventListener('click', () => { openPopup(Shared.matpopup, true); });
meshSelectBtn.addEventListener('click', () => { openPopup(Shared.meshpopup, true); });
RandBtn.addEventListener('click', () => { Editor.randLevel(); });
mazewallSelectBtn.addEventListener('click', () => { openPopup(Shared.mazewallpopup, true); });
mazefloorSelectBtn.addEventListener('click', () => { openPopup(Shared.mazefloorpopup, true); });

/*-----------------------------------------------------*/
// COMBOBOX
/*-----------------------------------------------------*/
// const matSelect = document.getElementById("matSelect");
// const meshSelect = document.getElementById("meshSelect");
const wallHeightSelect = document.getElementById("wallHeightSelect");
const floorHeightSelect = document.getElementById("floorHeightSelect");

/*-----------------------------------------------------*/
// RADIOS
/*-----------------------------------------------------*/
const radios = document.querySelectorAll('input[name="wallOption"]');

/*-----------------------------------------------------*/
// COMBOBOX LISTENER
/*-----------------------------------------------------*/
// matSelect.addEventListener("click", e => {
//     // e.clientX/Y = mouse position relative to viewport
//     openPopup(e.clientX, e.clientY);
// });
// matSelect.addEventListener("change", (event) => {
//     Editor.setCurrentUVIndex(event.target.selectedIndex);
//     Editor.setMesh(event.target.selectedIndex,Editor.getCurrentMeshIndex());
//     console.log("event.target.selectedIndex",event.target.selectedIndex);
// });
// meshSelect.addEventListener("change", (event) => {
//     Editor.setCurrentMeshIndex(event.target.selectedIndex);
//     Editor.setMesh(Editor.getCurrentUVIndex(), event.target.selectedIndex);
// });
wallHeightSelect.addEventListener("change", (event) => {
    const value = parseInt(event.target.value, 10); // convert string → integer
    Editor.setWallHeight(value);
});
floorHeightSelect.addEventListener("change", (event) => {
    const value = parseInt(event.target.value, 10); // convert string → integer
    Editor.setFloorHeight(value);
});

/*-----------------------------------------------------*/
// DOCUMENT/Shared.canvas EVENT LISTENERS
/*-----------------------------------------------------*/
//prevent right click context menu everywhere in document
document.addEventListener("contextmenu", (e) => e.preventDefault()); // prevent browser menu

// Shared.editorState.pause = true; //start paused
// document.addEventListener("pointerlockchange", () => {
//     if (document.pointerLockElement === Shared.canvas) {
//         // Shared.editorState.pause = false;
//         Shared.setPause(false);
//         console.log("Pointer locked");
//         document.getElementById('crosshair').style.display = 'block';
//         document.getElementById('pointer-lock-hint').style.display = 'block';
//         document.addEventListener("mousemove", Shared.onMouseMove, false);
//         document.addEventListener("mousedown", Editor.onMouseClick, false);
//         document.addEventListener("mouseup", Editor.onMouseUp, false);
//         document.addEventListener("wheel", Editor.onMouseWheel, { passive: false });
//         closePopup();
//     } else {
//         // Shared.editorState.pause = true;
//         Shared.setPause(true);
//         Shared.resetAllActions();
//         console.log("Pointer unlocked");
//         document.getElementById('crosshair').style.display = 'none';
//         document.getElementById('pointer-lock-hint').style.display = 'none';
//         document.removeEventListener("mousemove", Shared.onMouseMove, false);
//         document.removeEventListener("mousedown", Editor.onMouseClick, false);
//         document.removeEventListener("mouseup", Editor.onMouseUp, false);
//         document.removeEventListener("wheel", Editor.onMouseWheel, false);
//     }
// });


// document.getElementById('pointer-lock-hint').style.display = 'block';
// document.addEventListener("mousedown", Editor.onMouseClick, false);
// document.addEventListener("mouseup", Editor.onMouseUp, false);
// document.addEventListener("wheel", Editor.onMouseWheel, { passive: false });

const crosshair = document.getElementById("crosshair");
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === Shared.canvas) {
        // console.log("Pointer locked");

        // Shared.canvas.removeEventListener("mousemove", crossHairFollow);
        // --- Locked mode: fixed at center ---
        crosshair.style.display = "block";
        crosshair.style.position = "absolute";
        crosshair.style.top = "50%";
        crosshair.style.left = "50%";
        crosshair.style.transform = "translate(-50%, -50%)";

        // document.addEventListener("mousemove", Shared.onMouseMove, false);
    } else {
        // console.log("Pointer unlocked");
        Shared.resetAllActions();
        crosshair.style.display = "none";
        // Shared.canvas.addEventListener("mousemove", crossHairFollow);
        // document.getElementById('crosshair').style.display = 'none';
        // document.removeEventListener("mousemove", Shared.onMouseMove, false);
    }
});


function crossHairFollow(e){
    if (document.pointerLockElement !== Shared.canvas) {
        const rect = Shared.canvas.getBoundingClientRect();

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        crosshair.style.position = "absolute";
        crosshair.style.left = `${x}px`;
        crosshair.style.top = `${y}px`;
        crosshair.style.transform = "translate(-50%, -50%)";
    }
}

// function onMouseUp(event){
//     Editor.onMouseUp(event);
//     //right click
//     if (event.button == 2) {
//         // if (event.ctrlKey || event.metaKey) {
//         if (event.altKey) {
//             openPopup(Shared.meshpopup);
//         } else {
//             openPopup(Shared.matpopup);
//         }
//         document.exitPointerLock();
//     }
// }
// function onMouseClick(event){
//     Editor.onMouseClick(event);
//     // if (event.button == 2) {
//     //     closePopup();
//     // }
// }

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/
// Shared.canvas.addEventListener("click", (e) => {
//     if (document.pointerLockElement !== Shared.canvas) {
//         if (e.button == 2)
//             Shared.canvas.requestPointerLock(); // First click: lock pointer
//     }
// });

// Prevent default right-click menu
Shared.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

/*---------------------------------*/
// Track hover state
/*---------------------------------*/
Shared.canvas.addEventListener("mouseenter", () => {
    // console.log("mouseenter");
    Shared.setIsMouseOverCanvas(true);
});

Shared.canvas.addEventListener("mouseleave", () => {
    // console.log("mouseleave");
    Shared.setIsMouseOverCanvas(false);
});

/*-----------------------------------------------------*/
// WINDOW RESIZE
/*-----------------------------------------------------*/
window.addEventListener('resize', () => {
    resizeRenderer();
});

function resizeRenderer() {
    // Resize the 3D Shared.canvas
    Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);
    Shared.camera.aspect = Shared.container.clientWidth / Shared.container.clientHeight;
    Shared.camera.updateProjectionMatrix();

    // Resize the HUD canvas
    GameHUD.hudCanvas.width = Shared.container.clientWidth;
    GameHUD.hudCanvas.height = Shared.container.clientHeight;
}

/*-----------------------------------------------------*/
// KEYBOARD INPUTS
/*-----------------------------------------------------*/
document.addEventListener('keydown', (event) => {
    Shared.onKeyDownEvent(event);
});
document.addEventListener('keyup', (event) => {
    Shared.onKeyUpEvent(event);
});

/*-----------------------------------------------------*/
// CUSTOM EVENT
/*-----------------------------------------------------*/
document.addEventListener("UIChange", (e) => {
    const { field, value } = e.detail;
    switch (field) {
        case "gameModeChange":
            switch (value) {
                case Shared.MODEMENU:
                    //hide the uipanel in game mode and resize renderer
                    Shared.uipanel.classList.add("hidden");
                    // document.getElementById('canvas-container').appendChild(Stats.stats.dom);
                    break;      
                case Shared.MODEEDITOR:
                    //re-add the uipanel in editor mode and resize renderer
                    Shared.uipanel.classList.remove("hidden");
                    Stats.dockStats(true);
                    // document.getElementById('ui-panel').appendChild(Stats.stats.dom);
                    break;
                case Shared.MODEGAME:
                    //hide the uipanel in game mode and resize renderer
                    Shared.uipanel.classList.add("hidden");
                    Stats.dockStats(false);
                    // document.getElementById('canvas-container').appendChild(Stats.stats.dom);
                    // document.getElementById('canvas-container').appendChild(Stats.stats.dom);
                    break;
                default:
                    console.warn("game mode unsupported:", value);
                    break;
            }
            resizeRenderer();
            break;
        case "modeChange":
            document.querySelectorAll("#ui-panel .tab-header").forEach(
                h => {
                    const mode = h.dataset.mode;
                    if (mode == value) {
                        console.log("match mode found");
                        expandHeader(h);
                    }
                }
            );
            break;
        case "MaterialChange":
            const matPreviewCanvas = document.getElementById("matPreviewCanvas");
            drawValueInCanvas(value,matPreviewCanvas);
            break;
        case "MazeWallChange":
            const mazewallPreviewCanvas = document.getElementById("mazewallPreviewCanvas");
            drawValueInCanvas(value,mazewallPreviewCanvas);
            break;
        case "MazeFloorChange":
            const mazefloorPreviewCanvas = document.getElementById("mazefloorPreviewCanvas");
            drawValueInCanvas(value,mazefloorPreviewCanvas);
            break;
        case "MeshChange":
            const meshPreviewCanvas = document.getElementById("meshPreviewCanvas");
            const meshctx = meshPreviewCanvas.getContext("2d");
            const meshatlasImage = Shared.thumbDict.ATLASMATERIAL.map.image;

            // clear
            meshctx.clearRect(0, 0, meshPreviewCanvas.width, meshPreviewCanvas.height);
            
            let meshsize = Shared.thumbDict.SIZE;
            let meshnumy = Shared.thumbDict.NUMY-1;
            const meshsubImageX = (Shared.thumbDictUVsArray[value][1]?.x || 0) * meshsize;
            // const meshsubImageY = (meshnumy-(Shared.thumbDictUVsArray[value][1]?.y || 0)) * meshsize;
            const meshsubImageY = ((Shared.thumbDictUVsArray[value][1]?.y || 0)) * meshsize;
            // draw the selected subimage from the atlas into the preview canvas
            meshctx.drawImage(
                meshatlasImage,
                meshsubImageX, meshsubImageY, meshsize, meshsize, // source
                0, 0, meshPreviewCanvas.width, meshPreviewCanvas.height // destination
            );
            break;      
        case "WallChange":
            // ensure the option exists before setting
            const optionWExists = Array.from(wallHeightSelect.options).some(
                opt => opt.value === value
            );

            if (optionWExists) {
                wallHeightSelect.value = value;
            } else {
                console.warn("illegal wall height:", value);
            }
            break;    
        case "FloorChange":
            // ensure the option exists before setting
            const optionHExists = Array.from(floorHeightSelect.options).some(
                opt => opt.value === value
            );

            if (optionHExists) {
                floorHeightSelect.value = value;
            } else {
                console.warn("illegal floor height:", value);
            }
            break;    
        case "WallModeChange":
            const newValue = e.detail.value; // the value you sent
            const radios = document.querySelectorAll('input[name="wallOption"]');
            radios.forEach(radio => {
                radio.checked = (parseInt(radio.value, 10) === parseInt(newValue, 10));
            });
            break;
        case "openPopup":
            openPopup(value);
            document.exitPointerLock();
            break;
        default:
            console.log("default",field);
            break;
    }
});


function drawValueInCanvas(thisvalue,thiscanvas){
    const ctx = thiscanvas.getContext("2d");
    const atlasTexture = Shared.atlasMat.map;
    const atlasImage = atlasTexture.image;
    // clear
    ctx.clearRect(0, 0, thiscanvas.width, thiscanvas.height);
    
    let size = Shared.atlasDict.SIZE;
    let numy = Shared.atlasDict.NUMY-1;
    const subImageX = (Shared.atlasUVsArray[thisvalue][1]?.x || 0) * size;
    const subImageY = (numy-(Shared.atlasUVsArray[thisvalue][1]?.y || 0)) * size;
    // draw the selected subimage from the atlas into the preview canvas
    ctx.drawImage(
        atlasImage,
        subImageX, subImageY, size, size, // source
        0, 0, thiscanvas.width, thiscanvas.height // destination
    );
}


/*-----------------------------------------------------*/
// TAB EVENTS
/*-----------------------------------------------------*/

document.querySelectorAll("#ui-panel .tab-header").forEach(header => 
    header.addEventListener("click", () => expandHeader(header))
);

function expandHeader(header) {

    {
        const tab = header.parentElement;
        const isActive = tab.classList.contains("active");

        // Collapse all tabs
        document.querySelectorAll("#ui-panel .tab").forEach(
            t => {
                t.classList.remove("active");
            }
        );
        document.querySelectorAll("#ui-panel .tab-header").forEach(
            h => {
                h.classList.remove("green")
            }
        );

        // Expand if it wasn't already open
        if (!isActive) {
            tab.classList.add("active");
            header.classList.add("green");

            // Call setAddMode if the header has a mode
            const mode = parseInt(header.dataset.mode,10);
            Editor.setAddMode(mode);
            // switch (mode) {
            //     case Editor.ADDPLANEMODE:
            //         Editor.setAddMode(Editor.ADDPLANEMODE);
            //         console.log("ADDPLANEMODE");
            //         break;
            //     case Editor.ADDLIGHTMODE:
            //         Editor.setAddMode(Editor.ADDLIGHTMODE);
            //         console.log("ADDLIGHTMODE");
            //         break;
            //     // case "addMesh":
            //     //     Editor.setAddMode(Editor.ADDMESHMODE);
            //     //     // console.log("ADDMESHMODE");
            //     //     break;
            //     case "addPlane":
            //         break;
            // }

        }
    }
}


/*-----------------------------------------------------*/
// setupEditorUI
/*-----------------------------------------------------*/
export function setupEditorUI() {

    for (let i = 1; i <= Shared.WALLHEIGHTMAX; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;  // what the user sees
        wallHeightSelect.appendChild(option);
    }
    // wallHeightSelect.value = "2";//default
    wallHeightSelect.value = Shared.WALLHEIGHTDEFAULT.toString();

    for (let i = 0; i <= Shared.FLOORHEIGHTMAX; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;  // what the user sees
        floorHeightSelect.appendChild(option);
    }

    //setup the popup atlas canvas
    setupPopup(Shared.matpopupCanvas,Shared.atlasMat.map.image,Shared.atlasDict.SIZE,Editor.setMaterial);
    // setupPopup(Shared.meshpopupCanvas,Shared.thumbDict.ATLASMATERIAL.map.image,Shared.thumbDict.SIZE,Editor.setMeshFromMeshindex);
    // setupPopupSubset(Shared.meshpopupCanvas,Shared.thumbDict.IMAGE,128,Editor.setMeshFromMeshName, "PLANE");
    setupPopupSubset(Shared.meshpopupCanvas,Shared.thumbDict.IMAGE,128,Editor.setMeshFromMeshName);
    
    setupPopup(Shared.mazewallpopupCanvas,Shared.atlasMat.map.image,Shared.atlasDict.SIZE,Editor.setMazeWallMaterial);
    setupPopup(Shared.mazefloorpopupCanvas,Shared.atlasMat.map.image,Shared.atlasDict.SIZE,Editor.setMazeFloorMaterial);
}

/*-----------------------------------------------------*/
// POPUP
/*-----------------------------------------------------*/

let popupVisible = false;
function openPopup(thispopup, tr = false) {
    popupVisible = true;
    thispopup.style.display = "block";

    // if (x !== null && y !== null) {
    if (tr) {
        // top-right corner
        thispopup.style.top = "0px";
        thispopup.style.right = "0px";
        thispopup.style.left = "auto";
        thispopup.style.bottom = "auto";
        thispopup.style.transform = "none";
    } else {
        // center of screen
        thispopup.style.left = "50%";
        thispopup.style.top = "50%";
        thispopup.style.right = "auto";
        thispopup.style.bottom = "auto";
        thispopup.style.transform = "translate(-50%, -50%)";
    }
}
export function closePopup(){
    popupVisible = false;
    Shared.matpopup.style.display       = "none";  // toggle off if already open
    Shared.meshpopup.style.display      = "none";  // toggle off if already open
    Shared.mazewallpopup.style.display  = "none";  // toggle off if already open
    Shared.mazefloorpopup.style.display = "none";  // toggle off if already open
}

function setupPopup(thiscanvas,thisimage,thiscellsize,thisaction) {
    // const atlasCanvas = document.getElementById("atlasCanvas");
    const ctx = thiscanvas.getContext("2d");

    // const texture = Shared.atlasMat.map;
    // const atlasImage = texture.image;  // this is the real <img> or <canvas>

    if (!thisimage) {
        console.warn("Atlas texture has no image yet");
        return;
    }

    thiscanvas.width = thisimage.width;
    thiscanvas.height = thisimage.height;

    ctx.drawImage(thisimage, 0, 0);


    // const cellSize = Shared.atlasDict.SIZE; // adjust to your atlas tile size

    thiscanvas.addEventListener("click", (e) => {
        const rect = thiscanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / thiscellsize);
        const row = Math.floor(y / thiscellsize);
        const index = row * (thiscanvas.width / thiscellsize) + col;

        // console.log("Clicked subimage:", { row, col, index });

        thisaction(index);

        closePopup();
        // Shared.canvas.requestPointerLock()
    });

    thiscanvas.addEventListener("mousemove", (e) => {
        const rect = thiscanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / thiscellsize);
        const row = Math.floor(y / thiscellsize);

        // console.log(x,y,col,row);

        // redraw atlas
        ctx.clearRect(0, 0, thiscanvas.width, thiscanvas.height);
        ctx.drawImage(thisimage, 0, 0);

        // highlight hovered cell
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.strokeRect(col * thiscellsize, row * thiscellsize, thiscellsize, thiscellsize);

    });

}

// let currentCategoryIndex = 0;
// const categories = ["PLANE", "PILLAR", "DOME", "GRID"]; // add all your subsets here
// function setupPopupSubset(thiscanvas, theseimages, thiscellsize, thisaction, prefix = "") {
//     const ctx = thiscanvas.getContext("2d");

//     // 1. Collect all matching keys
//     const keys = Object.keys(theseimages).filter(k => k.startsWith(prefix));
//     // const keys = Object.keys(Shared.atlasDict).filter(k => k.startsWith(prefix));

//     if (keys.length === 0) {
//         console.warn(`No subimages found starting with "${prefix}"`);
//         return;
//     }

//     // Thumbnail size (you can scale them down if needed)
//     // const thumbW = 64;
//     // const thumbH = 64;
//     const thumbW = thiscellsize;
//     const thumbH = thumbW;

//     // Decide grid size
//     const cols = 6; // how many per row
//     // const cols = Math.sqrt(keys.length); // how many per row
//     const rows = Math.ceil(keys.length / cols);

//     // Resize canvas to fit thumbnails
//     const padding = 100;
//     thiscanvas.width = cols * thumbW+padding;
//     thiscanvas.height = rows * thumbH;

//     // Lookup table from cell index → key
//     const indexToKey = {};

//     function redraw(highlightIndex = null) {
//         ctx.clearRect(0, 0, thiscanvas.width, thiscanvas.height);

//         keys.forEach((key, i) => {
//             const col = i % cols;
//             const row = Math.floor(i / cols);
//             const x = col * thumbW+padding/2;
//             const y = row;

//             // draw the subimage (scaled to fit thumbnail)
//             ctx.drawImage(theseimages[key], 0, 0, theseimages[key].width, theseimages[key].height,
//                           x, y, thumbW, thumbH);

//             // store mapping
//             indexToKey[i] = key;

//             // highlight if hovered
//             if (highlightIndex === i) {
//                 // highlight border
//                 ctx.strokeStyle = "yellow";
//                 ctx.lineWidth = 2;
//                 ctx.strokeRect(x, y, thumbW, thumbH);

//                 // draw text label
//                 // ctx.fillStyle = "rgba(0,0,0,0.7)";
//                 // ctx.fillRect(x, y + thumbH - 18, thumbW, 18);

//                 // ctx.fillStyle = "white";
//                 // ctx.font = "12px sans-serif";
//                 // ctx.textAlign = "center";
//                 // ctx.textBaseline = "middle";
//                 // ctx.fillText(key, x + thumbW / 2, y + thumbH - 9);
//             }
//         });
//     }

//     redraw();

//     // Handle mouse events
//     function getIndexFromEvent(e) {
//         const rect = thiscanvas.getBoundingClientRect();
//         const x = e.clientX - rect.left;
//         const y = e.clientY - rect.top;
//         const col = Math.floor(x / thumbW);
//         const row = Math.floor(y / thumbH);
//         const i = row * cols + col;
//         return (i >= 0 && i < keys.length) ? i : null;
//     }

//     // --- tooltip div ---
//     const tooltip = document.createElement("div");
//     tooltip.style.position = "fixed";
//     tooltip.style.pointerEvents = "none";
//     tooltip.style.background = "rgba(0,0,0,0.75)";
//     tooltip.style.color = "white";
//     tooltip.style.padding = "2px 6px";
//     tooltip.style.borderRadius = "4px";
//     tooltip.style.fontSize = "12px";
//     tooltip.style.visibility = "hidden";
//     tooltip.style.zIndex = "2000";
//     document.body.appendChild(tooltip);


//     thiscanvas.addEventListener("click", (e) => {
//         const index = getIndexFromEvent(e);
//         if (index !== null) {
//             const key = indexToKey[index];
//             thisaction(key);
//             closePopup();
//         }
//     });

//     thiscanvas.addEventListener("mousemove", (e) => {
//         const index = getIndexFromEvent(e);
//         redraw(index);

//         if (index !== null) {
//             const key = indexToKey[index];
//             tooltip.textContent = key;
//             tooltip.style.left = e.clientX + 12 + "px";
//             tooltip.style.top = e.clientY + 12 + "px";
//             tooltip.style.visibility = "visible";
//         } else {
//             tooltip.style.visibility = "hidden";
//         }

//     });

//     thiscanvas.addEventListener("mouseleave", () => {
//         tooltip.style.visibility = "hidden";
//         redraw(null);
//     });


//     document.getElementById("leftArrow").addEventListener("click", prevCategory);
//     document.getElementById("rightArrow").addEventListener("click", nextCategory);    


//     function prevCategory() {
//         console.log("prevCategory");
//         currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
//         refreshPopup(categories[currentCategoryIndex]);
//     }
//     function nextCategory() {
//         console.log("nextCategory");
//         currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
//         refreshPopup(categories[currentCategoryIndex]);

//     }
//     function refreshPopup(prefix) {
//         setupPopupSubset(
//             thiscanvas,
//             theseimages, // all images
//             thiscellsize,              // cell size
//             thisaction,
//             prefix
//         );
//     }

// }

const popuppadding = 100;
function drawPopupCanvas(ctx, images, keys, thumbW, thumbH, cols, highlightIndex = null) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    keys.forEach((key, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * thumbW + popuppadding/2;
        const y = row * thumbH;

        ctx.drawImage(
            images[key],
            0, 0, images[key].width, images[key].height,
            x, y, thumbW, thumbH
        );

        if (highlightIndex === i) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, thumbW, thumbH);
        }
    });
}

function setupPopupSubset(thiscanvas, images, cellSize, action) {
    const ctx = thiscanvas.getContext("2d");

    let currentCategoryIndex = 0;
    const categories = ["PLANE", "PILLAR", "DOME", "GRID", "ARCH", ""];
    let keys = [];

    // Tooltip setup (only once)
    let tooltip = document.getElementById("meshPopupTooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "meshPopupTooltip";
        tooltip.style.position = "fixed";
        tooltip.style.pointerEvents = "none";
        tooltip.style.background = "rgba(0,0,0,0.75)";
        tooltip.style.color = "white";
        tooltip.style.padding = "2px 6px";
        tooltip.style.borderRadius = "4px";
        tooltip.style.fontSize = "12px";
        tooltip.style.visibility = "hidden";
        tooltip.style.zIndex = "2000";
        document.body.appendChild(tooltip);
    }

    const thumbW = cellSize;
    const thumbH = cellSize;
    const cols = 6;

    function updateKeys() {
        const prefix = categories[currentCategoryIndex];
        if (prefix !== "") {
            // Normal category: filter by prefix
            keys = Object.keys(images).filter(k => k.startsWith(prefix));
        } else {
            // Catch-all category: pick everything that doesn't start with any other category prefix
            const otherPrefixes = categories.slice(0, -1); // all except last (which is "")
            keys = Object.keys(images).filter(k => {
                return !otherPrefixes.some(p => k.startsWith(p));
            });
        }
        const rows = Math.ceil(keys.length / cols);
        thiscanvas.width = cols * thumbW + popuppadding;
        thiscanvas.height = rows * thumbH;
    }

    function redraw(highlightIndex = null) {
        drawPopupCanvas(ctx, images, keys, thumbW, thumbH, cols, highlightIndex);
    }

    function getIndexFromEvent(e) {
        const rect = thiscanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / thumbW);
        const row = Math.floor(y / thumbH);
        const i = row * cols + col;
        return (i >= 0 && i < keys.length) ? i : null;
    }

    function refreshPopup() {
        updateKeys();
        document.getElementById("popupCategoryTitle").textContent =
            categories[currentCategoryIndex] || "OTHER";
        redraw();
    }

    // --- Event listeners (attached only once) ---
    thiscanvas.addEventListener("mousemove", (e) => {
        const index = getIndexFromEvent(e);
        redraw(index);
        if (index !== null) {
            tooltip.textContent = keys[index];
            tooltip.style.left = e.clientX + 12 + "px";
            tooltip.style.top = e.clientY + 12 + "px";
            tooltip.style.visibility = "visible";
        } else {
            tooltip.style.visibility = "hidden";
        }
    });

    thiscanvas.addEventListener("click", (e) => {
        const index = getIndexFromEvent(e);
        if (index !== null) {
            action(keys[index]);
            closePopup();
        }
    });

    thiscanvas.addEventListener("mouseleave", () => {
        tooltip.style.visibility = "hidden";
        redraw(null);
    });

    document.getElementById("leftArrow").addEventListener("click", () => {
        currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
        refreshPopup();
    });
    document.getElementById("rightArrow").addEventListener("click", () => {
        currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
        refreshPopup();
    });

    // thiscanvas.addEventListener("keydown", (e) => {
    document.addEventListener("keydown", (e) => {
        // console.log("keydown");
        if (popupVisible) {
            if (true) {
                // if (e.key === "ArrowLeft") {
                if (e.code === "KeyA") {
                    console.log("keydown");
                    currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
                    refreshPopup();
                }
                // if (e.key === "ArrowRight") {
                if (e.code === "KeyD") {
                    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
                    refreshPopup();
                }
            }
        }
    });

    // Initial draw
    refreshPopup();
}





/*-----------------------------------------------------*/
// RADIOS EVENT LISTENERS
/*-----------------------------------------------------*/
radios.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (event.target.checked) {
        Editor.setWallMode(parseInt(event.target.value, 10));
        Shared.editorState.renderOneFrame = true;
    }
  });
});