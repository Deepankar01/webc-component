import { DETPayBaseElement } from "../lib/DETPayBaseElement";
import { errorTemplate, loaderTemplate } from "../lib/templates";
import { toBoolean } from "../lib/utils";

const redirectTemplate = document.createElement("template");
redirectTemplate.innerHTML = `
  <style>
    :host { display: inline-block; }
    form { display:none; }
    .status { position: relative; }
  </style>
  <slot></slot>
  <div class="status" part="status" data-status></div>
`;

export class DETPayRedirect extends DETPayBaseElement {
  private baseUrl: string = "https://pay.det.co/redirect";
  private form: HTMLFormElement | null = null;
  private shadowRootElement: ShadowRoot;
  private statusContainer: HTMLElement;
  private autoSubmit = true;

  constructor() {
    super();
    this.shadowRootElement = this.attachShadow({ mode: "open" });
    const fragment = redirectTemplate.content.cloneNode(true) as DocumentFragment;
    this.shadowRootElement.appendChild(fragment);
    const existingContainer = this.shadowRootElement.querySelector<HTMLElement>(
      "[data-status]"
    );
    if (existingContainer) {
      this.statusContainer = existingContainer;
    } else {
      const fallbackContainer = document.createElement("div");
      fallbackContainer.setAttribute("data-status", "");
      fallbackContainer.className = "status";
      this.shadowRootElement.appendChild(fallbackContainer);
      this.statusContainer = fallbackContainer;
    }
  }

  // Lifecycle method called when the element is added to the DOM
  connectedCallback() {
    this.log("DETPayRedirect connected to the DOM");
    this.readCommonAttributes();
    this.autoSubmit = this.resolveAutoSubmit();
    this.fetchCredentialsAndEmitEvents({
      onLoad: () => this.loaderComponent(),
      onSuccess: () => {
        this.renderForm();
        this.log("Form rendered: Awaiting submission");
        if (this.autoSubmit) {
          // submit in next task to allow listeners to hook into dtpay:before-redirect
          queueMicrotask(() => {
            if (this.form) {
              this.submit();
            }
          });
        }
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
      "base-src",
    ];
  }

  // Lifecycle method called when an observed attribute changes
  attributeChangedCallback() {
    if (!this.isConnected) return;
    this.readCommonAttributes();
    this.autoSubmit = this.resolveAutoSubmit();
    this.renderForm();
  }

  /**
   * Prepare the src URL with query parameters
   * @returns prepared src URL
   */
  private prepareSrc(): URL | null {
    this.log("Preparing redirect URL");
    const baseUrl = this.resolveBaseUrl();
    if (!baseUrl) {
      this.errorComponent("Invalid redirect base URL.");
      return null;
    }
    const url = new URL(baseUrl.href);
    if (this.clientId) {
      url.searchParams.append("client_id", this.clientId);
    }
    if (this.redirectUri && this.dataConfiguration?.redirectUrls) {
      if (this.dataConfiguration.redirectUrls.includes(this.redirectUri)) {
        url.searchParams.append("redirect_uri", this.redirectUri);
      } else {
        this.errorComponent("Redirect URI mismatch."); // return empty URL if redirect URI is invalid
        return null;
      }
    }
    if (this.dataContext && this.dataConfiguration?.dataKey) {
      url.searchParams.append(this.dataConfiguration.dataKey, this.dataContext);
    }
    // return the fully prepared redirect URL
    return url;
  }

  // Render the form based on current attributes
  private renderForm() {
    const url = this.prepareSrc();
    if (!url) return;

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
    this.setStatusContent();
    this.shadowRootElement.appendChild(form);
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
    this.form?.remove();
    this.form = null;
    const fragment = errorTemplate.content.cloneNode(true) as DocumentFragment;
    const errorNode = fragment.querySelector<HTMLElement>(".error");
    if (errorNode) {
      errorNode.textContent = message;
    }
    this.setStatusContent(fragment);
  }

  // Initialize loader component
  private loaderComponent() {
    this.form?.remove();
    this.form = null;
    const fragment = loaderTemplate.content.cloneNode(true) as DocumentFragment;
    this.setStatusContent(fragment);
  }

  private setStatusContent(fragment?: DocumentFragment): void {
    if (!this.statusContainer) return;
    this.statusContainer.innerHTML = "";
    if (fragment) {
      this.statusContainer.appendChild(fragment);
    }
  }

  private resolveBaseUrl(): URL | null {
    const baseSrc = this.getAttribute("base-src");
    const candidate = baseSrc?.trim() || this.baseUrl;
    try {
      return new URL(candidate, document.baseURI);
    } catch (error) {
      this.log("Invalid base-src provided", error);
      return null;
    }
  }

  private resolveAutoSubmit(): boolean {
    const attr = this.getAttribute("auto-submit");
    return attr === null ? true : toBoolean(attr);
  }
}



// define once, avoid double-registration in dev/HMR
if (!customElements.get('det-pay-redirect')) {
  customElements.define('det-pay-redirect', DETPayRedirect);
}
