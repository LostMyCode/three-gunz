const fs = require("fs");
const path = require('path');
const xmlParser = require("fast-xml-parser");
const BufferReader = require("./BufferReader");
const say = require("./logger");
const { rvector, BSPNORMALVERTEX, vec2, DotProduct, OpenNodesState } = require("./Structs");

console.log("[world-reader] GunZ world reading test");

const RS_ID = 0x12345678;
const RS_VERSION = 7;

const RM_FLAG_HIDE = 0x0080; // from RealSpace2 -> Include -> RTypes.h

const Materials = [];
const StaticObjectLightList = [];
const StaticMapLightList = [];
const StaticSunLightList = [];
const PhysOnly = false; // default: false

function OpenRs(filePath, Counts) {
    let buf = fs.readFileSync(filePath);
    let u8a = new Uint8Array(buf);
    let checkArr = [];
    u8a.map(v => {
        checkArr.push(v.toString(16));
        return v;
    });

    let data = new BufferReader(buf);

    // Read header
    say("Read ID:", data.readUInt32LE(), "RS_ID:", RS_ID);

    say("Read Version:", data.readUInt32LE(), "RS_VERSION", RS_VERSION);

    // Read number of materials
    let nMaterial = data.readInt32LE(); // int = 4 bytes
    say("Number of materials:", nMaterial);

    if (!PhysOnly) {
        //cut
    }

    let lc = 0;
    for (let i = 1; i < nMaterial + 1; i++) {
        let str = "";
        let c;
        while (c = data.readUInt8(), c != 0) {
            str += String.fromCharCode(c);
        }
        say(lc++, "file:", str);
    }

    Open_ConvexPolygons(data);

    // Read counts
    let Nodes = data.readInt32LE();
    say("Bsp Nodes:", Nodes);

    let Polygons = data.readInt32LE();
    let Vertices = data.readInt32LE();
    let Indices = data.readInt32LE();

    let NodeCount = data.readInt32LE();
    let PolygonCount = data.readInt32LE();
    let NumVertices = data.readInt32LE();
    let NumIndices = data.readInt32LE();

    // cut oc resize thing

    say(NodeCount, PolygonCount, NumVertices, NumIndices);
}

/**
 * @param {BufferReader} data 
 */
function Open_ConvexPolygons(data) {
    let NumConvexPolygons = data.readInt32LE();
    let nConvexVertices = data.readInt32LE();

    say("Convex polygons:", NumConvexPolygons, nConvexVertices);

    let ConvexPolygons = new Array(NumConvexPolygons).fill({});
    for (let i = 0; i < NumConvexPolygons; i++) {
        ConvexPolygons[i].nMaterial = data.readInt32LE();
        ConvexPolygons[i].nMaterial += 2;
        ConvexPolygons[i].dwFlags = data.readUInt32LE();

        // rplane(float a, float b, float c, float d)
        const [a, b, c, d] = data.readStructFloatLE(4);
        ConvexPolygons[i].plane = {};
        ConvexPolygons[i].plane.a = a;
        ConvexPolygons[i].plane.b = b;
        ConvexPolygons[i].plane.c = c;
        ConvexPolygons[i].plane.d = d;

        ConvexPolygons[i].fArea = data.readFloatLE();
        ConvexPolygons[i].nVertices = data.readInt32LE();

        for (let j = 0; j < ConvexPolygons[i].nVertices; j++) {
            // rvector = float x 3 (?)
            const x = data.readFloatLE();
            const y = data.readFloatLE();
            const z = data.readFloatLE();
            // say(x, y, z);
        }

        for (let j = 0; j < ConvexPolygons[i].nVertices; j++) {
            // rvector = float x 3 (?)
            data.readFloatLE();
            data.readFloatLE();
            data.readFloatLE();
        }

    }
} // [END] Open_ConvexPolygons


/**
 * 
 * @param {RSBspNode} pNode 
 * @param {BufferReader} data 
 * @param {OpenNodesState} State 
 */
function Open_Nodes(pNode, data, State) {
    const bound = data.readStructFloatLE(6);
    pNode.bbTree = [];
    pNode.bbTree.push(...bound);

    const [a, b, c, d] = data.readStructFloatLE(4);
    pNode.plane = {};
    pNode.plane.a = a;
    pNode.plane.b = b;
    pNode.plane.c = c;
    pNode.plane.d = d;

    // branch
    let flag = data.readUInt8();
    if (flag) {
        // open front node
        pNode.m_pPositive = State.nextNode;
        State = Open_Nodes(pNode.m_pPositive, data, State);
    }
    flag = data.readUInt8();
    if (flag) {
        // open back node
        pNode.m_pNegative = State.nextNode;
        State = Open_Nodes(pNode.m_pNegative, data, State);
    }

    pNode.nPolygon = data.readInt32LE();

    if (pNode.nPolygon) {
        pNode.pInfo = State.Info;
        State.Info += pNode.nPolygon;

        let pInfo = pNode.pInfo;

        for (let i = 0; i < pNode.nPolygon; i++) {
            let mat = data.readInt32LE();
            pInfo.nConvexPolygon = data.readInt32LE();
            pInfo.dwFlags = data.readUInt32LE();
            pInfo.nVertices = data.readInt32LE();

            let pVertex = pInfo.pVertices = State.Vertices[State.verticesOffset];

            for (let j = 0; j < pInfo.nVertices; j++) {
                /**
                 * @type {rvector}
                 */
                let normal = new rvector();
                let x, y, z;

                // read vertex position
                [x, y, z] = readStructFloatLE(3);
                pVertex.x = x;
                pVertex.y = y;
                pVertex.z = z;

                // read vertex normal
                [x, y, z] = readStructFloatLE(3);
                normal.x = x;
                normal.y = y;
                normal.z = z;

                // read texture coordinates (diffuse map)
                [pVertex.tu1, pVertex.tv1] = readStructFloatLE(2);

                // read texture lightmap
                [pVertex.tu2, pVertex.tv2] = readStructFloatLE(2);

                if (State.Normals) {
                    let normalVertex = new BSPNORMALVERTEX(
                        new rvector(pVertex.x, pVertex.y, pVertex.z),
                        normal,
                        new vec2(pVertex.tu1, pVertex.tv1),
                        new vec2(pVertex.tu2, pVertex.tv2)
                    );
                    State.Normals.push(normalVertex);
                }

                pVertex.verticesOffset++;
            }

            // idk if this is correct or not
            // State.verticesOffset += pInfo.nVertices;

            let nor = new rvector();
            [nor.x, nor.y, nor.z] = data.readFloatLE(3);
            pInfo.plane.a = nor.x;
            pInfo.plane.b = nor.y;
            pInfo.plane.c = nor.z;
            pInfo.plane.b = -DotProduct(nor, pInfo.pVertices[0].Coord());

            if ((pInfo.dwFlags & RM_FLAG_HIDE) != 0) {
                pInfo.nMaterial = -1;
            } else {
                let nMaterial = mat + 1;

                if (nMaterial < 0 || nMaterial >= Materials.length) nMaterial = 0;

                pInfo.nMaterial = nMaterial;
                pInfo.dwFlags |= Materials[nMaterial].dwFlags;
            }

            pInfo.nPolygonID = State.PolygonID;
            pInfo.nLightmapTexture = 0;

            // update pInfo offset
            pNode.pInfoOffset++;

            State.PolygonID++; // int
        }
    }

    return State;
}


