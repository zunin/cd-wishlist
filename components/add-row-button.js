class AddRowButton extends HTMLElement {
    _internals;
    static formAssociated = true;
    constructor() {
        super();
        this._internals = this.attachInternals();
    }

    /**
     * @type {HTMLFormElement}
     */
    get form() {
        return this._internals.form;
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        shadow.innerHTML = `
        <button type="button" id="addrow">Add item</button>
        `;

        const button = shadow.querySelector("button");

        button.addEventListener("click", () => {
            this.form.dispatchEvent(new Event("addArtistAndAlbumRow"));
        });
    }
}

// Define the new element
customElements.define("add-row-button", AddRowButton);
