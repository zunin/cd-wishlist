class SubmitButton extends HTMLElement {
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
            <button type="submit" id="submit">Submit</button>
        `;

        const button = shadow.querySelector("button");

        button.addEventListener("click", this.submit.bind(this));

        shadow.appendChild(button);
    }

    submit(e) {
        this.form.dispatchEvent(new SubmitEvent("submit", {submitter: e.target}));
    }
}

// Define the new element
customElements.define("submit-button", SubmitButton);
