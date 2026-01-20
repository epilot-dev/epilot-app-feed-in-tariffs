import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { EegTariffRecord } from "../types";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export interface TariffLookupParams {
  energyType: string;
  commissioningDate?: string;
  powerOutput?: string;
  criteria?: string;
  bezeichnung?: string;
}

export interface TariffLookupResult {
  found: boolean;
  records: EegTariffRecord[];
  totalCount: number;
  error?: string;
}

/**
 * Looks up EEG tariffs based on the provided parameters
 * @param params - The lookup parameters
 * @returns The tariff lookup result
 */
export const lookupTariffs = async (params: TariffLookupParams): Promise<TariffLookupResult> => {
  const { energyType, commissioningDate, powerOutput, criteria, bezeichnung } = params;

  if (!energyType) {
    return {
      found: false,
      records: [],
      totalCount: 0,
      error: "energyType parameter is required",
    };
  }

  try {
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

    console.log(`Queried ${records.length} records for energyType=${energyType}`);

    // Filter by commissioning date if provided (ISO date string)
    if (commissioningDate) {
      records = records.filter((record) => {
        if (!record.commissioning_date_from) return false;

        // Check if the provided date falls within the valid range
        if (commissioningDate < record.commissioning_date_from) return false;
        if (record.commissioning_date_to && commissioningDate > record.commissioning_date_to) return false;

        // Exclude open-ended tariffs (no commissioning_date_to) that are more than 1 year old
        if (!record.commissioning_date_to) {
          const recordDate = new Date(record.commissioning_date_from);
          const providedDate = new Date(commissioningDate);
          const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
          const timeDiff = providedDate.getTime() - recordDate.getTime();

          if (timeDiff > oneYearInMs) {
            return false;
          }
        }

        return true;
      });
    }

    // Filter by additional criteria
    if (criteria) {
      records = records.filter((record) => record.weitereKriterien?.toLowerCase().includes(criteria.toLowerCase()));
    }

    // Filter by bezeichnung (category designation/code)
    if (bezeichnung) {
      records = records.filter((record) => record.bezeichnung?.toLowerCase().includes(bezeichnung.toLowerCase()));
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
      found: records.length > 0,
      records,
      totalCount: records.length,
    };
  } catch (error) {
    console.error("Error querying tariffs:", error);
    return {
      found: false,
      records: [],
      totalCount: 0,
      error: "Internal server error",
    };
  }
};
