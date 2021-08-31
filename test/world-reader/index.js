const fs = require("fs");
const path = require('path');
const BufferReader = require("./BufferReader");
const say = require("./logger");

console.log("[map read] .RS read test");

const RS_ID = 0x12345678;
const RS_VERSION = 7;

let buf = fs.readFileSync(path.resolve("test", "world-reader", "town.RS"));

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

let PhysOnly = false; // default: false

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

// Open_ConvexPolygons
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

// [END] Open_ConvexPolygons

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

// open nodes
/**
 * 
 * @param {RSBspNode} pNode 
 * @param {BufferReader} data 
 * @param {OpenNodeState} State 
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
    }
}

class OpenNodeState {
    constructor() {
        this.Vertices = [];
        this.Node = [];
        this.Info = "idk";

        this.nodeOffset = 0;
    }

    get nextNode() {
        return this.Node[++this.nodeOffset];
    }
}



// [END] OpenRs

// for debug
// say(checkArr.slice(offset, offset + 40))
