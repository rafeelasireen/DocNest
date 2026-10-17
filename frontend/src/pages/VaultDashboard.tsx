import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { InlineChat } from "@/components/dashboard/InlineChat";
import { UploadZone } from "@/components/ui/UploadZone";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDocuments } from "@/hooks/useDocuments";
import { deleteDocument, reprocessDocument, uploadDocument } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type PendingConfirm =
  | { type: "delete"; id: string; filename: string }
  | { type: "reprocess"; id: string; filename: string }
  | null;

export default function VaultDashboard() {
  const { data, isLoading } = useDocuments();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  const upload = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUpload(false);
    },
  });

  const remove = useMutation({
    mutationFn: deleteDocument,
    onSuccess: (_, id) => {
      setPendingConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (selectedDocId === id) setSelectedDocId(null);
    },
  });

  const retry = useMutation({
    mutationFn: reprocessDocument,
    onSuccess: () => {
      setPendingConfirm(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const documents = data?.documents ?? [];
  const scored = documents.filter((d) => d.score?.overall);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, d) => sum + (d.score?.overall ?? 0), 0) / scored.length)
    : 0;

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? documents[0];

  const canUpload = user?.role !== "viewer";
  const canDelete = user?.role !== "viewer";

  return (
    <AppLayout breadcrumb="Vault — dashboard">
      <ConfirmDialog
        open={pendingConfirm?.type === "delete"}
        title="Delete document?"
        description={
          pendingConfirm?.type === "delete"
            ? `Delete "${pendingConfirm.filename}"?\n\nThis removes the PDF, all versions, chat history, and AI index. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => pendingConfirm?.type === "delete" && remove.mutate(pendingConfirm.id)}
        onCancel={() => setPendingConfirm(null)}
      />
      <ConfirmDialog
        open={pendingConfirm?.type === "reprocess"}
        title="Reprocess document?"
        description={
          pendingConfirm?.type === "reprocess"
            ? `Reprocess "${pendingConfirm.filename}"?\n\nThis will re-index the PDF and regenerate the summary and score.`
            : ""
        }
        confirmLabel="Reprocess"
        variant="default"
        loading={retry.isPending}
        onConfirm={() => pendingConfirm?.type === "reprocess" && retry.mutate(pendingConfirm.id)}
        onCancel={() => setPendingConfirm(null)}
      />

      <div className="space-y-8">
        <StatsRow
          documentCount={documents.length}
          storageUsed={data?.storage_used ?? 0}
          storageQuota={data?.storage_quota ?? 5 * 1024 ** 3}
          avgScore={avgScore}
        />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Documents</h2>
            {canUpload && (
              <button
                onClick={() => setShowUpload(!showUpload)}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Upload
              </button>
            )}
          </div>

          {showUpload && canUpload && (
            <div className="mb-4">
              <UploadZone
                onUpload={(file) => upload.mutate(file)}
                disabled={upload.isPending}
              />
            </div>
          )}

          {isLoading ? (
            <p className="text-gray-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-gray-400">No documents yet. Upload your first PDF.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  selected={selectedDoc?.id === doc.id}
                  canDelete={canDelete}
                  deleting={remove.isPending}
                  retrying={retry.isPending}
                  onSelect={() => setSelectedDocId(doc.id)}
                  onDelete={() =>
                    setPendingConfirm({ type: "delete", id: doc.id, filename: doc.filename })
                  }
                  onRetry={() =>
                    setPendingConfirm({ type: "reprocess", id: doc.id, filename: doc.filename })
                  }
                />
              ))}
            </div>
          )}
        </div>

        {selectedDoc && (
          <InlineChat
            documentId={selectedDoc.id}
            filename={selectedDoc.filename}
            processingStatus={selectedDoc.processing_status}
          />
        )}
      </div>
    </AppLayout>
  );
}
