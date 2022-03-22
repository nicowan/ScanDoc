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

    constructor(identifier, posX, posY) {
        this.identifier = identifier;

        /** @type {Number} X position */
        this.posX = posX;
    
        /** @type {Number} Y position */
        this.posY = posY;
    }
}

// Target paper dimensions
export const PAPER_WIDTH  = 210;
export const PAPER_HEIGHT = 297;

export class ViewPerspective {

    /** @type {Number} Scaling factor between canvas and DOM coordinates */
    scale = 1;


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
            <img id="cursor1" data-id="0" class="corners" src="img/curseur.png">
            <img id="cursor2" data-id="1" class="corners" src="img/curseur.png">
            <img id="cursor3" data-id="2" class="corners" src="img/curseur.png">
            <img id="cursor4" data-id="3" class="corners" src="img/curseur.png">
        </div>
        <button id="correctPerspective">Corriger</button>
        `;
    }

    /**
     * View constructor
     * 
     * @param {HTMLElement} parent The element where to place the view
     */
    constructor(parent) {
        this.parent = parent;
        parent.className = "perspective";
        parent.innerHTML = this.getHtml();

        parent.querySelector('button').
            addEventListener('click', event => this.validateView(event));

        // Attach event to cursor images
        const corners = parent.querySelectorAll('.corners');
        for(const corner of corners) {
            corner.addEventListener('mousedown',   event => this.mouseDown(event));
            corner.addEventListener('mouseup',     event => this.mouseUp(event));

            corner.addEventListener("touchstart",  event => this.handleTouchStart(event));
            corner.addEventListener("touchend",    event => this.handleTouchEnd(event));
            corner.addEventListener("touchcancel", event => this.handleTouchEnd(event));

            corner.addEventListener('load',        event => this.updateDisplay());
        }

        parent.querySelector("#edit")
            .addEventListener('mousemove', event => this.mouseMove(event));
        parent.querySelector("#edit")
            .addEventListener("touchmove",   event => this.handleTouchMove(event));


        /** @type {HTMLImageElement} The selected corner's image */
        this.corner = null;

        /** @type {Number} X Position on last event */
        this.lastX = 0;

        /** @type {Number} Y Position on last event */
        this.lastY = 0;

        /** @type {Array<Number>} */
        this.polygon = [ 179, 33,    1001, 146,    899, 1304,    59, 1235];

        /** @type {HTMLImageElement} */
        this.image = null;

        /** @type {Map<Number, Touches>} */
        this.touches = new Map();

        /** @type {HTMLCanvasElement} */
        this.canvas = parent.querySelector('canvas');
        this.canvas.width  = 1024;
        this.canvas.height = 1360;

        /** @type {Number} Scaling factor between canvas and DOM coordinates */
        this.updateScaling();
        this.setCanvasDisplaySize();



        /** @type {CanvasRenderingContext2D} */
        this.context = this.canvas.getContext('2d');
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
        // with same form factor as A4 paper
        this.canvas.width  = this.image.width;
        this.canvas.height = this.image.width / PAPER_WIDTH * PAPER_HEIGHT;

        // Update the scaling factor
        this.updateScaling();
        this.setCanvasDisplaySize();
        this.updateDisplay();
    }

    placeCorner(idCorner, x, y) {
        const corner = this.parent.querySelector(`#${idCorner}`);
        corner.style.left = `${x - corner.clientWidth / 2}px`;
        corner.style.top  = `${y - corner.clientHeight / 2}px`;
    }

    updateDisplay() {
        if( this.image) {
            this.printDebug(`<br>body ${document.body.clientWidth} x ${document.body.clientHeight}`);

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
        this.context.beginPath();
        this.context.strokeStyle = "red";
        this.context.lineWidth = 2 / this.scale;
        this.context.moveTo(this.polygon[0], this.polygon[1]);
        this.context.lineTo(this.polygon[2], this.polygon[3]);
        this.context.lineTo(this.polygon[4], this.polygon[5]);
        this.context.lineTo(this.polygon[6], this.polygon[7]);
        this.context.lineTo(this.polygon[0], this.polygon[1]);
        this.context.stroke();

        this.placeCorner("cursor1", this.polygon[0], this.polygon[1]);
        this.placeCorner("cursor2", this.polygon[2], this.polygon[3]);
        this.placeCorner("cursor3", this.polygon[4], this.polygon[5]);
        this.placeCorner("cursor4", this.polygon[6], this.polygon[7]);
    }

    validateView(event) {
        dispatchEditedFinishedEvent(this.parent, this.polygon);
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
     * Move the dragged corner according to the mouse or touch event
     * 
     * @param {Touches} touch The current touch information
     */
    moveCorner(touch) {
        if(this.corner) {
            const prev = this.touches.get(touch.identifier);

            // Compute change in position
            const dx = touch.posX - prev.posX ;
            const dy = touch.posY - prev.posY;

            // Get the modified point
            const pointId = this.corner.dataset.id;

            // Change the position of the point
            this.polygon[pointId * 2 + 0] = (this.corner.offsetLeft + dx + this.corner.clientWidth / 2);
            this.polygon[pointId * 2 + 1] = (this.corner.offsetTop  + dy + this.corner.clientHeight / 2);

            // changes the corner's image
            this.corner.style.left = (this.corner.offsetLeft + dx) + "px";
            this.corner.style.top  = (this.corner.offsetTop  + dy) + "px";

            // Update the polygon
            this.updateDisplay();

            // Replaces the touch in our tracking Map
            this.touches.set(touch.identifier, touch);
        }
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

        // Store the manipulated corner
        this.corner = event.target;

        // Adds the touches tou our map
        for(const touch of event.changedTouches) {
            const id = this.createTouchId('touch', touch.identifier);
            const touchCopy = new Touches(id, touch.pageX, touch.pageY);
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

        // Clear the manipulated corner
        this.corner = null;

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
                const id = this.createTouchId('touch', touch.identifier);
                const touchCopy = new Touches(id, touch.pageX, touch.pageY);
                this.moveCorner(touchCopy);
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

        // Store the manipulated corner
        this.corner = event.target;

        // Save the current mouse evnt
        const id = this.createTouchId('mouse');
        const touchCopy = new Touches(id, event.pageX, event.pageY);
        this.touches.set(id, touchCopy);
    }

    /**
     * Called when the mouse button is released
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    mouseUp(event) {
        event.preventDefault();

        // Clear the manipulated corner
        this.corner = null;

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

        // Manages the mouse cursor
        const id = this.createTouchId('mouse');

        if (this.touches.has(id)) {
            const touchCopy = new Touches(id, event.pageX, event.pageY);
            this.moveCorner(touchCopy);
        }
    }
}