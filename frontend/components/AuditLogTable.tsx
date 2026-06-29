import { useState, useEffect, useCallback } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "./ui/utils";

interface AuditLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: number;
  performedByName: string;
  performed_at: string;
}

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  create: { label: "Criação",   className: "bg-green-100 text-green-700 border-green-200" },
  update: { label: "Edição",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  delete: { label: "Exclusão",  className: "bg-red-100 text-red-700 border-red-200" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  pet:  "Pet",
  camera: "Câmera",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function ChangesDetails({ changes }: { changes: AuditLog["changes"] }) {
  if (!changes || Object.keys(changes).length === 0) {
    return <p className="text-xs text-muted-foreground italic">Sem detalhes registrados.</p>;
  }
  return (
    <div className="space-y-1">
      {Object.entries(changes).map(([field, diff]) => (
        <div key={field} className="text-xs flex gap-2">
          <span className="font-semibold text-muted-foreground min-w-[80px]">{field}:</span>
          <span className="text-red-500 line-through">{String(diff.old ?? "—")}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-green-600">{String(diff.new ?? "—")}</span>
        </div>
      ))}
    </div>
  );
}

export function AuditLogTable() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [filterType, setFilterType]   = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (filterType   !== "all") params.set("entity_type", filterType);
      if (filterAction !== "all") params.set("action",      filterAction);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAction, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(0); }}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="pet">Pet</SelectItem>
            <SelectItem value="camera">Câmera</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="create">Criação</SelectItem>
            <SelectItem value="update">Edição</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchLogs} className="h-8 ml-auto">
          <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
        </Button>

        <span className="text-xs text-muted-foreground">{total} registro(s)</span>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Nenhum log encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id;
            const actionMeta = ACTION_LABELS[log.action] || { label: log.action, className: "" };
            return (
              <div key={log.id} className="border rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                >
                  <Badge className={cn("text-[10px] border shrink-0", actionMeta.className)}>
                    {actionMeta.label}
                  </Badge>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    {ENTITY_LABELS[log.entity_type] || log.entity_type} #{log.entity_id}
                  </span>
                  <span className="text-sm truncate flex-1">por <strong>{log.performedByName || `#${log.performed_by}`}</strong></span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(log.performed_at)}</span>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t bg-muted/20">
                    <p className="text-[10px] text-muted-foreground mb-1 pt-2 font-semibold uppercase">Alterações</p>
                    <ChangesDetails changes={log.changes} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page + 1} de {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
