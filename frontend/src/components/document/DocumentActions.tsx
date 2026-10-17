import { useRef } from "react";
import { Pencil, RotateCcw, Trash2, Upload } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface DocumentActionsProps {
  filename: string;
  currentVersion: number;
  size: number;
  uploadDate: string;
  processingStatus: string;
  canManage: boolean;
  onRename: () => void;
  onUpdateFile: (file: File) => void;
  onReprocess: () => void;
  onDelete: () => void;
  updating?: boolean;
  reprocessing?: boolean;
  deleting?: boolean;
}

export function DocumentActions({
  filename,
  currentVersion,
  size,
  uploadDate,
  processingStatus,
  canManage,
  onRename,
  onUpdateFile,
  onReprocess,
  onDelete,
  updating,
  reprocessing,
  deleting,
}: DocumentActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing =
    processingStatus === "pending" || processingStatus === "processing";
  const busy = updating || reprocessing || deleting || isProcessing;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="min-w-0">
        <div className="flex items-start gap-2">
          <h2 className="flex-1 font-semibold text-gray-900 break-words">{filename}</h2>
          {canManage && (
            <button
              type="button"
              onClick={onRename}
              disabled={busy}
              title="Rename document"
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary disabled:opacity-50"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Version {currentVersion} · {formatBytes(size)} · {formatDate(uploadDate)}
        </p>
      </div>

      {canManage && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Replace PDF — document name stays the same, version number increases"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-primary/30 hover:text-primary disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {updating ? "Updating…" : "Update file"}
          </button>
          <button
            type="button"
            onClick={onReprocess}
            disabled={busy}
            title="Reprocess document (re-index and regenerate summary)"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-primary/30 hover:text-primary disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reprocess
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting || updating || reprocessing}
            title="Delete document and all related data"
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpdateFile(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
    </div>
  );
}
