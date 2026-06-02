export default function DataTable({ columns, data, onDelete }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[var(--border)]" style={{ boxShadow: "var(--shadow-sm)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
            {columns.map((col) => (
              <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                {col}
              </th>
            ))}
            {onDelete && (
              <th className="px-4 py-3 text-right text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onDelete ? 1 : 0)} className="px-4 py-10 text-center text-[var(--text-muted)] text-sm">
                No data available
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={row._id} className="hover:bg-[var(--bg-elevated)] transition-colors group">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                    {row[col]}
                  </td>
                ))}
                {onDelete && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(row._id)}
                      className="text-[12px] font-medium text-rose-400 hover:text-rose-300 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
