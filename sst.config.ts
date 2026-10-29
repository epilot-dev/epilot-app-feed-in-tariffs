/// <reference path="./.sst/platform/config.d.ts" />

const PRODUCTION_STAGES = ["production", "prod"];

export default $config({
  app(input) {
    const isProduction = PRODUCTION_STAGES.includes(input?.stage);
    return {
      name: "epilot-app-feed-in-tariffs",
      removal: isProduction ? "retain" : "remove",
      protect: isProduction,
      home: "aws",
    };
  },
  async run() {
    await import("./infra");
  },
});
