
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
// import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.12.0';
import {GLTFLoader} from './utils/GLTFLoader.js'
import {FBXLoader} from './utils/FBXLoader.js'
//OTHER IMPORTS FORBIDDEN

/*---------------------------------------------------------*/
/* loadResourcesFromJson */
/* load resources from JSON and place them in a dictionary */
/*---------------------------------------------------------*/
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

/*---------------------------------------------------------*/
/* loadResources */
/* load resources from JSON Data*/
/*---------------------------------------------------------*/
function loadResources(jsonData) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (key == "IMAGES") {
            //load images
            return loadImages(data).then(result => [key, result]);
        } else if (key == "ATLAS") {
            //load atlas
            return loadAtlases(data).then(result => [key, result]);
        } else if (key == "MESHATLAS") {
            //load mesh atlas
            return loadMeshAtlases(data).then(result => [key, result]);
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


/*---------------------------------------------------------*/
/* loadAtlases */
/* Function to load all images and create objects based on type and data from JSON */
/*---------------------------------------------------------*/ 
function loadAtlases(jsonData) {
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        // return null;
        return loadAtlas(data.url).then(planes => {
            return [key, planes]; // Return the texture
        });
    });
    // Wait for all images to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

/*---------------------------------------------------------*/
/* loadAtlas */
/* Load JSON atlas and corresponding image */
/*---------------------------------------------------------*/
function loadAtlas(jsonUrl) {
    const imageUrl = jsonUrl.replace('.json', '.png');

    return Promise.all([
        fetch(jsonUrl).then(res => res.json()),
        new THREE.TextureLoader().loadAsync(imageUrl),
    ]).then(([atlasData, texture]) => {

        texture.magFilter = THREE.NearestFilter;
        // texture.minFilter = THREE.NearestFilter; // optional, if you also want it on minification
        texture.needsUpdate = true;
        texture.name = "ATLASTEXTURE";

        // const material = new THREE.MeshBasicMaterial({
        const material = new THREE.MeshLambertMaterial({
            map: texture,
            // transparent: true, //TEMP: a transparent plane adds 2 draw calls per plane instead of 1.
            transparent: false,
            name: "ATLASMATERIAL",
            side: THREE.DoubleSide, // To show the sprite from both sides if needed
        });

        const transmaterial = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: true, //TEMP: a transparent plane adds 2 draw calls per plane instead of 1.
            // transparent: false,
            name: "ATLASMATERIALTRANSP",
            side: THREE.DoubleSide, // To show the sprite from both sides if needed
        });

        const atlasWidth = texture.image.width;
        const atlasHeight = texture.image.height;

        const planes = {};

        planes["ATLASMATERIAL"] = material;
        planes["ATLASMATERIALTRANSP"] = transmaterial;
        const size =  atlasData["SIZE"];
        planes["SIZE"] = size;
        planes["NUMX"] = atlasData["NUMX"];
        planes["NUMY"] = atlasData["NUMY"];
        planes["UVS"] = {};
        planes["IMAGE"] = {};

        let images = atlasData["IMAGES"];
        for (const [name, frame] of Object.entries(images)) {

            // Remove extension and convert to uppercase
            const displayName = name.replace(/\.[^/.]+$/, '').toUpperCase();

            planes["UVS"][displayName] = {
                x: frame.x,
                y: frame.y
            };

            // Create a canvas for each sprite
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;

            const ctx = canvas.getContext("2d");
            //drawImage copies the pixels in memory-> consumes memory but last 2 arguments could be changed to thumbsize=32x32 to minify the thumbnail size
            ctx.drawImage(
                texture.image,
                frame.x*size, frame.y*size, size, size, // source rect
                0, 0, size, size              // destination rect
            );

            planes["IMAGE"][displayName] = canvas;


        }

        return planes;
    });
}


/*---------------------------------------------------------*/
/* loadImages */
/* Function to load all images and create objects based on type and data from JSON */
/*---------------------------------------------------------*/
function loadImages(jsonData) {
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

/*---------------------------------------------------------*/
/* loadImage */
/*---------------------------------------------------------*/
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = src;
        img.onload = () => resolve(img); // Resolve promise when image is loaded
        img.onerror = () => reject(new Error(`Failed to load image: ${src}`)); // Reject promise if there's an error
    });
}

/*---------------------------------------------------------*/
/* loadMeshAtlases */
/*---------------------------------------------------------*/
function loadMeshAtlases(jsonData) {
    const loader = new GLTFLoader();
    const loadPromises = Object.entries(jsonData).map(([key, data]) => {
        if (!data || !data.url) {
            console.warn(`Skipping entry with missing 'url' for key: ${key}`);
            return Promise.resolve([key, null]); // Return null for missing or invalid data
        }
        // return null;
        return loadMeshAtlas(loader, data.url).then(meshes => {
            return [key, meshes]; // Return the Mesh
        });
    });
    // Wait for all Meshes to load and return the results
    return Promise.all(loadPromises).then(results => {
        return Object.fromEntries(results); // Convert back to a dictionary { key: sprite/texture }
    });
}

