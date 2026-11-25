import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig(({ isPreview, mode }) => {
  const isStaging = isPreview || mode === "development" || mode === "preview" || mode === "staging";

  return {
    worker: defineWorker({
      name: isStaging ? "masidy-store-preview" : "masidy-store1",
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-11-25",
      compatibilityFlags: ["nodejs_compat"],
      workersDev: isStaging,
      previewUrls: isStaging,
      observability: {
        enabled: true,
        logs: { enabled: true, invocationLogs: true },
        traces: { enabled: true },
      },
      assets: {
        htmlHandling: "none",
        notFoundHandling: "none",
        runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
      },
      env: {
        DB: bindings.d1(
          isStaging
            ? {
                id: "d9851218-a17e-4ec1-ad85-d3d725447513",
                name: "masidy-staging-db",
              }
            : {
                id: "f05b7c92-b9c5-4beb-ba0a-c4f5e798cb34",
                name: "masidy-store-production",
                jurisdiction: "eu",
              },
        ),
        ASSETS: bindings.assets(),
        IMAGES: bindings.images(),
        VINEXT_KV_CACHE: bindings.kv({
          id: "9a4a24c8eb7144c88cdc89c7ef8c8924",
        }),
        PUBLIC_SITE_URL: bindings.text(
          isStaging ? "http://localhost:3001" : "https://www.masidy.store",
        ),
        USE_PAYMENT_LINKS: bindings.text(String(false)),
        PRINTFUL_API_TOKEN: bindings.secret(),
        PRINTFUL_STORE_ID: bindings.text(""),
        STRIPE_LIVE_SECRET_KEY: bindings.secret(),
        STRIPE_SECRET_KEY: bindings.secret(),
        STRIPE_WEBHOOK_SECRET: bindings.secret(),
        RESEND_API_KEY: bindings.secret(),
        ADMIN_SETUP_TOKEN: bindings.secret(),
      },
    }),
  };
});
