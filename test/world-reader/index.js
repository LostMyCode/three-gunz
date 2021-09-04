const fs = require("fs");
const path = require('path');
const xmlParser = require("fast-xml-parser");
const BufferReader = require("./BufferReader");
const say = require("./logger");
const { rvector, BSPNORMALVERTEX, vec2, DotProduct, OpenNodesState, BspCounts, RPOLYGONINFO, BSPVERTEX } = require("./Structs");

console.log("[world-reader] GunZ world reading test");

const RS_ID = 0x12345678;
const RS_VERSION = 7;
const RBSP_ID = 0x35849298;
const RBSP_VERSION = 2;
const R_LM_ID = 0x30671804;
const R_LM_VERSION = 3;

const RM_FLAG_HIDE = 0x0080; // from RealSpace2 -> Include -> RTypes.h

const Materials = [];
const StaticObjectLightList = [];
const StaticMapLightList = [];
const StaticSunLightList = [];
const ConvexPolygons = [];
const ConvexVertices = [];
const ConvexNormals = [];
const OcRoot = [];
const OcInfo = [];
const OcVertices = [];
const OcIndices = [];
const OcNormalVertices = [];
const BspVertices = [];
const BspRoot = [];
const BspInfo = [];
const MaterialList = [];
const LightmapTextures = [];
const PhysOnly = false; // default: false

/**
 * @param {string} filePath 
 * @param {BspCounts} Counts 
 */
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
    Counts.Nodes = data.readInt32LE();
    say("Bsp Nodes:", Counts.Nodes);

    Counts.Polygons = data.readInt32LE();
    Counts.Vertices = data.readInt32LE();
    Counts.Indices = data.readInt32LE();

    let NodeCount = data.readInt32LE();
    let PolygonCount = data.readInt32LE();
    let NumVertices = data.readInt32LE();
    let NumIndices = data.readInt32LE();

    Open_Nodes(
        OcRoot, data,
        new OpenNodesState(
            OcVertices, OcRoot,
            OcInfo, OcNormalVertices
        )
    );

    say(NodeCount, PolygonCount, NumVertices, NumIndices);
}

/**
 * @param {BufferReader} data 
 */
