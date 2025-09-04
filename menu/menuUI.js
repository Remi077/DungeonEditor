
import * as Shared from '../shared.js';

/*-----------------------------------------------------*/
//  BUTTONS
/*-----------------------------------------------------*/
const Menu     = document.getElementById('menu');
const StartBtn = document.getElementById('menu-start');
const LoadBtn  = document.getElementById('menu-load');
const EditBtn  = document.getElementById('menu-editor');

/*-----------------------------------------------------*/
// BUTTON LISTENERS
/*-----------------------------------------------------*/
StartBtn.addEventListener('click', () => { console.log("StartBtn");  Shared.setMode(Shared.MODEGAME); });
LoadBtn.addEventListener('click', () => { console.log("LoadBtn"); });
EditBtn.addEventListener('click', () => { console.log("EditBtn"); Shared.setMode(Shared.MODEEDITOR); });

/*-----------------------------------------------------*/
// CUSTOM EVENT
/*-----------------------------------------------------*/
document.addEventListener("UIChange", (e) => {
    const { field, value } = e.detail;
    switch (field) {
        case "gameModeChange":
            switch (value) {
                case Shared.MODEMENU:
                    //display the menu
                    Menu.classList.remove("hidden");
                    break;
                default:
                    //hide the menu
                    Menu.classList.add("hidden");
                    break;
            }
            break;
        default:
            // console.log("default",field);
            break;
    }
});
