import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Download, RotateCcw } from "lucide-react";
import {
  downloadDocument,
  downloadDocumentVersion,
  getDocumentVersions,
  restoreVersion,
} from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface BackupHistoryProps {
  documentId: string;
  documentName: string;
  currentVersion: number;
  canRestore: boolean;
}

export function BackupHistory({
  documentId,
  documentName,
  currentVersion,
  canRestore,
}: BackupHistoryProps) {
  const [open, setOpen] = useState(false);
  const [restoreVersionId, setRestoreVersionId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["versions", documentId],
    queryFn: async () => (await getDocumentVersions(documentId)).data,
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreVersion(documentId, versionId),
    onSuccess: () => {
      setRestoreVersionId(null);
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["versions", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["chat", documentId] });
    },
  });

  const versionToRestore = data?.versions.find((v) => v.version_number === restoreVersionId);

  const handleDownloadVersion = async (versionId: string, versionNumber: number) => {
    setDownloadingId(versionId);
    try {
      await downloadDocumentVersion(documentId, versionId, documentName, versionNumber);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCurrent = async () => {
    setDownloadingId("current");
    try {
      await downloadDocument(documentId, documentName);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <div>
          <h3 className="font-semibold text-gray-900">Backup History</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Current file is Version {currentVersion}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5">
          <div className="flex items-center justify-between py-3">
            <p className="text-sm text-gray-500">
              Version {currentVersion} (current)
            </p>
            <button
              type="button"
              onClick={handleDownloadCurrent}
              disabled={downloadingId === "current"}
              title="Download current file"
              className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {downloadingId === "current" ? "Downloading…" : "Download"}
            </button>
          </div>

          {!data?.versions.length ? (
            <p className="pb-2 text-sm text-gray-400">No previous versions yet</p>
          ) : (
            <ul className="space-y-2">
              {data.versions.map((v) => (
                <li
                  key={v.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">
                    Version {v.version_number} · {formatBytes(v.size)} ·{" "}
                    {formatDate(v.created_at)}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadVersion(v.id, v.version_number)}
                      disabled={downloadingId === v.id}
                      title={`Download Version ${v.version_number}`}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    {canRestore && (
                      <button
                        type="button"
                        onClick={() => setRestoreVersionId(v.version_number)}
                        disabled={restore.isPending}
                        title={`Restore Version ${v.version_number}`}
                        className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmDialog
        open={restoreVersionId !== null}
        title="Restore this version?"
        description={
          versionToRestore
            ? `Restore Version ${versionToRestore.version_number}? The current PDF will be replaced with this snapshot and AI reprocessing will start automatically.`
            : ""
        }
        confirmLabel="Restore"
        variant="default"
        loading={restore.isPending}
        onConfirm={() => {
          if (versionToRestore) restore.mutate(versionToRestore.id);
        }}
        onCancel={() => setRestoreVersionId(null)}
      />
    </div>
  );
}
