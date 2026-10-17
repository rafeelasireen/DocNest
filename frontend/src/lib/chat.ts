export function getChatUnavailableMessage(status: string): string | null {
  switch (status) {
    case "completed":
      return null;
    case "processing":
      return "This document is still being processed. Chat will be available once indexing is complete.";
    case "pending":
      return "This document is queued for processing. Chat will be available shortly.";
    case "failed":
      return "Document processing failed. Please retry processing before chatting.";
    default:
      return "Chat is not available for this document yet.";
  }
}

export function isChatReady(status: string): boolean {
  return status === "completed";
}
