// myFunctions.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import * as FBX from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/FBXLoader.js';
import { FBXLoader } from './FBXLoader.js'

//TEXT SPRITE

export function initializeHubFromJson(jsonPath, thisDocument, thisCamera, thisScene) {
    return fetch(jsonPath)
        .then(response => response.json()) // Parse JSON
        .then(jsonData => {
            console.log('Loaded JSON HUB data:', jsonData);
            // Use the data (which contains the URL, scale, type, etc.) 
            // to load the resources and create objects.
            // return all resources in a dictionary
            const result = loadHUBResources(jsonData, thisDocument, thisCamera, thisScene);
            console.log('Parsed JSON HUB data');
            return result;
        }).catch(error => {
            console.error('Error loading JSON HUB:', error);
            throw error; // Re-throw the error for upstream handling
        });
}

export function loadHUBResources(jsonData, thisDocument, thisCamera, thisScene) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data) {
            console.warn(`Skipping entry with missing data for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        return initializeTextSprite(thisDocument, thisCamera, thisScene, data).then(sprite => {
            return [key, sprite]; // Return the sprite dictionary
        });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

function addEntries(originalDict, newEntries) {
    return { ...originalDict, ...newEntries };
}


export function initializeTextSprite(thisDocument, thisCamera, thisScene, jsonData) {
    const textCanvas = thisDocument.createElement('canvas');
    const context = textCanvas.getContext('2d');
    textCanvas.width = 256;
    textCanvas.height = 128;

    context.fillStyle = jsonData.color;
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText(jsonData.text, textCanvas.width / 2, textCanvas.height / 2);

    const texture = new THREE.CanvasTexture(textCanvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        depthTest: false // Disable depth test (never occluded)
    });
    let mycolor;
    let redcolor = new THREE.Color(1, 0, 0);
    let greencolor = new THREE.Color(0, 1, 0);
    let bluecolor = new THREE.Color(0, 0, 1);
    if (jsonData.color == "red") mycolor = redcolor;
    else mycolor = greencolor;
    const nMaterial = new THREE.SpriteMaterial({
        color: mycolor,
        depthTest: false // Disable depth test (never occluded)
    });
    const sprite = new THREE.Sprite(nMaterial);

    //add to scene
    thisScene.add(sprite);

    // sprite.position.set(position.x, position.y, position.z);
    if (!jsonData.scale) console.warn("scale not defined for sprite");
    sprite.scale.set(1 * jsonData.scale, 0.5 * jsonData.scale, 1);  // Adjust the scale as needed

    const offset = alignHUBToCamera(sprite, thisCamera, jsonData.alignX, jsonData.alignY, jsonData.padX, jsonData.padY);

    const result =
        addEntries(jsonData,
            {
                SPRITE: sprite,
                CANVAS: textCanvas,
                CONTEXT: context,
                TEXTURE: texture,
                OFFSET: offset,
            }
        )
    return Promise.resolve(result);
}

export function alignHUBToCamera(sprite, thisCamera, alignX = 'center', alignY = 'middle', padx = 0, pady = 0) {

    //check camera is defined
    if (thisCamera == null)
        console.error('thisCamera is not defined');

    let posX, posY;
    switch (alignX) {
        case "center": posX = 0; break;
        case "left": posX = -1 + padx; break;
        case "right": posX = 1 - padx; break;
        default: {
            // console.error(alignX, "not supported");
            posX = 0;
        }
    }
    switch (alignY) {
        case "middle": posY = 0; break;
        case "bottom": posY = -1 + pady; break;
        case "top": posY = 1 - pady; break;
        default: {
            // console.error(alignY, "not supported");
            posY = 0;
        }
    }

    const vector = new THREE.Vector3(
        posX,
        posY,
        -1 // Depth in NDC (-1 is near the camera)
    );
    const oldVector = [...vector];
    // Unproject the screen position to world coordinates
    thisCamera.updateProjectionMatrix();
    vector.unproject(thisCamera);
    console.log("cam", thisCamera.position, thisCamera.rotation, thisCamera.projectionMatrix, oldVector, vector);
    // Ensure the sprite stays in view
    sprite.position.copy(vector);

    // Calculate the offset vector 
    const offsetVector = new THREE.Vector3().subVectors(sprite.position, thisCamera.position);
    return (offsetVector);//return offset
}

// updateHUD function

function updateHUD() {

    if (frameCount < 3) {
        for (const [key, sprite] of Object.entries(HUBDict)) {
            let noffset = alignHUBToCamera(sprite.SPRITE, camera, sprite.alignX, sprite.alignY, sprite.padX, sprite.padY);
            console.log(key, `noffset`, noffset, sprite.OFFSET);
        };
    } else {

        for (const [key, sprite] of Object.entries(HUBDict)) {
            // console.log(`${key}: ${sprite}`);
            sprite.SPRITE.position.copy(camera.position).add(sprite.OFFSET);
        };
    }
}


/* createPlane */

// export function createPlane(imageMat, posx = 0, posy = 0, posz = 0, scale = 1, rotx = 0, roty = 0, transparent = true) {
export function createPlane(imageMat, transparent = true) {

    // Create a plane geometry for the tree sprite
    const imageGeometry = new THREE.PlaneGeometry(1, 1);  // Adjust size as needed
    const sprite = new THREE.Mesh(imageGeometry, imageMat);
    // const sprite = new new THREE.MeshLambertMaterial(imageGeometry, imageMat);
    // sprite.position.set(posx, posz, posy);  // Set the position of the tree sprite in the scene
    // sprite.rotation.x = rotx;
    // sprite.rotation.y = roty;
    // sprite.scale.set(scale, scale, scale);

    return sprite;

};

/* createMaterial */

export function createMaterial(image, transparent = false, wrapX = 1, wrapY = 1, lambert = false, name = '') {
    // Create a texture from the image
    const imageTexture = new THREE.Texture(image);
    imageTexture.needsUpdate = true;
    // Repeat the texture multiple times
    imageTexture.wrapS = THREE.RepeatWrapping; // alignXizontal wrapping
    imageTexture.wrapT = THREE.RepeatWrapping; // Vertical wrapping
    imageTexture.repeat.set(wrapX, wrapY); // Number of times to repeat the texture (x, y)

    // let imageMaterial = null
    // if (!lambert){
    // if (0){
    // imageMaterial = new THREE.MeshBasicMaterial({
    const imageMaterial = new THREE.MeshLambertMaterial({
        map: imageTexture,
        transparent: transparent,  // Ensure transparency is handled
        side: THREE.DoubleSide, // To show the sprite from both sides if needed
        name: name
    });
    // } else {
    //     imageMaterial = new THREE.MeshLambertMaterial({
    //         map: imageTexture,
    //     });
    // }
    return imageMaterial;
}

export function getGridKey(x, y = 0, z) {
    return `${x},${y},${z}`;
}

export function createLight(pos, range = 100, intensity = 1, color = 0xffffff, helper = true) {

    //light
    const pointLight = new THREE.PointLight(color, intensity, range); // white light, intensity 1, range 100
    // Set position from passed Vector3
    pointLight.position.copy(pos);  // ✅ use copy() to assign from a Vector3

    let lightHelper=null;
    if (helper) {
        // Optional: add helper to visualize light
        lightHelper = new THREE.PointLightHelper(pointLight, 0.5);
        // scene.add(lightHelper);
    }

    return {light: pointLight, helper: lightHelper};
}

/* updateAnimations */
export function updateAnimations(thisMixer, delta) {
    // Update the mixer (animation playback)
    if (thisMixer) {
        thisMixer.update(delta);
    } else {
        console.error("no mixer found")
    }
}

/* load resources from JSON and place them in a dictionary */
export function loadResourcesFromJson(jsonPath) {
    return fetch(jsonPath)
        .then(response => response.json()) // Parse JSON
        .then(jsonData => {
            console.log('Loaded JSON data:', jsonData);
            // Use the data (which contains the URL, scale, type, etc.) 
            // to load the resources and create objects.
            // return all resources in a dictionary
            const result = loadResources(jsonData);
            console.log('Parsed JSON data');
            return result;
        }).catch(error => {
            console.error('Error loading JSON:', error);
            throw error; // Re-throw the error for upstream handling
        });
}

/* load resources from JSON Data*/
export function loadResources(jsonData) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (key == "IMAGES") {
            //load images
            return loadImages(data).then(result => [key, result]);
        } else if (key == "ATLAS") {
            //load atlas
            return loadAtlases(data).then(result => [key, result]);
        } else if (key == "MESHES") {
            //load meshes
            return loadMeshes(data).then(result => [key, result]);
        } else {
            console.warn(`key entry: ${key} is not supported`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
    });
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary
    });
}

/* loadAtlases */
// Function to load all images and create objects based on type and data from JSON
export function loadAtlases(jsonData) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        // return null;
        return loadAtlas(data.url).then(planes => {
            return [key, planes]; // Return the texture
        });
        // return loadAtlas(data.url).then(image => {
        //     const material = createMaterial(image,
        //         data.transparent ?? false,
        //         data.repeat?.x ?? 1,
        //         data.repeat?.y ?? 1,
        //         false,
        //         key
        //         // data.lambert
        //     );
        //     return [key, material]; // Return the texture
        // });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}


// Load JSON atlas and corresponding image
function loadAtlas(jsonUrl) {
    const imageUrl = jsonUrl.replace('.json', '.png');

    return Promise.all([
        fetch(jsonUrl).then(res => res.json()),
        new THREE.TextureLoader().loadAsync(imageUrl),
    ]).then(([atlasData, texture]) => {

        texture.magFilter = THREE.NearestFilter;
        // texture.minFilter = THREE.NearestFilter; // optional, if you also want it on minification
        texture.needsUpdate = true;

        // const material = new THREE.MeshBasicMaterial({
        const material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide, // To show the sprite from both sides if needed
        });

        const atlasWidth = texture.image.width;
        const atlasHeight = texture.image.height;

        const planes = {};

        for (const [name, frame] of Object.entries(atlasData)) {

            // Remove extension and convert to uppercase
            const displayName = name.replace(/\.[^/.]+$/, '').toUpperCase();
            const geometry = new THREE.PlaneGeometry(1, 1);//TODO: need to pass cellsize?

            // Compute UVs from atlas coordinates
            const u0 = frame.x / atlasWidth;
            const v0 = 1 - (frame.y + frame.height) / atlasHeight;
            const u1 = (frame.x + frame.width) / atlasWidth;
            const v1 = 1 - frame.y / atlasHeight;

            // Set custom UVs to match the sub-region of the atlas
            const uvs = geometry.attributes.uv;
            uvs.setXY(0, u0, v1); // bottom-left
            uvs.setXY(1, u1, v1); // bottom-right
            uvs.setXY(2, u0, v0); // top-left
            uvs.setXY(3, u1, v0); // top-right
            uvs.needsUpdate = true;

            // Adjust plane size to match sprite aspect ratio (optional)
            const mesh = new THREE.Mesh(geometry, material);
            geometry.name = displayName;
            mesh.name = displayName;
            // mesh.scale.set(frame.width / 64, frame.height / 64, 1); // normalize to 1x1 unit

            planes[displayName] = mesh;
        }

        return planes;
    });
}


/* loadImages */
// Function to load all images and create objects based on type and data from JSON
export function loadImages(jsonData) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        return loadImage(data.url).then(image => {
            const material = createMaterial(image,
                data.transparent ?? false,
                data.repeat?.x ?? 1,
                data.repeat?.y ?? 1,
                false,
                key
                // data.lambert
            );
            return [key, material]; // Return the texture
        });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

/* loadImage */

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => resolve(img); // Resolve promise when image is loaded
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`)); // Reject promise if there's an error
    });
}

