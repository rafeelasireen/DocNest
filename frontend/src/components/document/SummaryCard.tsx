interface SummaryCardProps {
  summary?: string | null;
  loading?: boolean;
}

export function SummaryCard({ summary, loading }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 font-semibold text-gray-900">AI Summary</h3>
      {loading ? (
        <p className="text-sm text-gray-400">Generating summary...</p>
      ) : summary ? (
        <p className="text-sm leading-relaxed text-gray-700">{summary}</p>
      ) : (
        <p className="text-sm text-gray-400">Summary not available yet</p>
      )}
    </div>
  );
}
