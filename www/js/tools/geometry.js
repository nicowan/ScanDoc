/**
 * Geometry related classes
 */


/**
 * The class vector is responsible to store a 2D point
 */
export class Vector {
    /** @type {Number} Horizontal position */
    x;

    /** @type {Number} Y Vertical position */
    y;

    /**
     * Class constructor
     * 
     * @param {Number} x Horizontal position
     * @param {Number} y Vertical position
     */
    constructor(x=0, y=0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Compute the vector's length
     * 
     * @returns {Number} the vector's length
     */
     length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }

    /**
     * Compute the vector's angle
     * 
     * @returns {Number} the vector's angle
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Returns a clone of the current object
     * 
     * @returns {Vector} The cloned point
     */
    clone() {
        return new Vector(this.x, this.y);
    }

    /**
     * Returns a scaled copy of the original object
     * 
     * @param {Number} scaleX The horizontal scaling factor 
     * @param {Number} scaleY (optional) The vertical scaling factor.
     *                        Same as scale X if ommited
     * @returns {Vector} The scaled point
     */
    scale(scaleX, scaleY = null) {
        // scaleY takes the same value as scaleX when ommited
        if (scaleY === null) scaleY = scaleX;

        // Create the new point
        return new Vector(this.x * scaleX, this.y * scaleY);
    }

    /**
     * Returns a shifted copy of the original point
     * 
     * @param {Number} offsetX the shift distance on the horizontal axis
     * @param {Number} offsetY the shift distance on the vertical axis
     * @returns {Vector} The shifted point
     */
    shift(offsetX = 0, offsetY = 0) {
        return new Vector( this.x + offsetX, this.y + offsetY)
    }

    /**
     * Convert the object to a string
     * @returns {String} The object represented in a string format
     */
    toString() {
        return `(${this.x}, ${this.y})`;
    }
}

/**
 * The class Polygon is responsible to store a polygon
 * 
 */
export class Polygon {
    /** @type {Array<Vector>} The polygon vertices */
    vertices;

    /** @type {Number} handle radius in pixel */
    radius = 25;


    /**
     * Polygon constructor
     * 
     */
    constructor() {
        this.vertices = [];
    }

    /**
     * Returns an array of all vertex coordinates.
     * for example a triangle gets [p0.x, p0.y, p1.x, p1.y, p2.x, p2.y].
     * 
     * @param {Number} scale (optional) Scales the points by a given factor
     * @returns {Array<Number>} The array of coordinates
     */
    getArrayOfCoords(scale=1) {
        const coordinates = [];
        for(let i=0; i<this.vertices.length; i++) {
            coordinates.push(this.vertices[i].x / scale);
            coordinates.push(this.vertices[i].y / scale);
        }
        return coordinates;
    }

    /**
     * Add a vertext to this polygon
     * 
     * @param {Vector} point The vertex to add to the polygon
     * @returns this object (to chain commands)
     */
    addVertex(point) {
        this.vertices.push(point.clone());
        return this;
    }

    /**
     * Is the given index valid ?
     * 
     * @param {Number} index The index to check
     * @returns {Boolean} true  when given index is valid
     *                    false when the index is not a valid index
     */
    isIndexValid(index) {
        return index >= 0 && index < this.vertices.length;
    }


    /**
     * Draw the polygon with the given drawing context
     * 
     * @param {CanvasRenderingContext2D} ctx The drawing target
     * @param {String} strokeStyle (optional) The line color
     * @param {String} fillStyle (optional) The fill color
     */
    draw(ctx, strokeStyle=null, fillStyle=null) {
        const len = this.vertices.length;

        // Set the styles if defined
        if (strokeStyle !== null) ctx.strokeStyle = strokeStyle;
        if (fillStyle !== null) ctx.fillStyle = fillStyle;

        // Draw the polygon
        ctx.beginPath();
        ctx.moveTo(this.vertices[0].x, this.vertices[0].y);

        for(let i=1; i<=len; i++) {
            ctx.lineTo(this.vertices[i%len].x, this.vertices[i%len].y);
        }

        ctx.fill();
        ctx.stroke();
    }
 
    /**
     * Draw the handle for the identified vertex.
     * 
     * @param {CanvasRenderingContext2D} ctx The drawing target
     * @param {Number} vertexIdx vertex index
     * @param {String} strokeStyle (optional) line color
     * @param {String} fillStyle (optional) fill color
     */
    drawHandle(ctx, vertexIdx, strokeStyle=null, fillStyle=null) {
        //const len = this.vertices.length;

        // Exit if bad index
        if (!this.isIndexValid(vertexIdx)) return;

        // Set the styles if defined
        if (strokeStyle !== null) ctx.strokeStyle = strokeStyle;
        if (fillStyle !== null) ctx.fillStyle = fillStyle;

        // Reference on points
        const curr = this.vertices[vertexIdx];
        //const prev = this.vertices[(vertexIdx + len - 1) % len];
        //const next = this.vertices[(vertexIdx + 1) % len];

        // polygon borders
        //const v1 = new Vector( next.x - curr.x, next.y - curr.y).scale(0.25);
        //const v2 = new Vector( prev.x - curr.x, prev.y - curr.y);

        // Draw it
        ctx.beginPath();
        //ctx.moveTo(p0.x, p0.y);
        ctx.arc(
            curr.x, curr.y,
            this.radius,    // v1.length(),
            0,              // v1.angle(),
            Math.PI * 2     // v2.angle()
        );
        //ctx.lineTo(p0.x, p0.y);

        ctx.fill();
        ctx.stroke();    
    }
    
    /**
     * Returns the handle designated by the cursor position
     * 
     * @param {Vector} point The cursor's position
     * @returns {Number} The handle index, -1 when no handle is selected
     */
    getPointedVertexIndex(point) {
        for( let idx=0; idx < this.vertices.length; idx++) {
            const distance = this.vertices[idx].shift(-point.x, -point.y).length();
            if (distance <= this.radius) return idx;
        }
        return -1;
    }


    /**
     * Move the given vertex
     * 
     * @param {Number} vertexIdx Vertex index as returned by getVertex
     * @param {Number} dx horizontal shift for the vertex
     * @param {Number} dy vertical shift for the selected vertex
     * @returns 
     */
    moveVertex(vertexIdx, dx, dy) {
        // Exit if bad index
        if (!this.isIndexValid(vertexIdx)) return;

        // Compute new position
        this.vertices[vertexIdx] = this.vertices[vertexIdx].shift(dx, dy);
    }
}