interface DateRange {
    from: string;
    to?: string;
}
interface PowerRange {
    from: number;
    to?: number;
}
declare function parseCommissioningDate(dateStr: string): DateRange | null;
declare function parsePowerRange(criteriaStr: string): PowerRange | null;
declare function isPowerInRange(powerKW: number, range: PowerRange): boolean;
declare function isDateInRange(isoDate: string, range: DateRange): boolean;
declare function populateData(): Promise<void>;
export { populateData, parseCommissioningDate, isDateInRange, parsePowerRange, isPowerInRange };
