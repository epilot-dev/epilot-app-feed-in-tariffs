import { useState, useMemo } from "react";
import { CellActions } from "./CellActions";

export type FeedInTariff = {
  bezeichnung?: string;
  aufnahmedatum?: string;
  weitereKriterien?: string;
  energietraeger?: string;
  inbetriebnahme?: string;
  einspeiseverguetung?: number;
  ausfallverguetung?: number;
  mieterstromzuschlag?: number;
  pk?: string;
  sk?: string;
  anzulegender_wert?: number;
  commissioning_date_to?: string;
  commissioning_date_from?: string;
  power_output_from?: number;
  power_output_to?: number;
  anteilige_zuordnung?: string;
};

export interface FeedInTariffsTableProps {
  tariffs: FeedInTariff[];
  schema?: string;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "-";
  return `${value.toFixed(2).replace(".", ",")} ct/kWh`;
};

const formatPowerRange = (params: { from?: number; to?: number }) => {
  const { from, to } = params;
  if (from === undefined && to === undefined) return "-";
  if (from === undefined) return `bis ${to} kW`;
  if (to === undefined) return `ab ${from} kW`;
  return `${from} - ${to} kW`;
};

interface CellWithActionsProps {
  children: React.ReactNode;
  value?: string;
  variableName: string;
  className?: string;
  onCopyVariable?: () => void;
}