/* loadMeshes */
// Function to load all meshes and create objects based on type and data from JSON
export function loadMeshes(jsonData) {
    const loader = new FBXLoader();
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        return loadMesh(loader, data.url, data.lit, data.animations).then(result => {
            return [key, result]; // Return the mesh
        });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

/* loadMesh */
export function loadMesh(loader, src, lit = false, animations = null) {
    return new Promise((resolve, reject) => {
        loader.load(
            src,
            (object) => {
                // Set the material to the loaded object if necessary
                object.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material && !lit) {
                            // Optional: Replace material with light-independent MeshBasicMaterial
                            child.material = new THREE.MeshBasicMaterial({
                                map: child.material.map // Retain the original diffuse map
                            });
                        }
                    }
                });
                console.log(`${src} mesh loaded`);
                resolve(object); // Resolve the promise with the loaded object
            },
            undefined, // Progress callback
            (error) => {
                console.error(`Error loading ${src}:`, error);
                reject(error); // Reject the promise on error
            }
        );
    }).then((mesh) => {

        if (animations) {
            const mixer = new THREE.AnimationMixer(mesh);
            // Assuming loadAnimations returns a Promise
            return loadAnimations(loader, mixer, animations).then(
                (loadedAnimations) => {

                    // Create the result object with both the mesh and animations
                    const result = {
                        MESH: mesh,
                        MIXER: mixer,
                        ANIMATIONS: loadedAnimations
                    };

                    return result; // Return the result with both MESH and ANIMATIONS
                });
        } else {

            const result = {
                MESH: mesh
            };

            return result; // Return the result with MESH but no ANIMATION 
        }
    });
}


