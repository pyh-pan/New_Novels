import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

const nextPluginWithMeta = {
  ...nextPlugin,
  meta: {
    name: "@next/eslint-plugin-next"
  }
};

export default [
  {
    ignores: ["node_modules/**", ".next/**", "next-env.d.ts"]
  },
  js.configs.recommended,
  {
    plugins: {
      "@next/next": nextPluginWithMeta
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules
    }
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off"
    }
  }
];
