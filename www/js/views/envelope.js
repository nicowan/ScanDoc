/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper    from '../tools/paper.js';
import * as Geometry from '../tools/geometry.js';
import * as Element  from '../tools/element.js';
import * as Pointers from '../tools/pointers.js'

export const ENVELOPE_EVENT_NAME = "EnvelopeValid";
export const CANCEL_EVENT_NAME   = "EnvelopeCancel";

export class View extends Element.Base {
    /** @type {Polygon} The polygon that delimits the document in the picture */
    polygon;

    /** @type {Pointers.Surface} Touch and mouse event tracking */
    surface;

    /**
     * Custom element's constructor
     */
    constructor() {
        super();
        this.surface = null;
        this.polygon = null;
    }

    /**
     * Update the component content and style
     */
    renderShadowDOM() {
        super.renderShadowDOM();

        // Cancel button
        const btnCancel = this.shadowRoot.querySelector('#cancel');
        btnCancel.addEventListener( 'click', event => this.envelopeCanceled(event));

        // Validate button
        const btnCorrect = this.shadowRoot.querySelector('#correct');
        btnCorrect.addEventListener( 'click', event => this.envelopeValidated(event));

        // Image loaded
        const img = this.shadowRoot.querySelector('img');
        img.addEventListener( 'load', event => this.imageLoaded(event));

        // Attach the touch / mouse events
        this.surface = new Pointers.Surface(this.shadowRoot.querySelector('canvas'));

        this.surface.pointerCreatedCallback =
            (id, ptr) => this.pointerCreated(id, ptr);

        this.surface.pointerMovedCallback =
            (id, ptr, pos) => this.pointerMoved(id, ptr, pos);
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
        this.polygon = new Geometry.Polygon()
            .addVertex(new Geometry.Vector(0.1 * cnv.width, 0.1 * cnv.height))
            .addVertex(new Geometry.Vector(0.9 * cnv.width, 0.1 * cnv.height))
            .addVertex(new Geometry.Vector(0.9 * cnv.width, 0.9 * cnv.height))
            .addVertex(new Geometry.Vector(0.1 * cnv.width, 0.9 * cnv.height));
 
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
        const scale = img.clientWidth / img.naturalWidth;

        const customEvent = new CustomEvent(ENVELOPE_EVENT_NAME, {
            bubbles: true,
            detail: { polygon : this.polygon.getArrayOfCoords(scale) }
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
     * Search a vertex under the pointer
     * 
     * @param {String} id Pointer's ID
     * @param {Pointers.Pointer} ptr The pointer
     */
    pointerCreated(id, ptr) {
        const vid = this.polygon.getPointedVertexIndex(ptr.position);
        ptr.setObject(vid);
    }

    /**
     * A pointer has moved, change the vertex position
     * 
     * @param {String} id Pointer's ID
     * @param {Pointers.Pointer} ptr The pointer
     * @param {Geometry.Vector} newPos The new position
     */
    pointerMoved(id, ptr, newPos) {
        const vertexIdx = ptr.getObject();
        if (vertexIdx !== -1) {
            this.polygon.moveVertex(
                vertexIdx,
                newPos.x - ptr.position.x,
                newPos.y - ptr.position.y
            );
            this.updateCanvas();
        }      
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
            this.polygon.drawHandle(ctx, 0, "#ff0", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, 1, "#0ff", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, 2, "#f0f", "rgba(255, 255, 255, 0.25)");
            this.polygon.drawHandle(ctx, 3, "#fff", "rgba(255, 255, 255, 0.25)");
            this.polygon.draw(ctx, "red", "rgba(255, 255, 255, 0.25)");
        }

        // TODO: Highlight the selected corner
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
