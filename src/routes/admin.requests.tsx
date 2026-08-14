import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listActivationRequests } from "@/lib/inventory/admin";
import { AdminRequestTable } from "@/components/inventory/AdminRequestTable";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/requests")({
  component: AdminRequestsPage,
});

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];
const LABELS: Record<Status, string> = { PENDING: "Pendentes", APPROVED: "Aprovadas", REJECTED: "Rejeitadas" };

export function AdminRequestsPage() {
  const [status, setStatus] = useState<Status>("PENDING");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-requests", status],
    queryFn: () => listActivationRequests(status),
  });

  return (
    <div>
      <p className="text-[11px] tracking-[0.3em] text-gold/70 uppercase mb-2">Administração</p>
      <h1 className="font-display text-2xl lg:text-3xl tracking-wide mb-6">Solicitações de Ativação</h1>

      <div className="flex gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 text-[11px] tracking-widest border rounded-sm transition-colors ${
              status === s
                ? "border-gold text-gold bg-gold/10"
                : "border-gold/20 text-parchment/60 hover:text-parchment"
            }`}
          >
            {LABELS[s].toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-sea-surface/40" />)}</div>
      ) : (
        <AdminRequestTable rows={data ?? []} />
      )}
    </div>
  );
}
