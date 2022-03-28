/**
 * Tracks mouse and touch events on a surface
 */

import * as Geometry from './geometry.js';

export class Pointer {
    /** @type {Geometry.Vector} Cursor's position */
    position;

    /** @type {*} Référence to the pointed object */
    object;

    /**
     * Create a new pointer
     * @param {Geometry.Vector} position The pointer's position
     */
    constructor(position) {
        this.position = position.clone();
        this.object = null;
    }

    /**
     * Set the pointed object
     * @param {*} obj The object pointed by this pointer
     */
    setObject(obj) {
        this.object = obj;
    }

    /**
     * Get the pointed object
     * @returns {*} The object pointed by this pointer
     */
    getObject() {
        return this.object;
    }
}

export class Surface {
    /** @type {HTMLElement} The element that tracks the pointers */
    surface;

    /** @type {Map<String, Pointer>} Dictionnary of pointers on the surface */
    pointers;

    /**
     * Callback for a created pointer
     *
     * @callback pointerCreatedCallback
     * @param {String}  ptrId   - The pointer identifier
     * @param {Pointer} pointer - The pointer
     */
    pointerCreatedCallback;

    /**
     * Callback for a deleted pointer
     *
     * @callback pointerDeletedCallback
     * @param {String}  ptrId   - The pointer identifier
     * @param {Pointer} pointer - The pointer
     */
    pointerDeletedCallback;

    /**
     * Callback for a moved pointer
     *
     * @callback pointerMovedCallback
     * @param {String}  ptrId - The pointer identifier
     * @param {Pointer} pointer - The pointer
     * @param {Geometry.Vector} newPos - The new pointer position
     */
    pointerMovedCallback;


    /**
     * 
     * @param {HTMLElement} surface The surface that tracks the pointers
     */
    constructor(surface) {
        this.surface  = surface;
        this.pointers = new Map();

        // Callback for the surface's client
        this.pointerCreatedCallback = null;
        this.pointerDeletedCallback = null;
        this.pointerMovedCallback = null;

        // Attach mouse events
        this.surface.addEventListener('mousedown',   event => this.handleMouseDown(event));
        this.surface.addEventListener('mousemove',   event => this.handleMouseMove(event));
        this.surface.addEventListener('mouseup',     event => this.handleMouseUp(event));

        // Attach touch events
        this.surface.addEventListener("touchstart",  event => this.handleTouchStart(event));
        this.surface.addEventListener("touchmove",   event => this.handleTouchMove(event));
        this.surface.addEventListener("touchend",    event => this.handleTouchEnd(event));
        this.surface.addEventListener("touchcancel", event => this.handleTouchEnd(event));
    }

    /**
     * Create the pointer ID
     * 
     * @param {Sring} name Cursor's name (for instance 'mouse' or 'touch')
     * @param {Number} id  Cursor's identifier
     * @returns {String} The pointer's identifier
     */
    createPointerId(name, id) {
        return `${name}-${id}`;
    }

    /**
     * Create a new pointer
     * 
     * @param {String} name Input device name ('touch', 'mouse')
     * @param {Number} touchId Button or Touch identifier
     * @param {Geometry.Vector} position pointer's position on surface
     */
    pointerCreated(name, touchId, position) {
        const ptrId = this.createPointerId(name, touchId); 
        const pointer = new Pointer(position);

        // Callback to signal the client
        if (this.pointerCreatedCallback) {
            this.pointerCreatedCallback(ptrId, pointer);
        }

        this.pointers.set(ptrId, pointer);
    }

    /**
     * Delete a pointer
     * 
     * @param {String} name Input device name ('touch', 'mouse')
     * @param {Number} touchId Button or Touch identifier
     */
    pointerDeleted(name, touchId) {
        const ptrId = this.createPointerId(name, touchId); 

        // Callback to signal the client
        if (this.pointerDeletedCallback) {
            this.pointerDeletedCallback(ptrId, this.pointers.get(ptrId));
        }

        this.pointers.delete(ptrId);
    }

    /**
     * An existing pointer has been moved
     * 
     * @param {String} name Input device name ('touch', 'mouse')
     * @param {Number} touchId Button or Touch identifier
     * @param {Geometry.Vector} newPos pointer's position on surface
     */
    pointerMoved(name, touchId, newPos) {
        const ptrId = this.createPointerId(name, touchId); 
        const pointer = this.pointers.get(ptrId);

        if (pointer) {
            // Callback to signal the client
            if (this.pointerMovedCallback) {
                this.pointerMovedCallback(ptrId, pointer, newPos);
            }

            // Save the new position in the pointer
            pointer.position = newPos.clone();
            this.pointers.set(ptrId, pointer);
        }
    }

    /**
     * Compute pointer position in the surface
     * 
     * @param {MouseEvent|Touch} event Event description
     * @returns {Geometry.Vector} The event position
     */
    getCoordinate(event) {
        const rect = event.target.getBoundingClientRect();
        return new Geometry.Vector(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
}


    /**
     * Called when a touchstart event occurs (new touch on surface)
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchStart(event) {
        // Do not continue the event processing
        event.preventDefault();

        // For each changed touch do ...
        for(const touch of event.changedTouches) {
            this.pointerCreated('touch', touch.identifier, this.getCoordinate(touch));
        }
    }

    /**
     * Called when a touchend / touchcancel event occurs (touch disappeats)
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchEnd(event) {
        // Do not continue the event processing
        event.preventDefault();

        // Removes the touches tou our map
        for(const touch of event.changedTouches) {
            this.pointerDeleted('touch', touch.identifier);
        }
    }

    /**
     * Called when a finger moves on the surface
     * 
     * @param {TouchEvent} event Description of the current touch event
     */
    handleTouchMove(event) {
        // Do not continue the event processing
        event.preventDefault();

        // For each changed touch do ...
        for(const touch of event.changedTouches) {
            this.pointerMoved('touch', touch.identifier, this.getCoordinate(touch));
        }
    }

    /**
     * Called when the mouse button is pressed
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    handleMouseDown(event) {
        if (event.button === 0) {
            // Do not continue the event processing
            event.preventDefault();
            // Create the pointer
            this.pointerCreated('mouse', event.button, this.getCoordinate(event));
        }
    }

    /**
     * Called when the mouse button is released
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    handleMouseUp(event) {
        if (event.button === 0) {
            // Do not continue the event processing
            event.preventDefault();
            // Delete a pointer
            this.pointerDeleted('mouse', event.button);
        }
    }

    /**
     * Called when the mouse moves
     * 
     * @param {MouseEvent} event Description of the current mouse event
     */
    handleMouseMove(event) {
        // Do not continue the event processing
        event.preventDefault();
        // Move a pointer
        this.pointerMoved('mouse', event.button, this.getCoordinate(event));
    }
}