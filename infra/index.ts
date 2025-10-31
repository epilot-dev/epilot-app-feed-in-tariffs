// DynamoDB table for EEG tariff data
const table = new sst.aws.Dynamo("EegTariffTable", {
  fields: {
    pk: "string",
    sk: "string",
  },
  primaryIndex: { hashKey: "pk", rangeKey: "sk" },
});

// API Gateway with Lambda function
const api = new sst.aws.ApiGatewayV2("EegTariffApi", {
  cors: {
    allowCredentials: false,
    allowHeaders: ["content-type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowOrigins: ["*"],
  },
  domain: $app.stage === "prod" ? {
    name: "app-feed-in-tariffs.sls.epilot.io",
  } : undefined,
});

api.route("GET /tariff", {
  handler: "packages/functions/api/api-handler.handler",
  link: [table],
});

api.route("POST /action", {
  handler: "packages/functions/webhook/webhook-handler.handler",
  link: [table],
});

export const outputs = {
  api: api.url,
  table: table.name,
};