function Open_ConvexPolygons(data) {
    let NumConvexPolygons = data.readInt32LE();
    let nConvexVertices = data.readInt32LE();

    say("Convex polygons:", NumConvexPolygons, nConvexVertices);

    for (let i = 0; i < NumConvexPolygons; i++) {
        const cp = {};
        cp.nMaterial = data.readInt32LE();
        cp.nMaterial += 2;
        cp.dwFlags = data.readUInt32LE();

        // rplane(float a, float b, float c, float d)
        const [a, b, c, d] = data.readStructFloatLE(4);
        cp.plane = {};
        cp.plane.a = a;
        cp.plane.b = b;
        cp.plane.c = c;
        cp.plane.d = d;

        cp.fArea = data.readFloatLE();
        cp.nVertices = data.readInt32LE();

        for (let j = 0; j < cp.nVertices; j++) {
            // rvector = float x 3
            const cv = new rvector();
            [cv.x, cv.y, cv.z] = data.readStructFloatLE(3);
            ConvexVertices.push(cv);
        }

        for (let j = 0; j < cp.nVertices; j++) {
            const cn = new rvector();
            [cn.x, cn.y, cn.z] = data.readStructFloatLE(3);
            ConvexNormals.push(cn);
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
    let node = {};
    pNode.push(node);

    const bound = data.readStructFloatLE(6);
    node.bbTree = [];
    node.bbTree.push(...bound);

    const [a, b, c, d] = data.readStructFloatLE(4);
    node.plane = {};
    node.plane.a = a;
    node.plane.b = b;
    node.plane.c = c;
    node.plane.d = d;

    // branch
    let flag = data.readUInt8();
    if (flag) {
        // open front node
        let branch = [];
        // State.Node.push(branch);
        node.m_pPositive = branch;
        State = Open_Nodes(node.m_pPositive, data, State);
    }
    flag = data.readUInt8();
    if (flag) {
        // open back node
        let branch = [];
        // State.Node.push(branch);
        node.m_pNegative = branch;
        State = Open_Nodes(node.m_pNegative, data, State);
    }

    node.nPolygon = data.readInt32LE();

    if (node.nPolygon) {
        node.pInfo = [];
        // State.Info += node.nPolygon;
        // node.pInfo = new RPOLYGONINFO();

        for (let i = 0; i < node.nPolygon; i++) {
            let pInfo = new RPOLYGONINFO();
            let mat = data.readInt32LE();
            pInfo.nConvexPolygon = data.readInt32LE();
            pInfo.dwFlags = data.readUInt32LE();
            pInfo.nVertices = data.readInt32LE();

            for (let j = 0; j < pInfo.nVertices; j++) {
                let pVertex = new BSPVERTEX();
                pInfo.pVertices.push(pVertex);
                State.Vertices.push(pVertex);

                /**
                 * @type {rvector}
                 */
                let normal = new rvector();
                let x, y, z;

                // read vertex position
                [x, y, z] = data.readStructFloatLE(3);
                pVertex.x = x;
                pVertex.y = y;
                pVertex.z = z;

                // read vertex normal
                [x, y, z] = data.readStructFloatLE(3);
                normal.x = x;
                normal.y = y;
                normal.z = z;

                // read texture coordinates (diffuse map)
                [pVertex.tu1, pVertex.tv1] = data.readStructFloatLE(2);

                // read texture lightmap
                [pVertex.tu2, pVertex.tv2] = data.readStructFloatLE(2);

                if (State.Normals) {
                    let normalVertex = new BSPNORMALVERTEX(
                        new rvector(pVertex.x, pVertex.y, pVertex.z),
                        normal,
                        new vec2(pVertex.tu1, pVertex.tv1),
                        new vec2(pVertex.tu2, pVertex.tv2)
                    );
                    State.Normals.push(normalVertex);
                    pVertex.normal = normal;
                }
            }

            let nor = new rvector();
            [nor.x, nor.y, nor.z] = data.readStructFloatLE(3);
            pInfo.plane = {};
            pInfo.plane.a = nor.x;
            pInfo.plane.b = nor.y;
            pInfo.plane.c = nor.z;
            // say(pInfo.pVertices[0], pInfo.pVertices.length)
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

            State.Info.push(pInfo);
            node.pInfo.push(pInfo);

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

    for (let i = 0; i < ml.length; i++) {
        const mat = ml[i];

        if (!mat["@_name"]) continue;

        elm = {};
        elm.Name = mat["@_name"];
        elm.dwFlags = 0;
        elm.Diffuse = mat.DIFFUSE;
        elm.Specular = mat.SPECULAR ? Number(mat.SPECULAR.split(" ")[0]) : null; // '0.9000000 0.9000000 0.9000000'
        elm.Ambient = mat.AMBIENT ? Number(mat.AMBIENT.split(" ")[0]) : null;
        elm.Diffuse = mat.DIFFUSE ? Number(mat.DIFFUSE.split(" ")[0]) : null;
        elm.DiffuseMap = mat.DIFFUSEMAP;
        // elm.Power = "idk"; // atleast theres no Power in Town.RS.xml

        if (mat.DIFFUSEMAP) MaterialList.push(elm);

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

/**
 * @param {string} filePath 
 * @param {BspCounts} Counts 
 */
function OpenBsp(filePath, Counts) {
    let buf = fs.readFileSync(filePath);
    let data = new BufferReader(buf);

    // Read header
    say("Read ID:", data.readUInt32LE(), "RBSP_ID:", RBSP_ID);
    say("Read Version:", data.readUInt32LE(), "RBSP_VERSION", RBSP_VERSION);

    const nBspNodeCount = data.readInt32LE();
    const nBspPolygon = data.readInt32LE();
    const nBspVertices = data.readInt32LE();
    const nBspIndices = data.readInt32LE();

    if (
        Counts.Nodes != nBspNodeCount || Counts.Polygons != nBspPolygon ||
        Counts.Vertices != nBspVertices || Counts.Indices != nBspIndices
    ) {
        say("[OpenBsp]", "Error: Counts in .rs file didn't match counts in bsp file");
        return false;
    }

    Open_Nodes(
        BspRoot, data,
        new OpenNodesState(
            BspVertices, BspRoot, BspInfo
        )
    );

    say("[OpenBsp]", "Bsp nodes opened.");

    return true;
}

function CreatePolygonTable(pNode, Indices) {
    pNode = pNode || OcRoot;
    Indices = Indices || OcIndices;

    pNode = pNode[0];

    if (pNode.m_pPositive)
        CreatePolygonTable(pNode.m_pPositive, Indices);

    if (pNode.m_pNegative)
        CreatePolygonTable(pNode.m_pNegative, Indices);

    if (pNode.nPolygon) {
        for (let i = 0; i < pNode.nPolygon; i++) {
            // let pInd = Indices;
            let pInd = [];
            let pInfo = pNode.pInfo[i];

            for (let j = 0; j < pInfo.nVertices - 2; j++) {
                pInd.push(0, j + 1, j + 2);
            }

            pInfo.pInd = pInd;
        }
    }
}

function OpenLightmap(filePath) {
    let buf = fs.readFileSync(filePath);
    let data = new BufferReader(buf);

    // Read header
    say("Read ID:", data.readUInt32LE(), "R_LM_ID:", R_LM_ID);
    say("Read Version:", data.readUInt32LE(), "R_LM_VERSION", R_LM_VERSION);

    let nSourcePolygon = data.readInt32LE();
    let nNodeCount = data.readInt32LE();

    // skip num check

    let nLightmap = data.readInt32LE();
    for (let i = 0; i < nLightmap; i++) {
        let nBmpSize = data.readInt32LE();
        let LightmapTex = data.readStructUInt8(nBmpSize);
        LightmapTextures.push({
            size: nBmpSize,
            data: LightmapTex
        });
    }

    for (let i = 0; i < OcInfo.length; i++) {
        data.readInt32LE();
    }

    // Read lightmap texture indices (Lightmap ID)
    for (let i = 0; i < OcInfo.length; i++) {
        const pInfo = OcInfo[i];
        pInfo.nLightmapTexture = data.readInt32LE();
    }

    // Read lightmap texture coordinates
    for (let i = 0; i < OcVertices.length; i++) {
        const Vertex = OcVertices[i];
        [Vertex.tu2, Vertex.tv2] = data.readStructFloatLE(2);
    }

    // original
    exportLightmapTexture(nLightmap);

    return true;
}

function exportLightmapTexture(nLightmap) {
    console.log(nLightmap);
    for (let i = 0; i < nLightmap; i++) {
        let tex = LightmapTextures[i];
        fs.writeFileSync(`./Lightmap${i}.bmp`, Buffer.from(tex.data));
    }
}

const bspc = new BspCounts();
OpenDescription(path.resolve("test", "world-reader", "town.RS.xml"));
OpenRs(path.resolve("test", "world-reader", "town.RS"), bspc);
OpenBsp(path.resolve("test", "world-reader", "town.RS.bsp"), bspc);
OpenLightmap(path.resolve("test", "world-reader", "town.RS.lm"));
CreatePolygonTable();

fs.writeFileSync("./rs_map_obj_data.json", JSON.stringify({
    OcRoot,
    MaterialList
}));
