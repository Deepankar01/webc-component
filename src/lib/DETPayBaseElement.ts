/**
 * Base class for DETPay web components
 * Provides common functionality like reading attributes, logging, and event emission
 * Also includes method to fetch client configuration from API
 */
import { toBoolean } from "./utils";

export abstract class DETPayBaseElement extends HTMLElement {
  protected static APIUrl: string = "http://localhost:3000/clients/";
  protected clientId: string | undefined;
  protected redirectUri: string | undefined;
  protected dataContext: string | undefined;
  protected dataConfiguration: ClientConfiguration | undefined;
  protected debugEnabled = false;
  public nonce?: string = undefined;
  
  /** Simple logger respecting debug flag */
  protected log(...args: unknown[]) {
    if (this.debugEnabled) console.debug("[DTPay]", ...args);
  }

  /** Emit a custom event from this element */
  protected emit(name: ComponentEventSource, detail?: DETPayCallbackResponse) {
    console.log(`Emitting event detPay:${name}`, detail);
    this.dispatchEvent(
      new CustomEvent(`detPay:${name}`, {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  /** Read common attributes from the element */
  protected readCommonAttributes() {
    this.log("Reading common attributes");
    this.clientId = this.getAttribute("client-id") || undefined;
    this.redirectUri = this.getAttribute("redirect-uri") || undefined;
    this.dataContext = this.getAttribute("data-context") || undefined;
    this.debugEnabled = toBoolean(this.getAttribute("debug"));
  }

  /**
   * Get client details from API to fetch redirect URI and configurations
   */
  protected getClientDetails = async (): Promise<void> => {
    try {
      this.log("Fetching client details from API");
      const response = await fetch(DETPayBaseElement.APIUrl + this.clientId);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = (await response.json()) as ClientConfiguration;
      this.dataConfiguration = data;
      this.nonce = data.nonce;
    } catch (error) {
      this.log("Error fetching client details:", error);
      this.dataConfiguration = undefined;
    }
  };

  /** read extra user supplied atributes and dump them in extraParams */
  protected readExtraDataAttributes() {
    // Everything else passed as data-* → query param
    const extraParams: Record<string, URLParamValue> = {};
    for (const attr of Array.from(this.attributes)) {
      if (attr.name.startsWith("data-")) {
        extraParams[attr.name.substring(5)] = attr.value;
      }
    }

    return {
      extraParams,
    };
  }
}
