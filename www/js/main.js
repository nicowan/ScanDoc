/**
 * Main program
 */


 import * as Camera   from './views/camera.js';
 import * as Envelope from './views/envelope.js';
 import * as Result   from './views/result.js';

/** @type {HTMLElement} The main view's container */
let mainView = null;

/** @type {HTMLImageElement} The image taken from the camera */
let imgFromTheCamera = null;

/** @type {HTMLImageElement} The image after perspective correction */
let imgCorectedPerspective = null;

/** @type {HTMLImageElement} The image after color correction */
let imgCorrectedColors = null;


// Start main program
window.addEventListener('load', event => {
    mainView = document.querySelector('main');

    // Set the default vue (open camera screen)
    mainView.innerHTML = "<app-camera></app-camera>";

    // Attach global events
    mainView.addEventListener(Camera.SNAPSHOT_EVENT_NAME, onCameraShooting);

    // Attach global events
    mainView.addEventListener(Envelope.ENVELOPE_EVENT_NAME, onEnvelopeValidated);

    // Attach global events
    mainView.addEventListener(Envelope.CANCEL_EVENT_NAME, onEnvelopeCanceled);
});


/**
 * A new picture is ready for correction
 * 
 * @param {CustomEvent} event event's data
 */
function onCameraShooting(event) {
    // Debugging
    console.log(event.type, event.detail);

    // Save the image
    imgFromTheCamera = event.detail.image;

    // Open the perspective correction's view
    mainView.innerHTML = "<app-envelope></app-envelope>";

    // Get the view
    const view = mainView.querySelector('app-envelope');
    view.setSourceImage(imgFromTheCamera);



}

/**
 * Envelope definition has been canceled
 * 
 * @param {CustomEvent} event event's data
 */
 function onEnvelopeCanceled(event) {
    // Debugging
    console.log(event.type, event.detail);

    // back to camera view (open camera screen)
    mainView.innerHTML = "<app-camera></app-camera>";

    // Delete previous image
    imgFromTheCamera = null;
}

/**
 * Envelope definition has been validated
 * 
 * @param {CustomEvent} event event's data
 */
 function onEnvelopeValidated(event) {
    // Debugging
    console.log(event.type, event.detail);

    // back to camera view (open camera screen)
    mainView.innerHTML = "<app-result></app-result>";

    const view = mainView.querySelector('app-result');
    view.setCorners(event.detail.polygon);
    view.setSourceImage(imgFromTheCamera);
}



/*




let imageRaw = null;
let currentView = null;

 * Application's entry point
 * @param {Event} event 
function main(event) {

    mainElem.addEventListener(IMAGE_LOADED_EVENT, (event) => {
        console.log("The image has been loaded");
        imageRaw = event.detail.image;
        const view2 = new ViewPerspective(mainElem);
        view2.setSourceImage(imageRaw);
    }, false);

    mainElem.addEventListener(EDIT_FINISHED_EVENT, (event) => {
        console.log("Image corners specified", event.detail.polygon);
        mainElem.innerHTML = "<app-result></app-result>";

        const view = mainElem.querySelector('app-result');
        view.setSourceImage(imageRaw);
        view.setCorners(event.detail.polygon);

    }, false);





}

*/