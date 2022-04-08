/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper   from '../tools/paper.js';
import * as Element from '../tools/element.js';

export const RESTART_EVENT_NAME = "Restart";

export class View extends Element.Base {

    /** @type {Number} Navigation bar height in pixel */
    NAVBAR_HEIGHT = 50;

    /** @type {HTMLImageElement} corrected document */
    imgOutput = null;

    /** @type {Array<Number>} The positions of the distorted image corner */
    corners = [];

    /** @type {String} Correction time stamp */
    timeStamp = "";

    /**
     * Custom element's constructor
     */
    constructor() {
        super();
        this.timeStamp = this.utcTimeStamp();
    }

    /**
     * Get UTC time stamp
     * 
     * @returns {String} The UTC TimeStamp 
     */
    utcTimeStamp() {
        const stamp = new Date();
        return stamp.getUTCFullYear()
            + '-' + this.pad( stamp.getUTCMonth() + 1 )
            + '-' + this.pad( stamp.getUTCDate() )
            + '-' + this.pad( stamp.getUTCHours() )
            + '-' + this.pad( stamp.getUTCMinutes() )
            + '-' + this.pad( stamp.getUTCSeconds());
    }

    /**
     * Padd number with leading zero
     * 
     * @param {Number} number The number to write
     *
     * @returns The padded number
     */
    pad(number) {
        if ( number < 10 ) {
            return '0' + number;
        }
        return number;
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
        this.imgOutput = this.shadowRoot.querySelector('img');

        // place for the image
        const width  = this.shadowRoot.host.clientWidth;
        const height = this.shadowRoot.host.clientHeight -
                       this.shadowRoot.querySelector('nav').clientHeight -
                       this.NAVBAR_HEIGHT;

        // Find best fit in display
        const scaleX = width  / Paper.PIXEL_WIDTH;
        const scaleY = height / Paper.PIXEL_HEIGHT;
        const scale  = Math.min(scaleX, scaleY);

        // Set display height (image)
        this.imgOutput.style.width  = `${Paper.PIXEL_WIDTH  * scale}px`;
        this.imgOutput.style.height = `${Paper.PIXEL_HEIGHT * scale}px`;
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
        // Display everything
        if (this.corners.length == 8) {
            /** @type {String} Corrected image's data (JPG encoded in base64) */
            const imgUriData = this.imageCorrection(imageRaw, this.corners);

            // Make link for download
            this.createOutputImg(imgUriData);
            this.createOutputPdf(imgUriData);
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
     * Produce a new image with corrected perspective
     * 
     * @param {HTMLImageElement} src 
     * @param {Array<Number>} corners Array of corners coordinates
     * 
     * @returns {String} Base64 Encoded JPG image
     */
    imageCorrection(src, corners) {
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

        // Free allocated memory
        srcImageData.delete();
        srcCorners.delete();
        dstImageData.delete();
        dstCorners.delete();
        transform.delete();

        // Save the canvas image as JPG
        return destinationCanvas.toDataURL("image/jpeg")
    }

    /**
     * Generate a downloadable image behind an <a> element
     * 
     * @param {string} uriJpgData The JPG image coded in base64
     */
    createOutputImg(uriJpgData) {
        // Show result on screen
        const img = this.shadowRoot.querySelector('img');
        img.src = uriJpgData;

        // Create the download link
        const saveJpgLink = this.shadowRoot.querySelector("#saveJPG");
        saveJpgLink.download = `${this.timeStamp}-scan-doc.jpg`;
        saveJpgLink.href = uriJpgData;
    }

    /**
     * Generate a downloadable PDF behind an <a> element
     * 
     * @param {string} uriJpgData The JPG image coded in base64
     */
    async createOutputPdf(uriJpgData) {
        const pdfDoc = await PDFLib.PDFDocument.create();

        const jpgImage = await pdfDoc.embedJpg(uriJpgData)

        const page = pdfDoc.addPage([
            Math.round(Paper.WIDTH  / 25.4 * 72),
            Math.round(Paper.HEIGHT / 25.4 * 72)
        ]);

        // Insert the image in the PDF document
        page.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width:  Paper.WIDTH  / 25.4 * 72,
            height: Paper.HEIGHT / 25.4 * 72,
        })

        const uriPdfData = await pdfDoc.saveAsBase64({ dataUri: true });

        const savePdfLink = this.shadowRoot.querySelector("#savePDF");
        savePdfLink.download = `${this.timeStamp}-scan-doc.pdf`;
        savePdfLink.href = uriPdfData;
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
                <a id="saveJPG">Download JPG</a>
                <a id="savePDF">Download PDF</a>
            </nav>
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
            margin:0;
            padding:0;
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
