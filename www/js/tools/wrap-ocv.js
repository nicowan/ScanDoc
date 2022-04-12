/**
 * Open CV functions wrapper
 * 
 * @author Nicolas Wanner
 * @version 0.1     2022-04-12      Initial revision
 * @license MIT
 */

import { Vector } from './geometry.js';


// Paper Shape detection ------------------------------------------------------

/**
 * Finds polygons in the given picture
 * 
 * @param {HTMLCanvasElement} cnv The image to be analyzed
 * 
 * @returns {Array<Vector>} The bounding polygon's vertices
 */
export function detectPaperInCanvas(cnv) {
    // Prepare the image for contour search (Gray -> Blur -> Edge detection)
    const src = cv.imread(cnv);

    // Change the color space (gray shades)
    cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);

    // Blur the image
    let gaussian = new cv.Size(5, 5);
    cv.GaussianBlur(src, src, gaussian, 0, 0, cv.BORDER_DEFAULT);

    // Edges detection
    cv.Canny(src, src, 90, 100, 3, false);

    // Black and white image
    //cv.threshold(src, src, 128, 255, cv.THRESH_BINARY);

    // Search polygons
    const contours  = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const index  = getBiggestAreaIndex(contours);
    const shape  = contours.get(index);
    const result = getBoundingPolygon(shape);

    freeOpenCvObjects(src, contours, hierarchy, shape);
    return result;
}

/**
 * Search for the greatest area in picture and return its index
 * 
 * @param {cv.MatVector} cvContours List of contours found in the image.
 * 
 * @returns {Number} The index of the greatest contour in the picture
 */
function getBiggestAreaIndex(cvContours) {
    /** @type {Number} Contains the greatest computed area */
    let maxArea = 0;

    /** @type {Number} Contains the index of the greatest computed area */
    let maxAreaIndex = 0;

    // Loop through all areas
    for (let i = 0; i < cvContours.size(); i++) {
        const cnt  = cvContours.get(i);
        const area = 1 * cv.contourArea(cnt);

        if (area > maxArea) {
            maxArea = area;
            maxAreaIndex = i;
        }
        freeOpenCvObjects(cnt);
    }

    // The biggest area
    return maxAreaIndex;
}

/**
 * Simplifies the given contour and return it as an array of vectors
 * 
 * @param {cv.MatVector} contour the contour to be simplified
 * @param {Number} scale Scaling factor between raw and work image size
 * 
 * @return {Array<Vector>} The points in the polygon
 */
function getBoundingPolygon(contour, scaling=1) {
    const result = [];
    const approx = new cv.Mat();
    const length = cv.arcLength(contour, true);

    // Simplify the shape
    cv.approxPolyDP(contour, approx,  length * 0.1, true);

    // Create the Vector array
    for(let i = 0; i < approx.rows; i++) {
        result.push( new Vector(approx.data32S[i * 2 + 0], approx.data32S[i * 2 + 1]));
    }

    // Free objects
    freeOpenCvObjects(approx);

    // The Array of vectors
    return result;
}

// General purpose functions --------------------------------------------------

/**
 * Call the delete() method on each passed object
 * 
 * @param  {...any} objects List of OpenCV objects to be freed
 */
function freeOpenCvObjects(...objects) {
    for(let i = 0; i < objects.length; i++) {
        objects[i].delete();
    }
}
