import { useQuery } from "@tanstack/react-query";
import { getDocuments } from "@/lib/api";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await getDocuments()).data,
    refetchInterval: (query) => {
      const docs = query.state.data?.documents ?? [];
      const active = docs.some(
        (d) => d.processing_status === "pending" || d.processing_status === "processing"
      );
      return active ? 3000 : false;
    },
  });
}
