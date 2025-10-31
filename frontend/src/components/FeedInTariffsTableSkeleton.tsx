export const FeedInTariffsTableSkeleton = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
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
              {[...Array(5)].map((_, index) => (
                <tr key={index}>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20 ml-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
