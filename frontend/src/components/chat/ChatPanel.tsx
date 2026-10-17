import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { getChatHistory, sendChat } from "@/lib/api";
import { isChatReady } from "@/lib/chat";
import { ChatBubble } from "./ChatBubble";
import { ChatUnavailable } from "./ChatUnavailable";
import { TypingIndicator } from "./TypingIndicator";

interface ChatPanelProps {
  documentId: string;
  processingStatus: string;
}

export function ChatPanel({ documentId, processingStatus }: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const chatReady = isChatReady(processingStatus);

  const { data } = useQuery({
    queryKey: ["chat", documentId],
    queryFn: async () => (await getChatHistory(documentId)).data,
    enabled: chatReady,
  });

  const mutation = useMutation({
    mutationFn: (q: string) => sendChat(documentId, q),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", documentId] });
    },
    onSettled: () => setPendingQuestion(null),
  });

  const messages = data?.messages ?? [];

  const handleSend = (q: string) => {
    if (!chatReady) return;
    const trimmed = q.trim();
    if (!trimmed || mutation.isPending) return;
    setQuestion("");
    setPendingQuestion(trimmed);
    mutation.mutate(trimmed);
  };

  if (!chatReady) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
        <ChatUnavailable status={processingStatus} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && !pendingQuestion && (
          <p className="text-center text-sm text-gray-400">Start a conversation about this document</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-2">
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
        className="sticky bottom-0 flex gap-2 border-t border-gray-100 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this document..."
          disabled={mutation.isPending}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={mutation.isPending || !question.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
