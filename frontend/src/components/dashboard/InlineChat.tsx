import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { sendChat } from "@/lib/api";
import { isChatReady } from "@/lib/chat";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatUnavailable } from "@/components/chat/ChatUnavailable";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

interface InlineChatProps {
  documentId: string;
  filename: string;
  processingStatus: string;
}

export function InlineChat({ documentId, filename, processingStatus }: InlineChatProps) {
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    {
      question: string;
      answer: string;
      source_page?: number | null;
      source_version?: number | null;
    }[]
  >([]);
  const chatReady = isChatReady(processingStatus);

  const mutation = useMutation({
    mutationFn: (q: string) => sendChat(documentId, q),
    onSuccess: (res, q) => {
      setMessages((prev) => [
        ...prev,
        { question: q, answer: res.data.answer, source_page: res.data.source_page, source_version: res.data.source_version },
      ]);
    },
    onSettled: () => setPendingQuestion(null),
  });

  const handleSend = (q: string) => {
    if (!chatReady) return;
    const trimmed = q.trim();
    if (!trimmed || mutation.isPending) return;
    setQuestion("");
    setPendingQuestion(trimmed);
    mutation.mutate(trimmed);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 font-semibold text-gray-900">Ask {filename}</h3>

      {!chatReady ? (
        <ChatUnavailable status={processingStatus} />
      ) : (
        <>
          <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
            {messages.length === 0 && !pendingQuestion && (
              <p className="text-sm text-gray-400">Ask a question about this document...</p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className="space-y-2">
                <ChatBubble role="user" content={msg.question} />
                <ChatBubble
                  role="assistant"
                  content={msg.answer}
                  sourcePage={msg.source_page}
                  sourceVersion={msg.source_version}
                />
              </div>
            ))}
            {pendingQuestion && (
              <div className="space-y-2">
                <ChatBubble role="user" content={pendingQuestion} />
                <TypingIndicator />
              </div>
            )}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(question);
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask about ${filename}...`}
              disabled={mutation.isPending}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={mutation.isPending || !question.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
