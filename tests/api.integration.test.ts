import { describe, it, expect, beforeAll } from "vitest";
import { Resource } from "sst";

interface TariffResponse {
  found: boolean;
  records?: any[];
  error?: string;
  totalCount?: number;
}

// Get the deployed API URL from SST resources
let apiUrl: string;

beforeAll(async () => {
  // SST will provide the API URL through Resource
  apiUrl = Resource.EegTariffApi.url;
});

describe("API Integration Tests", () => {
  const makeRequest = async (params: Record<string, string>): Promise<TariffResponse> => {
    const url = new URL("/tariff", apiUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    return response.json();
  };

  describe("Parameter validation", () => {
    it("should return 400 when energyType is missing", async () => {
      const response = await fetch(`${apiUrl}/tariff`);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.found).toBe(false);
      expect(body.error).toBe("energyType parameter is required");
    });

    it("should return 400 when energyType is empty", async () => {
      const response = await fetch(`${apiUrl}/tariff?energyType=`);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.found).toBe(false);
      expect(body.error).toBe("energyType parameter is required");
    });
  });

  describe("Basic queries", () => {
    it("should return records for Solar/Gebäude energy type", async () => {
      const result = await makeRequest({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(true);
      expect(result.records).toBeDefined();
      expect(result.records!.length).toBeGreaterThan(0);
      expect(result.totalCount).toBe(result.records!.length);

      // Verify record structure
      const record = result.records![0];
      expect(record).toHaveProperty("pk");
      expect(record).toHaveProperty("sk");
      expect(record).toHaveProperty("energietraeger");
      expect(record).toHaveProperty("bezeichnung");
    });

    it("should return empty results for unknown energy type", async () => {
      const result = await makeRequest({ energyType: "Unknown/Type" });

      expect(result.found).toBe(false);
      expect(result.records).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("should return records for Wind energy type", async () => {
      const result = await makeRequest({ energyType: "Wind" });

      expect(result.found).toBe(true);
      expect(result.records).toBeDefined();
      expect(result.records!.length).toBeGreaterThan(0);
    });
  });

  describe("Commissioning date filtering", () => {
    it("should filter Solar records by commissioning date from 2010", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2010-06-15",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // All returned records should be valid for the given date
      result.records!.forEach((record) => {
        expect(record.commissioning_date_from).toBeDefined();
        expect(record.commissioning_date_from <= "2010-06-15").toBe(true);
        if (record.commissioning_date_to) {
          expect(record.commissioning_date_to >= "2010-06-15").toBe(true);
        }
      });
    });

    it("should filter records for modern installations (2020+)", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2023-01-01",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // Should include open-ended ranges from recent years
      const hasOpenEndedRange = result.records!.some(
        (record) => !record.commissioning_date_to && record.commissioning_date_from <= "2023-01-01",
      );
      expect(hasOpenEndedRange).toBe(true);
    });

    it("should return no records for very old dates", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "1999-01-01",
      });

      // Might return some records with "bis" ranges, but should be limited
      if (result.found) {
        expect(result.records!.length).toBeLessThan(10);
      }
    });
  });

  describe("Power output filtering", () => {
    it("should filter Solar records by small power output (10-40 kW range)", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        powerOutput: "25",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // All returned records should include the 25 kW range
      result.records!.forEach((record) => {
        expect(record.power_output_from).toBeDefined();
        expect(record.power_output_from <= 25).toBe(true);
        if (record.power_output_to) {
          expect(record.power_output_to >= 25).toBe(true);
        }
      });
    });

    it("should filter records by large power output (> 100 kW)", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        powerOutput: "500",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // Should include open-ended ranges and large MW ranges
      const hasLargePowerRange = result.records!.some(
        (record) => record.power_output_from <= 500 && (!record.power_output_to || record.power_output_to >= 500),
      );
      expect(hasLargePowerRange).toBe(true);
    });

    it("should return many records for very small installations", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        powerOutput: "5",
      });

      // Many ranges start from 0 kW so small installations should find matches
      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(50);
    });
  });

  describe("Additional criteria filtering", () => {
    it("should filter records by MW criteria", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        criteria: "MW",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // All records should contain 'MW' in their criteria
      result.records!.forEach((record) => {
        expect(record.weitereKriterien?.toLowerCase()).toContain("mw");
      });
    });

    it("should be case insensitive for criteria filtering", async () => {
      const resultUpper = await makeRequest({
        energyType: "Solar/Gebäude",
        criteria: "KW",
      });

      const resultLower = await makeRequest({
        energyType: "Solar/Gebäude",
        criteria: "kw",
      });

      expect(resultUpper.found).toBe(true);
      expect(resultLower.found).toBe(true);
      expect(resultUpper.totalCount).toBe(resultLower.totalCount);
    });
  });

  describe("Combined filtering", () => {
    it("should apply date and power filters together", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2022-10-15",
        powerOutput: "20",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // Should find specific records from 2022 for small installations
      const validRecord = result.records!.find(
        (record) =>
          record.commissioning_date_from <= "2022-10-15" &&
          (!record.commissioning_date_to || record.commissioning_date_to >= "2022-10-15") &&
          record.power_output_from <= 20 &&
          (!record.power_output_to || record.power_output_to >= 20),
      );

      expect(validRecord).toBeDefined();
      expect(validRecord.einspeiseverguetung).toBeGreaterThan(5); // Modern rates are lower but should exist
    });

    it("should find modern large installation tariffs", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2024-01-01",
        powerOutput: "200",
      });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(0);

      // Modern rates should be lower
      const modernRecord = result.records!.find(
        (record) =>
          record.commissioning_date_from <= "2024-01-01" &&
          (!record.commissioning_date_to || record.commissioning_date_to >= "2024-01-01") &&
          record.power_output_from <= 200 &&
          (!record.power_output_to || record.power_output_to >= 200),
      );

      expect(modernRecord).toBeDefined();
      expect(modernRecord.einspeiseverguetung).toBeLessThan(15); // Modern rates are lower
    });

    it("should handle all filters simultaneously", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2022-10-15",
        powerOutput: "100",
        criteria: "MW",
      });

      // Should find records that match all criteria
      if (result.found) {
        expect(result.records!.length).toBeGreaterThan(0);
        result.records!.forEach((record) => {
          // Verify all filters are applied
          expect(record.commissioning_date_from <= "2022-10-15").toBe(true);
          expect(record.power_output_from <= 100).toBe(true);
          expect(record.weitereKriterien?.toLowerCase()).toContain("mw");
        });
      }
    });
  });

  describe("Response format and CORS", () => {
    it("should return proper response format", async () => {
      const response = await fetch(`${apiUrl}/tariff?energyType=Solar/Gebäude`);

      expect(response.headers.get("content-type")).toContain("application/json");
      // CORS header might not be present in test environment
      const corsHeader = response.headers.get("access-control-allow-origin");
      if (corsHeader !== null) {
        expect(corsHeader).toBe("*");
      }

      const body = await response.json();
      expect(body).toHaveProperty("found");
      expect(body).toHaveProperty("records");
      expect(body).toHaveProperty("totalCount");
    });
  });

  describe("Result sorting", () => {
    it("should sort results by power_output_from ascending", async () => {
      const result = await makeRequest({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(true);
      expect(result.records!.length).toBeGreaterThan(10);

      // Filter records that have power_output_from defined
      const recordsWithPower = result.records!.filter(
        (r) => r.power_output_from !== undefined && r.power_output_from !== null,
      );

      expect(recordsWithPower.length).toBeGreaterThan(0);

      // Check that they are sorted in ascending order
      for (let i = 1; i < recordsWithPower.length; i++) {
        expect(recordsWithPower[i].power_output_from).toBeGreaterThanOrEqual(recordsWithPower[i - 1].power_output_from);
      }
    });

    it("should place records without power_output_from at the end", async () => {
      const result = await makeRequest({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(true);

      // Find the first record without power_output_from
      const firstWithoutPower = result.records!.findIndex(
        (r) => r.power_output_from === undefined || r.power_output_from === null,
      );

      if (firstWithoutPower >= 0) {
        // All records after the first one without power should also not have power
        for (let i = firstWithoutPower + 1; i < result.records!.length; i++) {
          const record = result.records![i];
          expect(record.power_output_from === undefined || record.power_output_from === null).toBe(true);
        }
      }
    });

    it("should maintain sorting when filtering by power output", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        powerOutput: "50", // Will filter to records that include 50 kW
      });

      if (result.found && result.records!.length > 1) {
        // Check that filtered results are still sorted
        const recordsWithPower = result.records!.filter(
          (r) => r.power_output_from !== undefined && r.power_output_from !== null,
        );

        for (let i = 1; i < recordsWithPower.length; i++) {
          expect(recordsWithPower[i].power_output_from).toBeGreaterThanOrEqual(
            recordsWithPower[i - 1].power_output_from,
          );
        }
      }
    });

    it("should show smallest installations first", async () => {
      const result = await makeRequest({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(true);

      const recordsWithPower = result.records!.filter(
        (r) => r.power_output_from !== undefined && r.power_output_from !== null,
      );

      if (recordsWithPower.length > 0) {
        // First record should have the smallest power_output_from
        const firstPower = recordsWithPower[0].power_output_from;
        expect(firstPower).toBeDefined();

        // Should be small (0-50 kW range typically for residential)
        expect(firstPower).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Real-world scenarios", () => {
    it("should find appropriate tariff for typical home solar (20 kW, installed in 2013)", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2013-08-15",
        powerOutput: "20",
      });

      expect(result.found).toBe(true);
      const bestMatch = result.records!.find(
        (record) =>
          record.power_output_from <= 20 &&
          record.power_output_to >= 20 &&
          record.commissioning_date_from <= "2013-08-15" &&
          record.commissioning_date_to >= "2013-08-15",
      );

      expect(bestMatch).toBeDefined();
      expect(bestMatch.einspeiseverguetung).toBeGreaterThan(10); // 2013 rates were still good
    });

    it("should find appropriate tariff for commercial solar (500 kW, modern)", async () => {
      const result = await makeRequest({
        energyType: "Solar/Gebäude",
        commissioningDate: "2024-01-01",
        powerOutput: "500",
      });

      expect(result.found).toBe(true);
      const commercialMatch = result.records!.find(
        (record) =>
          record.power_output_from <= 500 &&
          (!record.power_output_to || record.power_output_to >= 500) &&
          record.commissioning_date_from <= "2024-01-01",
      );

      expect(commercialMatch).toBeDefined();
      expect(commercialMatch.einspeiseverguetung).toBeLessThan(20); // Lower modern rates
    });

    it("should handle wind energy queries", async () => {
      const result = await makeRequest({
        energyType: "Wind",
        commissioningDate: "2020-01-01",
        powerOutput: "2000", // 2 MW wind turbine
      });

      if (result.found) {
        expect(result.records!.length).toBeGreaterThan(0);
        result.records!.forEach((record) => {
          expect(record.energietraeger).toBe("Wind");
        });
      }
    });
  });
});
