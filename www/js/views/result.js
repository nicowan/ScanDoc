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

    /** @type {HTMLImageElement} distorterd document */
    image = null;

    /** @type {HTMLImageElement} corrected document */
    img = null;

    /** @type {HTMLCanvasElement} Correction element */
    cnv = null;

    /** @type {HTMLImageElement} navigation element */
    nav = null;

    /** @type {Array<Number>} The positions of the distorted image corner */
    corners = [];

    resultDataURL = "";

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

        // Interface components
        //this.cnv = this.shadowRoot.querySelector('canvas');
        this.img = this.shadowRoot.querySelector('img');
        this.nav = this.shadowRoot.querySelector('nav');

        // The document size uîn pixel
        //this.cnv.width  = Paper.PIXEL_WIDTH;
        //this.cnv.height = Paper.PIXEL_HEIGHT;

        // place for the image
        const width  = this.shadowRoot.host.clientWidth;
        const height = this.shadowRoot.host.clientHeight -
                       this.shadowRoot.querySelector('nav').clientHeight -
                       50;

        // Find best fit in display
        const scaleX = width  / Paper.PIXEL_WIDTH;
        const scaleY = height / Paper.PIXEL_HEIGHT;
        const scale  = Math.min(scaleX, scaleY);

        // Set display height (image)
        this.img.style.width  = `${Paper.PIXEL_WIDTH  * scale}px`;
        this.img.style.height = `${Paper.PIXEL_HEIGHT * scale}px`;
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
            this.imageCorrection(this.image, this.img, this.corners);
            this.createPdf(this.resultDataURL);
        }
    }

    setCorners(polygon) {
        for(let i=0; i<polygon.length; i++) {
            this.corners[i] = polygon[i];
        }
    }

    /**
     * Returns the array with the target paper's corners coordinates
     * @return {Array>Number} The corners coordinates
     */
    getPaperCorners() {
        return [
            0,                  0,                      // Top    - Left
            Paper.PIXEL_WIDTH,  0,                      // Top    - Right
            Paper.PIXEL_WIDTH,  Paper.PIXEL_HEIGHT,     // Bottom - Right
            0,                  Paper.PIXEL_HEIGHT      // Bottom - Left
        ];
    }



    /**
     * Apply the perspective transformation to src image and show it in dst image
     * 
     * @param {HTMLImageElement} src 
     * @param {HTMLImageElement} dst 
     * @param {Array<Number>} corners Array of corners coordinates
     */
    imageCorrection(src, dst, corners) {
        // Convert the source image definition to OpenCV objects
        const srcImageData = cv.imread(src);
        const srcCorners = cv.matFromArray(4, 1, cv.CV_32FC2, corners);

        // The destination image data in openCV format
        const dstImageData = new cv.Mat();
        const dstCorners = cv.matFromArray(4, 1, cv.CV_32FC2, this.getPaperCorners());
        const dstSize = new cv.Size(Paper.PIXEL_WIDTH, Paper.PIXEL_HEIGHT);

        // Compute the transformation matrix
        const transform = cv.getPerspectiveTransform(srcCorners, dstCorners);

        // Transform the image
        cv.warpPerspective(
            srcImageData,
            dstImageData,
            transform,
            dstSize,
            cv.INTER_LINEAR,
            cv.BORDER_CONSTANT,
            new cv.Scalar()
        );

        // Copy the result to a canvas
        const destinationCanvas = document.createElement('canvas');
        cv.imshow(destinationCanvas, dstImageData);

        // Save the canvas image as JPG
        this.resultDataURL = destinationCanvas.toDataURL("image/jpeg")

        // Copy canvas to image to make it shareable
        const img = this.shadowRoot.querySelector('img');
        img.src = this.resultDataURL;

        // Free allocated memory
        srcImageData.delete();
        srcCorners.delete();
        dstImageData.delete();
        dstCorners.delete();
        transform.delete();
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
        const destinationCorners = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0,                  0,
            dstElem.width,  0,
            dstElem.width,  dstElem.height,
            0,              dstElem.height]);

        /** @type {OpenCvSize} OpenCV destination image's size */
        const dstSize = new cv.Size(dstElem.width,  dstElem.height);

        /** @type {OpenCvTransform} Transformation mattrix */
        const transform = cv.getPerspectiveTransform(srcCorners, destinationCorners);

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
        destinationCorners.delete();
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
        const pdfDoc = await PDFLib.PDFDocument.create();

        const jpgImageBytes = image;
        const jpgImage = await pdfDoc.embedJpg(jpgImageBytes)

        const page = pdfDoc.addPage([
            Math.round(Paper.WIDTH / 25.4 * 72),
            Math.round(Paper.HEIGHT / 25.4 * 72)
        ]);

        page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: Paper.WIDTH / 25.4 * 72,
            height: Paper.HEIGHT / 25.4 * 72,
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
                <a href="#pdf" target="_blank">Download PDF</a>
            </nav>
            <img>
            <iframe id="pdf">
            <canvas class="hidden"></canvas>
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
            background-color: white;
        }

        img {
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
