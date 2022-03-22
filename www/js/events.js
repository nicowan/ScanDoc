export const IMAGE_LOADED_EVENT = "imageLoaded";

export function dispatchImageLoadedEvent(eventTarget, imageElement) {
    const imageLoadedEvent = new CustomEvent(IMAGE_LOADED_EVENT, {
        bubbles: true,
        detail: { image: imageElement }
    });

    eventTarget.dispatchEvent(imageLoadedEvent);
}

export const EDIT_FINISHED_EVENT = "editFinished";

export function dispatchEditedFinishedEvent(eventTarget, polygon) {
    const editFinishedEvent = new CustomEvent(EDIT_FINISHED_EVENT, {
        bubbles: true,
        detail: { polygon: polygon }
    });

    eventTarget.dispatchEvent(editFinishedEvent);
}
