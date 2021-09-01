/**
 * v3
 */
class rvector {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    setFromArray(xyzArray) {
        [this.x, this.y, this.z] = xyzArray;
    }
}

class vec2 {
    constructor() {
        this.x = 0;
        this.y = 0;
    }
}

class BSPNORMALVERTEX {
    /**
     * @param {rvector} Position 
     * @param {rvector} Normal 
     * @param {rvector} TexCoord0 
     * @param {rvector} TexCoord1 
     */
    constructor(Position, Normal, TexCoord0, TexCoord1) {
        this.Position = Position || new rvector();
        this.Normal = Normal || new rvector();
        this.TexCoord0 = TexCoord0 || new rvector();
        this.TexCoord1 = TexCoord1 || new rvector();
    }
}

/**
 * @param {rvector} v1 
 * @param {rvector} v2 
 */
function DotProduct(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

module.exports = {
    rvector,
    BSPNORMALVERTEX,
    vec2,
    DotProduct,
};