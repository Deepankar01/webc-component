import { DETPayBaseElement } from "../lib/DETPayBaseElement";
import {errorTemplate, loaderTemplate} from "../lib/templates"

const iFrameTemplate = document.createElement("template");
iFrameTemplate.innerHTML = `
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
  private baseUrl: string = "https://pay.det.co/iframe";
  private iframe!: HTMLIFrameElement;
  private teardownMessage?: () => void;
  private shadowRootElement: ShadowRoot;

  constructor() {
    super();
    this.shadowRootElement = this.attachShadow({ mode: "open" });
  }

  /**
   * Lifecycle method called when the element is added to the DOM
   */
  connectedCallback() {
    this.log("DETPayIFrame connected to the DOM");
    this.readCommonAttributes();
    if (this.clientId && !this.dataConfiguration) {
      // initialize loader configuration
      this.loaderComponent();
      this.log("config_loading event emitted");
      this.emit("iframe", {
        message: "Fetching client details",
        event: "det_pay:config_loading",
        origin: "",
      });
      this.getClientDetails()
        .then(() => {
          // initialize iframe only after fetching configuration
          this.initializeIFrame();
          this.applyIframeAttributes();
          this.prepareSrc();
          this.setupMessageBridge();
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
    }
  }

  /**
   * Lifecycle method called when the element is removed from the DOM
   */
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
   */
  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    // Re-apply on relevant attr changes
    if (!this.isConnected) return;
    this.readCommonAttributes();
    if (this.dataConfiguration) {
      this.applyIframeAttributes();
      // console.log("Attribute changed:", name, oldValue, newValue);
      this.prepareSrc();
    }
  }

  /**
   * Initialize the iframe element and append it to the shadow DOM
   */
  private initializeIFrame() {
    this.shadowRootElement.innerHTML = iFrameTemplate.innerHTML;
    this.iframe = this.shadowRootElement!.querySelector("iframe")!;
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
  private prepareSrc(): void {
    console.log("Preparing iframe src URL");
    const url = new URL(this.baseUrl);
    if (this.clientId) {
      url.searchParams.append("client_id", this.clientId);
    }
    if (this.redirectUri && this.dataConfiguration?.redirectUrls) {
      if (this.dataConfiguration.redirectUrls.includes(this.redirectUri)) {
        url.searchParams.append("redirect_uri", this.redirectUri);
      } else {
        this.errorComponent("Redirect URI mismatch.");// return empty URL if redirect URI is invalid
      }
    }
    if (this.dataContext && this.dataConfiguration?.dataKey) {
      url.searchParams.append(this.dataConfiguration.dataKey, this.dataContext);
    }
    //adds src to iframe
    this.iframe.src = url.toString();
  }

  /**
   * Setup message bridge to listen to messages from the iframe
   * CHILD TO PARENT MESSAGE BRIDGE
   */
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

  private errorComponent(message: string) {
    errorTemplate.querySelector(".error")!.textContent = message;
    this.shadowRootElement.innerHTML = errorTemplate.innerHTML;
  }

  /**
   * Initialize loader component
   */
  private loaderComponent() {
    this.shadowRootElement.innerHTML = loaderTemplate.innerHTML;
  }
}




// define once, avoid double-registration in dev/HMR
if (!customElements.get('det-pay-iframe')) {
  customElements.define("det-pay-iframe", DETPayIFrame);
}