/*---------------------------------------------------------*/
/* loadMeshAtlas */
/*---------------------------------------------------------*/
function loadMeshAtlas(loader, src) {
    return new Promise((resolve, reject) => {
        loader.load(
            src,
            (gltf) => {
                const scene = gltf.scene;
                const meshMap = {};

                // First, fix UVs on all meshes
                //Blender +Y (forward) ⟶ Three.js −Z (forward) 
                //Blender +Z (up) ⟶ Three.js +Y (up) 
                //Blender +X (right) ⟶ Three.js +X (right) 
                //because of the UV forward flip we rotate them 180 degrees at import
                scene.traverse((child) => {
                    if (child.isMesh && child.geometry && child.geometry.attributes.uv &&
                        !child.name.startsWith("Collider_")
                    ) {
                        const uvAttr = child.geometry.attributes.uv;
                        const uvArray = uvAttr.array;
                        for (let i = 1; i < uvArray.length; i += 2) {
                            uvArray[i] = 1 - uvArray[i]; // flip V coordinate
                        }
                        uvAttr.needsUpdate = true;
                    }
                });

                // --- Step 2: Build a map of colliders first ---
                const colliders = {};
                scene.updateMatrixWorld(true); // make sure world transforms are up-to-date
                scene.children.forEach((child) => {
                    if (child.isMesh && child.name.startsWith("Collider_")) {
                        const baseName = child.name.replace(/^Collider_/, "").toUpperCase();

                        const position = new THREE.Vector3();
                        const quaternion = new THREE.Quaternion();
                        const scale = new THREE.Vector3();
                        child.matrixWorld.decompose(position, quaternion, scale);

                        // Compute geometry bounds (in local space)
                        child.geometry.computeBoundingBox();

                        // Apply local transform to get world size
                        const bbox = child.geometry.boundingBox.clone();
                        bbox.applyMatrix4(child.matrixWorld);

                        const size = new THREE.Vector3();
                        bbox.getSize(size);
                        const center = new THREE.Vector3();
                        bbox.getCenter(center);

                        // Half extents for Rapier
                        const halfExtents = {
                        x: size.x * 0.5,
                        y: size.y * 0.5,
                        z: size.z * 0.5,
                        };

                        // // Create collider
                        // const colliderDesc = RAPIER.ColliderDesc.cuboid(
                        // halfExtents.x,
                        // halfExtents.y,
                        // halfExtents.z
                        // )
                        // .setTranslation(center.x, center.y, center.z)
                        // .setRotation(quaternion);

                        // // Optionally: hide collider mesh in Three.js
                        // // child.visible = false;

                        // colliders[baseName] = colliderDesc;
                        // When building the atlas
                        colliders[baseName] = {
                        halfExtents: halfExtents,
                        localOffset: center.clone(),
                        localRotation: quaternion.clone()
                        };


                    }
                });

                // --- Step 3: Collect visible meshes and pair them with colliders ---
                scene.children.forEach((child) => {
                    if (
                        // child.isMesh &&//this can be a empty object or armature holding a hierarchy 
                        !child.name.startsWith("Collider_") &&
                        !child.isLight &&
                        !child.isCamera
                    ) {
                        const name = child.name.toUpperCase();
                        meshMap[name] = {
                            MESH: child,
                            COLLIDER: colliders[name] || null
                        };
                    }
                });


                resolve(meshMap);
            },
            undefined, // onProgress
            (error) => reject(error)
        );
    });
}

function scaleAndClampPosition(obj, scale, precision = 3) {
    obj.position.multiplyScalar(scale);
    obj.position.x = parseFloat(obj.position.x.toFixed(precision));
    obj.position.y = parseFloat(obj.position.y.toFixed(precision));
    obj.position.z = parseFloat(obj.position.z.toFixed(precision));
}

/*---------------------------------------------------------*/
/* loadMeshes */
/* Function to load all meshes and create objects based on type and data from JSON */
/*---------------------------------------------------------*/
function loadMeshes(jsonData) {
    const loader = new FBXLoader();//TODO: change to gltf, smaller and faster
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

/*---------------------------------------------------------*/
/* loadMesh */
/*---------------------------------------------------------*/
function loadMesh(loader, src, lit = false, animations = null) {
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


/*---------------------------------------------------------*/
/* loadAnimations */
/*---------------------------------------------------------*/
function loadAnimations(loader, mixer, animations) {
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

/*---------------------------------------------------------*/
/* loadAnimation */
/*---------------------------------------------------------*/
function loadAnimation(loader, mixer, src, startFrame, endFrame, playRate, frameRate) {
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

/*---------------------------------------------------------*/
/* createMaterial */
/*---------------------------------------------------------*/
function createMaterial(image, transparent = false, wrapX = 1, wrapY = 1, lambert = false, name = '') {
    // Create a texture from the image
    const imageTexture = new THREE.Texture(image);
    imageTexture.needsUpdate = true;
    // Repeat the texture multiple times
    imageTexture.wrapS = THREE.RepeatWrapping; // alignXizontal wrapping
    imageTexture.wrapT = THREE.RepeatWrapping; // Vertical wrapping
    imageTexture.repeat.set(wrapX, wrapY); // Number of times to repeat the texture (x, y)

    // imageMaterial = new THREE.MeshBasicMaterial({
    const imageMaterial = new THREE.MeshLambertMaterial({
        map: imageTexture,
        transparent: transparent,  // Ensure transparency is handled
        side: THREE.DoubleSide, // To show the sprite from both sides if needed
        name: name
    });
    return imageMaterial;
}
