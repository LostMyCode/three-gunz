window.addEventListener('DOMContentLoaded', async () => {

    let fetch = await window.fetch("./Town/rs_map_obj_data.json");
    let data = await fetch.json();
    console.log(data);
    init(data);

});

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

function init(data) {
    // レンダラーを作成
    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#canvas')
    });
    // ウィンドウサイズ設定
    width = document.getElementById('main_canvas').getBoundingClientRect().width;
    height = document.getElementById('main_canvas').getBoundingClientRect().height;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    console.log(window.devicePixelRatio);
    console.log(width + ", " + height);

    // シーンを作成
    const scene = new THREE.Scene();
    scene.scale.set(-1, 1, 1);

    // カメラを作成
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 100000);
    // camera.position.set(0, 100, 1400);
    camera.position.x = -0.00022959756808358926;
    camera.position.y = -5059.912198446767;
    camera.position.z = 0.0050549255682858195;

    camera.rotation.x = 1.5707953277804136;
    camera.rotation.y = -4.537580082161764e-8;
    camera.rotation.z = 0.04538936754410236;

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    const loader = new THREE.TextureLoader();
    const ddsLoader = new THREE.DDSLoader();

    const lightmapTex = ddsLoader.load("./Town/lm_test.dds");
    /* const skydome = ddsLoader.load("./BattleArena/sky_daylight.bmp.dds");

    var objGeometry = new THREE.SphereBufferGeometry(13130);
    var objMaterial = new THREE.MeshPhongMaterial({
        map: skydome,
        shading: THREE.FlatShading
    });
    objMaterial.side = THREE.BackSide;
    let earthMesh = new THREE.Mesh(objGeometry, objMaterial);

    scene.add(earthMesh); */

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
                texture = ddsLoader.load(`${texFileName.replace(/\.\.\//, "./")}.dds`);
            } else {
                texture = ddsLoader.load(`./Town/${texFileName}.dds`);
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
            lightMap: lightMapTexture,
            color: rgb2hex([0.5882353, 0.5882353, 0.5882353]),
            specular: rgb2hex([materialData.Specular, materialData.Specular, materialData.Specular]),
            transparent: !!(materialData.dwFlags & 0x0002)
        });
        const mesh = new THREE.Mesh(geometry, material);
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

    polysPerMat = {};
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

    let hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.position.set(-7188.0190430, 6539.0439453, 22334.4062500);
    // hemiLight.castShadow = true;
    scene.add(hemiLight);

    const light = new THREE.AmbientLight(0xffffff, 1);
    light.intensity = .4; // 光の強さ
    light.position.set(1, 1, 1);
    scene.add(light);

    // 初回実行
    tick();

    function tick() {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
}