import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import type { EpilotWebhookPayload, EpilotCallbackPayload, EegTariffRecord } from "../../core/types";
import { getClient } from "@epilot/entity-client";
import { lookupTariffs } from "../../core/services/tariff-lookup";

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

    // Look up tariffs using the shared service
    const tariffResult = await lookupTariffs({
      energyType: energyType || "",
      commissioningDate,
      // we fetch all tariffs (customer request)
      powerOutput: undefined, 
    });

    if (tariffResult.error) {
      console.error("Tariff lookup error:", tariffResult.error);
    }

    const tariffs: EegTariffRecord[] = tariffResult.records || [];

    console.log(`Found ${tariffs.length} tariffs`, { energyType, commissioningDate, powerOutput, tariffs });
    
    // Initialize epilot client
    const client = getClient();
    client.defaults.headers.common["Authorization"] = `Bearer ${epilotToken}`;

    // Update entity with tariff results
    const updateData: any = {
      processed_at: new Date().toISOString(),
      mieterstromzuschlag_ctkwh: null,
      ausfall_verguetung_in_ctkwh: null,
      anzulegender_wert_in_ctkwh: null,
      einspeise_verguetung_in_ctkwh: null,
    };

    // Add tariff data if found
    if (tariffs.length > 0) {
      // Find the best matching tariff based on power output
      let bestTariff = tariffs[0]; // Default to first (smallest power range)

      if (powerOutput) {
        const power = parseFloat(powerOutput);
        // Find tariff that matches the power range (tariffs are sorted by power_output_from ascending)
        const matchingTariff = tariffs.find((tariff) => {
          if (tariff.power_output_from === undefined) return false;
          // Check if the power falls within this tariff's range
          if (power < tariff.power_output_from) return false;
          if (tariff.power_output_to && power > tariff.power_output_to) return false;
          return true;
        });

        if (matchingTariff) {
          bestTariff = matchingTariff;
        }
      }

      updateData.mieterstromzuschlag_ctkwh = bestTariff.mieterstromzuschlag ?? null;
      updateData.ausfall_verguetung_in_ctkwh = bestTariff.ausfallverguetung ?? null;
      updateData.anzulegender_wert_in_ctkwh = bestTariff.anzulegender_wert ?? null;
      updateData.einspeise_verguetung_in_ctkwh = bestTariff.einspeiseverguetung ?? null;
      updateData.bezeichnung = bestTariff.bezeichnung ?? entity.bezeichnung ?? null;
      updateData.eeg_feed_in_tariffs = tariffs; // Store all found tariffs for reference
    }

    const bezeichnung = tariffs.length > 0 ? tariffs[0].bezeichnung : 'unbekannte Anlage';

    const activityRes = await client.createActivity(null, {
      type: "EEGFeedInTariffLookup",
      message: bezeichnung ? `Vergütungen für {{payload.bezeichnung}} wurden von der API abgerufen` : "Vergütungen wurden von der API abgerufen",
      title: "EEG Vergütungsdaten abgerufen",
      payload: {
        input: {
          energyType,
          commissioningDate,
          powerOutput,
        },
        output: {
          payload: updateData,
          bezeichnung,
          tariffs,
        }
      },
    });

    await client.patchEntity(
      { slug: payload.data.entity._schema, id: payload.data.entity._id, activity_id: activityRes.data._id },
      updateData,
    );

    // Call back to epilot to resume the automation
    if (payload.data.callback_post_url && payload.data.resume_token) {
      await resumeEpilotExecution(payload.data.callback_post_url, payload.data.resume_token);
    }

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
      throw new Error(`Callback failed: ${response.status} ${response.statusText} ${JSON.stringify(await response.json())}`);
    }

    console.log("Epilot execution resumed successfully");
  } catch (error) {
    console.error("Failed to resume epilot execution:", JSON.stringify(error), error);


    throw error;
  }
}
