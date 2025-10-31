import { useState } from "react";
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
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(2)} ct/kWh`;
};

const formatPowerRange = (params: { from?: number; to?: number }) => {
  const { from, to } = params;
  if (from === undefined && to === undefined) return '-';
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

const CellWithActions = ({ children, value, variableName, className = '', onCopyVariable }: CellWithActionsProps) => {
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

export const FeedInTariffsTable = ({ tariffs, schema = 'opportunity' }: FeedInTariffsTableProps) => {
  if (!tariffs || tariffs.length === 0) {
    return (
      <div className="w-full p-4 text-center text-gray-500">
        Keine Einspeisevergütungen verfügbar
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="bg-white shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Bezeichnung
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
              {tariffs.map((tariff, index) => (
                <tr key={tariff.sk || index} className="hover:bg-gray-50 transition-colors">
                  <CellWithActions
                    value={tariff.bezeichnung || '-'}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.bezeichnung}}`}
                    className="whitespace-nowrap"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {tariff.bezeichnung || '-'}
                    </div>
                    {tariff.energietraeger && (
                      <div className="text-xs text-gray-500">
                        {tariff.energietraeger}
                      </div>
                    )}
                    {tariff.anteilige_zuordnung && (
                      <div className="text-xs text-gray-500">
                        {tariff.anteilige_zuordnung}
                      </div>
                    )}
                  </CellWithActions>
                  <CellWithActions
                    value={tariff.weitereKriterien}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.power_output_from}}`}
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
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.inbetriebnahme}}`}
                    className="text-sm text-gray-700"
                  >
                    {tariff.inbetriebnahme || '-'}
                    {(tariff.commissioning_date_from || tariff.commissioning_date_to) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(tariff.commissioning_date_from)} - {formatDate(tariff.commissioning_date_to)}
                      </div>
                    )}
                  </CellWithActions>
                  <CellWithActions
                    value={formatCurrency(tariff.einspeiseverguetung)}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.einspeiseverguetung}}`}
                    className="whitespace-nowrap text-sm text-right font-medium text-gray-900"
                  >
                    {formatCurrency(tariff.einspeiseverguetung)}
                  </CellWithActions>
                  <CellWithActions
                    value={formatCurrency(tariff.anzulegender_wert)}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.anzulegender_wert}}`}
                    className="whitespace-nowrap text-sm text-right font-medium text-gray-900"
                  >
                    {formatCurrency(tariff.anzulegender_wert)}
                  </CellWithActions>
                  <CellWithActions
                    value={formatCurrency(tariff.ausfallverguetung)}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.ausfallverguetung}}`}
                    className="whitespace-nowrap text-sm text-right text-gray-700"
                  >
                    {formatCurrency(tariff.ausfallverguetung)}
                  </CellWithActions>
                  <CellWithActions
                    value={formatCurrency(tariff.mieterstromzuschlag)}
                    variableName={`{{${schema}.eeg_feed_in_tariffs.${index}.mieterstromzuschlag}}`}
                    className="whitespace-nowrap text-sm text-right text-gray-700"
                  >
                    {formatCurrency(tariff.mieterstromzuschlag)}
                  </CellWithActions>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
