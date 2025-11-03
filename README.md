# DETPay Web Component

This package exposes the `<det-pay-iframe>` custom element that embeds the DETPay checkout experience inside any web page. The component manages iframe setup, lifecycle events, message passing, and configuration loading so integrators can focus on business logic.

## Installation

```bash
npm install webc-component
```

If you are installing from a local checkout, run the build step first and then install using `npm link` or a file reference:

```bash
npm install
npm run build
npm install ./dist
```

## Usage

Import the package once in your application to register the elements globally, then add `<det-pay-iframe>` or `<det-pay-redirect>` to your markup.

```ts
import "webc-component";

// Declarative usage in HTML
// <det-pay-iframe client-id="..." redirect-uri="..." data-context="..." invoice-id="..."></det-pay-iframe>
// <det-pay-redirect client-id="..." redirect-uri="..." invoice-id="..." auto-submit></det-pay-redirect>

// Imperative usage in JavaScript
const detPay = document.createElement("det-pay-iframe");
detPay.setAttribute("client-id", "YOUR_CLIENT_ID");
detPay.setAttribute("redirect-uri", "https://example.com/return");
detPay.setAttribute("data-context", JSON.stringify({ cartId: "abc" }));
detPay.setAttribute("invoice-id", "INV-12345");

detPay.addEventListener("detPay:det_pay:result", (event) => {
  console.log("Checkout result", event.detail);
});

document.body.appendChild(detPay);

// Functional helper for the redirect component
import { mountDETPayRedirect } from "webc-component/redirect";

const redirectEl = mountDETPayRedirect({
  "client-id": "YOUR_CLIENT_ID",
  "redirect-uri": "https://example.com/return",
  "invoice-id": "INV-12345",
  "auto-submit": true,
});

document.body.appendChild(redirectEl);
```

Refer to [`docs/DETPayIFrame.md`](docs/DETPayIFrame.md) for a full iframe API and event reference, and to [`docs/DETPayRedirect.md`](docs/DETPayRedirect.md) for redirect usage details.

### Configuration at a glance

The iframe exposes a handful of attributes that control how it bootstraps the DETPay checkout flow. All attributes are reactive,
so updating them after insertion reconfigures the iframe.

| Attribute | Purpose |
| --- | --- |
| `client-id` | Fetches client configuration and validates redirect URIs / postMessage origins. |
| `redirect-uri` | Optional URL validated against the client configuration. |
| `invoice-id` | Optional invoice identifier to resume or prefill a specific DETPay invoice. |
| `data-context` | Arbitrary JSON string passed through to the checkout experience. |
| `debug` | When truthy enables verbose logging via the browser console. |
| `base-src` | Optional explicit iframe origin used when posting messages with `postToChild`. |

### Redirect configuration at a glance

`<det-pay-redirect>` shares the core attributes above—`invoice-id` included so existing invoices can be resumed—and also supports a few redirect-specific options:

| Attribute | Purpose |
| --- | --- |
| `auto-submit` | Submits automatically when the redirect URL is ready (defaults to `true`). |
| `method` | Overrides the form submission method (`GET` by default). |
| `target` | Sets the browsing context target for the redirect (`_self` by default). |

Additional iframe specific attributes (`sandbox`, `allow`, `referrerpolicy`, `title`, `loading`) fall back to secure defaults
but can be overridden directly on the element when an integration requires different behaviour.

### Lifecycle events and messaging

The component emits lifecycle events prefixed with `detPay:` that bubble through the DOM. These can be observed with
`addEventListener` to drive custom UI states (e.g. loading spinners or error banners).

```ts
detPay.addEventListener("detPay:iframe", (event) => {
  switch (event.detail.event) {
    case "det_pay:config_loading":
      // show a loading indicator
      break;
    case "det_pay:config_error":
      // surface an error message to the user
      break;
  }
});
```

To send custom messages into the iframe, call `detPay.postToChild(message)`. The component uses the `base-src` attribute (or the
configured client origin) to scope the postMessage target and prevent broadcasting to the entire web.

## Building the package

```bash
npm install
npm run build
```

- The compiled JavaScript is emitted to `dist/index.js`.
- Type definitions are copied to `dist/types.d.ts`.

## Running the example app

An integration example lives in the [`example/`](example/) directory. It uses `json-server` to mock the DETPay API and `five-server` to serve the static page.

1. Build the component into the example folder:
   ```bash
   npm run build -- --outDir example/dist
   ```
2. Install the example dependencies and start both servers:
   ```bash
   cd example
   npm install
   npm run start
   ```
3. Open the URL printed by `five-server` (defaults to [http://localhost:5500](http://localhost:5500)) in your browser.

The sample page demonstrates attribute-based configuration and runtime updates through JavaScript.

## Development tips

- Enable debugging by setting `debug="true"` on the element to surface internal logs.
- Use the `postToChild` method to send custom messages into the iframe when integrating advanced workflows.
- Listen for `detPay:*` events to track the iframe lifecycle and checkout results.
