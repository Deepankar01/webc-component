/**
 * Templates for error and loader components
 */

export const errorTemplate = document.createElement("error-template");
errorTemplate.innerHTML = `
  <style>
    .error  {
      color: red;
      font-weight: bold;
      text-align: center;
      padding: 20px;
    }
  </style>
  <div class="error">
    An error occurred while loading the payment frame.
  </div>
`;

export const loaderTemplate = document.createElement("loader-template");
loaderTemplate.innerHTML = `
  <style>
    .loader {
      border: 8px solid #f3f3f3;
      border-top: 8px solid #3498db;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      animation: spin 2s linear infinite;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
  <div class="loader"></div>
`;