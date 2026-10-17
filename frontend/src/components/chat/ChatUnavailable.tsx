import { MessageSquareOff } from "lucide-react";
import { getChatUnavailableMessage, isChatReady } from "@/lib/chat";

interface ChatUnavailableProps {
  status: string;
}

export function ChatUnavailable({ status }: ChatUnavailableProps) {
  const message = getChatUnavailableMessage(status);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 rounded-full bg-gray-100 p-3">
        <MessageSquareOff className="h-6 w-6 text-gray-400" />
      </div>
      <p className="max-w-sm text-sm text-gray-500">{message}</p>
      {status === "processing" && (
        <p className="mt-2 text-xs text-amber-600">Processing in progress…</p>
      )}
    </div>
  );
}

export { isChatReady };
