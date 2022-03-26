/**
 * Shared parts of all UI elements
 */

export const STYLE = `
    :host {
        width:100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        align-items: center;
    }

    h1 {
        background-color: #48A;
        color: white;
        text-align: center;
    }
`;

/**
 * Base class is used to derive all other custom elements
 */
export class Base extends HTMLElement {
    /**
     * Custom element's constructor
     */
    constructor() {
        // MUST BE FIRST INSTRUCTION!
        super();

        // Create the Shadow DOM
        this.attachShadow({mode : 'open'});
    }

    /**
     * Called when the custom component is added to the page
     */
    connectedCallback() {
        this.update()
    }

    /**
     * Called when an watched attribute changes
     * 
     * @param {String} name Attribute's name
     * @param {String} oldValue previous attribute's value
     * @param {String} newValue new attribute's values (JSON accepted)
     * @returns 
     */
    attributeChangedCallback(name, oldValue, newValue) {
        let data = "";
        try {
            data = JSON.parse(unescape(newValue));
        } catch (e) {
            data = newValue;
        }
        this[name] = data;
		this.update();
    }

    /**
     * Update the component content and style
     */
    update() {
        this.shadowRoot.innerHTML = this.getHtml();
        this.shadowRoot.appendChild(this.makeStyle());
    }

    /**
     * Create a The style element with its content.
     * @returns {HTMLStyleElement} The style element with its content
     */
    makeStyle() {
        const style = document.createElement('style');
        style.textContent = this.getStyle();
        return style;
    }

    /**
     * The custom element's HTML content
     * 
     * @returns {string} The custom element's HTML content
     */
    getHtml() {
        return `<!-- Empty element -->`;
    }

    /**
     * The custom element's CSS content
     * 
     * @returns {string} The custom element's CSS content
     */
    getStyle() {
        return STYLE;
    }

    /**
     * @type {Array>String>} Array of observed attributes
     */
    static get observedAttributes() {
        return [];
    }
}