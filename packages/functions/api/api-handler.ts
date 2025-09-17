import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { TariffResponse, EegTariffRecord } from "../../core/types";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const { energyType, commissioningDate, powerOutput, criteria } = queryParams;

    if (!energyType) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          found: false,
          error: "energyType parameter is required",
        } as TariffResponse),
      };
    }

    // Query DynamoDB by energy type (pk)
    const command = new QueryCommand({
      TableName: Resource.EegTariffTable.name,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": energyType,
      },
    });

    const result = await docClient.send(command);
    let records = (result.Items as EegTariffRecord[]) || [];

    // Filter by commissioning date if provided (ISO date string)
    if (commissioningDate) {
      records = records.filter((record) => {
        if (!record.commissioning_date_from) return false;

        // Check if the provided date falls within the valid range
        if (commissioningDate < record.commissioning_date_from) return false;
        if (record.commissioning_date_to && commissioningDate > record.commissioning_date_to) return false;

        return true;
      });
    }

    // Filter by additional criteria
    if (criteria) {
      records = records.filter((record) => record.weitereKriterien?.toLowerCase().includes(criteria.toLowerCase()));
    }

    // Filter by power output (using parsed power ranges)
    if (powerOutput) {
      const power = parseFloat(powerOutput);
      records = records.filter((record) => {
        if (record.power_output_from === undefined) return false;

        // Check if the provided power falls within the valid range
        if (power < record.power_output_from) return false;
        if (record.power_output_to && power > record.power_output_to) return false;

        return true;
      });
    }

    // Sort by power_output_from ascending (smallest installations first)
    records.sort((a, b) => {
      const powerA = a.power_output_from ?? Infinity;
      const powerB = b.power_output_from ?? Infinity;
      return powerA - powerB;
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        found: records.length > 0,
        records,
        totalCount: records.length,
      } as TariffResponse),
    };
  } catch (error) {
    console.error("Error querying tariffs:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        found: false,
        error: "Internal server error",
      } as TariffResponse),
    };
  }
};
