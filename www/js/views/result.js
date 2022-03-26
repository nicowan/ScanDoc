/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper   from '../tools/paper.js';
import * as Element from '../tools/element.js';


export class View extends Element.Base {
    /** @type {Number} Scaling factor between canvas and DOM coordinates */
    scale = 1;

    /** @type {HTMLImageElement} background image */
    image = null;

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

        // Create an image with 150 DPI  for the document
        const cnv = this.shadowRoot.querySelector('canvas');

        cnv.width  = Paper.WIDTH  * Paper.DENSITY;
        cnv.height = Paper.HEIGHT * Paper.DENSITY;

        console.log("Canvas image", cnv.width, cnv.height);

        const scale = this.shadowRoot.host.clientWidth / cnv.width;

        // Set display height
        cnv.style.width  = `${this.shadowRoot.host.clientWidth}px`;
        cnv.style.height = `${cnv.height * scale}px`;
        console.log("Canvas screen", cnv.style.width, cnv.style.height);
    }

    /**
     * Set the image in this view
     * @param {Image} imageRaw The image taken by the camera
     */
    setSourceImage(imageRaw) {
        this.image = imageRaw;

        // Display everything
        if (this.corners.length == 8) {
            this.correctPerspective(null, null, this.corners);
        }
    }

    setCorners(polygon) {
        for(let i=0; i<polygon.length; i++) {
            this.corners[i] = polygon[i];
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
        const dstElem = this.shadowRoot.querySelector('canvas');

        /** @type {OpenCvMattrix} */
        const dstImage = new cv.Mat();

        /** @type {OpenCvMattrix} Output document's corner  */
        const dstCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,                  0,
            dstElem.width,  0,
            dstElem.width,  dstElem.height,
            0,              dstElem.height]);

        /** @type {OpenCvSize} OpenCV destination image's size */
        const dstSize = new cv.Size(dstElem.width,  dstElem.height);

        /** @type {OpenCvTransform} Transformation mattrix */
        const transform = cv.getPerspectiveTransform(srcCorners, dstCorners);

        cv.warpPerspective(srcImage, dstImage, transform, dstSize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

        dstElem.width  = dstSize.cols;
        dstElem.height = dstSize.rows;

        cv.imshow(dstElem, dstImage);
        
        // Copy canvas to image to make it shareable
        const img = this.shadowRoot.querySelector('img')
        img.src = dstElem.toDataURL("image/jpg");

        img.style.width = dstElem.style.width;
        img.style.height = dstElem.style.height;


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
            <h1>Share it</h1>
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

        img {
            width:100%;
            margin:0;
            padding:0;
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

window.customElements.define('app-result', View);
