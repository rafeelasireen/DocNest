import { SourceTag } from "./SourceTag";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  sourcePage?: number | null;
  sourceVersion?: number | null;
}

export function ChatBubble({ role, content, sourcePage, sourceVersion }: ChatBubbleProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
          {content}
        </div>
        {(sourcePage || sourceVersion) && (
          <SourceTag page={sourcePage} version={sourceVersion} />
        )}
      </div>
    </div>
  );
}
