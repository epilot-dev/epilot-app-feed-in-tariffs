import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { EpilotWebhookPayload, EpilotCallbackPayload, EegTariffRecord } from "../../core/types";
import { getClient } from "@epilot/entity-client";
import { handler as apiHandler } from "../api/api-handler";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "No body provided" }),
      };
    }

    // Extract epilot token from headers
    const epilotToken = event.headers["x-epilot-token"];
    if (!epilotToken) {
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, error: "Missing x-epilot-token header" }),
      };
    }

    // Parse the epilot webhook payload
    const payload: EpilotWebhookPayload = JSON.parse(event.body);

    console.log("Entity ID:", payload.data.entity._id);
    console.log("Epilot token available:", !!epilotToken);

    // Extract tariff lookup parameters from entity
    const entity = payload.data.entity;
    const energyType = entity.energietraeger;
    const commissioningDate = entity.inbetriebnahme;
    const powerOutput = entity.leistung_kw;

    console.log("Tariff lookup params:", { energyType, commissioningDate, powerOutput });

    // Look up tariffs using existing API handler logic
    const tariffResponse = await apiHandler({
      queryStringParameters: {
        energyType,
        commissioningDate,
        powerOutput,
      },
    } as any);
    
    const responseBody = JSON.parse(tariffResponse.body || '{}');
    const tariffs: EegTariffRecord[] = responseBody.records || [];
    
    // Initialize epilot client
    const client = getClient();
    client.defaults.headers.common["Authorization"] = `Bearer ${epilotToken}`;

    // Update entity with tariff results
    const updateData: any = {
      processed_at: new Date().toISOString(),
    };

    // Add tariff data if found
    if (tariffs.length > 0) {
      const bestTariff = tariffs[0]; // Already sorted by power ascending
      updateData.mieterstromzuschlag_ctkwh = bestTariff.mieterstromzuschlag;
      updateData.ausfall_verguetung_in_ctkwh = bestTariff.ausfallverguetung;
      updateData.anzulegender_wert_in_ctkwh = bestTariff.anzulegender_wert;
      updateData.einspeise_verguetung_in_ctkwh = bestTariff.einspeiseverguetung;
    }

    await client.patchEntity(
      { slug: payload.data.entity._schema, id: payload.data.entity._id },
      updateData,
    );

    // Call back to epilot to resume the automation
    await resumeEpilotExecution(payload.data.callback_post_url, payload.data.resume_token);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("Error processing webhook:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
    };
  }
};

async function resumeEpilotExecution(callbackUrl: string, resumeToken: string): Promise<void> {
  try {
    const callbackPayload: EpilotCallbackPayload = {
      resume_token: resumeToken,
    };

    console.log("Calling epilot callback:", callbackUrl);
    console.log("Resume token:", resumeToken);

    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callbackPayload),
    });

    if (!response.ok) {
      throw new Error(`Callback failed: ${response.status} ${response.statusText}`);
    }

    console.log("Epilot execution resumed successfully");
  } catch (error) {
    console.error("Failed to resume epilot execution:", error);
    throw error;
  }
}
