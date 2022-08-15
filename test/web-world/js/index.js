window.addEventListener('DOMContentLoaded', async () => {

    updateLoadingText("Loading resources...");

    let fetch = await window.fetch("./Town/rs_map_obj_data.json");
    let data = await fetch.json();

    console.log(data);
    init(data);

});

/* const LS = {
    list: ["map-objects", "lightmap", "skydome"],
    init() {
        this.list = this.list.map((v, i) => {
            return {
                name: v,
                loaded: false
            }
        });
        console.log(this.list)
    },
    startLoad(itemName) {

    },
    onload(itemName) {
        
    }
} */

function updateLoadingText(msg) {
    const loadingStatus = document.getElementById("loader-status-detail");
    loadingStatus.innerText = msg;
}

function closeLoaderScreen() {
    const screen = document.getElementById("loader-screen");
    screen.style.display = "none";
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function rgb2hex(rgb) {
    let res = "0x" + rgb.map(function (value) {
        return ("0" + value.toString(16)).slice(-2);
    }).join("");
    return Number(res);
}

function searchNodes(root) {
    var list = [];
    var search = function (node) {
        while (node != null) {
            if (node instanceof Array && node[0]) node = node[0];
            if (!node) break;
            // 自分を処理
            list.push(node);
            // 子供を再帰
            search(node.m_pNegative);
            // 次のノードを探査
            node = node.m_pPositive;
        }
    }
    search(root[0]);
    return list;
}

const promiseList = [];
function makePromise(callback) {
    const p = new Promise(callback);
    promiseList.push(p);
    return p;
}

async function init(data) {
    // レンダラーを作成
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas')
    });
    // ウィンドウサイズ設定
    const { width, height } = document.getElementById('main_canvas').getBoundingClientRect();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    console.log(window.devicePixelRatio);
    console.log(width + ", " + height);

    const clock = new THREE.Clock();

    // シーンを作成
    const scene = new THREE.Scene();
    scene.scale.set(1, -1, 1);

    // カメラを作成
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    // camera.position.set(0, 500, 1400);
    camera.position.set(-81.56873102983137, -389.85144607755143, -5077.10678359543);
    camera.rotation.set(0, 3.13598417583715535, -0.4240758065603119)

    const controls = new THREE.FirstPersonControls(camera, renderer.domElement);
    controls.lookSpeed = 0.1;
    controls.movementSpeed = 1000;
    controls.lookVertical = true;
    controls.constrainVertical = true;
    camera.lookAt(new THREE.Vector3(0, 0, 0))
    const loader = new THREE.TextureLoader();
    const ddsLoader = new THREE.DDSLoader();

    let lightmapTex;
    makePromise((resolve, reject) => {
        let tex = ddsLoader.load("./Town/lm.dds", res => {
            resolve(res);
        });
        lightmapTex = tex;
    });

    // Load GLTF or GLB
    const gltfLoader = new THREE.GLTFLoader();
    const url = './Town/skydome.glb';

    let model = null;
    makePromise(function (resolve, reject) {
        gltfLoader.load(
            url,
            function (gltf) {
                model = gltf.scene;
                model.scale.set(1.0, -1.0, 1.0);
                model.position.set(0, 0, 0);
                model.rotation.set(0, 0, 0);
                scene.add(gltf.scene);
                resolve();
            },
            function (error) {
                // console.log('An error happened');
                // console.log(error);
            }
        );
    });

    if (location.hash == "#lambo") {
        gltfLoader.load(
            "./Lamborghini/scene.gltf",
            function (gltf) {
                model = gltf.scene;
                model.scale.set(111.0, -111.0, 111.0);
                model.position.set(0, 0, 0);
                model.rotation.set(0, 1, 0);
                scene.add(gltf.scene);
                console.log(gltf.scene)
            },
            function (error) {
                // console.log('An error happened');
                // console.log(error);
            }
        );
    }

    function drawGeo(pInfoArr, matId) {
        const geometry = new THREE.BufferGeometry();

        let positions = [];
        let uvs = [];
        let uvs2 = [];
        let normals = [];
        let indices = [];
        let indicesOffset = 0;
        for (let pInfo of pInfoArr) {
            for (let polyVertex of pInfo.pVertices) {
                // geometry.vertices.push(new THREE.Vector(polyVertex.x, polyVertex.y, polyVertex.z));
                positions.push(polyVertex.x, polyVertex.y, polyVertex.z);
                uvs.push(polyVertex.tu1, polyVertex.tv1);
                uvs2.push(polyVertex.tu2, polyVertex.tv2);
                normals.push(polyVertex.normal.x, polyVertex.normal.y, polyVertex.normal.z);
            }
            let shiftedIndices = [];
            pInfo.pInd.forEach(pInd => {
                shiftedIndices.push(pInd + indicesOffset);
            });
            indices.push(...shiftedIndices);
            indicesOffset += pInfo.pVertices.length;
        }

        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(positions), 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
        geometry.setAttribute(
            'normal',
            new THREE.BufferAttribute(new Float32Array(normals), 3)
        );
        geometry.setAttribute(
            "uv",
            new THREE.BufferAttribute(new Float32Array(uvs), 2)
        );
        geometry.setAttribute(
            "uv2",
            new THREE.BufferAttribute(new Float32Array(uvs2), 2)
        );

        let texture;
        let materialData = data.MaterialList[matId - 1];
        let texFileName = materialData.DiffuseMap;
        if (texFileName) {
            texFileName = texFileName.replace(/ /g, "");
            if (texFileName.includes("../")) {
                makePromise((resolve, reject) => {
                    texture = ddsLoader.load(`${texFileName.replace(/\.\.\//, "./")}.dds`, res => {
                        resolve(res);
                    });
                });
            } else {
                makePromise((resolve, reject) => {
                    texture = ddsLoader.load(`./Town/${texFileName}.dds`, res => {
                        resolve(res);
                    });
                });
            }
        }
        if (!texture) console.log("?")
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        texture.repeat.set(1, 1);

        let lightMapTexture = lightmapTex;
        /* if (pInfo.nLightmapTexture != undefined) {
            lightMapTexture = lightmapTex;
        } */

        const showWireFrame = true
        // console.log(texture)
        // const material = new THREE.MeshBasicMaterial({ color: getRandomColor(), side: THREE.DoubleSide, lightMap: lightMapTexture });
        // const material = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, side: THREE.BackSide });
        // const material = new THREE.MeshBasicMaterial({ color: 0x6699FF, wireframe: showWireFrame });
        // const material = new THREE.MeshBasicMaterial(withTex);
        /* const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
            lightMap: lightMapTexture,
            lightMapIntensity: 1,
        }); */
        const material = new THREE.MeshPhongMaterial({
            map: texture,
            side: THREE.BackSide,
            aoMap: lightMapTexture,
            color: rgb2hex([materialData.Diffuse, materialData.Diffuse, materialData.Diffuse]),
            specular: rgb2hex([materialData.Specular, materialData.Specular, materialData.Specular]), //todo: fix str -> number
            transparent: !!(materialData.dwFlags & 0x0002)
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.set(90 * (Math.PI / 180), 0, 0);
        scene.add(mesh);

        // geometry.computeVertexNormals();
        // geometry.computeBoundingBox()
        // console.log(geometry.boundingBox)
        // console.log(positions);

        /* let bbox = new THREE.BoxHelper(mesh, "#fff");
        bbox.update();
        scene.add(bbox); */
    }

    const allNodes = searchNodes(data.OcRoot);
    console.log(allNodes);

    const polysPerMat = {};
    for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        if (node.nPolygon) {
            for (let pInfo of node.pInfo) {
                // drawGeo(pInfo)
                if (!polysPerMat[pInfo.nMaterial]) polysPerMat[pInfo.nMaterial] = [];
                polysPerMat[pInfo.nMaterial].push(pInfo);
            }
        }
    }
    for (let group in polysPerMat) {
        drawGeo(polysPerMat[group], group);
    }

    // renderer.shadowMap.enabled = true;

    /* const slight = new THREE.PointLight(0xffffff, 1);
    slight.position.set(1100, 100, 2500);
    slight.castShadow = true;
    scene.add(slight); */

    /* const sphereSize = 5;
    const pointLightHelper = new THREE.PointLightHelper(slight, sphereSize);
    scene.add(pointLightHelper); */

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 2.8);
    hemiLight.position.set(-7188.0190430, 6539.0439453, 22334.4062500);
    // hemiLight.castShadow = true;
    scene.add(hemiLight);

    const light = new THREE.AmbientLight(0xffffff, 1);
    light.intensity = 2.4; // 光の強さ
    light.position.set(1, 1, 1);
    scene.add(light);

    function tick() {
        controls.update(clock.getDelta());
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }

    /* setTimeout(() => {
        var exporter = new THREE.GLTFExporter();
        let res = exporter.parse(scene, e => {
            console.log(JSON.stringify(e))
        });
    }, 3000); */

    Promise.all(promiseList).then((e) => {
        console.log("All resources has been loaded.");
    });

    let progress = 0;
    promiseList.forEach(p => p.then(() => progress++));

    let loadCheckInterval = setInterval(() => {
        let rate = progress / promiseList.length * 100;
        if (rate >= 100) {
            clearInterval(loadCheckInterval);
            updateLoadingText("Done!");

            setTimeout(() => {
                // 初回実行
                tick();

                closeLoaderScreen();
            }, 1000);
        }
    }, 100);
}