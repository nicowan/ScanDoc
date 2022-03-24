/**
 * View to get a new image from the camera
 */

import { EDIT_FINISHED_EVENT, dispatchEditedFinishedEvent } from '../events.js';


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

    /** @type {Corner} corner's reference */
    corner = null;

    constructor(identifier, posX, posY) {
        this.identifier = identifier;
        this.posX = posX;
        this.posY = posY;
        this.corner = null;
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

// Target paper dimensions
export const PAPER_WIDTH  = 210;
export const PAPER_HEIGHT = 297;

const RADIUS = 15;

export class ViewPerspective {

    /** @type {Number} Scaling factor between canvas and DOM coordinates */
    scale = 1;

    /** @type {Array<Corner>} The paper corner's positions */
    corners = [];

    /** @type {Map<Number, Touches>} Touch pannel touches or mouse pointers */
    touches = null;

    /** @type {HTMLElement} The parent element */
    parent = null;

    /** @type {HTMLImageElement} background image */
    image = null;

    /** @type {HTMLCanvasElement} */
    canvas = null;

    /** @type {CanvasRenderingContext2D} */
    context = null;

    /**
     * View constructor
     * 
     * @param {HTMLElement} parent The element where to place the view
     */
     constructor(parent) {
        // Generate the Views content
        this.parent = parent;
        parent.className = "perspective";
        parent.innerHTML = this.getHtml();

        // Initialize canvas 
        this.canvas  = parent.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
        this.canvas.width  = 1024;
        this.canvas.height = 1360;

        // Button to validate paper's corner
        parent.querySelector('button').
            addEventListener('click', event => this.validateView(event));

        // Attach mouse events
        this.canvas.addEventListener('mousedown',   event => this.mouseDown(event));
        this.canvas.addEventListener('mousemove',   event => this.mouseMove(event));
        this.canvas.addEventListener('mouseup',     event => this.mouseUp(event));

        // Attach touch events
        this.canvas.addEventListener("touchstart",  event => this.handleTouchStart(event));
        this.canvas.addEventListener("touchmove",   event => this.handleTouchMove(event));
        this.canvas.addEventListener("touchend",    event => this.handleTouchEnd(event));
        this.canvas.addEventListener("touchcancel", event => this.handleTouchEnd(event));

        // Create the Touches dictionnary
        this.touches = new Map();

        // Initialize the scaling and canvas size
        this.updateScaling();
        this.setCanvasDisplaySize();
        this.updateDisplay();
    }

    /**
     * Returns the view's content
     * 
     * @returns The view's HTML
     */
    getHtml() {
        return `
        <div id="edit">
            <p id="debug">---</p>
            <canvas id="displayCanvas"></canvas>
        </div>
        <button id="correctPerspective">Corriger</button>
        `;
    }

    /**
     * Compute scaleing factor between canvas and DOM
     */
    updateScaling() {
        this.scale = this.parent.clientWidth / this.canvas.width;
    }

    /**
     * Set the canvas' display size
     */
    setCanvasDisplaySize() {
        this.canvas.style.width  = `${Math.round(this.canvas.width  * this.scale)}px`;
        this.canvas.style.height = `${Math.round(this.canvas.height * this.scale)}px`;    
    }

    /**
     * Set the image in this view
     * @param {Image} imageRaw The image taken by the camera
     */
    setSourceImage(imageRaw) {
        this.image = imageRaw;

        // Set the canvas size according to the picture
        // with same form factor as document's paper
        this.canvas.width  = this.image.width;
        this.canvas.height = this.image.width / PAPER_WIDTH * PAPER_HEIGHT;

        // Update the scaling factor
        this.updateScaling();
        this.setCanvasDisplaySize();

        // Create document's corners
        const cornerUL = new Corner( 0.1 * this.canvas.width, 0.1 * this.canvas.height);
        cornerUL.radius = RADIUS / this.scale;

        const cornerUR = new Corner( 0.9 * this.canvas.width, 0.1 * this.canvas.height);
        cornerUR.radius = RADIUS / this.scale;

        const cornerLR = new Corner( 0.9 * this.canvas.width, 0.9 * this.canvas.height);
        cornerLR.radius = RADIUS / this.scale;

        const cornerLL = new Corner( 0.1 * this.canvas.width, 0.9 * this.canvas.height);
        cornerLL.radius = RADIUS / this.scale;

        this.corners.push(cornerUL);
        this.corners.push(cornerUR);
        this.corners.push(cornerLR);
        this.corners.push(cornerLL);

        // Display everything
        this.updateDisplay();
    }

    /**
     * Convert the event coordinates to canvas coordinate
     * 
     * @param {MouseEvent|TouchEvent} event The event's data
     * @returns {Point} The coordinate in the canvas
     */
    getCanvasCoordinate(event) {
        const rect = this.canvas.getBoundingClientRect();
        const result = {
            rawX : event.clientX - rect.left, 
            rawY : event.clientY - rect.top,
            x : (event.clientX - rect.left) / this.scale,
            y : (event.clientY - rect.top) / this.scale
        };

        //this.printDebug(`
        //DIRECT ${result.rawX.toFixed(3)}, ${result.rawY.toFixed(3)}<br>
        //SCALED ${result.x.toFixed(3)}, ${result.y.toFixed(3)}`);

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

    updateDisplay() {
        if( this.image) {
            this.context.drawImage(
                this.image,
                0, 0,
                this.image.width, this.image.height
            );
        }
        else {
            this.context.clearRect(
                0, 0,
                this.canvas.width, this.canvas.height
            );
        }

        // Draw the polygon
        if (this.corners.length == 4) {
            this.context.beginPath();
            this.context.strokeStyle = "red";
            this.context.lineWidth = 2 / this.scale;
            this.context.moveTo(this.corners[0].posX, this.corners[0].posY);
            this.context.lineTo(this.corners[1].posX, this.corners[1].posY);
            this.context.lineTo(this.corners[2].posX, this.corners[2].posY);
            this.context.lineTo(this.corners[3].posX, this.corners[3].posY);
            this.context.lineTo(this.corners[0].posX, this.corners[0].posY);
            this.context.stroke();    
        } 

        // Cursor around moved corner
        for (const touch of this.touches.values()) {
            if (touch.corner !== null) {
                this.context.beginPath();
                this.context.strokeStyle = "yellow";
                this.context.lineWidth = 2 / this.scale;
                this.context.arc(
                    touch.corner.posX, touch.corner.posY,
                    touch.corner.radius / this.scale,
                    0, 2 * Math.PI);
                this.context.stroke();    
            }
            else {
                this.context.beginPath();
                this.context.strokeStyle = "green";
                this.context.lineWidth = 2 / this.scale;
                this.context.arc(
                    touch.posX, touch.posY,
                    5 / this.scale,
                    0, 2 * Math.PI);
                this.context.stroke();
            }
        }
    }

    validateView(event) {
        const polygon = [
            this.corners[0].posX, this.corners[0].posY,
            this.corners[1].posX, this.corners[1].posY,
            this.corners[2].posX, this.corners[2].posY,
            this.corners[3].posX, this.corners[3].posY,
        ];

        dispatchEditedFinishedEvent(this.parent, polygon);
    }

    /**
     * Show the givent text in the debug element
     * 
     * @param {String} text The text to print
     */
    printDebug(text) {
        this.parent.querySelector("#debug").innerHTML = text;
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
            touchCopy.setCorner(this.findCorner(point.x, point.y));
    
            // Save the cursor
            this.touches.set(id, touchCopy);
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
            if (this.touches.has(id)) {
                // Cursor coordinates
                const point = this.getCanvasCoordinate(touch);

                const touchCopy = this.touches.get(id);
                touchCopy.posX = point.x;
                touchCopy.posY = point.y;

                if (touchCopy.corner == null) {
                    touchCopy.setCorner(this.findCorner(point.x, point.y));
                }
                if (touchCopy.corner != null) {
                    touchCopy.corner.posX = point.x;
                    touchCopy.corner.posY = point.y;
                }
                this.updateDisplay();
            }
        }
    }

    /**
     * Called when the mouse button is pressed
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseDown(event) {
        event.preventDefault();

        const point = this.getCanvasCoordinate(event);

        // Create the pointer position
        const id = this.createTouchId('mouse');
        const touchCopy = new Touches(id, point.x, point.y);

        // Add a reference to the touched corner
        touchCopy.setCorner(this.findCorner(point.x, point.y));

        // Save the cursor
        this.touches.set(id, touchCopy);
    }

    /**
     * Called when the mouse button is released
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseUp(event) {
        event.preventDefault();

        // Removes the touches tou our map
        const id = this.createTouchId('mouse');
        this.touches.delete(id);
    }

    /**
     * Called when the mouse moves
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseMove(event) {
        event.preventDefault();

        const point = this.getCanvasCoordinate(event);

        // Create the pointer position
        const id = this.createTouchId('mouse');
        if (this.touches.has(id)) {
            const touchCopy = this.touches.get(id);
            if (touchCopy.corner != null) {
                touchCopy.corner.posX = point.x;
                touchCopy.corner.posY = point.y;
                this.updateDisplay();
            }
        }
    }
}