const CellWithActions = ({ children, value, variableName, className = "", onCopyVariable }: CellWithActionsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <td
      className={`px-4 py-3 ${className} relative group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {children}
        {isHovered && (
          <div className="absolute top-0 right-0 bg-white/95 backdrop-blur-sm">
            <CellActions value={value} variableName={variableName} onCopyVariable={onCopyVariable} />
          </div>
        )}
      </div>
    </td>
  );
};

export const FeedInTariffsTable = ({ tariffs, schema = "opportunity" }: FeedInTariffsTableProps) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const uniqueZuordnungen = useMemo(() => {
    const values = tariffs.map((t) => t.anteilige_zuordnung).filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort();
  }, [tariffs]);

  const filteredTariffs = useMemo(() => {
    if (selectedFilter === "all") {
      return tariffs;
    }
    if (selectedFilter === "basis") {
      return tariffs.filter((t) => !t.anteilige_zuordnung);
    }
    return tariffs.filter((t) => t.anteilige_zuordnung === selectedFilter);
  }, [tariffs, selectedFilter]);

  const copyTableToClipboard = async () => {
    const headers = [
      "Bezeichnung",
      "Anteilige Zuordnung",
      "Weitere Kriterien",
      "Inbetriebnahme",
      "Einspeisevergütung",
      "Anzulegender Wert",
      "Ausfallvergütung",
      "Mieterstromzuschlag",
    ];

    const tableData = filteredTariffs.map((tariff) => [
      tariff.bezeichnung || "",
      tariff.anteilige_zuordnung || "",
      tariff.weitereKriterien || "",
      tariff.inbetriebnahme || "",
      formatCurrency(tariff.einspeiseverguetung),
      formatCurrency(tariff.anzulegender_wert),
      formatCurrency(tariff.ausfallverguetung),
      formatCurrency(tariff.mieterstromzuschlag),
    ]);

    // Create HTML table
    const htmlTable = `
      <table>
        <thead>
          <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${tableData.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;

    // Create plain text (TSV) fallback
    const tsvContent = [headers.join("\t"), ...tableData.map((row) => row.join("\t"))].join("\n");

    try {
      const htmlBlob = new Blob([htmlTable], { type: "text/html" });
      const textBlob = new Blob([tsvContent], { type: "text/plain" });

      const clipboardItem = new ClipboardItem({
        "text/html": htmlBlob,
        "text/plain": textBlob,
      });

      await navigator.clipboard.write([clipboardItem]);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy table:", err);
    }
  };

  if (!tariffs || tariffs.length === 0) {
    return <div className="w-full p-4 text-center text-gray-500">Keine Einspeisevergütungen verfügbar</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="bg-white shadow-sm border border-gray-200 relative group">
        <button
          onClick={copyTableToClipboard}
          className="absolute top-2 right-2 z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          {copySuccess ? (
            <>
              <svg
                className="w-5 h-5 text-green-600"
                fill="none"
                strokeWidth="2.5"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600 font-medium">Kopiert!</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Tabelle kopieren</span>
            </>
          )}
        </button>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Bezeichnung</span>
                    {uniqueZuordnungen.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setIsFilterOpen(!isFilterOpen)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Filter"
                        >
                          <svg
                            className={`w-4 h-4 ${selectedFilter !== "all" ? "text-blue-600" : "text-gray-500"}`}
                            fill="none"
                            strokeWidth="2"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                            />
                          </svg>
                        </button>
                        {isFilterOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                            <div className="absolute left-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-20 min-w-[180px]">
                              <button
                                onClick={() => {
                                  setSelectedFilter("all");
                                  setIsFilterOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${
                                  selectedFilter === "all" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                                }`}
                              >
                                Alle anzeigen
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFilter("basis");
                                  setIsFilterOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${
                                  selectedFilter === "basis" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                                }`}
                              >
                                Basis
                              </button>
                              <div className="border-t border-gray-200 my-1" />
                              {uniqueZuordnungen.map((zuordnung) => (
                                <button
                                  key={zuordnung}
                                  onClick={() => {
                                    setSelectedFilter(zuordnung);
                                    setIsFilterOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 transition-colors ${
                                    selectedFilter === zuordnung
                                      ? "bg-blue-50 text-blue-700 font-medium"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {zuordnung}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Leistung
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Inbetriebnahme
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Einspeisevergütung
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Anzulegender Wert
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ausfallvergütung
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Mieterstromzuschlag
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTariffs.map((tariff) => {
                const originalIndex = tariffs.indexOf(tariff);
                return (
                  <tr key={originalIndex} className="hover:bg-gray-50 transition-colors">
                    <CellWithActions
                      value={tariff.bezeichnung || "-"}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.bezeichnung}}`}
                      className="whitespace-nowrap"
                    >
                      <div className="text-sm font-medium text-gray-900">{tariff.bezeichnung || "-"}</div>
                      {tariff.energietraeger && <div className="text-xs text-gray-500">{tariff.energietraeger}</div>}
                      {tariff.anteilige_zuordnung && (
                        <div className="text-xs text-gray-500">{tariff.anteilige_zuordnung}</div>
                      )}
                    </CellWithActions>
                    <CellWithActions
                      value={tariff.weitereKriterien}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.power_output_from}}`}
                      className="text-sm text-gray-700"
                    >
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatPowerRange({
                          from: tariff.power_output_from,
                          to: tariff.power_output_to,
                        })}
                      </div>
                      {tariff.weitereKriterien && (
                        <div
                          className="text-xs text-gray-500 mt-1 max-w-[200px] truncate"
                          title={tariff.weitereKriterien}
                        >
                          {tariff.weitereKriterien}
                        </div>
                      )}
                    </CellWithActions>
                    <CellWithActions
                      value={tariff.inbetriebnahme}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.inbetriebnahme}}`}
                      className="text-sm text-gray-700"
                    >
                      {tariff.inbetriebnahme || "-"}
                      {(tariff.commissioning_date_from || tariff.commissioning_date_to) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {formatDate(tariff.commissioning_date_from)} - {formatDate(tariff.commissioning_date_to)}
                        </div>
                      )}
                    </CellWithActions>
                    <CellWithActions
                      value={formatCurrency(tariff.einspeiseverguetung)}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.einspeiseverguetung}}`}
                      className="whitespace-nowrap text-sm text-right font-medium text-gray-900"
                    >
                      {formatCurrency(tariff.einspeiseverguetung)}
                    </CellWithActions>
                    <CellWithActions
                      value={formatCurrency(tariff.anzulegender_wert)}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.anzulegender_wert}}`}
                      className="whitespace-nowrap text-sm text-right font-medium text-gray-900"
                    >
                      {formatCurrency(tariff.anzulegender_wert)}
                    </CellWithActions>
                    <CellWithActions
                      value={formatCurrency(tariff.ausfallverguetung)}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.ausfallverguetung}}`}
                      className="whitespace-nowrap text-sm text-right text-gray-700"
                    >
                      {formatCurrency(tariff.ausfallverguetung)}
                    </CellWithActions>
                    <CellWithActions
                      value={formatCurrency(tariff.mieterstromzuschlag)}
                      variableName={`{{${schema}.eeg_feed_in_tariffs.${originalIndex}.mieterstromzuschlag}}`}
                      className="whitespace-nowrap text-sm text-right text-gray-700"
                    >
                      {formatCurrency(tariff.mieterstromzuschlag)}
                    </CellWithActions>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
