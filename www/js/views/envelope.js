/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper   from '../tools/paper.js';
import * as Element from '../tools/element.js';

export const ENVELOPE_EVENT_NAME = "EnvelopeValid";
export const CANCEL_EVENT_NAME   = "EnvelopeCancel";
const RADIUS = 10;

/**
 * Touches class keeps local track of a touch point
 */
class Touches {
    /** @type {String} Touch identifier */
    identifier = "none";

    /** @type {Number} X position */
    posX = 0;

    /** @type {Number} Y position */
    posY = 0;

    /** @type {String} corner's reference */
    corner = "-";

    constructor(identifier, posX, posY) {
        this.identifier = identifier;
        this.posX = posX;
        this.posY = posY;
        this.corner = "-";
    }

    setCorner(corner) {
        this.corner = corner;
    }
}

class Corner {
    radius = 50;
    posX = 0;
    posY = 0;

    constructor(posX, posY) {
        this.posX = posX;
        this.posY = posY;
    }

    isInside(x, y) {
        const distance = Math.sqrt(Math.pow(this.posX - x, 2) + Math.pow(this.posY - y, 2));
        return (distance < this.radius);
    }
}


class Polygon {
    /**
     * Polygon constructor
     * @param {Point} ul Upper-left  corner's position
     * @param {Point} ur Upper-right corner's position
     * @param {Point} lr Lower-left  corner's position
     * @param {Point} ll Lower-right corner's position
     */
    constructor(ul, ur, lr, ll) {
        this.ul = ul;
        this.ur = ur;
        this.lr = lr;
        this.ll = ll;
        this.size = 50;

        this.offset = {
            ul : { x: 0,         y: 0         },
            ur : { x: this.size, y: 0         },
            lr : { x: this.size, y: this.size },
            ll : { x: 0,         y: this.size },
        }
    }

    /**
     * Draw the polygon in the given context
     * @param {CanvasRenderingContext2D} ctx The drawing target
     * @param {String} strokeStyle The line color
     * @param {String} fillStyle The fill color
     */
    draw(ctx, strokeStyle="red", fillStyle="rgba(255, 255, 255, 0.25") {
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;

        ctx.beginPath();
        ctx.moveTo(this.ul.x, this.ul.y);
        ctx.lineTo(this.ur.x, this.ur.y);
        ctx.lineTo(this.lr.x, this.lr.y);
        ctx.lineTo(this.ll.x, this.ll.y);
        ctx.lineTo(this.ul.x, this.ul.y);
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draw the identified handle in the given context
     * @param {CanvasRenderingContext2D} ctx The drawing target
     * @param {String} corner The handle identifier (ul, ur, ll, lr)
     * @param {String} strokeStyle The line color
     * @param {String} fillStyle The fill color
     */
    drawHandle(ctx, corner, strokeStyle="red", fillStyle="rgba(255, 255, 255, 0.25") {
        if (this[corner] !== undefined) {
            ctx.fillStyle = fillStyle;
            ctx.strokeStyle = strokeStyle;
    
            ctx.beginPath();
            ctx.rect(
                this[corner].x - this.offset[corner].x,
                this[corner].y - this.offset[corner].y,
                this.size,
                this.size
            );
            ctx.fill();
            ctx.stroke();    
        }
    }

    /**
     * Returns the handle designated by the cursor position
     * @param {Number} x The cursor's X position
     * @param {Number} y The cursor's Y position
     * @returns {String} The handle name
     */
    getHandle(x, y) {

        for( let handle in this.offset) {
            const offset = this.offset[handle];
            const corner = this[handle];

            const cx = corner.x - offset.x;
            const cy = corner.y - offset.y;
            
            if (x >= cx && x < cx + this.size - 1 &&
                y >= cy && y < cy + this.size - 1 ) {
                return handle;
            }
        }

        // No handle clicked
        return "-";
    }


    moveCorner(corner, dx, dy) {
        if (this[corner] !== undefined) {
            this[corner].x += dx;
            this[corner].y += dy;
        }
    }
}




export class View extends Element.Base {
    /** @type {Array<Corner>} The paper corner's positions */
    corners = [];

    /** @type {Map<Number, Touches>} Touch pannel touches or mouse pointers */
    touches = null;

    /**
     * Custom element's constructor
     */
    constructor() {
        super();

        // Create the Touches dictionnary
        this.touches = new Map();

        this.polygon = null;
    }

