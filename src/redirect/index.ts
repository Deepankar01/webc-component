import type { DETPayRedirect } from "./element";

export * from "./element";


export const mountDETPayRedirect = (props: DETPayProps) => {
  const el = document.createElement("det-pay-redirect");
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else if (v != null) {
      el.setAttribute(k, String(v));
    }
  }
  return el as DETPayRedirect;
};
