// EEG tariff data structure based on Excel analysis
export interface EegTariffRecord {
  pk: string; // Will be energy type, e.g., "Solar/Gebäude"
  sk: string; // Will be category code, e.g., "SgK330------09"

  // lookup fields
  bezeichnung: string; // Category designation/code
  energietraeger: string; // Energy type
  inbetriebnahme: string; // Commissioning date/period (original text)
  weitereKriterien?: string; // Additional criteria (power range, etc.)
  anteilige_zuordnung?: string; // Proportional allocation

  // parsed date range for filtering
  commissioning_date_from?: string; // ISO date string (start of valid range)
  commissioning_date_to?: string; // ISO date string (end of valid range, undefined = ongoing)

  // parsed power range for filtering (normalized to kW)
  power_output_from?: number; // Minimum power in kW
  power_output_to?: number; // Maximum power in kW (undefined = no upper limit)

  // pricing
  einspeiseverguetung?: number; // Feed-in tariff in ct/kWh
  anzulegender_wert?: number; // Reference value in ct/kWh
  ausfallverguetung?: number; // Fallback payment in ct/kWh
  mieterstromzuschlag?: number; // Tenant power surcharge in ct/kWh
  aufnahmedatum?: string; // Date when category was added to list
}

// Query interface for API
export interface TariffQuery {
  energyType: string;
  commissioningDate?: string;
  powerOutput?: number; // In kW or MW
  criteria?: string;
}

// API response interface
export interface TariffResponse {
  found: boolean;
  records?: EegTariffRecord[];
  error?: string;
  totalCount?: number;
}
