import * as XLSX from "xlsx";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import path from "path";
import { EegTariffRecord } from "../packages/core/types";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface DateRange {
  from: string; // ISO date string
  to?: string; // ISO date string, undefined means ongoing
}

interface PowerRange {
  from: number; // Power in kW
  to?: number; // Power in kW, undefined means no upper limit
}

// Parse German commissioning date strings into date ranges
function parseCommissioningDate(dateStr: string): DateRange | null {
  if (!dateStr) return null;

  const str = dateStr.toLowerCase().trim();

  // "Inbetriebnahme bis 2001" -> from beginning of time to end of 2001
  if (str.includes("bis")) {
    const yearMatch = str.match(/bis (\d{4})/);
    if (yearMatch) {
      return {
        from: "1900-01-01",
        to: `${yearMatch[1]}-12-31`,
      };
    }
  }

  // "Inbetriebnahme 2005" -> entire year 2005
  const singleYearMatch = str.match(/inbetriebnahme (\d{4})$/);
  if (singleYearMatch) {
    const year = singleYearMatch[1];
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }

  // "Inbetriebnahme 01-07/2004" -> January to July 2004
  const monthRangeMatch = str.match(/inbetriebnahme (\d{2})-(\d{2})\/(\d{4})/);
  if (monthRangeMatch) {
    const fromMonth = monthRangeMatch[1];
    const toMonth = monthRangeMatch[2];
    const year = monthRangeMatch[3];
    return {
      from: `${year}-${fromMonth}-01`,
      to: `${year}-${toMonth}-31`,
    };
  }

  // "Inbetriebnahme 08-12/2004" -> August to December 2004
  const monthRangeMatch2 = str.match(/inbetriebnahme (\d{2})-(\d{2})\/(\d{4})/);
  if (monthRangeMatch2) {
    const fromMonth = monthRangeMatch2[1];
    const toMonth = monthRangeMatch2[2];
    const year = monthRangeMatch2[3];
    return {
      from: `${year}-${fromMonth}-01`,
      to: `${year}-${toMonth}-31`,
    };
  }

  // "Inbetriebnahme ab 01/2017" -> from January 2017 onwards
  const fromDateMatch = str.match(/ab (\d{2})\/(\d{4})/);
  if (fromDateMatch) {
    const month = fromDateMatch[1];
    const year = fromDateMatch[2];
    return {
      from: `${year}-${month}-01`,
      // no 'to' date means ongoing
    };
  }

  // "Inbetriebnahme ab 25.07.2017" -> from specific date onwards
  const specificDateMatch = str.match(/ab (\d{2})\.(\d{2})\.(\d{4})/);
  if (specificDateMatch) {
    const day = specificDateMatch[1];
    const month = specificDateMatch[2];
    const year = specificDateMatch[3];
    return {
      from: `${year}-${month}-${day}`,
    };
  }

  // "Inbetriebnahme 04/2020" -> April 2020 (single month)
  const singleMonthMatch = str.match(/inbetriebnahme (\d{2})\/(\d{4})/);
  if (singleMonthMatch) {
    const month = singleMonthMatch[1];
    const year = singleMonthMatch[2];
    // Get the last day of the month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return {
      from: `${year}-${month}-01`,
      to: `${year}-${month}-${lastDay.toString().padStart(2, "0")}`,
    };
  }

  // "Modernisierung 2020" -> treat as entire year 2020 for modernization
  const modernizationYearMatch = str.match(/modernisierung (\d{4})$/);
  if (modernizationYearMatch) {
    const year = modernizationYearMatch[1];
    return {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    };
  }

  // "Modernisierung 01-07/2014" -> January to July 2014 for modernization
  const modernizationRangeMatch = str.match(/modernisierung (\d{2})-(\d{2})\/(\d{4})/);
  if (modernizationRangeMatch) {
    const fromMonth = modernizationRangeMatch[1];
    const toMonth = modernizationRangeMatch[2];
    const year = modernizationRangeMatch[3];
    return {
      from: `${year}-${fromMonth}-01`,
      to: `${year}-${toMonth}-31`,
    };
  }

  // "Inbetriebnahme 30.07. bis 31.12.2022" -> specific date range within same year
  const specificRangeMatch = str.match(/inbetriebnahme (\d{2})\.(\d{2})\. bis (\d{2})\.(\d{2})\.(\d{4})/);
  if (specificRangeMatch) {
    const fromDay = specificRangeMatch[1];
    const fromMonth = specificRangeMatch[2];
    const toDay = specificRangeMatch[3];
    const toMonth = specificRangeMatch[4];
    const year = specificRangeMatch[5];
    return {
      from: `${year}-${fromMonth}-${fromDay}`,
      to: `${year}-${toMonth}-${toDay}`,
    };
  }

  // "Inbetriebnahme 30.06. bis 31.12.2006" -> specific date range within same year (alternative format)
  const specificRange2Match = str.match(/inbetriebnahme (\d{2})\.(\d{2})\. bis (\d{2})\.(\d{2})\.(\d{4})/);
  if (specificRange2Match) {
    const fromDay = specificRange2Match[1];
    const fromMonth = specificRange2Match[2];
    const toDay = specificRange2Match[3];
    const toMonth = specificRange2Match[4];
    const year = specificRange2Match[5];
    return {
      from: `${year}-${fromMonth}-${fromDay}`,
      to: `${year}-${toMonth}-${toDay}`,
    };
  }

  // "Inbetriebnahme 01.01. - 15.05.2024" -> date range with dash separator
  const dashRangeMatch = str.match(/inbetriebnahme (\d{2})\.(\d{2})\. - (\d{2})\.(\d{2})\.(\d{4})/);
  if (dashRangeMatch) {
    const fromDay = dashRangeMatch[1];
    const fromMonth = dashRangeMatch[2];
    const toDay = dashRangeMatch[3];
    const toMonth = dashRangeMatch[4];
    const year = dashRangeMatch[5];
    return {
      from: `${year}-${fromMonth}-${fromDay}`,
      to: `${year}-${toMonth}-${toDay}`,
    };
  }

  // "Inbetriebnahme 25.07.2017 - 31.12.2020" -> date range across years
  const crossYearRangeMatch = str.match(/inbetriebnahme (\d{2})\.(\d{2})\.(\d{4}) - (\d{2})\.(\d{2})\.(\d{4})/);
  if (crossYearRangeMatch) {
    const fromDay = crossYearRangeMatch[1];
    const fromMonth = crossYearRangeMatch[2];
    const fromYear = crossYearRangeMatch[3];
    const toDay = crossYearRangeMatch[4];
    const toMonth = crossYearRangeMatch[5];
    const toYear = crossYearRangeMatch[6];
    return {
      from: `${fromYear}-${fromMonth}-${fromDay}`,
      to: `${toYear}-${toMonth}-${toDay}`,
    };
  }

  console.warn(`Could not parse commissioning date: ${dateStr}`);
  return null;
}