    /**
     * Update the component content and style
     */
    update() {
        super.update();

        // Cancel button
        const btnCancel = this.shadowRoot.querySelector('#cancel');
        btnCancel.addEventListener( 'click', event => this.envelopeCanceled(event));

        // Validate button
        const btnCorrect = this.shadowRoot.querySelector('#correct');
        btnCorrect.addEventListener( 'click', event => this.envelopeValidated(event));

        // Image loaded
        const img = this.shadowRoot.querySelector('img');
        img.addEventListener( 'load', event => this.imageLoaded(event));

        // Attach mouse events
        const cnv = this.shadowRoot.querySelector('canvas');
        cnv.addEventListener('mousedown',   event => this.mouseDown(event));
        cnv.addEventListener('mousemove',   event => this.mouseMove(event));
        cnv.addEventListener('mouseup',     event => this.mouseUp(event));

        // Attach touch events
        cnv.addEventListener("touchstart",  event => this.handleTouchStart(event));
        cnv.addEventListener("touchmove",   event => this.handleTouchMove(event));
        cnv.addEventListener("touchend",    event => this.handleTouchEnd(event));
        cnv.addEventListener("touchcancel", event => this.handleTouchEnd(event));
    }

    /**
     * Set the image in this view
     * @param {HTMLImageElement} imageRaw The image taken by the camera
     */
    setSourceImage(sourceImage) {
        const img = this.shadowRoot.querySelector('img');
        img.src = sourceImage.src;
    }

    /**
     * When the image is loaded, update canvas size to match the screen
     */
    imageLoaded() {
        const cnv = this.shadowRoot.querySelector('canvas');
        const img = this.shadowRoot.querySelector('img');

        // The canvas takes the image's size on screen
        cnv.width  = img.clientWidth;
        cnv.style.width  = `${cnv.width}px`;

        cnv.height = img.clientHeight;
        cnv.style.height = `${cnv.height}px`;

        // Create document's corners
        this.polygon = new Polygon(
            { x:0.1 * cnv.width, y:0.1 * cnv.height },
            { x:0.9 * cnv.width, y:0.1 * cnv.height },
            { x:0.9 * cnv.width, y:0.9 * cnv.height },
            { x:0.1 * cnv.width, y:0.9 * cnv.height }
        );

        this.updateCanvas();
    }

    /**
     * Validation button clicked
     * Fires a ENVELOPE_EVENT_NAME.
     * 
     * @param {Event} event Button click event
     */
    envelopeValidated(event) {
        const img   = this.shadowRoot.querySelector('img');
        const scale = img.naturalWidth / img.clientWidth;


        const polygon = [
            scale * this.polygon.ul.x, scale * this.polygon.ul.y,
            scale * this.polygon.ur.x, scale * this.polygon.ur.y,
            scale * this.polygon.lr.x, scale * this.polygon.lr.y,
            scale * this.polygon.ll.x, scale * this.polygon.ll.y,
        ];

        const customEvent = new CustomEvent(ENVELOPE_EVENT_NAME, {
            bubbles: true,
            detail: { polygon : polygon  }
        });
    
        this.parentElement.dispatchEvent(customEvent);
    }

    /**
     * Cancel button clicked
     * Fires a CANCEL_EVENT_NAME.
     * 
     * @param {Event} event Button click event
     */
    envelopeCanceled(event) {
        const customEvent = new CustomEvent(CANCEL_EVENT_NAME, {
            bubbles: true,
            detail: { /* TODO */  }
        });
    
        this.parentElement.dispatchEvent(customEvent);
    }

    /**
     * Redraw the canvas
     */
    updateCanvas() {
        /** @type {HTMLCanvasElement} */
        const cnv = this.shadowRoot.querySelector('canvas');

        /** @type {CanvasRenderingContext2D} */
        const ctx = cnv.getContext('2d');

        // Clear the previous rectangle
        ctx.clearRect(0, 0, cnv.width, cnv.height);

        // Draw canvas' frame
        if (this.polygon) {
            this.polygon.drawHandle(ctx, "ul", "#ff0", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, "ur", "#0ff", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, "lr", "#f0f", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, "ll", "#fff", "rgba(255, 255, 255, 0.25)");
            this.polygon.draw(ctx, "red", "rgba(255, 255, 255, 0.25)");
        }

        // TODO: Highlight the selected corner
    }

    /**
     * Convert the event coordinates to canvas coordinate
     * 
     * @param {MouseEvent|Touch} event The event's data
     * @returns {Point} The coordinate in the canvas
     */
    getCanvasCoordinate(event) {
        const rect = event.target.getBoundingClientRect();
        const result = {
            x : event.clientX - rect.left, 
            y : event.clientY - rect.top,
        };
        //this.printDebug(`${result.x.toFixed(3)}, ${result.y.toFixed(3)}`);
        return result;
    }





    /**
     * Search a corner at the cursor position
     * 
     * @param {Number} x Cursor Xposition
     * @param {Number} y Cursor Y position
     */
     findCorner(x, y) {
        for(const corner of this.corners) {
            if (corner.isInside(x, y)) {
                //this.printDebug(`Find corner at ${x.toFixed(0)}, ${y.toFixed(0)}`);
                return corner;
            }
        }

        //this.printDebug(`Nothing at ${x.toFixed(0)}, ${y.toFixed(0)}`);
        return null;
    }



