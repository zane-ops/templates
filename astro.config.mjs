// @ts-check

import node from "@astrojs/node";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: node({
    mode: "standalone"
  }),
  devToolbar: {
    enabled: false
  },
  integrations: [
    starlight({
      title: "ZaneOps documentation",
      logo: {
        light: "./src/assets/ZaneOps-SYMBOL-BLACK.svg",
        dark: "./src/assets/ZaneOps-SYMBOL-WHITE.svg",
        replacesTitle: true
      },
      editLink: {
        baseUrl: "https://github.com/zane-ops/templates/edit/main/"
      },
      customCss: [
        "./src/assets/global.css",
        "./src/assets/fonts/font-face.css"
      ],
      social: [
        {
          label: "Github",
          icon: "github",
          href: "https://github.com/zane-ops/zane-ops"
        },
        {
          label: "Discord",
          icon: "discord",
          href: "https://zaneops.dev/discord"
        }
      ],
      components: {
        Footer: "./src/components/Footer.astro",
        Head: "./src/components/Head.astro"
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Example Guide", slug: "guides/example" }
          ]
        }
      ]
    })
  ],
  vite: {
    plugins: [tailwindcss()]
  }
});
