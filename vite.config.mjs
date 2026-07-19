import { cp, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";

function copyRuntimeImages() {
  return {
    name: "copy-runtime-images",
    async writeBundle() {
      const menus = JSON.parse(await readFile(resolve("src/data/menus.json"), "utf8"));
      const imagePaths = new Set(["assets/lunch-spread.png"]);

      menus.forEach((menu) => {
        const entries = [...(Array.isArray(menu.imageUrls) ? menu.imageUrls : []), menu.imageUrl];
        entries.forEach((entry) => {
          const url = typeof entry === "string" ? entry : entry?.url || entry?.imageUrl || entry?.localUrl;
          const normalizedPath = url?.replace(/^\.\//, "");
          if (
            normalizedPath?.startsWith("assets/menu/")
            || normalizedPath?.startsWith("assets/menu-cache/")
            || normalizedPath?.startsWith("assets/menu-reviewed/")
          ) {
            imagePaths.add(normalizedPath);
          }
        });
      });

      await Promise.all(
        [...imagePaths].map(async (imagePath) => {
          const target = resolve("dist", imagePath);
          await mkdir(dirname(target), { recursive: true });
          await cp(resolve(imagePath), target, { force: true });
        }),
      );
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "legacy-jsx-loader",
      enforce: "pre",
      async transform(code, id) {
        if (!id.includes("/src/") || !id.endsWith(".js")) return null;

        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic",
        });
      },
    },
    react({
      include: /\.[jt]sx?$/,
    }),
    copyRuntimeImages(),
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
