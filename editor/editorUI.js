
import * as Shared from '../shared.js';
import * as Editor from './editor.js';
import * as GameHUD from '../game/gameHUD.js';


/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
const AddBtn   = document.getElementById('AddBtn');
const AddLBtn  = document.getElementById('AddLBtn');
const LoadBtn  = document.getElementById('LoadBtn');
const SaveBtn  = document.getElementById('SaveBtn');
const BakeBtn  = document.getElementById('BakeBtn');
const ResetBtn = document.getElementById('ResetBtn');
const StartBtn = document.getElementById('StartBtn');

/*-----------------------------------------------------*/
// BUTTON LISTENERS
/*-----------------------------------------------------*/
AddBtn.addEventListener('click', () => {
    Shared.canvas.focus();
    Shared.canvas.requestPointerLock();
    Editor.setAddMode(ADDPLANEMODE);
});
AddLBtn.addEventListener('click', () => {
    Shared.canvas.focus();
    Shared.canvas.requestPointerLock();
    Editor.setAddMode(ADDLIGHTMODE);
});
LoadBtn.addEventListener('click', () => { Editor.loadLevel(); });
SaveBtn.addEventListener('click', () => { Editor.saveLevel(); });
BakeBtn.addEventListener('click', () => { Editor.bakeLevel(); });
ResetBtn.addEventListener('click', () => { Editor.resetLevel(); });
StartBtn.addEventListener('click', () => { Shared.toggleGameMode(); });


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

