const fs = require("fs");
const path = require('path');
const xmlParser = require("fast-xml-parser");
const BufferReader = require("../world-reader/BufferReader");
const say = require("../world-reader/logger");
const { rvector } = require("../world-reader/Structs");

const ELU_ID = 0x0107F060;

// Animation Types
const RAniType_TransForm = 0;
const RAniType_Vertex = 1;
const RAniType_Bone = 2;
const RAniType_Tm = 3;

let m_pBipRootNode;
let m_max_frame;
let allAnimationTracks = [];

function LoadElu(filePath) {
    const buf = fs.readFileSync(filePath);
    const data = new BufferReader(buf);

    const [Signature, Version, matCount, meshCount] = data.readStructUInt32LE(4);
    say(Signature, Version, matCount, meshCount);

    if (Signature != ELU_ID) throw new Error("Bad magic number");
}

function LoadAni(filePath) {
    const buf = fs.readFileSync(filePath);
    const data = new BufferReader(buf);

    const [Signature, Version] = data.readStructUInt32LE(2);
    const max_frame = data.readInt32LE();
    const model_num = data.readInt32LE();
    const ani_type = data.readInt32LE();

    const ani_name = filePath.match(/\w+\.elu\.ani/)[0];

    const m_ani_node = [];
    const m_ani_node_cnt = model_num;

    let tracks;

    switch (ani_type) {
        case RAniType_Vertex:
            say("Vertex type is not supported yet");
            break;

        case RAniType_Tm:
            say("Tm type is not supported yet");
            break;

        default:
            say("Type:", ani_type);

            for (let i = 0; i < m_ani_node_cnt; i++) {
                const pANode = {};
                m_ani_node.push(pANode);

                let t_mesh_name = data.readStructUInt8(40);
                let t = "";
                let c;
                let o = 0;
                while (c = t_mesh_name[o++], c != 0) {
                    t += String.fromCharCode(c);
                }
                pANode.name = t;
                pANode.m_mat_base = data.readStructFloatLE(16);
                console.log(t);
                if (t == "Bip01") {
                    m_pBipRootNode = pANode;
                }

                let pos_key_num = data.readInt32LE();
                let rot_key_num = 0;
                let vertex_num = 0;

                pANode.m_pos_cnt = pos_key_num;

                if (pos_key_num) {
                    pANode.m_pos = {};
                    for (let j = 0; j < pos_key_num; j++) {
                        let pos = new rvector();
                        [pos.x, pos.y, pos.z] = data.readStructFloatLE(3);
                        let frame = data.readInt32LE();
                        pANode.m_pos[frame] = pos;
                    }
                }

                rot_key_num = data.readInt32LE();
                pANode.m_rot_cnt = rot_key_num;

                if (rot_key_num) {
                    pANode.m_quat = {};
                    for (let j = 0; j < rot_key_num; j++) {
                        let [rx, ry, rz, rw] = data.readStructFloatLE(4);
                        let frame = data.readInt32LE();
                        pANode.m_quat[frame] = { rx, ry, rz, rw };
                    }
                }

                if (Version > 0x00000012) {
                    pANode.m_vis_cnt = data.readUInt32LE();

                    if (pANode.m_vis_cnt) {
                        pANode.m_vis = {};

                        for (let j = 0; j < pANode.m_vis_cnt; j++) {
                            let v = data.readFloatLE();
                            let frame = data.readInt32LE();
                            // pANode.m_vis.push({ v, frame });
                            pANode.m_vis[frame] = v;
                        }
                    }
                }
            }

            tracks = AniToGLTFAnimation(ani_name, m_ani_node, Version);
            break;
    }

    m_max_frame = max_frame;
    say(Version);

    return tracks;
}

function AniToGLTFAnimation(aniName, aniData, aniVersion) {
    const tracks = [];

    for (const node of aniData) {
        let trackNameBase = "";

        if (node.name == "Bip01") {
            trackNameBase = node.name;
        } else {
            let nels = node.name.split(" ");
            if (nels.length === 2) {
                trackNameBase = nels[0] + "_" + nels[1];
            }
            else if (nels.length === 3) {
                trackNameBase = nels[0] + "_" + nels[2] + nels[1];
            }
        }

        let track;
        if (node.m_pos_cnt) {
            track = {
                name: trackNameBase + "." + "position",
                times: [],
                values: []
            }
            for (const frame in node.m_pos) {
                const pos = node.m_pos[frame];
                track.times.push(frame / 2000);
                track.values.push(pos.x, pos.y, pos.z);
            }
            tracks.push(track);
        }
        if (node.m_rot_cnt) {
            track = {
                name: trackNameBase + "." + "quaternion",
                times: [],
                values: []
            }
            for (const frame in node.m_quat) {
                let quat = node.m_quat[frame];
                track.times.push(frame / 2000);
                if (aniVersion > 0x00001002) {
                    track.values.push(quat.rx, quat.rz, quat.ry, -quat.rw);
                } else { // 4097, 4098 ?
                    quat = AngleAxisToQuaternion(quat, quat.rw);
                    track.values.push(quat.rx, quat.rz, quat.ry, -quat.rw);
                };
            }
            tracks.push(track);
        }
    } // for end

    // fs.writeFileSync("./" + aniName + ".json", JSON.stringify(tracks));
    fs.writeFileSync("./test/web-women26/test_ani.json", JSON.stringify(tracks));
    allAnimationTracks.push(tracks);
    return tracks;
}

function AngleAxisToQuaternion(Axis, Angle) {
    Axis.rx *= Math.sin(Angle / 2);
    Axis.ry *= Math.sin(Angle / 2);
    Axis.rz *= Math.sin(Angle / 2);
    Axis.rw = Math.cos(Angle / 2);
    return Axis;
}

function readXML(filePath) {
    const xmlData = fs.readFileSync(filePath, "utf-8");
    const json = xmlParser.parse(xmlData, { ignoreAttributes: false });
    
    const animations = json.xml.AddAnimation;
    const aniList = createAnimationList(animations);
    fs.writeFileSync("./test/web-women26/test_ani.json", JSON.stringify(aniList));
}

function createAnimationList(animations) {
    const animationsByType = {};
    for (const anim of animations) {
        const typeNum = anim["@_motion_type"];
        const aniName = anim["@_name"];
        animationsByType[typeNum] = animationsByType[typeNum] || {};

        const res = LoadAni(targetDir + anim["@_filename"]);
        animationsByType[typeNum][aniName] = res;
    }
    return animationsByType;
}

const targetDir = "P:/Gunz/buildable/Gunz 1.5 Repack by Jur13n #2 (Clean)/Clean client/Model/woman/";
// readXML(targetDir + "woman01.xml");

/* fs.readdir(targetDir, function (err, files) {
    if (err) throw err;
    var fileList = files.filter(function (file) {
        console.log(file);
        return /.*\.ani$/.test(file);
    })
    console.log(fileList);
}); */

// LoadElu(path.resolve("test", "elu-ani-reader", "woman-parts26.elu"));
// LoadAni(path.resolve("test", "elu-ani-reader", "woman_sword_jump_slash1.elu.ani"));
let fileName = "woman_blade_run.elu.ani";
LoadAni(targetDir + fileName)