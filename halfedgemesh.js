/**
 * Skeleton code implementation for a half-edge mesh
 */

let vec3 = glMatrix.vec3;

function HEdge() {
    this.head = null; // Head vertex
    this.face = null; // Left face
    this.pair = null; // Half edge on opposite face
    this.prev = null; // Previous half edge in CCW order around left face
    this.next = null; // Next half edge in CCW order around left face
    this.visited = false; // Used in boundary cycles

    /**
     * Return a list of the two vertices attached to this edge,
     * or an empty list if one of them has not yet been initialized
     * 
     * @returns {list} A 2-element list of HVertex objects corresponding
     *                  to vertices attached to this edge
     */
    this.getVertices = function () {
        let ret = [];
        if (!(this.head === null) && !(this.prev === null)) {
            if (!(this.prev.head === null)) {
                ret = [this.head, this.prev.head];
            }
        }
        return ret;
    }
}

function HFace() {
    this.h = null; // Any HEdge on this face

    /**
     * Get a list of half-edges involved with this face
     * 
     * @returns {list} A list of HEdge objects corresponding
     *                 to edges at the boundary of this face
     */
    this.getEdges = function () {
        if (this.h === null) {
            return [];
        }

        let h = this.h;
        let edges = [];

        do {
            edges.push(h);
            h = h.next;
        } while (h != this.h)

        return edges;
    }

    /**
     * Get a list of vertices attached to this face
     * 
     * @returns {list} A list of HVertex objects corresponding
     *                 to vertices on this face
     */
    this.getVertices = function () {
        if (this.h === null) {
            return [];
        }
        let h = this.h.next;
        let vertices = [this.h.head];
        while (h != this.h) {
            vertices.push(h.head);
            h = h.next;
        }

        return vertices;
    }

    /**
     * Compute the area of this face
     * 
     * @returns {float} The area of this face
     */
    this.getArea = function () {
        let area = 0.0;

        let vertices = this.getVertices();
        let edges = this.getEdges();
        let numTriangles = edges.length - 2;

        // First vertex in triangle for area
        // Stays constant while iterate through other vertices
        let a = vertices[0].pos;

        // Other 2 vertices for calling get triangle area
        let b;
        let c;

        for (let i = 0; i < numTriangles; i++) {
            b = vertices[i + 1].pos;
            c = vertices[i + 2].pos;

            area += getTriangleArea(a, b, c);
        }

        return area;
    }

    /**
     * Get the normal of this face, assuming it is flat
     * 
     * @returns {vec3} The normal of this face
     */
    this.getNormal = function () {
        let normal = vec3.create();

        let vertices = this.getVertices();
        let vert0 = vertices[0].pos;
        let vert1 = vertices[1].pos;
        let vert2 = vertices[2].pos;

        let edge1 = vec3.create();
        let edge2 = vec3.create();

        vec3.subtract(edge1, vert1, vert0);
        vec3.subtract(edge2, vert2, vert0);

        vec3.cross(normal, edge1, edge2);

        vec3.normalize(normal, normal);

        return normal;
    }
}

function HVertex(pos, color) {
    this.pos = pos;
    this.color = color;
    this.h = null; // Any hedge on this vertex

    /**
     * Compute the vertices that are attached to this
     * vertex by an edge
     * 
     * @returns {list} List of HVertex objects corresponding
     *                 to the attached vertices
     */
    this.getVertexNeighbors = function () {
        if (this.h === null) {
            return [];
        }

        let vertices = [];
        let h = this.h;

        do {
            vertices.push(h.head);
            h = h.pair.next;
        } while (h != this.h)

        return vertices;
    }

    /**
     * Compute the faces of which this vertex is a member
     * 
     * @returns {list} A list of HFace objects corresponding
     *                  to the incident faces
     */
    this.getAttachedFaces = function () {
        if (this.h === null) {
            return [];
        }

        let faces = [];
        let h = this.h;

        do {

            if (h.face !== null) {
                faces.push(h.face);
            }

            h = h.pair.next;
        } while (h != this.h)

        return faces;
    }

    /**
     * Compute the normal of this vertex as an area-weighted
     * average of the normals of the faces attached to this vertex
     * 
     * @returns {float} The estimated normal
     */
    this.getNormal = function () {
        let normal = vec3.fromValues(0, 0, 0);
        let weight = 0.0;

        let faces = this.getAttachedFaces();

        for (face of faces) {
            weight += face.getArea();
            vec3.scaleAndAdd(normal, normal, face.getNormal(), face.getArea());
        }

        normal = vec3.scale(normal, normal, 1 / weight);

        return normal;
    }
}

