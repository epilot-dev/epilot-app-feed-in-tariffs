import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { populateData } from "./populate-data";

const BASE_URL =
  "https://www.netztransparenz.de/xspproxy/api/staticfiles/ntp-relaunch/dokumente/erneuerbare%20energien%20und%20umlagen/abwicklungshinweise%20und%20umsetzungshilfen";

const DATA_DIR = path.join(__dirname, "../excel-data");

const fetchLatestFileUrl = async (): Promise<{ url: string; filename: string } | null> => {
  // Fetch the EEG page to find the latest file link
  const pageUrl =
    "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Abwicklungshinweise-und-Umsetzungshilfen/EEG";
  const response = await fetch(pageUrl);
  const html = await response.text();

  // Find all xlsx download links matching the tariff file pattern
  const linkPattern = /href="([^"]*eeg-verguetungskategorien[^"]*\.xlsx)"/gi;
  const matches = [...html.matchAll(linkPattern)];

  if (matches.length === 0) {
    console.error("No tariff file links found on page");
    return null;
  }

  // Extract date from filename pattern: eeg-verguetungskategorien_eeg_YYYY_YYYYMMDD.xlsx
  const dated = matches
    .map((m) => {
      const url = m[1].startsWith("http") ? m[1] : `https://www.netztransparenz.de${m[1]}`;
      const filenameMatch = url.match(/eeg-verguetungskategorien_eeg_\d{4}_(\d{8})\.xlsx/i);
      const dateStr = filenameMatch?.[1];
      return { url, dateStr };
    })
    .filter((d) => d.dateStr);

  // Sort by date descending and pick the latest
  dated.sort((a, b) => (b.dateStr ?? "").localeCompare(a.dateStr ?? ""));

  const latest = dated[0];
  if (!latest) return null;

  const filename = decodeURIComponent(latest.url.split("/").pop() ?? "");
  return { url: latest.url, filename };
};

const downloadFile = async (url: string, destPath: string) => {
  console.log(`Downloading ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved to ${destPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
};

const verifyExcel = (filePath: string): boolean => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = "EEG-Vergütungen und vNNE";
    if (!workbook.Sheets[sheetName]) {
      console.error(`Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(", ")}`);
      return false;
    }
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
    console.log(`Verified: ${data.length} rows in "${sheetName}"`);
    return data.length > 10;
  } catch (e) {
    console.error("Failed to read Excel file:", e);
    return false;
  }
};

const main = async () => {
  const skipPopulate = process.argv.includes("--download-only");

  console.log("Checking for latest EEG tariff data...");
  const latest = await fetchLatestFileUrl();

  if (!latest) {
    console.error("Could not determine latest file URL");
    process.exit(1);
  }

  console.log(`Latest file: ${latest.filename}`);

  const destPath = path.join(DATA_DIR, latest.filename);

  // Check if we already have this file
  if (fs.existsSync(destPath)) {
    console.log("File already exists locally. Skipping download.");
  } else {
    await downloadFile(latest.url, destPath);
  }

  // Verify the file
  if (!verifyExcel(destPath)) {
    console.error("Excel verification failed");
    process.exit(1);
  }

  if (skipPopulate) {
    console.log("Skipping DynamoDB population (--download-only)");
    return;
  }

  // Update the populate script's file reference and run it
  console.log("Populating DynamoDB with latest data...");
  await populateData(destPath);

  console.log("Done!");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
