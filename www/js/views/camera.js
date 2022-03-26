/**
 * The AppResultView show the image with its corrected perspective
 * 
 * @copyright 2022, Nicolas Wanner
 */

import * as Paper   from '../tools/paper.js';
import * as Element from '../tools/element.js';

export const SNAPSHOT_EVENT_NAME = "Snapshot";
 
export class View extends Element.Base {
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
        super.update();
        // DOM has changed, update the event listeners
        const btn = this.shadowRoot.querySelector('#openCamera');
        btn.addEventListener( 'change', event => this.getCameraImage(event));
    }

    /**
     * Copy the opened file to target image.
     * 
     * @param {Event} event input's change parameters
     */
    getCameraImage(event) {
        const image = new Image();
        image.addEventListener( 'load', event => this.snapshotLoaded(event));

        let files = event.target.files;
        if (files && files.length >= 0) {
            try {
                let url = window.URL.createObjectURL(files[0]);
                image.src = url;
            }
            catch(exception) {
                try {
                    let fileReader  = new FileReader();
                    fileReader.onload = function(fileReaderEvent) {
                        image.src = fileReaderEvent.target.result;
                    };
                    fileReader.readAsDataURL(files[0]);
                }
                catch(error) {
                    console.log('Neither createObjectURL or FileReader are supported' + error);
                }
            }
        }
    }

    /**
     * Camera picture has been loaded in the target image.
     * Fires a SNAPSHOT_EVENT_NAME.
     * 
     * @param {Event} event load event for the image
     */
    snapshotLoaded(event) {
        const snapshotEvent = new CustomEvent(SNAPSHOT_EVENT_NAME, {
            bubbles: true,
            detail: { image: event.target }
        });
    
        this.parentElement.dispatchEvent(snapshotEvent);
    }


    /**
     * The custom element's HTML content
     * 
     * @returns {string} The custom element's HTML content
     */
    getHtml() {
        return `
            <h1>Scan your document</h1>

            <label for="openCamera" class="openCamera">
                Open camera
                <input id="openCamera" type="file" accept="image/*" capture="camera">
            </label>    
        `;
    }

    /**
     * The custom element's CSS content
     * 
     * @returns {string} The custom element's CSS content
     */
    getStyle() {
        return ` ${super.getStyle()}

        #openCamera {
            display: none;
        }
        
        .openCamera {
            background-color: #ccc;
            color: black;
            border: 4px groove #fff;
            display: block;
            width:  75%;
            height: 5em;
            cursor: pointer;
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            align-items: center;
            justify-content: center;
            margin-top: 5em;
        }
        `;
    }
}

window.customElements.define('app-camera', View);
