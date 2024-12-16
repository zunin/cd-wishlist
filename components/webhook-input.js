class WebhookInput extends HTMLElement {
    static formAssociated = true;
    #internals;
    #shadowRoot;
    constructor() {
        super();
        this.#internals = this.attachInternals();
    }

    connectedCallback() {
        this.#shadowRoot = this.attachShadow({
            mode: "open",
            delegatesFocus: true,
        });

        this.#shadowRoot.innerHTML = `
          <label for="url">Webhook url:</label>
          <input type="url" name="url">
        `;

        const input = this.#shadowRoot.querySelector("input");
        input.addEventListener("change", () => {
            this.#internals.setFormValue(input.value);
            //this.updateValidity(input.value);
        });
    }
}

// Define the new element
customElements.define("webhook-input", WebhookInput);
