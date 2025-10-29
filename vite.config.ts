import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "DETPayComponents", // global name if you build UMD later
      formats: ["es"], // ES module is best for web components
      fileName: () => "index.js",
    },
    rollupOptions: {
      // externalize deps if you have any (usually none for pure web components)
      external: [],
    },
    emptyOutDir: true,
    outDir: "dist",
    copyPublicDir: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      outDir: "dist",
      rollupTypes: true,
      include: [
        'src/**/*.ts',
        'src/**/*.d.ts',          // <- ensure your types.d.ts is picked up
        'types/**/*.d.ts'
      ]
    }),
  ],
});
