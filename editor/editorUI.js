
import * as Shared from '../shared.js';
import * as Editor from './editor.js';
import * as GameHUD from '../game/gameHUD.js';


/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
// const AddBtn   = document.getElementById('AddBtn');
// const AddLBtn  = document.getElementById('AddLBtn');
const LoadBtn       = document.getElementById('LoadBtn');
const SaveBtn       = document.getElementById('SaveBtn');
const BakeBtn       = document.getElementById('BakeBtn');
const ResetBtn      = document.getElementById('ResetBtn');
const StartBtn      = document.getElementById('StartBtn');
const matSelectBtn  = document.getElementById("matSelectBtn");
const meshSelectBtn = document.getElementById("meshSelectBtn");

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
BakeBtn.addEventListener('click', () => { Editor.bakeLevel(); });
ResetBtn.addEventListener('click', () => { Editor.resetLevel(); });
StartBtn.addEventListener('click', () => { Shared.toggleGameMode(); });
matSelectBtn.addEventListener('click', () => { openPopup(Shared.matpopup,true); });
meshSelectBtn.addEventListener('click', () => { openPopup(Shared.meshpopup,true); });

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
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === Shared.canvas) {
        // Shared.editorState.pause = false;
        Shared.setPause(false);
        console.log("Pointer locked");
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('pointer-lock-hint').style.display = 'block';
        document.addEventListener("mousemove", Shared.onMouseMove, false);
        document.addEventListener("mousedown", onMouseClick, false);
        document.addEventListener("mouseup", onMouseUp, false);
        document.addEventListener("wheel", Editor.onMouseWheel, { passive: false });
        closePopup();
    } else {
        // Shared.editorState.pause = true;
        Shared.setPause(true);
        console.log("Pointer unlocked");
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('pointer-lock-hint').style.display = 'none';
        document.removeEventListener("mousemove", Shared.onMouseMove, false);
        document.removeEventListener("mousedown", onMouseClick, false);
        document.removeEventListener("mouseup", onMouseUp, false);
        document.removeEventListener("wheel", Editor.onMouseWheel, false);
    }
});

function onMouseUp(event){
    Editor.onMouseUp(event);
    //right click
    if (event.button == 2) {
        // if (event.ctrlKey || event.metaKey) {
        if (event.altKey) {
            openPopup(Shared.meshpopup);
        } else {
            openPopup(Shared.matpopup);
        }
        document.exitPointerLock();
    }
}
function onMouseClick(event){
    Editor.onMouseClick(event);
    // if (event.button == 2) {
    //     closePopup();
    // }
}

/*-----------------------------------------------------*/
// GAMEPLAY GLOBAL VARIABLES
/*-----------------------------------------------------*/
Shared.canvas.addEventListener("click", () => {
    if (document.pointerLockElement !== Shared.canvas) {
        Shared.canvas.requestPointerLock(); // First click: lock pointer
    }
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
                    break;      
                case Shared.MODEEDITOR:
                    //re-add the uipanel in editor mode and resize renderer
                    Shared.uipanel.classList.remove("hidden");
                    break;
                case Shared.MODEGAME:
                    //hide the uipanel in game mode and resize renderer
                    Shared.uipanel.classList.add("hidden");
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
            const ctx = matPreviewCanvas.getContext("2d");
            const atlasTexture = Shared.atlasMat.map;
            const atlasImage = atlasTexture.image;
            // clear
            ctx.clearRect(0, 0, matPreviewCanvas.width, matPreviewCanvas.height);
            
            let size = Shared.atlasDict.SIZE;
            let numy = Shared.atlasDict.NUMY-1;
            const subImageX = (Shared.atlasUVsArray[value][1]?.x || 0) * size;
            const subImageY = (numy-(Shared.atlasUVsArray[value][1]?.y || 0)) * size;
            // draw the selected subimage from the atlas into the preview canvas
            ctx.drawImage(
                atlasImage,
                subImageX, subImageY, size, size, // source
                0, 0, matPreviewCanvas.width, matPreviewCanvas.height // destination
            );
            break;
            // case "MaterialChange":
        //     // ensure the option exists before setting
        //     const optionExists = Array.from(matSelect.options).some(
        //         opt => opt.value === value
        //     );

        //     if (optionExists) {
        //         matSelect.value = value;
        //     } else {
        //         console.warn("No such material in combobox:", value);
        //     }
        //     break;
        case "MeshChange":
            const meshPreviewCanvas = document.getElementById("meshPreviewCanvas");
            const meshctx = meshPreviewCanvas.getContext("2d");
            const meshatlasImage = Shared.thumbDict.ATLASMATERIAL.map.image;

            // clear
            meshctx.clearRect(0, 0, meshPreviewCanvas.width, meshPreviewCanvas.height);
            
            let meshsize = Shared.thumbDict.SIZE;
            let meshnumy = Shared.thumbDict.NUMY-1;
            const meshsubImageX = (Shared.thumbDictUVsArray[value][1]?.x || 0) * meshsize;
            const meshsubImageY = (meshnumy-(Shared.thumbDictUVsArray[value][1]?.y || 0)) * meshsize;
            // draw the selected subimage from the atlas into the preview canvas
            meshctx.drawImage(
                meshatlasImage,
                meshsubImageX, meshsubImageY, meshsize, meshsize, // source
                0, 0, meshPreviewCanvas.width, meshPreviewCanvas.height // destination
            );
            break;      
        // case "MeshChange":
        //     // ensure the option exists before setting
        //     const optionMeshExists = Array.from(meshSelect.options).some(
        //         opt => opt.value === value
        //     );

        //     if (optionMeshExists) {
        //         meshSelect.value = value;
        //     } else {
        //         console.warn("No such mesh in combobox:", value);
        //     }
        //     break;      
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
        default:
            console.log("default",field);
            break;
    }
});


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
            const mode = header.dataset.mode;
            switch (mode) {
                case "addPlane":
                    Editor.setAddMode(Editor.ADDPLANEMODE);
                    // console.log("ADDPLANEMODE");
                    break;
                case "addLight":
                    Editor.setAddMode(Editor.ADDLIGHTMODE);
                    // console.log("ADDLIGHTMODE");
                    break;
                case "addMesh":
                    Editor.setAddMode(Editor.ADDMESHMODE);
                    // console.log("ADDMESHMODE");
                    break;
                case "addPlane":
                    break;
            }

        }
    }
}


