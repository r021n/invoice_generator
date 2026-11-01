import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  base: '/invoice_generator/',
  plugins: [tailwindcss(), svelte()],
  server: {
    host: true,
  },
});
