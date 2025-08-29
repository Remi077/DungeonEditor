
import * as Shared from '../shared.js';
import * as Editor from './editor.js';
import * as GameHUD from '../game/gameHUD.js';


/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
// const AddBtn   = document.getElementById('AddBtn');
// const AddLBtn  = document.getElementById('AddLBtn');
const LoadBtn  = document.getElementById('LoadBtn');
const SaveBtn  = document.getElementById('SaveBtn');
const BakeBtn  = document.getElementById('BakeBtn');
const ResetBtn = document.getElementById('ResetBtn');
const StartBtn = document.getElementById('StartBtn');

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

/*-----------------------------------------------------*/
// COMBOBOX
/*-----------------------------------------------------*/
const matSelect = document.getElementById("matSelect");
const meshSelect = document.getElementById("meshSelect");
const wallHeightSelect = document.getElementById("wallHeightSelect");
const floorHeightSelect = document.getElementById("floorHeightSelect");

/*-----------------------------------------------------*/
// COMBOBOX LISTENER
/*-----------------------------------------------------*/
matSelect.addEventListener("change", (event) => {
    Editor.setCurrentUVIndex(event.target.selectedIndex);
    Editor.setMesh(event.target.selectedIndex,Editor.getCurrentMeshIndex());
    console.log("event.target.selectedIndex",event.target.selectedIndex);
});
meshSelect.addEventListener("change", (event) => {
    Editor.setCurrentMeshIndex(event.target.selectedIndex);
    Editor.setMesh(Editor.getCurrentUVIndex(), event.target.selectedIndex);
});
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
// Shared.editorState.pause = true; //start paused
document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement === Shared.canvas) {
        // Shared.editorState.pause = false;
        Shared.setPause(false);
        console.log("Pointer locked");
        document.getElementById('crosshair').style.display = 'block';
        document.getElementById('pointer-lock-hint').style.display = 'block';
        document.addEventListener("mousemove", Shared.onMouseMove, false);
        document.addEventListener("mousedown", Editor.onMouseClick, false);
        document.addEventListener("mouseup", Editor.onMouseUp, false);
        document.addEventListener("wheel", Editor.onMouseWheel, false);

    } else {
        // Shared.editorState.pause = true;
        Shared.setPause(true);
        console.log("Pointer unlocked");
        document.getElementById('crosshair').style.display = 'none';
        document.getElementById('pointer-lock-hint').style.display = 'none';
        document.removeEventListener("mousemove", Shared.onMouseMove, false);
        document.removeEventListener("mousedown", Editor.onMouseClick, false);
        document.removeEventListener("mouseup", Editor.onMouseUp, false);
        document.removeEventListener("wheel", Editor.onMouseWheel, false);
    }
});

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
    // Resize the 3D Shared.canvas
    Shared.renderer.setSize(Shared.container.clientWidth, Shared.container.clientHeight);
    Shared.camera.aspect = Shared.container.clientWidth / Shared.container.clientHeight;
    Shared.camera.updateProjectionMatrix();

    // Resize the HUD canvas
    GameHUD.hudCanvas.width = Shared.container.clientWidth;
    GameHUD.hudCanvas.height = Shared.container.clientHeight;
});

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
            // ensure the option exists before setting
            const optionExists = Array.from(matSelect.options).some(
                opt => opt.value === value
            );

            if (optionExists) {
                matSelect.value = value;
            } else {
                console.warn("No such material in combobox:", value);
            }
            break;
        case "MeshChange":
            // ensure the option exists before setting
            const optionMeshExists = Array.from(meshSelect.options).some(
                opt => opt.value === value
            );

            if (optionMeshExists) {
                meshSelect.value = value;
            } else {
                console.warn("No such mesh in combobox:", value);
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
                console.warn("illegal height:", value);
            }
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
    Object.keys(Shared.atlasUVs).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;  // visible label
        matSelect.appendChild(option);
    });

    // set default starting value
    // if (matSelect.options.length > 0) {
    //     matSelect.value = Object.keys(Shared.atlasUVs)[0]; // first key as default
    // }

    // set mesh combobox
    // const meshSelect = document.getElementById("meshSelect");
    // fill combo with keys from atlasMesh
    Object.keys(Shared.atlasMesh).forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key;  // visible label
        meshSelect.appendChild(option);
    });

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

}

