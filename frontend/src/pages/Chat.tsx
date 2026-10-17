import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDocuments } from "@/hooks/useDocuments";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Chat() {
  const { data, isLoading } = useDocuments();
  const documents = data?.documents ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(documents[0]?.id ?? null);

  const selected = documents.find((d) => d.id === selectedId);

  return (
    <AppLayout breadcrumb="Chat — hub">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-1">
          <h2 className="mb-3 font-semibold">Your Documents</h2>
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-gray-400">Upload a document to start chatting</p>
          ) : (
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === doc.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {doc.filename}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="h-[600px] lg:col-span-3">
          {selected ? (
            <ChatPanel
              documentId={selected.id}
              processingStatus={selected.processing_status}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-gray-200 bg-white">
              <p className="text-gray-400">
                Select a document or{" "}
                <Link to="/vault" className="text-primary hover:underline">
                  upload one
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