/* loadAnimations */
export function loadAnimations(loader, mixer, animations) {
    const loadPromises = Object.entries(animations).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        return loadAnimation(loader, mixer, data.url, data.startFrame, data.endFrame, data.playRate, data.frameRate).then(result => {
            return [key, result]; // Return the mesh
        });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

/* loadAnimation */
export function loadAnimation(loader, mixer, src, startFrame, endFrame, playRate, frameRate) {
    // Set default values if any of these parameters are undefined
    const defaultStartFrame = 0;
    const defaultPlayRate = 1.0; // Default playback speed
    const defaultFrameRate = 30; // Default animation frame rate

    let trim = startFrame || endFrame //does it need trimming
    trim = false; //TODO: trimAnimationClip makes the game hang 
    // Use the provided values or fallback to the default ones
    startFrame = startFrame || defaultStartFrame;
    playRate = playRate || defaultPlayRate;
    frameRate = frameRate || defaultFrameRate;
    const startTime = startFrame / frameRate;
    return new Promise((resolve, reject) => {
        loader.load(
            src,
            (animationFBX) => {
                console.log(`${src} animation loaded`);
                // Extract the animation clips from the FBX
                const animationClip = animationFBX.animations[0]; // Assuming the first animation is what you want
                // Add the animation clip to the mixer
                // const action = mixer.clipAction(animationClip);
                // If endTime is undefined, use the clip's duration as the default value
                const endTime = endFrame ? endFrame / frameRate : animationClip.duration; // Default to the full duration of the animation clip
                const trimmedClip = trim ?
                    trimAnimationClip(animationClip, startTime, endTime) :
                    animationClip;
                const action = mixer.clipAction(trimmedClip);
                action.setEffectiveTimeScale(playRate);

                resolve(action); // Resolve the promise with the loaded object
            },
            undefined, // Progress callback
            (error) => {
                console.error(`Error loading ${src}:`, error);
                reject(error); // Reject the promise on error
            }
        );
    })
}

export function updateTextSprite(spriteData, newText, color = 'Red') {
    const textCanvas = spriteData.CANVAS;
    const context = spriteData.CONTEXT;
    const texture = spriteData.TEXTURE;
    // console.log("textCanvas, context, texture", textCanvas, context, texture);

    // Clear the canvas
    context.clearRect(0, 0, textCanvas.width, textCanvas.height);

    // Redraw the text
    context.fillStyle = color;
    context.font = '30px Arial';
    context.textAlign = 'center';
    context.fillText(newText, textCanvas.width / 2, textCanvas.height / 2);

    // Refresh the texture
    texture.needsUpdate = true;
}

/* waitFor */
export function waitFor(seconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, seconds * 1000); // Resolve the promise after 3 seconds
    });
}

// Trim the animation clip to play only a portion (startTime to endTime)
//TODO this function hangs the game
export function trimAnimationClip(clip, startTime, endTime) {
    const duration = endTime - startTime;
    const tracks = clip.tracks.map((track) => {
        // Slicing the animation tracks
        const trimmed = track.clone();
        trimmed.times = track.times.filter(
            (time) => time >= startTime && time <= endTime
        ).map((time) => time - startTime);
        trimmed.values = track.values.slice(0, trimmed.times.length * track.getValueSize());
        return trimmed;
    });

    return new THREE.AnimationClip(clip.name, duration, tracks);
}

