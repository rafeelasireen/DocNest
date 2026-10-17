import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { getAuditLogs } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function Security() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => (await getAuditLogs()).data,
    enabled: isAdmin,
  });

  return (
    <AppLayout breadcrumb="Security">
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-2 font-semibold">Account</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium capitalize text-primary">
              {user?.role}
            </span>
          </div>
        </div>

        {isAdmin ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="mb-4 font-semibold">Audit Logs</h2>
            {isLoading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : !data?.logs.length ? (
              <p className="text-sm text-gray-400">No audit logs yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Action</th>
                      <th className="pb-2 pr-4 font-medium">Resource</th>
                      <th className="pb-2 pr-4 font-medium">Resource ID</th>
                      <th className="pb-2 font-medium">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.logs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-50">
                        <td className="py-2 pr-4 capitalize">{log.action}</td>
                        <td className="py-2 pr-4">{log.resource_type}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-400">
                          {log.resource_id?.slice(0, 8) ?? "—"}
                        </td>
                        <td className="py-2 text-gray-500">{formatDate(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">
              Audit logs are only available to administrators.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
