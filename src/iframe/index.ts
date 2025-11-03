import type { DETPayIFrame } from "./element";

export * from "./element";

export const mountDETPayIFrame = (props: DETPayProps) => {
  const el = document.createElement("det-pay-iframe");
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else if (v != null) {
      el.setAttribute(k, String(v));
    }
  }
  return el as DETPayIFrame;
};
