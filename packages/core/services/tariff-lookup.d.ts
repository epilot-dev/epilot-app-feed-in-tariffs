import { EegTariffRecord } from "../types";
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
export declare const lookupTariffs: (params: TariffLookupParams) => Promise<TariffLookupResult>;
