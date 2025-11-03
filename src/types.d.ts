type ConfigurationFetchEventType =
  | "det_pay:config_loading"
  | "det_pay:config_error"
  | "det_pay:config_success";
type RedirectEventType = "detpay:before-redirect";
type IframeEventType =
  | "det_pay:load"
  | "det_pay:error"
  | "det_pay:ready"
  | "det_pay:height"
  | "det_pay:result";
type EventType =
  | ConfigurationFetchEventType
  | IframeEventType
  | RedirectEventType;
type ComponentEventSource = "iframe" | "redirect";
type URLParamValue = string | number | boolean | null | undefined;
interface DETPayCallbackResponse {
  origin: string;
  message: string;
  event: EventType;
  data?: string | object;
}

interface ClientConfiguration {
  id: string;
  redirectUrls: string[];
  dataKey: string;
  nonce: string;
  allowedOrigins: string[];
}

type DETPayMessage =
  | { type: "det_pay:ready" }
  | { type: "det_pay:height"; payload: { height: number } }
  | {
      type: "det_pay:error";
      payload: { code: string; message: string | object };
    }
  | { type: "det_pay:result"; payload: Record<string, unknown> }
  | { type: "det_pay:load" };

interface DETPayProps {
  clientId: string;
  redirectUri: string;
  dataContext: string;
  baseUrl: string;
}
