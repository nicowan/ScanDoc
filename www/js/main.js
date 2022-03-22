/**
 * Main program
 */
import { IMAGE_LOADED_EVENT, EDIT_FINISHED_EVENT } from './events.js';
import { ViewGetImage } from './view/get-image.js';
import { ViewPerspective } from './view/perspective.js';

let state    = "loadImage";
let imageRaw = null;

// Start main program
window.addEventListener('load', event => main(event));




let currentView = null;

/**
 * Application's entry point
 * @param {Event} event 
 */
function main(event) {
    const mainElem = document.querySelector('main');

    new ViewGetImage(mainElem);

    mainElem.addEventListener(IMAGE_LOADED_EVENT, (event) => {
        console.log("The image has been loaded");
        imageRaw = event.detail.image;
        const view2 = new ViewPerspective(mainElem);
        view2.setSourceImage(imageRaw);
    }, false);

    mainElem.addEventListener(EDIT_FINISHED_EVENT, (event) => {
        console.log("Image corners specified", event.detail.polygon);
    }, false);





}

