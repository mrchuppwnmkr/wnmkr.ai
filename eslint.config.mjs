import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A leading underscore marks a parameter that is deliberately part of the signature but not
      // yet used — e.g. recomputeEntitlement's clerkUserId, which is the seam the Stripe slice
      // fills in without touching any call site.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The live GitHub Pages site — not part of the Next.js app until the Vercel cutover.
    "index.html",
    "assets/**",
    "public/**",
  ]),
]);

export default eslintConfig;
