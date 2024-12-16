class WishlistForm extends HTMLElement {
    constructor() {
        super();
        this.template = document.createElement("template");
        this.template.innerHTML = `
          <style>
          div {
            display: flex;
            gap: 0.5ch;
            flex-direction: column;
          }
          </style>
          <div>
            <album-input name="album"></album-input>
            <artist-input name="artist"></artist-input>
          <div>
        `;
    }

    /**
     * @type {HTMLFormElement}
     */
    form;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `
          <style>
          fieldset {
              display: flex;
              gap: 1ch;
              flex-direction: column;
          }
          form {
              display: flex;
              gap: 1ch;
              flex-direction: column;
          }

          </style>
          <form method="post">
          <webhook-input name="url"></webhook-input> 
          <fieldset>  
            <legend>Items to subscribe to</legend>
          </fieldset>
          <add-row-button></add-row-button>
          <submit-button></submit-button>
          </form>
        `;
        this.form = shadow.querySelector("form");
        this.form.addEventListener("submit", this.submit.bind(this));
        this.addArtistAndAlbumRow();
        this.form.addEventListener(
            "addArtistAndAlbumRow",
            this.addArtistAndAlbumRow.bind(this),
        );
    }

    addArtistAndAlbumRow() {
        const [fieldSet] = [...this.form.getElementsByTagName("fieldset")];
        const clone = this.template.content.cloneNode(true);
        fieldSet.appendChild(clone);
    }

    submit(e) {
        e.preventDefault();
        return false;
    }
}

// Define the new element
customElements.define("wishlist-form", WishlistForm);
