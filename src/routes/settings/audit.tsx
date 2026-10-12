import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/ui-kit";
import { ShieldCheck, Activity, User, FileText, Globe } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/hooks/use-app-state";

export const Route = createFileRoute("/settings/audit")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { t } = useAppState();

  const { data: response, isLoading } = useQuery<any>({
    queryKey: ["audit-logs", page],
    queryFn: () => api.get(`/audit-logs?page=${page}&limit=${limit}`),
  });

  const logs = response?.data || [];
  const totalPages = response?.meta?.totalPages || 1;

  const getActionBadge = (action: string) => {
    if (action.includes("CREATE")) return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border-none">{action}</Badge>;
    if (action.includes("UPDATE")) return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border-none">{action}</Badge>;
    if (action.includes("DELETE")) return <Badge variant="destructive" className="border-none">{action}</Badge>;
    if (action.includes("VIEW")) return <Badge variant="outline">{action}</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settingsPage.securityAuditTitle}
        subtitle={t.settingsPage.securityAuditSubtitle}
      />

      <div className="bg-card text-card-foreground border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 dark:bg-muted/10 flex items-center gap-3">
          <ShieldCheck className="size-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-foreground">{t.settingsPage.eventLogTitle}</h2>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30 dark:bg-muted/20">
              <TableRow>
                <TableHead className="w-[180px]">{t.settingsPage.thDate}</TableHead>
                <TableHead>{t.settingsPage.thUser}</TableHead>
                <TableHead>{t.settingsPage.thAction}</TableHead>
                <TableHead>{t.settingsPage.thResource}</TableHead>
                <TableHead>{t.settingsPage.thIpAddress}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {t.settingsPage.loadingAudit}
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    {t.settingsPage.noAuditFound}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="size-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{log.user}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider text-muted-foreground">{log.userRole}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">
                          {log.resourceName || log.resourceId || "—"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                          {log.resourceType === "patient" ? <User className="size-3" /> : <FileText className="size-3" />}
                          {log.resourceType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <Globe className="size-3" />
                        {log.ipAddress || "—"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.settingsPage.pageXofY.replace("{page}", String(page)).replace("{totalPages}", String(totalPages))}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t.settingsPage.btnPrev}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t.settingsPage.btnNext}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