// Parse German power range strings into power ranges (normalized to kW)
function parsePowerRange(criteriaStr: string): PowerRange | null {
  if (!criteriaStr) return null;

  const str = criteriaStr.toLowerCase().trim();

  // "0-0,5 MW" -> 0 to 500 kW
  const mwRangeMatch = str.match(/(\d+(?:,\d+)?)-(\d+(?:,\d+)?)\s*mw/);
  if (mwRangeMatch) {
    const fromMW = parseFloat(mwRangeMatch[1].replace(",", "."));
    const toMW = parseFloat(mwRangeMatch[2].replace(",", "."));
    return {
      from: fromMW * 1000, // Convert MW to kW
      to: toMW * 1000,
    };
  }

  // "1 - 10 MW" -> 1000 to 10000 kW (MW range with spaces)
  const mwRangeSpaceMatch = str.match(/(\d+(?:,\d+)?)\s*-\s*(\d+(?:,\d+)?)\s*mw/);
  if (mwRangeSpaceMatch) {
    const fromMW = parseFloat(mwRangeSpaceMatch[1].replace(",", "."));
    const toMW = parseFloat(mwRangeSpaceMatch[2].replace(",", "."));
    return {
      from: fromMW * 1000, // Convert MW to kW
      to: toMW * 1000,
    };
  }

  // "10 - 40 kW" -> 10 to 40 kW
  const kwRangeMatch = str.match(/(\d+(?:,\d+)?)\s*-\s*(\d+(?:,\d+)?)\s*kw/);
  if (kwRangeMatch) {
    const fromKW = parseFloat(kwRangeMatch[1].replace(",", "."));
    const toKW = parseFloat(kwRangeMatch[2].replace(",", "."));
    return {
      from: fromKW,
      to: toKW,
    };
  }

  // "0-30 kW" -> 0 to 30 kW
  const kwRangeMatch2 = str.match(/(\d+)-(\d+)\s*kw/);
  if (kwRangeMatch2) {
    const fromKW = parseFloat(kwRangeMatch2[1]);
    const toKW = parseFloat(kwRangeMatch2[2]);
    return {
      from: fromKW,
      to: toKW,
    };
  }

  // "40 kW - 1 MW" -> 40 kW to 1000 kW (mixed units)
  const mixedRangeMatch = str.match(/(\d+(?:,\d+)?)\s*kw\s*-\s*(\d+(?:,\d+)?)\s*mw/);
  if (mixedRangeMatch) {
    const fromKW = parseFloat(mixedRangeMatch[1].replace(",", "."));
    const toMW = parseFloat(mixedRangeMatch[2].replace(",", "."));
    return {
      from: fromKW,
      to: toMW * 1000, // Convert MW to kW
    };
  }

  // "> 1 MW" -> from 1000 kW upwards
  const greaterMwMatch = str.match(/>\s*(\d+(?:,\d+)?)\s*mw/);
  if (greaterMwMatch) {
    const fromMW = parseFloat(greaterMwMatch[1].replace(",", "."));
    return {
      from: fromMW * 1000,
      // no 'to' means unlimited
    };
  }

  // "> 100 kW" -> from 100 kW upwards
  const greaterKwMatch = str.match(/>\s*(\d+(?:,\d+)?)\s*kw/);
  if (greaterKwMatch) {
    const fromKW = parseFloat(greaterKwMatch[1].replace(",", "."));
    return {
      from: fromKW,
    };
  }

  // "≤ 100 kW" or "<= 100 kW" -> up to 100 kW
  const lesserKwMatch = str.match(/[≤<=]\s*(\d+(?:,\d+)?)\s*kw/);
  if (lesserKwMatch) {
    const toKW = parseFloat(lesserKwMatch[1].replace(",", "."));
    return {
      from: 0,
      to: toKW,
    };
  }

  // "≤ 1 MW" or "<= 1 MW" -> up to 1000 kW
  const lesserMwMatch = str.match(/[≤<=]\s*(\d+(?:,\d+)?)\s*mw/);
  if (lesserMwMatch) {
    const toMW = parseFloat(lesserMwMatch[1].replace(",", "."));
    return {
      from: 0,
      to: toMW * 1000,
    };
  }

  // Single values are harder to parse without more context
  // "100 kW" could mean exactly 100 kW or up to 100 kW, need more examples

  return null; // Could not parse power range
}

