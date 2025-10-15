import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import type { TariffResponse } from "../../core/types";
import { lookupTariffs } from "../../core/services/tariff-lookup";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Parse query parameters
  const queryParams = event.queryStringParameters || {};
  const { energyType, commissioningDate, powerOutput, criteria } = queryParams;

  // Lookup tariffs using the shared service
  const result = await lookupTariffs({
    energyType: energyType || "",
    commissioningDate,
    powerOutput,
    criteria,
  });

  // Handle validation errors
  if (result.error) {
    return {
      statusCode: result.error.includes("required") ? 400 : 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        found: false,
        error: result.error,
      } as TariffResponse),
    };
  }

  // Return successful response
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      found: result.found,
      records: result.records,
      totalCount: result.totalCount,
    } as TariffResponse),
  };
};
