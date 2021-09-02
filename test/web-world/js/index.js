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
    camera.position.set(0, 100, 1400);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    const loader = new THREE.DDSLoader();
    // const texture = loader.load('./gzd_map_town_car_b02.jpg');
    // const texture = loader.load("./gzd_map_town_car_b02.bmp.dds");

    function drawGeo(pInfo) {
        // if (node.nPolygon) console.log(node);
        const geometry = new THREE.BufferGeometry();

        let positions = [];
        let uvs = [];
        let indices = new Uint16Array(pInfo.pInd);
        for (let polyVertex of pInfo.pVertices) {
            // geometry.vertices.push(new THREE.Vector(polyVertex.x, polyVertex.y, polyVertex.z));
            positions.push(polyVertex.x, polyVertex.y, polyVertex.z)
            uvs.push(polyVertex.tu1, polyVertex.tv1);
        }
        geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(new Float32Array(positions), 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.setAttribute(
            "uv",
            new THREE.BufferAttribute(new Float32Array(uvs), 2)
        );

        let texture;
        let materialData = data.MaterialList[pInfo.nMaterial - 1];
        let texFileName = materialData.DiffuseMap;
        if (texFileName) {
            texFileName = texFileName.replace(/ /g, "");
            if (texFileName.includes("../")) {
                texture = loader.load(`${texFileName.replace(/\.\.\//, "./")}.dds`);
            } else {
                texture = loader.load(`./Town/${texFileName}.dds`);
            }
        }
        if (!texture) console.log("?")
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.offset.set(0, 0);
        texture.repeat.set(1, 1);

        const showWireFrame = true
        // console.log(texture)
        // const material = new THREE.MeshBasicMaterial({ color: getRandomColor(), side: THREE.DoubleSide });
        // const material = new THREE.MeshBasicMaterial({ color: 0x6699FF, wireframe: showWireFrame });
        // const material = new THREE.MeshBasicMaterial(withTex);
        /* const material = new THREE.MeshBasicMaterial({
            map: texture, side: THREE.DoubleSide
        }); */
        const material = new THREE.MeshPhongMaterial({
            map: texture, side: THREE.DoubleSide,
            // specular: rgb2hex([materialData.Specular, materialData.Specular, materialData.Specular]),
        });
        const plane = new THREE.Mesh(geometry, material);
        scene.add(plane);

        geometry.computeVertexNormals();
        // geometry.computeBoundingBox()
        // console.log(geometry.boundingBox)
        // console.log(positions);

        /* let bbox = new THREE.BoxHelper(plane, "#fff");
        bbox.update();
        scene.add(bbox); */
    }

    const allNodes = searchNodes(data.OcRoot);
    console.log(allNodes);

    for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        if (node.nPolygon) {
            for (let pInfo of node.pInfo) {
                drawGeo(pInfo)
            }
        }
    }


    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;


    // 平行光源
    // const light = new THREE.DirectionalLight(0xFFFFFF);

    const light = new THREE.AmbientLight(0xffffff, 1);
    light.intensity = 1; // 光の強さを倍に
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