// Check if a given power (in kW) falls within the power range
function isPowerInRange(powerKW: number, range: PowerRange): boolean {
  if (powerKW < range.from) return false;
  if (range.to && powerKW > range.to) return false;
  return true;
}

// Check if a given ISO date falls within the date range
function isDateInRange(isoDate: string, range: DateRange): boolean {
  if (isoDate < range.from) return false;
  if (range.to && isoDate > range.to) return false;
  return true;
}

async function populateData() {
  // Import SST resource to get table name
  const { Resource } = await import("sst");
  const tableName = Resource.EegTariffTable.name;

  // Read Excel file
  // Source: https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Abwicklungshinweise-und-Umsetzungshilfen/EEG
  const excelPath = path.join(__dirname, "../excel-data/eeg-verguetungskategorien_eeg_2026_20251212.xlsx");
  const workbook = XLSX.readFile(excelPath);
  const worksheet = workbook.Sheets["EEG-Vergütungen und vNNE"];

  // Convert to JSON
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const records: EegTariffRecord[] = [];

  // Process data rows (starting from row 5, index 4)
  for (let i = 4; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];

    // Skip empty rows or rows without category code
    if (!row || !row[0] || !row[0].toString().trim()) continue;

    const bezeichnung = row[0]?.toString().trim();
    const energietraeger = row[1]?.toString().trim();
    const inbetriebnahme = row[2]?.toString().trim();
    const weitereKriterien = row[3]?.toString().trim();
    const anteilige_zuordnung = row[4]?.toString().trim();
    const einspeiseverguetung = parseFloat(row[5]) || undefined;
    const anzulegender_wert = parseFloat(row[6]) || undefined;
    const ausfallverguetung = parseFloat(row[7]) || undefined;
    const mieterstromzuschlag = parseFloat(row[8]) || undefined;
    const aufnahmedatum = row[9]?.toString().trim();

    // Skip records with missing required keys
    if (!energietraeger || !bezeichnung) {
      console.warn(
        `Skipping record with missing keys: energietraeger="${energietraeger}", bezeichnung="${bezeichnung}"`,
      );
      continue;
    }

    // Parse commissioning date range
    const dateRange = parseCommissioningDate(inbetriebnahme);

    // Parse power range from additional criteria
    const powerRange = parsePowerRange(weitereKriterien);

    const record: EegTariffRecord = {
      pk: energietraeger, // Energy type as partition key
      sk: bezeichnung, // Category code as sort key
      bezeichnung,
      energietraeger,
      inbetriebnahme,
      weitereKriterien: weitereKriterien || undefined,
      anteilige_zuordnung: anteilige_zuordnung || undefined,
      einspeiseverguetung,
      anzulegender_wert,
      ausfallverguetung,
      mieterstromzuschlag,
      aufnahmedatum: aufnahmedatum || undefined,
      // Add parsed date range for filtering
      commissioning_date_from: dateRange?.from,
      commissioning_date_to: dateRange?.to,
      // Add parsed power range for filtering
      power_output_from: powerRange?.from,
      power_output_to: powerRange?.to,
    };

    records.push(record);
  }

  console.log(`Parsed ${records.length} records`);

  // Batch write to DynamoDB (25 items at a time)
  const batchSize = 25;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch.map((record) => ({
          PutRequest: { Item: record },
        })),
      },
    });

    try {
      await docClient.send(command);
      console.log(`Wrote batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);
    } catch (error) {
      console.error(`Error writing batch starting at ${i}:`, error);
    }
  }

  console.log("Data population completed");
}

if (require.main === module) {
  populateData().catch(console.error);
}

export { populateData, parseCommissioningDate, isDateInRange, parsePowerRange, isPowerInRange };
