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

Import the package once in your application to register the element globally, then add `<det-pay-iframe>` to your markup.

```ts
import "webc-component";

// Declarative usage in HTML
// <det-pay-iframe client-id="..." redirect-uri="..." data-context="..."></det-pay-iframe>

// Imperative usage in JavaScript
const detPay = document.createElement("det-pay-iframe");
detPay.setAttribute("client-id", "YOUR_CLIENT_ID");
detPay.setAttribute("redirect-uri", "https://example.com/return");
detPay.setAttribute("data-context", JSON.stringify({ cartId: "abc" }));

detPay.addEventListener("detPay:det_pay:result", (event) => {
  console.log("Checkout result", event.detail);
});

document.body.appendChild(detPay);
```

Refer to [`docs/DETPayIFrame.md`](docs/DETPayIFrame.md) for a full API and event reference.

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