function OpenDescription(filePath) {
    const xmlData = fs.readFileSync(filePath, "utf-8");
    const json = xmlParser.parse(xmlData, { ignoreAttributes: false });
    LoadRS2Map(json.XML);
}

function Open_MaterialList(data) {
    let ml = data.MATERIALLIST.MATERIAL;
    let elm = {};

    // Materials[0] initial elm is special
    elm.texture = null;
    elm.Diffuse = new rvector(1, 1, 1);
    elm.dwFlags = 0;
    Materials.push(elm);

    for (let i = 1; i < ml.length; i++) {
        const mat = ml[i];

        if (!mat["@_name"]) continue;

        elm = {};
        elm.Name = mat["@_name"];
        elm.dwFlags = 0;
        elm.Diffuse = mat.DIFFUSE;
        elm.Specular = mat.SPECULAR; // todo: '0.9000000 0.9000000 0.9000000'
        elm.Ambient = mat.AMBIENT;   // need to parse them
        elm.Diffuse = mat.DIFFUSEMAP;
        elm.DiffuseMap = mat.DIFFUSEMAP;
        // elm.Power = "idk"; // atleast theres no Power in Town.RS.xml

        // if "" (empty str) then update the flag but not when undefined
        if (mat.ADDITIVE !== undefined) {
            elm.dwFlags |= 0x0001;
        }
        if (mat.USEOPACITY !== undefined) {
            elm.dwFlags |= 0x0002;
        }
        if (mat.TWOSIDED !== undefined) {
            elm.dwFlags |= 0x0004;
        }
        if (mat.USEALPHATEST !== undefined) {
            elm.dwFlags |= 0x0400;
        }

        if (!PhysOnly && mat.DIFFUSEMAP) {
            // load texture
            // not implemented yet
            // elm.texture = RCreateBaseTexture(mat.DIFFUSEMAP);
        }

        Materials.push(elm);
    }

    say("Loaded", Materials.length, "materials from xml file");

    return true;
} // [END] open material list function

function Open_LightList(data) {
    let llist = data.LIGHTLIST.LIGHT;
    // RTOK_MAX_OBJLIGHT		"obj_"

    for (let i = 1; i < llist.length; i++) {
        const Light = llist[i];

        if (Light["@_name"].match(/^obj_/)) {
            StaticObjectLightList.push(Light);
        } else {
            StaticMapLightList.push(Light);

            if (Light["@_name"].match(/^sun_omni/)) {
                let Sunlight = {};
                Sunlight.Name = Light["@_name"];
                Sunlight.dwFlags = 0;
                Sunlight.fAttnEnd = Light.ATTENUATIONEND;
                Sunlight.fAttnStart = Light.ATTENUATIONSTART;
                Sunlight.fIntensity = Light.INTENSITY;
                Sunlight.Position = Light.POSITION; // TODO: need to parse them
                Sunlight.Color = Light.COLOR;

                if (Light.CASTSHADOW !== undefined) {
                    Sunlight.dwFlags |= 0x0010;
                }

                StaticSunLightList.push(Sunlight);
            }
        }
    }

    say("Loaded", llist.length, "lights from xml file")

    return true;
}

function LoadRS2Map(data) {
    if (data.MATERIALLIST) Open_MaterialList(data);
    if (!PhysOnly) {
        if (data.LIGHTLIST) Open_LightList(data);

        // skip them because these are not that important at this moment
        // if (data.OBJECTLIST) Open_ObjectList(data);
        // if (data.OCCLUSIONLIST) Open_ObjectList(data); // elu objects
        // if (data.OBJECTLIST) Open_OcclusionList(data); // walls, wall partitions
        // open dummy
        // set fog
        // set ambsound (AMBIENTSOUNDLIST)
    }
    return true;
}

// OpenRs(path.resolve("test", "world-reader", "town.RS"));
OpenDescription(path.resolve("test", "world-reader", "town.RS.xml"));

// for debug
// say(checkArr.slice(offset, offset + 40))
