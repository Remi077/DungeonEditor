/*-----------------------------------------------------*/
// IMPORTS //
/*-----------------------------------------------------*/

import * as Shared from './shared.js';
import * as Editor from './editor/editor.js';
import * as EditorUI from './editor/editorUI.js';
import * as MenuUI from './menu/menuUI.js';
import * as Game from './game/game.js';

/*-----------------------------------------------------*/
// REVISION NUMBER
/*-----------------------------------------------------*/

// revision hash
const revision = "0.69"; // Replace with actual Git hash

// Add it to the div
document.getElementById('revision-info').innerText = `Version: ${revision}`;

//pick params passed from url
// const params = new URLSearchParams(window.location.search);
// const compressed = params.get("level");
// console.log("compressed", compressed);

/*-----------------------------------------------------*/
// PLATFORM MANAGEMENT
/*-----------------------------------------------------*/

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}
// Usage
if (isMobile()) {
    console.log("You're on a mobile device! revision:", revision);
} else {
    console.log("You're on a desktop! revision:", revision);
}



//DEPENDENCIES DIAGRAM

/*

main
 ├── editor ───────┐
 │    ├── stats ───┼──> shared
 │    ├── shared   │
 │    └── gameHUD──┘
 ├── game ─────────┐
 │    ├── stats ───┼──> shared
 │    ├── shared   │
 │    └── gameHUD──┘
 ├── editorUI
 │    ├──> editor
 │    ├──> stats ─────> shared
 │    ├──> shared
 │    └──> gameHUD
 ├── menuUI ──────────> shared
 │ 
 └── shared ─────────> LoadResources

*/

//main->editor
//main->game
//main->shared
//main->editorUI
//main->menuUI

//editorUI->editor
//editorUI->shared
//editorUI->gameHUD

//editor->stats
//editor->shared
//editor->gameHUD

//menuUI->shared

//game->stats
//game->shared
//game->gameHUD

//gameHUD->shared

//stats->shared

//shared->LoadResources


/*-----------------------------------------------------*/
// SETUP AND START GAME
/*-----------------------------------------------------*/

async function setupAndStart() {
    try {

        //init Rapier
        await Shared.initRapier();

        //load assets
        await Shared.loadResources();

        //setup editor scene
        Editor.setupEditor();
        EditorUI.setupEditorUI();

        //wire the callbacks here to avoid circular dependencies
        Shared.setStartEditorLoop(Editor.startEditorLoop);
        Shared.setStopEditorLoop(Editor.stopEditorLoop);
        Shared.setStartGameLoop(Game.startGameLoop);
        Shared.setStopGameLoop(Game.stopGameLoop);
        Shared.setEditorActions(Editor.Actions);
        Shared.setGameActions(Game.Actions);
        Shared.setEditorActionsMap(Editor.ActionToKeyMap);
        Shared.setGameActionsMap(Game.ActionToKeyMap);
        
        // Start editor loop
        Shared.setMode(Shared.MODEEDITOR);
        // Shared.setMode(Shared.MODEMENU);

    } catch (error) {
        console.error("Error: ", error);
    }
}

//start here
setupAndStart();