    /**
     * Show the givent text in the debug element
     * 
     * @param {String} text The text to print
     */
    printDebug(text) {
        const target = this.shadowRoot.querySelector("#debug")
        if (target) target.innerHTML = text;
    }

    /**
     * Create a touche / mouse identifier
     * 
     * @param {String} type Type of event touch or mouse
     * @param {Number} identifier (optional) The touch identifier, leave empty for mouse
     * @returns {String} The touch identifier
     */
    createTouchId(type, identifier=0) {
        return `${type}-${identifier}`;
    }

    /**
     * Called when a new touch point apears
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchStart(event) {
        event.preventDefault();

        // Adds the touches tou our map
        for(const touch of event.changedTouches) {
            // Cursor coordinates
            const point = this.getCanvasCoordinate(touch);

            // Create the pointer position
            const id = this.createTouchId('touch', touch.identifier);
            const touchCopy = new Touches(id, point.x, point.y);
    
            // Add a reference to the touched corner
            touchCopy.setCorner(this.polygon.getHandle(point.x, point.y));
    
            this.printDebug(`TouchStart corner ${touchCopy.corner}`);

            // Save the cursor
            this.touches.set(id, touchCopy);
            this.updateCanvas();
        }
    }

    /**
     * Called when a touch disappears or is canceled
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchEnd(event) {
        event.preventDefault();

        // Removes the touches tou our map
        for(const touch of event.changedTouches) {
            const id = this.createTouchId('touch', touch.identifier);
            this.touches.delete(id);
        }
    }

    /**
     * Called when a touch moves
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchMove(event) {
        event.preventDefault();

        // Actions for each touch point
        for(const touch of event.changedTouches) {
            const id = this.createTouchId('touch', touch.identifier);
            const point = this.getCanvasCoordinate(touch);
            this.printDebug(`Move ${id} ${point}`);

            this.cursorMove(id, point);
        }
    }

    /**
     * Called when the mouse button is pressed
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseDown(event) {
        if (event.button == 0) {
            event.preventDefault();

            // Get event's coordinate
            const point = this.getCanvasCoordinate(event);

            // Create the pointer position
            const id = this.createTouchId('mouse');
            const touchCopy = new Touches(id, point.x, point.y);

            // Add a reference to the touched corner
            touchCopy.setCorner(this.polygon.getHandle(point.x, point.y));

            // Save the cursor
            this.touches.set(id, touchCopy);

            this.updateCanvas();
        }

    }

    /**
     * Called when the mouse button is released
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseUp(event) {
        if (event.button == 0) {
            event.preventDefault();

            // Removes the touches from the map
            const id = this.createTouchId('mouse');
            this.touches.delete(id);
            this.updateCanvas();
        }
    }

    /**
     * Called when the mouse moves
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseMove(event) {
        event.preventDefault();

        const id = this.createTouchId('mouse');
        const point = this.getCanvasCoordinate(event);
        this.cursorMove(id, point);
    }

    cursorMove(id, point) {
        if (this.touches.has(id)) {
            const cursor = this.touches.get(id);
            if (cursor.corner != "-") {
                this.polygon.moveCorner(
                    cursor.corner,
                    point.x - cursor.posX,
                    point.y - cursor.posY,
                );
                cursor.posX = point.x;
                cursor.posY = point.y;
                this.updateCanvas();
            }
        }

    }

    
    /**
     * The custom element's HTML content
     * 
     * @returns {string} The custom element's HTML content
     */
    getHtml() {
        return `
            <p id="debug"></p>
            <nav>
                <button id="cancel" class="cancel">Cancel</button>
                <button id="correct" class="valid">Correct</button>
            </nav>
            <div id="edit">
                <img>
                <canvas></canvas>
            </div>
        `;
    }

    /**
     * The custom element's CSS content
     * 
     * @returns {string} The custom element's CSS content
     */
    getStyle() {
        return ` ${super.getStyle()}

        nav {
            width: 100%;
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: space-between;
        }

        nav button {
            width: 30%;
            height: 3em;
            margin: 0.5em 1em; 
            font-weight: bolder;
        }

        #edit {
            width: 100%;
            position: relative;
            background-color: pink
        }

        #edit canvas, #edit img {
            position: absolute;
            left: 0;
            top: 0;
        }

        #edit img {
            width:100%;
            margin:0;
            padding:0;
        }

        .valid {
            background-color: green;
            color: white;
        }

        .cancel {
            background-color: red;
            color: white;
        }
        `;
    }
}

window.customElements.define('app-envelope', View);
