const fs = require("fs");
const path = require('path');
const say = require("./logger");

console.log("[map read] .RS read test");

const RS_ID = 0x12345678;
const RS_VERSION = 7;

let data = fs.readFileSync(path.resolve("test", "world-reader", "town.RS"));
let offset = 0;

let u8a = new Uint8Array(data);
let checkArr = [];
u8a.map(v => {
    checkArr.push(v.toString(16));
    return v;
})

// Read header
say("Read ID:", data.readUInt32LE(offset), "RS_ID:", RS_ID);
offset += 4;

say("Read Version:", data.readUInt32LE(offset), "RS_VERSION", RS_VERSION);
offset += 4;

// Read number of materials
let nMaterial = data.readInt32LE(offset); // int = 4 bytes
offset += 4;
say("Number of materials:", nMaterial);

let PhysOnly = false; // default: false

if (!PhysOnly) {
    //cut
}

let lc = 0;
for (let i = 1; i < nMaterial + 1; i++) {
    let str = "";
    let c;
    while (c = data.readUInt8(offset++), c != 0) {
        str += String.fromCharCode(c);
    }
    say(lc++, "file:", str);
}

// Open_ConvexPolygons
let NumConvexPolygons = data.readInt32LE(offset);
offset += 4;

let nConvexVertices = data.readInt32LE(offset);
offset += 4;

say("Convex polygons:", NumConvexPolygons, nConvexVertices);

let ConvexPolygons = new Array(NumConvexPolygons).fill({});
for (let i = 0; i < NumConvexPolygons; i++) {
    ConvexPolygons[i].nMaterial = data.readInt32LE(offset);
    offset += 4;
    ConvexPolygons[i].nMaterial += 2;
    ConvexPolygons[i].dwFlags = data.readUInt32LE(offset);
    offset += 4;

    // rplane(float a, float b, float c, float d)
    ConvexPolygons[i].plane = {};
    ConvexPolygons[i].plane.a = data.readFloatLE(offset);
    offset += 4;
    ConvexPolygons[i].plane.b = data.readFloatLE(offset);
    offset += 4;
    ConvexPolygons[i].plane.c = data.readFloatLE(offset);
    offset += 4;
    ConvexPolygons[i].plane.d = data.readFloatLE(offset);
    offset += 4;

    ConvexPolygons[i].fArea = data.readFloatLE(offset);
    offset += 4;
    ConvexPolygons[i].nVertices = data.readInt32LE(offset);
    offset += 4;

    for (let j = 0; j < ConvexPolygons[i].nVertices; j++) {
        // rvector = float x 3 (?)
        const x = data.readFloatLE(offset);
        offset += 4;
        const y = data.readFloatLE(offset);
        offset += 4;
        const z = data.readFloatLE(offset);
        offset += 4;
        // say(x, y, z);
    }

    for (let j = 0; j < ConvexPolygons[i].nVertices; j++) {
        // rvector = float x 3 (?)
        // data.readFloatLE(offset);
        offset += 4;
        // data.readFloatLE(offset);
        offset += 4;
        // data.readFloatLE(offset);
        offset += 4;
    }

}

// [END] Open_ConvexPolygons

// Read counts
let Nodes = data.readInt32LE(offset);
offset += 4;
say("Bsp Nodes:", Nodes);

let Polygons = data.readInt32LE(offset);
offset += 4;
let Vertices = data.readInt32LE(offset);
offset += 4;
let Indices = data.readInt32LE(offset);
offset += 4;

let NodeCount = data.readInt32LE(offset);
offset += 4;
let PolygonCount = data.readInt32LE(offset);
offset += 4;
let NumVertices = data.readInt32LE(offset);
offset += 4;
let NumIndices = data.readInt32LE(offset);
offset += 4;

// cut oc resize thing

say(NodeCount, PolygonCount, NumVertices, NumIndices);

// open nodes
function Open_Nodes(pNode, data, State) {
    pNode.bbTree = [];
    for (let i = 0; i < 6; i++) {
        const bound = data.readFloatLE(offset);
        offset += 4;
        pNode.bbTree.push(bound);
    }

    pNode.plane = {};
    pNode.plane.a = data.readFloatLE(offset);
    offset += 4;
    pNode.plane.b = data.readFloatLE(offset);
    offset += 4;
    pNode.plane.c = data.readFloatLE(offset);
    offset += 4;
    pNode.plane.d = data.readFloatLE(offset);
    offset += 4;

    // branch
    let flag = data.readUInt8(offset++);
    if (flag) {
        // open front node
    }
    flag = data.readUInt8(offset++);
    if (flag) {
        // open back node
    }
}


// [END] OpenRs

// for debug
// say(checkArr.slice(offset, offset + 40))
