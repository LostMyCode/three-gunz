window.addEventListener('DOMContentLoaded', async () => {

    let fetch = await window.fetch("./test_ani.json");
    let data = await fetch.json();
    console.log(data);
    init(data);

});

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
    scene.scale.set(1, -1, 1);

    // カメラを作成
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(0, 100, -400);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    const clock = new THREE.Clock();

    var gridHelper = new THREE.GridHelper(1022, 10);
    scene.add(gridHelper);

    // Load GLTF or GLB
    const loader = new THREE.GLTFLoader();
    const url = 'women26.glb';

    let mixer;
    let model = null;
    loader.load(
        url,
        function (gltf) {
            model = gltf.scene;
            // console.log(gltf.animations[0]);
            model.scale.set(1.0, -1.0, 1.0);
            model.position.set(0, -70, 0);

            const animations = gltf.animations;
            const tracks = [];

            for (const track of data) {
                let kfTrack;
                if (track.times.length * 3 == track.values.length) { // x y z
                    kfTrack = new THREE.VectorKeyframeTrack(
                        track.name,
                        track.times,
                        track.values
                    );
                }
                else if (track.times.length * 4 == track.values.length) { // quat
                    kfTrack = new THREE.QuaternionKeyframeTrack(
                        track.name,
                        track.times,
                        track.values
                    );
                }
                console.log(track)

                tracks.push(kfTrack);
            }

            const duration = data[0].times[data[0].times.length - 1];
            const animationClip = new THREE.AnimationClip("testname", duration, tracks)
            mixer = new THREE.AnimationMixer(model);
            mixer.timeScale = 2 // アニメーション速度

            let action = mixer.clipAction(animationClip);

            // action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            action.play();

            gltf.scene.rotation.set(90 * (Math.PI / 180), 0, 0);
            scene.add(gltf.scene);
        },
        function (error) {
            /* console.log('An error happened');
            console.log(error); */
        }
    );
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;


    // 平行光源
    // const light = new THREE.DirectionalLight(0xFFFFFF);

    const light = new THREE.AmbientLight(0xffffff, 1);
    light.intensity = 2; // 光の強さを倍に
    light.position.set(1, 1, 1);
    // シーンに追加
    scene.add(light);

    // 初回実行
    tick();

    function tick() {
        controls.update();

        if (model != null) {
            // console.log(model);
            //Animation Mixerを実行
            if (mixer) {
                mixer.update(clock.getDelta());
            }
        }
        renderer.render(scene, camera);
        requestAnimationFrame(tick);
    }
}