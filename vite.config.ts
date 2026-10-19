import { defineConfig } from "vite";
import { execFileSync } from "node:child_process";
let buildId = process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "local";
if (buildId === "local") {
  try {
    buildId = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    /* Source archives can build without Git. */
  }
}
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  plugins: [
    {
      name: "build-identity",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "build.json",
          source: JSON.stringify({ id: buildId }),
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { game: "index.html", assets: "asset-review.html" },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three/examples/"))
            return "three-addons";
          if (id.includes("node_modules/three/")) return "three";
        },
      },
    },
  },
});
