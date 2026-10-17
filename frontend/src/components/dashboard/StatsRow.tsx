import { FileText, HardDrive, TrendingUp } from "lucide-react";
import { formatBytes } from "@/lib/utils";

interface StatsRowProps {
  documentCount: number;
  storageUsed: number;
  storageQuota: number;
  avgScore: number;
}

export function StatsRow({ documentCount, storageUsed, storageQuota, avgScore }: StatsRowProps) {
  const storagePct = Math.min((storageUsed / storageQuota) * 100, 100);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Documents</p>
            <p className="text-2xl font-bold">{documentCount}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <HardDrive className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-500">Storage Used</p>
            <p className="text-2xl font-bold">
              {formatBytes(storageUsed)}{" "}
              <span className="text-sm font-normal text-gray-400">
                of {formatBytes(storageQuota)}
              </span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg. Score</p>
            <p className="text-2xl font-bold">{avgScore > 0 ? `${avgScore}%` : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
