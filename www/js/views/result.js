/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper   from '../tools/paper.js';
import * as Element from '../tools/element.js';

export const RESTART_EVENT_NAME = "Restart";


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
    renderShadowDOM() {
        super.renderShadowDOM();

        // Event listeners
        this.shadowRoot.querySelector('#finish').
            addEventListener( 'click', event => this.finishButtonClick(event));

        // Create an image with 150 DPI  for the document
        const cnv = this.shadowRoot.querySelector('canvas');

        cnv.width  = Paper.WIDTH  * Paper.DENSITY;
        cnv.height = Paper.HEIGHT * Paper.DENSITY;

        const scale = this.shadowRoot.host.clientWidth / cnv.width;

        // Set display height
        cnv.style.width  = `${this.shadowRoot.host.clientWidth}px`;
        cnv.style.height = `${cnv.height * scale}px`;
    }

    finishButtonClick(event) {
        const customEvent = new CustomEvent(RESTART_EVENT_NAME, {
            bubbles: true,
            detail: { /* TODO */  }
        });
    
        this.parentElement.dispatchEvent(customEvent);

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
        const img = this.shadowRoot.querySelector('img');
        img.src = dstElem.toDataURL("image/jpeg");

        img.style.width = dstElem.style.width;
        img.style.height = dstElem.style.height;


        this.createPdf(dstElem.toDataURL("image/jpeg"));

        // Free allocated memory
        srcImage.delete();
        srcCorners.delete();
        dstImage.delete();
        dstCorners.delete();
        transform.delete();
    }

    dataURItoBlob(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        var byteString = atob(dataURI.split(',')[1]);
      
        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
      
        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
      
        // create a view into the buffer
        var ia = new Uint8Array(ab);
      
        // set the bytes of the buffer to the correct values
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
      
        // write the ArrayBuffer to a blob, and you're done
        var blob = new Blob([ab], {type: mimeString});
        return blob;
      
      }


    async createPdf(image) {
        /** @type {HTMLCanvasElement} */
        const cnv = this.shadowRoot.querySelector('canvas');

        /** @type {CanvasRenderingContext2D} */
        const ctx = cnv.getContext('2d');


        const pdfDoc = await PDFLib.PDFDocument.create();

        //const jpgUrl = 'img/exemple.jpg'
        //const jpgImageBytes = await fetch(jpgUrl).then((res) => res.arrayBuffer())
        //const jpgImageBytes = ctx.getImageData(0, 0, cnv.width, cnv.height);
        const jpgImageBytes = image;
        const jpgImage = await pdfDoc.embedJpg(jpgImageBytes)

        const page = pdfDoc.addPage([
            Math.round(210 / 25.4 * 72),
            Math.round(297 / 25.4 * 72)
        ]);

        page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: 210 / 25.4 * 72,
            height: 297 / 25.4 * 72,
        })

        const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
        this.shadowRoot.getElementById('pdf').src = pdfDataUri;
    }



    /**
     * The custom element's HTML content
     * 
     * @returns {string} The custom element's HTML content
     */
    getHtml() {
        return `
            <nav>
                <button id="finish" class="valid">Next Scan</button>
            </nav>
            <iframe id="pdf"></iframe>
            <canvas class="hidden"></canvas>
            <img class="hidden">
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

        #pdf {
            width:100%;
            height: 400px;
            border: 4px solid red;
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
