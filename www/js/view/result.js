/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import {BaseElement} from './base-elem.js';

// Target paper dimensions
const PAPER_WIDTH  = 210;
const PAPER_HEIGHT = 297;


export class AppResultView extends BaseElement {
    /** @type {Number} Scaling factor between canvas and DOM coordinates */
    scale = 1;

    /** @type {HTMLImageElement} background image */
    image = null;

    /** @type {HTMLCanvasElement} */
    canvas = null;

    /** @type {CanvasRenderingContext2D} */
    context = null;

    /** @type {Array<Number>} The positions of the distorted image corner */
    corners = [];

    /**
     * Custom element's constructor
     */
    constructor() {
        super();
    }

    /**
     * Update the component content and style
     */
    update() {
        this.shadowRoot.innerHTML = this.getHtml();
        this.shadowRoot.appendChild(this.makeStyle());

        this.canvas = this.shadowRoot.querySelector('canvas');
        this.context = this.canvas.getContext('2d');
    
        this.updateScaling();
        this.setCanvasDisplaySize();
    }



    /**
     * Compute scaleing factor between canvas and DOM
     */
    updateScaling() {
        this.scale = this.shadowRoot.host.clientWidth / this.canvas.width;
    }

    /**
     * Set the canvas' display size
     */
    setCanvasDisplaySize() {
        this.canvas.style.width  = `${Math.round(this.canvas.width  * this.scale)}px`;
        this.canvas.style.height = `${Math.round(this.canvas.height * this.scale)}px`;    
    }


    setCorners(polygon) {
        for (const coord of polygon) {
            this.corners.push(coord);
        }
        this.correctPerspective(null, null, this.corners);
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

        // Display everything
        if (this.corners.length == 8) {
            this.correctPerspective(null, null, this.corners);
        }
    }

    /**
     * Apply a perspective transform to the image and copy result in the canvas
     * @see https://docs.opencv.org/3.4/dd/d52/tutorial_js_geometric_transformations.html
     * 
     * @param {String} inputImageId ID of the input image
     * @param {String} outputCanvasId ID of the output canvas
     * @param {Array}  corners Array of corners coordinates
     */
    correctPerspective(inputImageId, outputCanvasId, corners) {
        /** @type {HTMLImageElement} */
        const srcElem = this.image; // document.getElementById(inputImageId);

        /** @type {OpenCvImage} Image data for OpenCV */
        const srcImage = cv.imread(srcElem);

        /** @type {OpenCvMattrix} Document's corner from the camera */
        const srcCorners = cv.matFromArray(4, 1, cv.CV_32FC2, corners);

        /** @type {HTMLCanvasElement} */
        const dstElem = this.canvas; //document.getElementById(outputCanvasId);

        /** @type {OpenCvMattrix} */
        const dstImage = new cv.Mat();

        /** @type {OpenCvMattrix} Output document's corner  */
        const dstCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,                  0,
            this.canvas.width,  0,
            this.canvas.width,  this.canvas.height,
            0,                  this.canvas.height]);

        /** @type {OpenCvSize} OpenCV destination image's size */
        const dstSize = new cv.Size(this.canvas.width,  this.canvas.height);

        /** @type {OpenCvTransform} Transformation mattrix */
        const transform = cv.getPerspectiveTransform(srcCorners, dstCorners);

        cv.warpPerspective(srcImage, dstImage, transform, dstSize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        dstElem.width  = dstSize.cols;
        dstElem.height = dstSize.rows;

        cv.imshow(this.canvas, dstImage);
        
        // Copy canvas to image to make it shareable
        this.shadowRoot.querySelector('img').src =
            this.canvas.toDataURL("image/jpg");




        // Free allocated memory
        srcImage.delete();
        srcCorners.delete();
        dstImage.delete();
        dstCorners.delete();
        transform.delete();
    }




    /**
     * The custom element's HTML content
     * 
     * @returns {string} The custom element's HTML content
     */
     getHtml() {
        return `
            <h3>Result view</h3>
            <canvas class="hidden"></canvas>
            <img>
        `;
    }

    /**
     * The custom element's CSS content
     * 
     * @returns {string} The custom element's CSS content
     */
    getStyle() {
        return `
            :host {
                width:100%;
                height: 100%;
            }

            img {
                width:100%;
                height: 100%;
            }

            h3 {
                background-color: #48A;
                color: white;
                text-align: center;
            }

            .hidden {
                display: none;   
            }
        `;
    }

    /**
     * @type {Array>String>} Array of observed attributes
     */
    static get observedAttributes() {
        return [];
    }

}

window.customElements.define('app-result', AppResultView);
