/**
 * View to get a new image from the camera
 */

import { IMAGE_LOADED_EVENT, dispatchImageLoadedEvent } from '../events.js';

export class ViewGetImage {
    /** @type {String} Image's ID where to save loaded image */
    static imageTargetId = "cameraImage";

    /**
     * Returns the view's content
     * 
     * @returns The view's HTML
     */
    getHtml() {
        return `
            <p>Scan a document with the camera</p>
            <p>Correct the picture</p>
            <p>Share the picture</p>

            <label for="openCamera" class="openCamera">
                Scan your document
                <input id="openCamera" type="file" accept="image/*" capture="camera">
            </label>
        `;
    }

    /**
     * View constructor
     * 
     * @param {HTMLElement} parent The element where to place the view
     */
    constructor(parent) {
        this.parent = parent;
        parent.className = "getImage";
        parent.innerHTML = this.getHtml();
        const button = parent.querySelector('#openCamera');
        button.addEventListener( 'change', event => this.getCameraImage(event));
    }

    /**
     * Copy the opened file to target image.
     * 
     * @param {Event} event input's change parameters
     */
    getCameraImage(event) {
        const image = new Image();
        image.addEventListener( 'load', event => this.imageLoaded(event));
        //const image = document.getElementById(ViewGetImage.imageTargetId);

        let files = event.target.files;
        if (files && files.length >= 0) {
            try {
                let url = window.URL.createObjectURL(files[0]);
                image.src = url;
                // window.URL.revokeObjectURL(url);
                // window.URL.revokeObjectURL(url);
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

    imageLoaded(event) {
        dispatchImageLoadedEvent(this.parent, event.target);
    }

}