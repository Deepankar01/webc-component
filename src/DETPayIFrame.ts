import { DETPayBaseElement } from "./lib/DETPayBaseElement";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host { display:block; width: 100%; min-height: 200px; height:inherit; }
    .wrapper { position: relative; width: 100%; height: 100%; }
    iframe { width: 100%; height: 100%; border: 0; }
  </style>
  <div class="wrapper">
    <iframe part="frame"></iframe>
  </div>
`;

export class DETPayIFrame extends DETPayBaseElement {
  private iframe!: HTMLIFrameElement;
  private teardownMessage?: () => void;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.appendChild(template.content.cloneNode(true));
    this.iframe = this.shadowRoot!.querySelector("iframe")!;
    /// Load event listener
    this.iframe.addEventListener("load", () => {
      console.log("Iframe content has loaded!");
      this.emit("iframe", {
        message: "Iframe loaded",
        event: "det_pay:load",
        origin: "",
      });
    });

    this.iframe.addEventListener("error", (e) => {
      console.log("Iframe content has error!");
      this.emit("iframe", {
        message: "Iframe error",
        event: "det_pay:error",
        data: e,
        origin: "",
      });
    });
  }

  /**
   * Lifecycle method called when the element is added to the DOM
   */
  connectedCallback() {
    this.log("DETPayIFrame connected to the DOM");
    this.readCommonAttributes();
    this.applyIframeAttributes();
    this.setupMessageBridge();
    if (this.clientId && !this.dataConfiguration) {
      this.log("config_loading event emitted");
      this.emit("iframe", {
        message: "Fetching client details",
        event: "det_pay:config_loading",
        origin: "",
      });
      this.getClientDetails()
        .then(() => {
          if (this.dataConfiguration) {
            this.log("config_success event emitted");
            this.emit("iframe", {
              message: "Client details fetched",
              event: "det_pay:config_success",
              data: this.dataConfiguration,
              origin: "",
            });
          } else {
            this.log(
              "config_error event emitted due to missing dataConfiguration"
            );
            this.emit("iframe", {
              message: "Failed to fetch client details",
              event: "det_pay:config_error",
              origin: "",
            });
          }
        })
        .catch((error) => {
          this.log("config_error event emitted due to error");
          this.emit("iframe", {
            message: "Error fetching client details",
            event: "det_pay:config_error",
            data: error,
            origin: "",
          });
        });

      this.shadowRoot!.querySelector("iframe")!.src = this.prepareSrc();
    }
  }

  disconnectedCallback() {
    this.teardownMessage?.();
  }

  /**
   * post a message to the child Iframe with strict targetOrigin validation
   * PARENT TO CHILD MESSAGE BRIDGE
   */
  postToChild(message: DETPayMessage) {
    if (!this.iframe.contentWindow) return;
    //TODO: validate origin properly
    const targetOrigin = new URL(this.getAttribute("base-src") || "").origin;
    if (!targetOrigin) return;
    this.iframe.contentWindow.postMessage(message, targetOrigin);
  }

  //Observed attributes for the element
  static get observedAttributes() {
    return ["client-id", "redirect-uri", "data-context", "debug"];
  }

  /**
   * Lifecycle method called when an observed attribute changes
   * @param name
   * @param oldValue
   * @param newValue
   * @returns
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    // Re-apply on relevant attr changes
    if (!this.isConnected) return;
    this.readCommonAttributes();
    this.applyIframeAttributes();
    this.prepareSrc();
  }

  /**
   * Apply iframe attributes based on element attributes
   */
  private applyIframeAttributes() {
    const sandbox =
      this.getAttribute("sandbox") ||
      "allow-scripts allow-forms allow-same-origin allow-popups";
    const allow = this.getAttribute("allow") || "payment *";
    const refpol = this.getAttribute("referrerpolicy") || "no-referrer";
    const title = this.getAttribute("title") || "Secure payment frame";
    const loading = this.getAttribute("loading") || "eager";

    this.iframe.setAttribute("sandbox", sandbox);
    this.iframe.setAttribute("allow", allow);
    this.iframe.setAttribute("referrerpolicy", refpol);
    this.iframe.setAttribute("title", title);
    this.iframe.setAttribute("loading", loading);
  }

  /**
   * Prepare the src URL with query parameters
   * @returns prepared src URL
   */
  private prepareSrc(): string {
    const baseUrl = "https://pay.det.co/iframe";
    const url = new URL(baseUrl);
    if (this.clientId) {
      url.searchParams.append("client_id", this.clientId);
    }

    if (this.redirectUri && this.dataConfiguration?.redirectUrls) {
      // validate redirect URI against dataConfiguration if available
      if (this.dataConfiguration.redirectUrls.includes(this.redirectUri)) {
        url.searchParams.append("redirect_uri", this.redirectUri);
      } else {
        return new URL("").toString(); // return empty URL if redirect URI is invalid
      }
    }
    if (this.dataContext && this.dataConfiguration?.dataKey) {
      url.searchParams.append(this.dataConfiguration.dataKey, this.dataContext);
    }
    return url.toString();
  }

  private setupMessageBridge() {
    const onMessage = (ev: MessageEvent) => {
      // Only accept messages from the configured allowed origins and the same window
      const expectedOrigins = new Set(
        this.dataConfiguration?.allowedOrigins.length
          ? this.dataConfiguration.allowedOrigins
          : [new URL("about:blank").origin]
      );

      if (!expectedOrigins.has(ev.origin)) return;
      if (ev.source !== this.iframe.contentWindow) return;

      const data = ev.data as DETPayMessage | unknown;
      // Optionally validate known message schema
      if (typeof data !== "object" || data === null) return;
      const msg = data as DETPayMessage;

      // Map to CustomEvents so integrators can handle: dtpay:ready, dtpay:height, dtpay:result, dtpay:error
      if (typeof msg.type === "string") {
        this.emit(msg.type as ComponentEventSource, {
          origin: ev.origin,
          message: "Message from iframe",
          event: msg.type as IframeEventType,
        });
        // Special case: auto-resize
        if (msg.type === "det_pay:height" && typeof msg.payload === "number") {
          this.style.minHeight = `${msg.payload}px`;
        }
      }
    };

    window.addEventListener("message", onMessage);
    this.teardownMessage = () =>
      window.removeEventListener("message", onMessage);
  }
}

customElements.define("det-pay-iframe", DETPayIFrame);
