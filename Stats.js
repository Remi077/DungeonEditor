import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import * as Shared from './shared.js';
//OTHER IMPORTS FORBIDDEN! CIRCULAR DEPENDENCIES

/*-----------------------------------------------------*/
// DISPLAY BROWSER FPS
/*-----------------------------------------------------*/

export const stats = new Stats();
// stats.dom.style.position = 'relative'; // <-- remove fixed position
// stats.dom.style.top = 'auto';
// stats.dom.style.left = 'auto';
// stats.dom.style.marginTop = '10px';
// stats.dom.style.transform = 'scale(2)';
// stats.dom.style.transformOrigin = 'top left';
// document.getElementById('ui-panel').appendChild(stats.dom);
// document.getElementById('canvas-container').appendChild(stats.dom);
export function dockStats(inUI){
    if (inUI){
        stats.dom.style.position = 'relative'; // <-- remove fixed position
        stats.dom.style.top = 'auto';
        stats.dom.style.left = 'auto';
        stats.dom.style.right = '0px';
        stats.dom.style.marginTop = '10px';
        stats.dom.style.transform = 'scale(2)';
        stats.dom.style.transformOrigin = 'top left';
        document.getElementById('ui-panel').appendChild(stats.dom);
    } else {
        stats.dom.style.position = 'absolute';
        stats.dom.style.top = '100px';
        stats.dom.style.left = 'auto';
        stats.dom.style.right = '100px';
        stats.dom.style.margin = '0';
        stats.dom.style.transform = 'scale(2)';
        stats.dom.style.transformOrigin = 'top right';
        document.getElementById('main-container').appendChild(stats.dom);
    }
}



// stats
export const renderStats = {
    drawcalls: 0,
    frameCount: 0
}

let lastFrameTime = performance.now();
let fps = 0;
let lastStatsUpdate = 0;
const statsUpdateInterval = 500; // ms - freq to update stats

/*---------------------------------*/
// updateTextStatsThrottled
/*---------------------------------*/
export function updateTextStatsThrottled() {
    const now = performance.now();
    renderStats.frameCount++;
    // FPS counter (average over 1 sec)
    if (now - lastFrameTime >= 1000) {
        fps = renderStats.frameCount;
        renderStats.frameCount = 0;
        lastFrameTime = now;
        document.getElementById('fps').textContent = fps;
    }
    document.getElementById('drawCalls').textContent = renderStats.drawcalls;
    document.getElementById('Colliders').textContent = Shared.physWorld.colliders.len();
    document.getElementById('RigidBodies').textContent = Shared.physWorld.bodies.len();

    //update other stats requiring Shared.scene traversal every statsUpdateInterval
    if (now - lastStatsUpdate < statsUpdateInterval) return;
    lastStatsUpdate = now;
    updateTextStats();
}

/*---------------------------------*/
// updateTextStats
/*---------------------------------*/
function updateTextStats() {

    // Mesh count
    let meshCount = 0;
    let lightCount = 0;
    let visibleMeshCount = 0;
    Shared.scene.traverse(obj => {
        if (obj.isMesh)
            meshCount++;
        if (obj.isLight)
            lightCount++;
    });
    //floor and masked markers are not counted
    visibleMeshCount = countVisibleMeshes(Shared.scene);
    document.getElementById('meshCount').textContent = meshCount;
    document.getElementById('chunkCount').textContent = Shared.chunksGroup.children.length;
    document.getElementById('visibleMeshCount').textContent = visibleMeshCount;
    document.getElementById('lightCount').textContent = lightCount;

    // Unique materials
    const materials = new Set();
    Shared.scene.traverse(obj => {
        if (obj.isMesh) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => materials.add(mat));
            } else {
                materials.add(obj.material);
            }
        }
    });
    document.getElementById('materialCount').textContent = materials.size;

    // GPU memory info
    const mem = Shared.renderer.info.memory;
    document.getElementById('geometryCount').textContent = mem.geometries;
    document.getElementById('textureCount').textContent = mem.textures;
    // console.log("Unique BufferAttributes in scene:", countBufferAttributes());
    // renderer.info.reset(); //it auto resets normally
}

/*---------------------------------*/
// countBufferAttributes
/*---------------------------------*/
function countBufferAttributes() {
    const attributes = new Set();

    Shared.scene.traverse(obj => {
        if (obj.isMesh && obj.geometry && obj.geometry.attributes) {
            const geom = obj.geometry;
            // Position / normal / uv / etc
            for (const key in geom.attributes) {
                attributes.add(geom.attributes[key]);
            }
            // Index buffer
            if (geom.index) {
                attributes.add(geom.index);
            }
        }
    });

    return attributes.size;
}


/*---------------------------------*/
// countVisibleMeshes
/*---------------------------------*/
function countVisibleMeshes(root = Shared.scene) {
    let count = 0;

    root.traverseVisible((obj) => {
        if (obj.isMesh) {
            const mat = obj.material;

            const materialVisible =
                Array.isArray(mat)
                    ? mat.some((m) => m.visible !== false)
                    : (mat?.visible !== false);

            if (materialVisible) {
                count++;
            }
        }
    });

    return count;
}



/*---------------------------------*/
// simulateBlockingWait
/*---------------------------------*/
export function simulateBlockingWait(durationMs) {
    const start = performance.now();
    while (performance.now() - start < durationMs) {
        // Busy-wait loop (blocks the main thread)
    }
}

