import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import tailwindcss from "@tailwindcss/vite";

/** Keep modular sources, ship an offline HTML with no asset requests. */
function portableHtml(): Plugin {
  return {
    name: "portable-html",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const page = bundle["index.html"];
      if (!page || page.type !== "asset") throw new Error("Missing HTML entry");
      let html = String(page.source).replace(/>\s+</g, "><");
      for (const [name, output] of Object.entries(bundle)) {
        if (name === "index.html") continue;
        if (output.type === "chunk") {
          if (!output.isEntry)
            throw new Error("Unexpected split chunk: " + name);
          html = html.replace(
            /<script\b[^>]*src="[^"]+"[^>]*><\/script>/,
            () =>
              `<script type="module">${output.code.replace(/<\/script/gi, "<\\/script")}</script>`,
          );
        } else if (name.endsWith(".css")) {
          html = html.replace(
            /<link\b[^>]*rel="stylesheet"[^>]*>/,
            () =>
              `<style>${String(output.source).replace(/<\/style/gi, "<\\/style")}</style>`,
          );
        } else throw new Error("Unexpected external asset: " + name);
        delete bundle[name];
      }
      page.source = html;
    },
  };
}

export default defineConfig({
  base: "./",
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [tailwindcss(), portableHtml()],
  build: {
    target: "es2020",
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: {
      output: { codeSplitting: false },
      onwarn(warning, defaultHandler) {
        // This client-only app has no server component boundary to preserve.
        if (
          warning.code === "MODULE_LEVEL_DIRECTIVE" &&
          warning.message.includes("use client")
        ) return;
        defaultHandler(warning);
      },
    },
  },
});
