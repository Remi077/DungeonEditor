/*-----------------------------------------------------*/
// IMPORTS //
/*-----------------------------------------------------*/

import * as Shared from './shared.js';
import * as Editor from './editor/editor.js';
import * as EditorUI from './editor/editorUI.js';
import * as Game from './game/game.js';

/*-----------------------------------------------------*/
// REVISION NUMBER
/*-----------------------------------------------------*/

// revision hash
const revision = "0.2"; // Replace with actual Git hash

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
    console.log("You're on a mobile device!");
} else {
    console.log("You're on a desktop!");
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
 │    ├──> shared
 │    └──> gameHUD
 └── shared ─────────> LoadResources

*/

//main->editor
//main->game
//main->shared
//main->editorUI

//editorUI->editor
//editorUI->shared
//editorUI->gameHUD

//editor->stats
//editor->shared
//editor->gameHUD

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

        //load assets
        await Shared.loadResources();

        //setup editor scene
        Editor.setupEditor();

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

    } catch (error) {
        console.error("Error: ", error);
    }
}

//start here
setupAndStart();



