import { DETPayBaseElement } from "../lib/DETPayBaseElement";
import { errorTemplate, loaderTemplate } from "../lib/templates";
import { toBoolean } from "../lib/utils";

const redirectTemplate = document.createElement("template");
redirectTemplate.innerHTML = `
  <style>
    :host { display: inline-block; }
    form { display:none; }
  </style>
  <slot></slot>
`;

export class DETPayRedirect extends DETPayBaseElement {
  private baseUrl: string = "https://pay.det.co/redirect";
  private form?: HTMLFormElement;
  private shadowRootElement: ShadowRoot;

  constructor() {
    super();
    this.shadowRootElement = this.attachShadow({ mode: "open" });
  }

  // Lifecycle method called when the element is added to the DOM
  connectedCallback() {
    this.log("DETPayRedirect connected to the DOM");
    this.readCommonAttributes();
    this.fetchCredentialsAndEmitEvents({
      onLoad: () => this.loaderComponent(),
      onSuccess: () => {
        this.renderForm();
        this.log("Form rendered: Awaiting submission");
        // submit in next task to allow listeners to hook into dtpay:before-redirect
        queueMicrotask(() => this.submit());
      },
      source: "redirect",
    });
  }

  // Specify observed attributes for the element
  static get observedAttributes() {
    return [
      "client-id",
      "redirect-uri",
      "data-context",
      "debug",
      "auto-submit",
    ];
  }

  // Lifecycle method called when an observed attribute changes
  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.readCommonAttributes();
    this.renderForm();
  }

  /**
   * Prepare the src URL with query parameters
   * @returns prepared src URL
   */
  private prepareSrc(): string {
    this.log("Preparing redirect URL");
    const url = new URL(this.baseUrl);
    if (this.clientId) {
      url.searchParams.append("client_id", this.clientId);
    }
    if (this.redirectUri && this.dataConfiguration?.redirectUrls) {
      if (this.dataConfiguration.redirectUrls.includes(this.redirectUri)) {
        url.searchParams.append("redirect_uri", this.redirectUri);
      } else {
        this.errorComponent("Redirect URI mismatch."); // return empty URL if redirect URI is invalid
        return "about:blank";
      }
    }
    if (this.dataContext && this.dataConfiguration?.dataKey) {
      url.searchParams.append(this.dataConfiguration.dataKey, this.dataContext);
    }
    //adds src to iframe
    return url.toString();
  }

  // Render the form based on current attributes
  private renderForm() {
    const url = new URL(this.prepareSrc());

    // Build fields
    const method = (this.getAttribute("method") || "GET").toUpperCase();
    const target = this.getAttribute("target") || "_self";

    const form = document.createElement("form");
    form.method = method === "POST" ? "POST" : "GET";
    form.target = target;

    // For GET, encode params in URL; for POST, set action to base and create inputs

    form.action = url.toString();
    // redirect_uri, dataKey/context, and extraParams as hidden inputs
    const params = new URLSearchParams(url.search);
    for (const [name, value] of params.entries()) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }

    // Replace old form
    this.form?.remove();
    this.form = form;
    this.shadowRootElement!.appendChild(form);
  }

  // Submit the form and emit event
  submit() {
    const detail = { action: this.form?.action, method: this.form?.method };
    this.emit("redirect", {
      event: "detpay:before-redirect",
      data: detail,
      origin: "",
      message: "Before redirect",
    });
    this.form?.submit();
  }

  // Display an error message in the component
  private errorComponent(message: string) {
    errorTemplate.querySelector(".error")!.textContent = message;
    this.shadowRootElement.innerHTML = errorTemplate.innerHTML;
  }

  // Initialize loader component
  private loaderComponent() {
    this.shadowRootElement.innerHTML = loaderTemplate.innerHTML;
  }
}



// define once, avoid double-registration in dev/HMR
if (!customElements.get('det-pay-redirect')) {
  customElements.define('det-pay-redirect', DETPayRedirect);
}
