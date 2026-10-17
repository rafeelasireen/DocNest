import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { SummaryCard } from "@/components/document/SummaryCard";
import { ScoreBars } from "@/components/document/ScoreBars";
import { BackupHistory } from "@/components/document/BackupHistory";
import { DocumentActions } from "@/components/document/DocumentActions";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deleteDocument,
  getDocument,
  renameDocument,
  reprocessDocument,
  updateDocument,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type ConfirmAction = "delete" | "reprocess" | null;

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => (await getDocument(id!)).data,
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.processing_status;
      return status === "processing" || status === "pending" ? 3000 : false;
    },
  });

  const invalidateDoc = () => {
    queryClient.invalidateQueries({ queryKey: ["document", id] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["chat", id] });
    queryClient.invalidateQueries({ queryKey: ["versions", id] });
  };

  const update = useMutation({
    mutationFn: (file: File) => updateDocument(id!, file),
    onSuccess: () => {
      setPendingFile(null);
      invalidateDoc();
    },
  });

  const rename = useMutation({
    mutationFn: (filename: string) => renameDocument(id!, filename),
    onSuccess: () => {
      setShowRename(false);
      invalidateDoc();
    },
  });

  const reprocess = useMutation({
    mutationFn: () => reprocessDocument(id!),
    onSuccess: () => {
      setConfirmAction(null);
      invalidateDoc();
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteDocument(id!),
    onSuccess: () => {
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate("/vault");
    },
  });

  const canManage = user?.role !== "viewer";
  const canRestore = canManage;

  const openRename = () => {
    if (doc) {
      setNewName(doc.filename);
      setShowRename(true);
    }
  };

  if (isLoading) {
    return (
      <AppLayout breadcrumb="Document">
        <p className="text-gray-400">Loading...</p>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout breadcrumb="Document">
        <p className="text-red-500">Document not found</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout breadcrumb={`Vault — ${doc.filename}`}>
      <ConfirmDialog
        open={confirmAction === "delete"}
        title="Delete document?"
        description={`Delete "${doc.filename}"?\n\nThis removes the PDF, all versions, chat history, and AI index. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "reprocess"}
        title="Reprocess document?"
        description="This will re-index the PDF and regenerate the summary and score. Chat will be unavailable until processing completes."
        confirmLabel="Reprocess"
        variant="default"
        loading={reprocess.isPending}
        onConfirm={() => reprocess.mutate()}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={!!pendingFile}
        title="Update file?"
        description={
          pendingFile
            ? `Replace the PDF with "${pendingFile.name}"?\n\nThe document name "${doc.filename}" will stay the same. The current file becomes Version ${doc.current_version_number ?? 1} in backup, and the new file becomes Version ${(doc.current_version_number ?? 1) + 1}. AI reprocessing starts automatically.`
            : ""
        }
        confirmLabel="Update"
        variant="default"
        loading={update.isPending}
        onConfirm={() => pendingFile && update.mutate(pendingFile)}
        onCancel={() => setPendingFile(null)}
      />

      {showRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            aria-label="Close dialog"
            onClick={() => setShowRename(false)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Rename document</h2>
            <p className="mt-1 text-sm text-gray-500">
              This only changes the display name. The stored PDF file is not affected.
            </p>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Document name"
              autoFocus
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRename(false)}
                disabled={rename.isPending}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => newName.trim() && rename.mutate(newName.trim())}
                disabled={rename.isPending || !newName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {rename.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <DocumentActions
            filename={doc.filename}
            currentVersion={doc.current_version_number ?? 1}
            size={doc.size}
            uploadDate={doc.upload_date}
            processingStatus={doc.processing_status}
            canManage={canManage}
            onRename={openRename}
            onUpdateFile={setPendingFile}
            onReprocess={() => setConfirmAction("reprocess")}
            onDelete={() => setConfirmAction("delete")}
            updating={update.isPending}
            reprocessing={reprocess.isPending}
            deleting={remove.isPending}
          />
          <SummaryCard
            summary={doc.summary}
            loading={doc.processing_status === "processing" || doc.processing_status === "pending"}
          />
          <ScoreBars score={doc.score} />
          <BackupHistory
            documentId={doc.id}
            documentName={doc.filename}
            currentVersion={doc.current_version_number ?? 1}
            canRestore={canRestore}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="h-[600px]">
            <ChatPanel documentId={doc.id} processingStatus={doc.processing_status} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
