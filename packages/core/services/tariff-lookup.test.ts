import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EegTariffRecord } from "../types";

// Mock the AWS SDK
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      send: mockSend,
    })),
  },
  QueryCommand: vi.fn((params) => params),
}));

// Mock SST Resource
vi.mock("sst", () => ({
  Resource: {
    EegTariffTable: {
      name: "test-tariff-table",
    },
  },
}));

// Import after mocks are set up
const { lookupTariffs } = await import("./tariff-lookup");

describe("tariff-lookup service", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  describe("Parameter validation", () => {
    it("should return error when energyType is missing", async () => {
      const result = await lookupTariffs({ energyType: "" });

      expect(result.found).toBe(false);
      expect(result.records).toHaveLength(0);
      expect(result.error).toBe("energyType parameter is required");
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should proceed with only energyType provided", async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await lookupTariffs({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(false);
      expect(result.records).toHaveLength(0);
      expect(result.error).toBeUndefined();
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("DynamoDB query", () => {
    it("should query DynamoDB with correct energy type", async () => {
      mockSend.mockResolvedValue({ Items: [] });

      await lookupTariffs({ energyType: "Solar/Gebäude" });

      expect(mockSend).toHaveBeenCalledWith({
        TableName: "test-tariff-table",
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": "Solar/Gebäude",
        },
      });
    });

    it("should handle DynamoDB errors gracefully", async () => {
      mockSend.mockRejectedValue(new Error("DynamoDB error"));

      const result = await lookupTariffs({ energyType: "Solar/Gebäude" });

      expect(result.found).toBe(false);
      expect(result.records).toHaveLength(0);
      expect(result.error).toBe("Internal server error");
    });
  });

  describe("Commissioning date filtering", () => {
    const mockRecords: EegTariffRecord[] = [
      {
        pk: "Solar/Gebäude",
        sk: "record1",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Test 1",
        inbetriebnahme: "01.01.2020 bis 31.12.2021",
        commissioning_date_from: "2020-01-01",
        commissioning_date_to: "2021-12-31",
        power_output_from: 0,
        power_output_to: 10,
        einspeiseverguetung: 10.5,
        anzulegender_wert: 10.5,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "record2",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Test 2",
        inbetriebnahme: "ab 01.01.2022",
        commissioning_date_from: "2022-01-01",
        commissioning_date_to: undefined,
        power_output_from: 0,
        power_output_to: 10,
        einspeiseverguetung: 8.5,
        anzulegender_wert: 8.5,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
    ];

    it("should filter records by commissioning date within range", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        commissioningDate: "2020-06-15",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("record1");
    });

    it("should include records with open-ended date ranges", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        commissioningDate: "2023-01-01",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("record2");
    });

    it("should exclude records before their start date", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        commissioningDate: "2019-01-01",
      });

      expect(result.found).toBe(false);
      expect(result.records).toHaveLength(0);
    });

    it("should exclude records after their end date", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        commissioningDate: "2025-01-01",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("record2"); // Has no end date
    });
  });

  describe("Power output filtering", () => {
    const mockRecords: EegTariffRecord[] = [
      {
        pk: "Solar/Gebäude",
        sk: "small",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Small",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 0,
        power_output_to: 10,
        einspeiseverguetung: 12,
        anzulegender_wert: 12,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "medium",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Medium",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 10,
        power_output_to: 40,
        einspeiseverguetung: 10,
        anzulegender_wert: 10,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "large",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Large",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 10,
        power_output_to: undefined,
        einspeiseverguetung: 8,
        anzulegender_wert: 8,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
    ];

    it("should filter records by power output within range", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        powerOutput: "25",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(2);
      expect(result.records.map((r) => r.sk)).toContain("medium");
      expect(result.records.map((r) => r.sk)).toContain("large");
    });

    it("should include records with open-ended power ranges", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        powerOutput: "500",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("large");
    });

    it("should handle small power outputs", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        powerOutput: "5",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1); // Only small range (0-10) includes 5 kW
      expect(result.records[0].sk).toBe("small");
    });
  });

  describe("Criteria filtering", () => {
    const mockRecords: EegTariffRecord[] = [
      {
        pk: "Solar/Gebäude",
        sk: "record1",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Test 1",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 0,
        weitereKriterien: "ab 100 kW bis 1 MW",
        einspeiseverguetung: 10,
        anzulegender_wert: 10,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "record2",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Test 2",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 0,
        weitereKriterien: "Sonstige Anlagen",
        einspeiseverguetung: 8,
        anzulegender_wert: 8,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
    ];

    it("should filter by criteria case-insensitively", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const resultUpper = await lookupTariffs({
        energyType: "Solar/Gebäude",
        criteria: "MW",
      });

      expect(resultUpper.found).toBe(true);
      expect(resultUpper.records).toHaveLength(1);
      expect(resultUpper.records[0].sk).toBe("record1");
    });

    it("should handle partial matches", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        criteria: "Sonstige",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("record2");
    });
  });

  describe("Sorting", () => {
    const mockRecords: EegTariffRecord[] = [
      {
        pk: "Solar/Gebäude",
        sk: "large",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Large",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 100,
        einspeiseverguetung: 8,
        anzulegender_wert: 8,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "small",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Small",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 0,
        einspeiseverguetung: 12,
        anzulegender_wert: 12,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "medium",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Medium",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 40,
        einspeiseverguetung: 10,
        anzulegender_wert: 10,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
    ];

    it("should sort records by power_output_from ascending", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
      });

      expect(result.found).toBe(true);
      expect(result.records[0].sk).toBe("small");
      expect(result.records[1].sk).toBe("medium");
      expect(result.records[2].sk).toBe("large");
    });

    it("should place records without power_output_from at the end", async () => {
      const recordsWithUndefined: EegTariffRecord[] = [
        ...mockRecords,
        {
          pk: "Solar/Gebäude",
          sk: "no-power",
          energietraeger: "Solar/Gebäude",
          bezeichnung: "No Power",
          inbetriebnahme: "ab 01.01.2020",
          commissioning_date_from: "2020-01-01",
          power_output_from: undefined,
          einspeiseverguetung: 10,
          anzulegender_wert: 10,
          ausfallverguetung: 0,
          mieterstromzuschlag: 0,
        },
      ];

      mockSend.mockResolvedValue({ Items: recordsWithUndefined });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
      });

      expect(result.found).toBe(true);
      expect(result.records[result.records.length - 1].sk).toBe("no-power");
    });
  });

  describe("Combined filtering", () => {
    const mockRecords: EegTariffRecord[] = [
      {
        pk: "Solar/Gebäude",
        sk: "match",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Perfect Match",
        inbetriebnahme: "01.01.2020 bis 31.12.2025",
        commissioning_date_from: "2020-01-01",
        commissioning_date_to: "2025-12-31",
        power_output_from: 10,
        power_output_to: 40,
        weitereKriterien: "MW range",
        einspeiseverguetung: 10,
        anzulegender_wert: 10,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "wrong-date",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Wrong Date",
        inbetriebnahme: "ab 01.01.2026",
        commissioning_date_from: "2026-01-01",
        power_output_from: 10,
        power_output_to: 40,
        weitereKriterien: "MW range",
        einspeiseverguetung: 9,
        anzulegender_wert: 9,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "wrong-power",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Wrong Power",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 100,
        power_output_to: 200,
        weitereKriterien: "MW range",
        einspeiseverguetung: 8,
        anzulegender_wert: 8,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
      {
        pk: "Solar/Gebäude",
        sk: "wrong-criteria",
        energietraeger: "Solar/Gebäude",
        bezeichnung: "Wrong Criteria",
        inbetriebnahme: "ab 01.01.2020",
        commissioning_date_from: "2020-01-01",
        power_output_from: 10,
        power_output_to: 40,
        weitereKriterien: "Other",
        einspeiseverguetung: 11,
        anzulegender_wert: 11,
        ausfallverguetung: 0,
        mieterstromzuschlag: 0,
      },
    ];

    it("should apply all filters simultaneously", async () => {
      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
        commissioningDate: "2022-06-15",
        powerOutput: "25",
        criteria: "MW",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].sk).toBe("match");
    });
  });

  describe("Response format", () => {
    it("should return found: false when no records match", async () => {
      mockSend.mockResolvedValue({ Items: [] });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
      });

      expect(result).toEqual({
        found: false,
        records: [],
        totalCount: 0,
      });
    });

    it("should return found: true with correct totalCount", async () => {
      const mockRecords: EegTariffRecord[] = [
        {
          pk: "Solar/Gebäude",
          sk: "record1",
          energietraeger: "Solar/Gebäude",
          bezeichnung: "Test 1",
          inbetriebnahme: "ab 01.01.2020",
          commissioning_date_from: "2020-01-01",
          power_output_from: 0,
          einspeiseverguetung: 10,
          anzulegender_wert: 10,
          ausfallverguetung: 0,
          mieterstromzuschlag: 0,
        },
      ];

      mockSend.mockResolvedValue({ Items: mockRecords });

      const result = await lookupTariffs({
        energyType: "Solar/Gebäude",
      });

      expect(result.found).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.totalCount).toBe(1);
    });
  });
});