/*-----------------------------------------------------*/
// setupEditorUI
/*-----------------------------------------------------*/
export function setupEditorUI() {
    // set material combobox
    // const matSelect = document.getElementById("matSelect");
    // fill combo with keys from matDict

    // Object.keys(Shared.atlasUVs).forEach(key => {
    //     const option = document.createElement("option");
    //     option.value = key;
    //     option.textContent = key;  // visible label
    //     matSelect.appendChild(option);
    // });

    // set default starting value
    // if (matSelect.options.length > 0) {
    //     matSelect.value = Object.keys(Shared.atlasUVs)[0]; // first key as default
    // }

    // set mesh combobox
    // const meshSelect = document.getElementById("meshSelect");
    // fill combo with keys from atlasMesh
    // Object.keys(Shared.atlasMesh).forEach(key => {
    //     const option = document.createElement("option");
    //     option.value = key;
    //     option.textContent = key;  // visible label
    //     meshSelect.appendChild(option);
    // });

    // set mesh combobox
    // const heightSelect = document.getElementById("heightSelect");
    // fill combo with keys from atlasMesh
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
    setupPopup(Shared.meshpopupCanvas,Shared.thumbDict.ATLASMATERIAL.map.image,Shared.thumbDict.SIZE,Editor.setMeshFromMeshindex);
}

/*-----------------------------------------------------*/
// POPUP
/*-----------------------------------------------------*/

function openPopup(thispopup, tr = false) {
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
    Shared.matpopup.style.display = "none"; // toggle off if already open
    Shared.meshpopup.style.display = "none"; // toggle off if already open
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
        Shared.canvas.requestPointerLock()
    });

    thiscanvas.addEventListener("mousemove", (e) => {
        const rect = thiscanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / thiscellsize);
        const row = Math.floor(y / thiscellsize);

        // redraw atlas
        ctx.clearRect(0, 0, thiscanvas.width, thiscanvas.height);
        ctx.drawImage(thisimage, 0, 0);

        // highlight hovered cell
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.strokeRect(col * thiscellsize, row * thiscellsize, thiscellsize, thiscellsize);

    });

}

// const popupbtn = document.getElementById('Item 1');
// popupbtn.addEventListener('click', () => {
//     console.log("popup");
//     closePopup();
//     Shared.canvas.requestPointerLock()
// });

/*-----------------------------------------------------*/
// RADIOS EVENT LISTENERS
/*-----------------------------------------------------*/
radios.forEach(radio => {
  radio.addEventListener('change', (event) => {
    if (event.target.checked) {
        Editor.setWallMode(parseInt(event.target.value, 10));
        Shared.editorState.renderOneFrame = true;
    //   console.log("Radio group name:", event.target.name);  // 👉 "wallOption"
    //   console.log("Selected option id:", event.target.id);  // 👉 "ceiling", "leftwall" etc
    //   console.log("Selected option value:", event.target.value); // 👉 "ceiling", "leftwall" etc
    }
  });
});
