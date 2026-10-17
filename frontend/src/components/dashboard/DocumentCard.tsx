import { Link } from "react-router-dom";
import { RotateCcw, Trash2 } from "lucide-react";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { Document } from "@/lib/api";

interface DocumentCardProps {
  document: Document;
  selected?: boolean;
  canDelete?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  deleting?: boolean;
  retrying?: boolean;
}

function statusBadge(status: string) {
  if (status === "completed") return null;
  const styles =
    status === "failed"
      ? "bg-red-100 text-red-700"
      : status === "processing"
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-600";
  return (
    <span className={cn("mt-2 inline-block rounded-full px-2 py-0.5 text-xs capitalize", styles)}>
      {status}
    </span>
  );
}

export function DocumentCard({
  document,
  selected,
  canDelete,
  onSelect,
  onDelete,
  onRetry,
  deleting,
  retrying,
}: DocumentCardProps) {
  const score = document.score?.overall ?? 0;
  const showScore = document.processing_status === "completed" && score > 0;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-white p-4 transition-shadow hover:shadow-md",
        selected ? "border-primary ring-2 ring-primary/20" : "border-gray-200"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/documents/${document.id}`}
          className="min-w-0 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="truncate font-medium text-gray-900 group-hover:text-primary">
            {document.filename}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {formatBytes(document.size)} · {formatDate(document.upload_date)}
          </p>
          {statusBadge(document.processing_status)}
        </Link>

        <div className="flex shrink-0 items-start gap-1">
          {showScore && <ScoreRing score={score} size={44} />}
          <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {document.processing_status === "failed" && onRetry && (
              <button
                type="button"
                title="Retry processing"
                disabled={retrying}
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry();
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                title="Delete document"
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
