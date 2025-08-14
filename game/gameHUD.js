import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as Shared from '../shared.js';
//OTHER IMPORTS FORBIDDEN! CIRCULAR DEPENDENCIES

// HUD variables
let messageScreen        = "";
let messageScale         = 0;
let messageTargetScale   = 1;
let messageScaleDuration = 0.8;                                        //in seconds
let messageScaleSpeed    = messageTargetScale / messageScaleDuration;

// Create a 2D canvas for overlay
export const hudCanvas = document.getElementById('hud-canvas');
hudCanvas.width = Shared.container.clientWidth;
hudCanvas.height = Shared.container.clientHeight;

const hudContext = hudCanvas.getContext('2d');

// Clear the canvas (transparent background)
hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

// Example: Draw a simple text overlay (debugging HUD)
hudContext.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Semi-transparent white
hudContext.font = '20px Arial';

/*---------------------------------*/
// setMessageScreen
/*---------------------------------*/
export function setMessageScreen(s) {
    messageScreen=s;
}

/*---------------------------------*/
// drawHUD
/*---------------------------------*/
export function drawHUD(delta = 1) {
    // Clear the canvas for redrawing
    hudContext.clearRect(0, 0, hudCanvas.width, hudCanvas.height);

    // Text box styles
    hudContext.font = '20px Arial';
    hudContext.textAlign = 'left';

    // Draw "Score" at the top-left corner with a surrounding rectangle
    // const scoreText = `TileCount: ${tilecount}`;
    const scoreText = ` `;
    const scoreMetrics = hudContext.measureText(scoreText);
    const scorePadding = 10; // Padding for the rectangle
    const scoreRectWidth = scoreMetrics.width + scorePadding * 2;
    const scoreRectHeight = 30; // Fixed height for simplicity
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    hudContext.fillStyle = 'White';
    hudContext.fillText(scoreText, 10, 25); // Text inside rectangle

    // Draw "Lives" at the top-right corner with a surrounding rectangle
    hudContext.textAlign = 'right';
    const livesText = ` `;
    const livesMetrics = hudContext.measureText(livesText);
    const livesRectWidth = livesMetrics.width + scorePadding * 2;
    const livesRectX = hudCanvas.width - livesRectWidth - 5; // Position from the right edge
    hudContext.fillStyle = 'rgba(255, 255, 255, 0.5)';
    hudContext.fillStyle = 'White';
    hudContext.fillText(livesText, hudCanvas.width - 10, 25); // Text inside rectangle

    // Scaling the "Game Over" message
    if (messageScale < messageTargetScale) {
        messageScale += messageScaleSpeed * delta; // Gradually increase the scale
        if (messageScale > messageTargetScale) {
            messageScale = messageTargetScale; // Clamp to the target scale
        }
    }

    hudContext.save(); // Save the current canvas state
    hudContext.translate(hudCanvas.width / 2, hudCanvas.height / 2); // Move to the center
    hudContext.scale(messageScale, messageScale); // Apply scaling

    // Draw the "Game Over" message
    hudContext.font = '60px Arial';
    hudContext.textAlign = 'center';
    hudContext.fillStyle = 'rgba(255, 0, 0, 0.9)';
    hudContext.fillText(messageScreen, 0, 20); // Text is now centered and scaled
    hudContext.restore(); // Restore the original canvas state

}
