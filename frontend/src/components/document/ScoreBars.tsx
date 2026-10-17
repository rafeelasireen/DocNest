import type { DocumentScore } from "@/lib/api";

interface ScoreBarsProps {
  score?: DocumentScore | null;
}

const metrics = [
  { key: "completeness" as const, label: "Completeness", color: "bg-score-high" },
  { key: "readability" as const, label: "Readability", color: "bg-teal-500" },
  { key: "structure" as const, label: "Structure", color: "bg-score-mid" },
  { key: "overall" as const, label: "Overall", color: "bg-score-high" },
];

export function ScoreBars({ score }: ScoreBarsProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-gray-900">Document Score</h3>
      {!score ? (
        <p className="text-sm text-gray-400">Score not available yet</p>
      ) : (
        <div className="space-y-3">
          {metrics.map(({ key, label, color }) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">{score[key]}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full ${color} transition-all`}
                  style={{ width: `${score[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