/**
 * Given three 3D vertices a, b, and c, compute the area 
 * of the triangle they span
 * @param {vec3} a First point
 * @param {vec3} b Second point
 * @param {vec3} c Third point
 * 
 * @return {float} Area of the triangle
 */
function getTriangleArea(a, b, c) {

    let ab = vec3.create();
    let ac = vec3.create();

    vec3.subtract(ab, b, a);
    vec3.subtract(ac, c, a);

    crossProduct = vec3.create();

    vec3.cross(crossProduct, ab, ac)

    magCrossProduct = Math.sqrt(vec3.dot(crossProduct, crossProduct));

    area = (1 / 2) * magCrossProduct;

    return area;
}

function HedgeMesh() {
    PolyMesh(this); // Initialize common functions/variables

    /**
     * @returns {I} A NumTrisx3 Uint16Array of indices into the vertex array
     */
    this.getTriangleIndices = function () {
        let NumTris = 0;
        let allvs = [];
        for (let i = 0; i < this.faces.length; i++) {
            let vsi = this.faces[i].getVertices();
            allvs.push(vsi.map(function (v) {
                return v.ID;
            }));
            NumTris += vsi.length - 2;
        }
        let I = new Uint16Array(NumTris * 3);
        let i = 0;
        let faceIdx = 0;
        //Now copy over the triangle indices
        while (i < NumTris) {
            let verts = allvs[faceIdx]
            for (let t = 0; t < verts.length - 2; t++) {
                I[i * 3] = verts[0];
                I[i * 3 + 1] = verts[t + 1];
                I[i * 3 + 2] = verts[t + 2];
                i++;
            }
            faceIdx++;
        }
        return I;
    }

    /**
     * @returns {I} A NEdgesx2 Uint16Array of indices into the vertex array
     */
    this.getEdgeIndices = function () {
        let I = [];
        for (let i = 0; i < this.edges.length; i++) {
            let vs = this.edges[i].getVertices();
            for (let k = 0; k < vs.length; k++) {
                I.push(vs[k].ID);
            }
        }
        return new Uint16Array(I);
    }

    /**
     * Given two vertex objects representing an edge,
     * and a face to the left of that edge, initialize
     * a half edge object and add it to the list of edges
     * 
     * @param {HVertex} v1 First vertex on edge
     * @param {HVertex} v2 Second vertex on edge
     * @param {HFace} face Face to the left of edge
     * 
     * @returns {HEdge} The constructed half edge
     */
    this.addHalfEdge = function (v1, v2, face) {
        const hedge = new HEdge();
        hedge.head = v2; // Points to head vertex of edge
        hedge.face = face;
        v1.h = hedge; // Let tail vertex point to this edge
        this.edges.push(hedge);
        return hedge;
    }

    /////////////////////////////////////////////////////////////
    ////                INPUT/OUTPUT METHODS                /////
    /////////////////////////////////////////////////////////////

    /**
     * Load in an OFF file from lines and convert into
     * half edge mesh format. Crucially, this function assumes
     * a consistently oriented mesh with vertices specified 
     * in CCW order
     */
    this.loadFileFromLines = function (lines) {
        // Step 1: Consistently orient faces using
        // the basic mesh structure and copy over the result
        const origMesh = new BasicMesh();
        origMesh.loadFileFromLines(lines);
        origMesh.consistentlyOrientFaces();
        origMesh.subtractCentroid();
        const res = { 'vertices': [], 'colors': [], 'faces': [] };
        for (let i = 0; i < origMesh.vertices.length; i++) {
            res['vertices'].push(origMesh.vertices[i].pos);
            res['colors'].push(origMesh.vertices[i].color);
        }
        for (let i = 0; i < origMesh.faces.length; i++) {
            // These faces should now be consistently oriented
            const vs = origMesh.faces[i].getVertices();
            res['faces'].push(vs.map(
                function (v) {
                    return v.ID;
                }
            ));
        }

        // Step 1.5: Clear previous mesh
        this.vertices.length = 0;
        this.edges.length = 0;
        this.faces.length = 0;

        // Step 2: Add vertices
        for (let i = 0; i < res['vertices'].length; i++) {
            let V = new HVertex(res['vertices'][i], res['colors'][i]);
            V.ID = this.vertices.length;
            this.vertices.push(V);
        }

        let str2Hedge = {};
        // Step 3: Add faces and halfedges
        for (let i = 0; i < res['faces'].length; i++) {
            const face = new HFace();
            this.faces.push(face);
            let vertsi = [];
            for (let k = 0; k < res['faces'][i].length; k++) {
                vertsi.push(this.vertices[res['faces'][i][k]]);
            }

            // Add halfedges
            for (let k = 0; k < vertsi.length; k++) {
                const v1 = vertsi[k];
                const v2 = vertsi[(k + 1) % vertsi.length];
                // Add each half edge
                const hedge = this.addHalfEdge(v1, v2, face);
                // Store half edge in hash table
                let key = v1.ID + "_" + v2.ID;
                str2Hedge[key] = hedge;
                face.h = hedge;
            }

            // Link edges together around face in CCW order
            // assuming each vertex points to the half edge
            // starting at that vertex
            // (which addHalfEdge has just done)
            for (let k = 0; k < vertsi.length; k++) {
                vertsi[k].h.next = vertsi[(k + 1) % vertsi.length].h;
                vertsi[(k + 1) % vertsi.length].h.prev = vertsi[k].h;
            }
        }

        // Step 4: Add links between opposite half edges if 
        // they exist.  Otherwise, it is a boundary edge, so
        // add a half edge with a null face on the other side
        let boundaryEdges = {}; // Index boundary edges by their tail
        for (const key in str2Hedge) {
            const v1v2 = key.split("_");
            let h1 = str2Hedge[key];
            const other = v1v2[1] + "_" + v1v2[0];
            if (other in str2Hedge) {
                h1.pair = str2Hedge[other];
            }
            else {
                let h2 = new HEdge();
                h1.pair = h2;
                h2.pair = h1;
                h2.head = this.vertices[v1v2[0]];
                boundaryEdges[v1v2[1]] = h2;
                this.edges.push(h2);
            }
        }

        // Step 5: Link boundary edges
        for (key in boundaryEdges) {
            let e = boundaryEdges[key];
            if (e.next === null) {
                let e2 = boundaryEdges[e.head.ID];
                e.next = e2;
                e2.prev = e;
            }
        }

        console.log("Initialized half edge mesh with " +
            this.vertices.length + " vertices, " +
            this.edges.length + " half edges, " +
            this.faces.length + " faces");

        this.needsDisplayUpdate = true;
    }


    /////////////////////////////////////////////////////////////
    ////                  GEOMETRIC TASKS                   /////
    /////////////////////////////////////////////////////////////

    /**
     * Move each vertex along its normal by a factor
     * 
     * @param {float} fac Move each vertex position by this
     *                    factor of its normal.
     *                    If positive, the mesh will inflate.
     *                    If negative, the mesh will deflate.
     */
    this.inflateDeflate = function (fac) {

        for (vertex of this.vertices) {
            vec3.scaleAndAdd(vertex.pos, vertex.pos, vertex.getNormal(), fac);
        }

        this.needsDisplayUpdate = true;
    }

    /**
     * Compute the mean vector from all of this vertex's neighbors
     * to the vertex.  If smoothing, subtract this vector off.
     * If sharpening, add this vector on
     * 
     * @param {boolean} smooth If true, smooth.  If false, sharpen
     */
    this.laplacianSmoothSharpen = function (smooth) {

        let smoothSharpCoeff = -1;

        if (smooth) {
            smoothSharpCoeff = 1;
        }

        let neighbors;
        let vertexPositions = [];

        // Loops through the vertices and takes the average of the neighbors of the vertices
        // This is then added or subtracted from the vertices position and stored in a temporary location
        for (let i = 0; i < this.vertices.length; i++) {
            neighbors = this.vertices[i].getVertexNeighbors();

            let toVectorsAvg = vec3.create();
            let tempVec = vec3.create();

            for (neighbor of neighbors) {
                vec3.subtract(tempVec, neighbor.pos, this.vertices[i].pos);
                vec3.add(toVectorsAvg, toVectorsAvg, tempVec);
            }

            vec3.scale(toVectorsAvg, toVectorsAvg, 1 / neighbors.length);
            vec3.scaleAndAdd(tempVec, this.vertices[i].pos, toVectorsAvg, smoothSharpCoeff);

            vertexPositions[i] = tempVec;
        }

        // Unloading the new positions back into the vertices
        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].pos = vertexPositions[i];
        }

        this.needsDisplayUpdate = true;
    }

    /** Apply some creative per-vertex warp */
    this.warp = function () {

        for(let i = 0; i < this.vertices.length; i+=1) {

            // Second Attempt at Warping
            // Warp the mesh twice for an interesting visual (flattens into 2D)
            // Increment by 1 when using this   
            x = this.vertices[i].pos[0];
            y = this.vertices[i].pos[1];
            z = this.vertices[i].pos[2];

            this.vertices[i].pos[0] = x * Math.cos(x);
            this.vertices[i].pos[1] = y * Math.sin(x);
            this.vertices[i].pos[2] = z;
            
        }

        this.needsDisplayUpdate = true;
    }


    /////////////////////////////////////////////////////////////
    ////                  TOPOLOGICAL TASKS                 /////
    /////////////////////////////////////////////////////////////
    /**
     * Return a list of boundary cycles
     * 
     * @returns {list} A list of cycles, each of which is
     *                 its own list of HEdge objects corresponding
     *                 to a unique cycle
     */
    this.getBoundaryCycles = function () {

        let cycles = [];
        let tempCycle = [];
        let tempHEdge;

        for (let edge of this.edges) {

            tempHEdge = edge;

            while (tempHEdge.visited === false && tempHEdge.face === null) {

                tempCycle.push(tempHEdge);
                tempHEdge.visited = true;

                tempHEdge = tempHEdge.next;
            }

            if (tempCycle.length !== 0) {
                cycles.push(tempCycle);
                tempCycle = [];
            }

        }

        // Have to unvisit them because this function gets called 
        // everytime the scene is altered (like moving the camera)
        for (let edge of this.edges) {
            edge.visited = false;
        }

        return cycles;
    }

    /**
     * Compute the genus of this mesh if it is watertight.
     * If it is not watertight, return -1
     * 
     * @returns {int} genus if watertight, or -1 if not
     */
    this.getGenus = function () {
        let genus = -1;

        let isWatertight = this.getBoundaryCycles().length === 0;

        if (isWatertight) {

            let numEdges = this.edges.length / 2;
            let numFaces = this.faces.length;
            let numVertices = this.vertices.length;

            euler = numVertices - numEdges + numFaces;
            genus = (2 - euler) / 2
        }

        return genus;
    }

    /**
     * Fill in the boundary cycles with triangles.  The mesh
     * should be watertight at the end
     */
    this.fillHoles = function () {
        // TODO: Fill this in

        this.needsDisplayUpdate = true;
    }



    /////////////////////////////////////////////////////////////
    ////                MESH CREATION TASKS                 /////
    /////////////////////////////////////////////////////////////

    /**
     * Truncate the mesh by slicing off the tips of each vertex
     * @param {float} fac The amount to go down each edge from the vertex
     *                    (should be between 0 and 1)
     */
    this.truncate = function (fac) {
        // TODO: Fill this in

        this.needsDisplayUpdate = true;
    }

    /**
     * Perform a linear subdivision of the mesh
     */
    this.subdivideLinear = function () {
        // TODO: Fill this in

        this.needsDisplayUpdate = true;
    }

    /** 
     * Perform Loop subdivision on the mesh
     */
    this.subdivideLoop = function () {
        // TODO: Fill this in

        this.needsDisplayUpdate = true;
    }

}