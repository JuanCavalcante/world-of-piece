// @lovable.dev/vite-tanstack-config already includes: TanStack devtools (dev),
// tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro, VITE_* env
// injection, @ path alias, React/TanStack dedupe, error logger, sandbox detection.
//
// Deploy target: Vercel. O preset do Nitro é lido de NITRO_PRESET.
// A Vercel define a env `VERCEL=1` automaticamente durante o build,
// então quando estamos rodando na Vercel forçamos o preset "vercel".
// No preview do Lovable/local o preset default (cloudflare) continua sendo usado.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

if (process.env.VERCEL && !process.env.NITRO_PRESET) {
  process.env.NITRO_PRESET = "vercel";
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
