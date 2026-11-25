import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle, ArrowLeft, Bell, CalendarDays, Check, ChevronDown,
  CircleDollarSign, ClipboardList, Clock3, Edit3, FilePlus2, FileText, Filter,
  Gavel, LayoutDashboard, LogOut, MapPin, Menu, MoreHorizontal, Plus, Search,
  ShieldCheck, Trash2, UploadCloud, UsersRound, X,
} from "lucide-react";

type Screen = "dashboard" | "autos" | "novo";
type Status = "Aguardando Defesa" | "Em Defesa" | "Em Parecer" | "Multa Emitida" | "Arquivado" | "Não Apresentou Defesa";
type DbAuto = {
  id_auto: string;
  contribuinte_criado?: boolean;
  numero_auto: string;
  data_auto: string;
  prazo_defesa?: string | null;
  local_ocorrencia?: string | null;
  descricao_detalhada?: string | null;
  status_processo?: string | null;
  fk_fiscal_matricula?: string | null;
  fk_contribuinte_id_contribuinte?: string | null;
  assinatura_autuado?: string | null;
  url_auto?: string | null;

  nome_fantasia?: string | null;
  nome_contribuinte?: string | null;
  cpf?: string | null;
  cnpj?: string | null;
  cnae?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  nome_fiscal?: string | null;

  inicio_fiscalizacao?: string | null;
  fim_fiscalizacao?: string | null;
  tipo_infracao?: string | null;
  base_legal?: string | null;
  valor_base?: number | null;

  responsavel_assinou?: boolean | null;
  testemunha_nome?: string | null;
  testemunha_matricula?: string | null;
  observacoes?: string | null;
  imagens_urls?: string[] | null;
};
type Contribuinte = { id_contribuinte: string; nome?: string; razao_social?: string; cpf?: string; cnpj?: string; tipo?: string };
type Fiscal = { matricula_fiscal: string; nome: string };
type Auto = {
  id: string;
  id_auto: string;
  contribuinte: string;
  documento: string;
  contribuinteId: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnae: string;
  rua: string;
  numero: string;
  bairro: string;

  infracao: string;
  baseLegal: string;
  data: string;
  dataISO: string;
  local: string;
  fiscal: string;
  fiscalMatricula: string;

  inicioFiscalizacao: string;
  fimFiscalizacao: string;
  responsavelAssinou: boolean | null;
  assinatura: string;
  testemunhaNome: string;
  testemunhaMatricula: string;
  observacoes: string;
  imagens: string[];

  valor: string;
  valor_base?: number | null;
  status: Status;
  descricao: string;
  prazo?: string | null;
  url?: string | null;
};
type Usuario = { login?: string; nome?: string; perfil?: string; matricula_fiscal?: string; matricula_admin?: string };

const statusToUi: Record<string, Status> = {
  "Em Aberto": "Aguardando Defesa", "Defesa Apresentada": "Em Defesa",
  "Em Julgamento": "Em Parecer", "Encerrado com Multa": "Multa Emitida",
  "Arquivado": "Arquivado", "Não Apresentou Defesa": "Não Apresentou Defesa",
};
const statusToDb: Record<Status, string> = {
  "Aguardando Defesa": "Em Aberto", "Em Defesa": "Defesa Apresentada",
  "Em Parecer": "Em Julgamento", "Multa Emitida": "Encerrado com Multa",
  "Arquivado": "Arquivado", "Não Apresentou Defesa": "Não Apresentou Defesa",
};
const statusStyle: Record<Status, string> = {
  "Aguardando Defesa": "border-amber-300 bg-amber-50 text-amber-800",
  "Em Defesa": "border-sky-300 bg-sky-50 text-sky-800",
  "Em Parecer": "border-violet-300 bg-violet-50 text-violet-800",
  "Multa Emitida": "border-rose-300 bg-rose-50 text-rose-800",
  "Arquivado": "border-stone-300 bg-stone-100 text-stone-600",
  "Não Apresentou Defesa": "border-orange-300 bg-orange-50 text-orange-800",
};
const inputClass = "h-11 w-full border border-border bg-white px-3.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10";
const labelClass = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground";
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (value?: string | null) => value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const formatDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Não informado";
const documentOf = (c?: Contribuinte) => c?.cpf || c?.cnpj || "—";
const nameOf = (c?: Contribuinte) => c?.nome || c?.razao_social || "Contribuinte não identificado";

const onlyDigits = (value: string) => value.replace(/\D/g, "");
function maskDocumento(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function cpfOk(d: string) {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  for (const n of [9, 10]) { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); if (((s * 10) % 11) % 10 !== Number(d[n])) return false; }
  return true;
}
function cnpjOk(d: string) {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  for (const n of [12, 13]) { const w = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * w[i]; const r = s % 11; if ((r < 2 ? 0 : 11 - r) !== Number(d[n])) return false; }
  return true;
}
function DocumentoField() {
  const [valor, setValor] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const d = onlyDigits(valor);
  const tipo = d.length === 11 ? "CPF" : d.length === 14 ? "CNPJ" : "";
  const valido = tipo === "CPF" ? cpfOk(d) : tipo === "CNPJ" ? cnpjOk(d) : false;
  useEffect(() => { ref.current?.setCustomValidity(valido ? "" : "Informe um CPF ou CNPJ válido."); }, [valido]);
  useEffect(() => {
    const form = ref.current?.form;
    const limpar = () => setValor("");
    form?.addEventListener("reset", limpar);
    return () => form?.removeEventListener("reset", limpar);
  }, []);
  const cor = !d ? "text-muted-foreground" : valido ? "text-emerald-700" : tipo ? "text-destructive" : "text-muted-foreground";
  const dica = !d ? "O sistema identifica automaticamente se é CPF ou CNPJ."
    : valido ? `${tipo} válido. O contribuinte será localizado ou cadastrado automaticamente.`
    : tipo ? `${tipo} inválido. Confira os dígitos.` : "Continue digitando: o CPF tem 11 dígitos e o CNPJ tem 14.";
  return (
    <Field label="CPF ou CNPJ" required>
      <input ref={ref} name="documento" required inputMode="numeric" autoComplete="off" value={valor} onChange={(e) => setValor(maskDocumento(e.target.value))} placeholder="Digite o CPF ou o CNPJ" className={inputClass} />
      <span className={`mt-1.5 block text-xs ${cor}`}>{dica}</span>
    </Field>
  );
}

async function api<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.mensagem || data.erro || `Falha na requisição (${response.status}).`);
  return data as T;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex whitespace-nowrap border px-2.5 py-1 text-[11px] font-bold ${statusStyle[status] || statusStyle["Aguardando Defesa"]}`}>{status}</span>;
}
function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold">
        {value || "Não informado"}
      </p>
    </div>
  );
}
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}{required && <span className="ml-1 text-destructive">*</span>}</span>{children}</label>;
}
function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-5 border-l-4 border-accent pl-5 md:flex-row md:items-end md:justify-between"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p><h1 className="font-['Segoe_UI'] text-3xl font-bold tracking-tight md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>;
}
function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="border border-border bg-card"><div className="flex gap-4 border-b border-border p-5"><span className="font-['Segoe_UI'] text-xs font-bold text-primary">{number}</span><div><h2 className="font-['Segoe_UI'] text-lg font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div></div><div className="p-5 md:p-6">{children}</div></section>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("novo");
  const [autos, setAutos] = useState<Auto[]>([]);
  const [contribuintes, setContribuintes] = useState<Contribuinte[]>([]);
  const [fiscais, setFiscais] = useState<Fiscal[]>([]);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "Todos">("Todos");
  const [selectedAuto, setSelectedAuto] = useState<Auto | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Auto | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function showNotice(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 4000); }

  async function loadAutos() {
    const [rows, options] = await Promise.all([
      api<DbAuto[]>("/api/autos"),
      api<{ contribuintes: Contribuinte[]; fiscais: Fiscal[] }>("/api/autos/opcoes"),
    ]);
    setContribuintes(options.contribuintes || []);
    setFiscais(options.fiscais || []);
const mapped = (rows || []).map((row) => {
  const c = (options.contribuintes || []).find(
    (item) => item.id_contribuinte === row.fk_contribuinte_id_contribuinte
  );

  const f = (options.fiscais || []).find(
    (item) => item.matricula_fiscal === row.fk_fiscal_matricula
  );

  const documentoOriginal = row.cnpj || row.cpf || documentOf(c);
  const description = row.descricao_detalhada || "";

  return {
    id: row.numero_auto || `AUTO-${row.id_auto}`,
    id_auto: row.id_auto,

    contribuinte: row.nome_fantasia || row.nome_contribuinte || nameOf(c),
    razaoSocial: row.nome_contribuinte || nameOf(c),
    nomeFantasia: row.nome_fantasia || "",
    documento: documentoOriginal && documentoOriginal !== "—"
      ? maskDocumento(documentoOriginal)
      : "—",
    contribuinteId: row.fk_contribuinte_id_contribuinte || "",

    cnae: row.cnae || "",
    rua: row.rua || "",
    numero: row.numero || "",
    bairro: row.bairro || "",

    infracao: row.tipo_infracao || "Não informado",
    baseLegal: row.base_legal || "Não informado",

    data: formatDate(row.data_auto),
    dataISO: row.data_auto?.slice(0, 10) || "",
    local: row.local_ocorrencia || "—",

    fiscal: row.nome_fiscal || f?.nome || row.fk_fiscal_matricula || "—",
    fiscalMatricula: row.fk_fiscal_matricula || "",

    inicioFiscalizacao: row.inicio_fiscalizacao || "",
    fimFiscalizacao: row.fim_fiscalizacao || "",

    responsavelAssinou: row.responsavel_assinou ?? null,
    assinatura: row.assinatura_autuado || "",
    testemunhaNome: row.testemunha_nome || "",
    testemunhaMatricula: row.testemunha_matricula || "",
    observacoes: row.observacoes || "",
    imagens: row.imagens_urls || [],

    valor_base: row.valor_base ?? null,
    valor: row.valor_base != null ? String(row.valor_base) : "—",

    status: statusToUi[row.status_processo || "Em Aberto"] || "Aguardando Defesa",
    descricao: description,
    prazo: row.prazo_defesa,
    url: row.url_auto,
  } satisfies Auto;
});
    setAutos(mapped);
    return mapped;
  }


  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api<{ logado: boolean; usuario?: Usuario }>("/api/verificar-sessao");
        if (!session.logado) { window.location.replace("/"); return; }
        if (active) setUsuario(session.usuario || null);
        await loadAutos();
      } catch (error) {
        if (active) showNotice(error instanceof Error ? error.message : "Não foi possível carregar o sistema.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const filteredAutos = useMemo(() => {
    const term = query.trim().toLowerCase();
    return autos.filter((item) => {
      const matches = [item.id, item.contribuinte, item.documento, item.infracao, item.fiscal, item.local].some((value) => value.toLowerCase().includes(term));
      return matches && (statusFilter === "Todos" || item.status === statusFilter);
    });
  }, [autos, query, statusFilter]);

  function navigate(next: Screen) { setScreen(next); setSidebarOpen(false); setSelectedAuto(null); setEditMode(false); }

  async function handleCreateAuto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    const dataInicio = String(form.get("data_inicio") || "");
    const horaInicio = String(form.get("hora_inicio") || "");
    const dataFim = String(form.get("data_fim") || "");
    const horaFim = String(form.get("hora_fim") || "");
    const descricao = String(form.get("descricao_detalhada") || "").trim();
    const tipoInfracao = String(form.get("tipo_infracao") || "").trim();
    const baseLegal = String(form.get("base_legal") || "").trim();

    // Captura dos novos campos do formulário
    const localOcorrencia = String(form.get("local_ocorrencia") || "").trim();
    const valorBase = String(form.get("valor_base") || "").trim();
    const rua = String(form.get("rua") || "").trim();
    const numero = String(form.get("numero") || "").trim();
    const bairro = String(form.get("bairro") || "").trim();

    const assinou = String(form.get("responsavel_assinou") || "");
    const testemunhaNome = String(form.get("testemunha_nome") || "").trim();
    const testemunhaMatricula = String(form.get("testemunha_matricula") || "").trim();
    const observacoes = String(form.get("observacoes") || "").trim();
    const fiscalMatricula = usuario?.matricula_fiscal || "";
    const numeroAuto = String(form.get("numero_auto") || "").trim();
    const imagens = form.getAll("imagens").filter((item): item is File => item instanceof File && item.size > 0);

    if (new Date(`${dataFim}T${horaFim}`) < new Date(`${dataInicio}T${horaInicio}`)) {
      showNotice("O término da fiscalização não pode ser anterior ao início."); setBusy(false); return;
    }
    if (imagens.length > 6 || imagens.some((file) => !file.type.startsWith("image/") || file.size > 2 * 1024 * 1024)) {
      showNotice("Adicione até 6 imagens, cada uma com no máximo 2 MB."); setBusy(false); return;
    }
    const prazo = new Date(`${dataInicio}T12:00:00`); prazo.setDate(prazo.getDate() + 15);
    const detalheCompleto = [
      `Descrição: ${descricao}`, `Enquadramento: ${tipoInfracao}`, `Base legal: ${baseLegal}`, `Período da fiscalização: ${dataInicio} ${horaInicio} até ${dataFim} ${horaFim}`,
      `Responsável assinou: ${assinou}`, `Testemunha: ${testemunhaNome || "Não informada"} | Matrícula: ${testemunhaMatricula || "Não informada"}`,
      observacoes ? `Observações: ${observacoes}` : ""
    ].filter(Boolean).join("\n");

    try {
      const imagensUrls: string[] = [];
      for (const file of imagens) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = reject; reader.readAsDataURL(file);
        });
        const uploaded = await api<{ url: string }>("/api/autos/imagens", { method: "POST", body: JSON.stringify({ nome: file.name, tipo: file.type, base64 }) });
        imagensUrls.push(uploaded.url);
      }

      const payload = {
        numero_auto: numeroAuto,
        data_auto: dataInicio,
        prazo_defesa: prazo.toISOString().slice(0, 10),
        local_ocorrencia: localOcorrencia,
        valor_base: valorBase ? Number(valorBase) : null,
        rua: rua || null,
        numero: numero || null,
        bairro: bairro || null,
        descricao_detalhada: detalheCompleto,
        status_processo: "Em Aberto",
        fk_fiscal_matricula: fiscalMatricula,
        nome_contribuinte: String(form.get("nome_contribuinte") || "").trim(),
        nome_fantasia: String(form.get("nome_fantasia") || "").trim(),
        documento: String(form.get("documento") || "").trim(),
        cnae: String(form.get("cnae") || "").trim(),
        inicio_fiscalizacao: `${dataInicio}T${horaInicio}:00`,
        fim_fiscalizacao: `${dataFim}T${horaFim}:00`,
        tipo_infracao: tipoInfracao,
        base_legal: baseLegal,
        responsavel_assinou: assinou === "Sim",
        assinatura_autuado: assinou,
        testemunha_nome: testemunhaNome || null,
        testemunha_matricula: testemunhaMatricula || null,
        observacoes: observacoes || null,
        imagens_urls: imagensUrls,
      };

      const created = await api<DbAuto>("/api/autos", { method: "POST", body: JSON.stringify(payload) });
      await loadAutos();
      showNotice(`Auto ${created.numero_auto || payload.numero_auto} cadastrado com sucesso.${created.contribuinte_criado ? " Novo contribuinte cadastrado." : ""}`);
      navigate("autos");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível cadastrar o auto."); }
    finally { setBusy(false); }
  }

  async function handleUpdateAuto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedAuto) return; setBusy(true);
    const form = new FormData(event.currentTarget);
    const valorBase = String(form.get("valor_base") || "").trim();

    const payload = {
      numero_auto: String(form.get("numero_auto") || "").trim(),
      data_auto: String(form.get("data_auto") || ""),
      local_ocorrencia: String(form.get("local_ocorrencia") || "").trim(),
      valor_base: valorBase ? Number(valorBase) : null,
      tipo_infracao: String(form.get("tipo_infracao") || "").trim() || undefined,
      base_legal: String(form.get("base_legal") || "").trim() || undefined,
      descricao_detalhada: String(form.get("descricao_detalhada") || "").trim(),
      status_processo: statusToDb[form.get("status_processo") as Status] || "Em Aberto",
      prazo_defesa: String(form.get("prazo_defesa") || "") || null,
      url_auto: String(form.get("url_auto") || "").trim() || null,
    };

    try {
      await api(`/api/autos/${selectedAuto.id_auto}`, { method: "PATCH", body: JSON.stringify(payload) });
      const updatedRows = await loadAutos();
      const updated = updatedRows.find((item) => item.id_auto === selectedAuto.id_auto);
      setSelectedAuto(updated || null);
      setEditMode(false); showNotice("Auto atualizado com sucesso.");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível atualizar o auto."); }
    finally { setBusy(false); }
  }


  async function confirmDelete() {
    if (!deleteTarget) return; setBusy(true);
    try {
      await api(`/api/autos/${deleteTarget.id_auto}`, { method: "DELETE" });
      setDeleteTarget(null); setSelectedAuto(null); await loadAutos(); showNotice("Auto de infração excluído com sucesso.");
    } catch (error) { showNotice(error instanceof Error ? error.message : "Não foi possível excluir o auto."); }
    finally { setBusy(false); }
  }


  async function logout() {
    try { await api("/api/logout"); } finally { window.location.replace("/"); }
  }

  const navItems = [
    { id: "novo" as Screen, label: "Gerenciar autos de infração", icon: FilePlus2 },
    { id: "autos" as Screen, label: "Pesquisar Autos", icon: Search },
  ];
  const podeGerenciarAuto = (auto: Auto) => Boolean(usuario?.matricula_fiscal && usuario.matricula_fiscal === auto.fiscalMatricula);
  const activeAutos = autos.filter((item) => !["Arquivado", "Multa Emitida"].includes(item.status)).length;
  const pendingAutos = autos.filter((item) => item.status === "Aguardando Defesa").length;
  const reviewAutos = autos.filter((item) => item.status === "Em Parecer").length;

  if (loading) return <div className="grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted-foreground">Carregando suas telas e consultando o banco de dados...</div>;

  return (
    <div className="min-h-screen bg-background font-['Segoe_UI'] text-foreground selection:bg-accent selection:text-accent-foreground">
      {sidebarOpen && <button aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/45 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[70px] items-center justify-between border-b border-white/10 px-5"><div className="flex items-center gap-2"><Gavel size={22} /><div><p className="text-lg font-bold leading-tight">SIGAI</p><p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Autos de Infração</p></div></div><button onClick={() => setSidebarOpen(false)} className="ml-auto p-2 text-white/70 lg:hidden"><X size={20} /></button></div>
        <nav className="flex-1 px-3 py-5"><p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-blue-200/80">Autos de infração</p><div className="space-y-1">{navItems.map((item) => { const Icon = item.icon; const active = screen === item.id; return <button key={item.id} onClick={() => navigate(item.id)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${active ? "bg-[#2563eb] text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}><Icon size={18} strokeWidth={active ? 2.4 : 1.7} /><span className="font-semibold">{item.label}</span></button>; })}</div></nav>
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center border-b border-[#e2e8f0] bg-white px-4 md:px-7"><button onClick={() => setSidebarOpen(true)} className="mr-3 rounded-md border border-[#e2e8f0] bg-white p-2.5 lg:hidden"><Menu size={20} /></button><div><p className="text-base font-bold text-[#1e293b]">Sistema de Gerenciamento de Autos de Infração</p><p className="text-xs text-[#64748b]">Prefeitura Municipal · Gerência de Posturas</p></div><div className="ml-auto flex items-center gap-3"><div className="text-right"><p className="text-[11px] font-semibold uppercase text-[#64748b]">{usuario?.perfil || "Usuário"}</p><p className="text-xs text-[#334155]">{usuario?.matricula_fiscal || usuario?.matricula_admin || usuario?.login || "Sessão ativa"}</p></div><div className="grid h-9 w-9 place-items-center rounded-full bg-[#2563eb] text-sm font-bold text-white">{(usuario?.nome || usuario?.login || "U").slice(0, 1).toUpperCase()}</div><button onClick={logout} className="ml-1 grid h-9 w-9 place-items-center rounded-md border border-[#e2e8f0] text-[#64748b] hover:bg-slate-50 hover:text-[#1b3899]" title="Encerrar sessão"><LogOut size={17} /></button></div></header>

        <main className="mx-auto max-w-[1500px] px-4 py-7 md:px-8 md:py-10">
          {screen === "dashboard" && <div><PageHeading eyebrow="Painel de controle" title="Visão geral" description="Acompanhe os autos cadastrados e a situação dos processos." action={<button onClick={() => navigate("novo")} className="flex h-11 items-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90"><Plus size={17} /> Lavrar auto</button>} />
            <section className="mb-8 grid border-y border-border bg-card sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Autos cadastrados", value: String(autos.length), delta: "Registros no banco de dados", icon: FileText }, { label: "Aguardando defesa", value: String(pendingAutos), delta: "Processos em aberto", icon: Clock3 }, { label: "Em análise", value: String(reviewAutos), delta: "Aguardando julgamento", icon: Gavel }, { label: "Autos ativos", value: String(activeAutos), delta: "Não arquivados ou multados", icon: CircleDollarSign }].map((stat, index) => { const Icon = stat.icon; return <div key={stat.label} className={`relative border-border p-6 ${index < 3 ? "xl:border-r" : ""} ${index % 2 === 0 ? "sm:border-r xl:border-r" : ""}`}><div className="mb-7 flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{stat.label}</p><Icon size={18} className="text-primary/65" /></div><p className="font-['Segoe_UI'] text-3xl font-bold tracking-tight">{stat.value}</p><p className="mt-2 text-xs font-semibold text-muted-foreground">{stat.delta}</p></div>; })}</section>
            <div className="grid gap-7 xl:grid-cols-[1fr_340px]"><section className="border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-['Segoe_UI'] text-lg font-bold">Autos recentes</h2><p className="mt-0.5 text-xs text-muted-foreground">Últimos registros encontrados no Supabase</p></div><button onClick={() => navigate("autos")} className="text-xs font-bold text-primary hover:underline">Ver todos</button></div><AutoTable autos={autos.slice(0, 5)} onSelect={setSelectedAuto} /></section><aside className="border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-['Segoe_UI'] text-lg font-bold">Resumo operacional</h2><p className="mt-0.5 text-xs text-muted-foreground">Situação atual dos registros</p></div><div className="space-y-4 p-5">{Object.entries(statusToUi).map(([dbStatus, uiStatus]) => <div key={dbStatus} className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{uiStatus}</span><span className="text-sm font-bold">{autos.filter((a) => a.status === uiStatus).length}</span></div>)}</div><div className="m-5 border-l-2 border-accent bg-secondary p-4"><p className="text-xs font-bold">Dados reais</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Os indicadores e a listagem são carregados da base de dados, não de exemplos demonstrativos.</p></div></aside></div>
          </div>}

          {screen === "autos" && <div><PageHeading eyebrow="Gerenciar auto · GA04" title="Autos de infração" description="Consulte registros por protocolo, CPF/CNPJ, contribuinte, local ou situação." action={<button onClick={() => navigate("novo")} className="flex h-11 items-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground"><Plus size={17} /> Novo auto</button>} /><section className="mb-5 border border-border bg-card p-4 md:p-5"><div className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_220px_auto]"><div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Protocolo, CPF/CNPJ ou contribuinte" className={`${inputClass} pl-10`} /></div><div className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as Status | "Todos")} className={`${inputClass} appearance-none pr-9`}><option>Todos</option>{Object.keys(statusStyle).map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /></div><button onClick={() => { setQuery(""); setStatusFilter("Todos"); }} className="flex h-11 items-center justify-center gap-2 border border-border px-4 text-sm font-bold hover:bg-muted"><Filter size={16} /> Limpar filtros</button></div></section><section className="border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="text-sm font-bold">{filteredAutos.length} autos encontrados</p><button onClick={() => exportCsv(filteredAutos)} className="text-xs font-bold text-muted-foreground hover:text-primary">Exportar CSV</button></div>{filteredAutos.length ? <AutoTable autos={filteredAutos} onSelect={setSelectedAuto} /> : <div className="py-20 text-center"><Search className="mx-auto mb-4 text-muted-foreground/50" /><p className="font-bold">Nenhum auto encontrado.</p><p className="mt-1 text-sm text-muted-foreground">Revise os critérios e tente novamente.</p></div>}</section></div>}

          {screen === "novo" && <div><button onClick={() => navigate("autos")} className="mb-5 flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary"><ArrowLeft size={15} /> Voltar para autos</button><PageHeading eyebrow="Lavratura · GA01" title="Novo auto de infração" description="Preencha os dados do estabelecimento, da fiscalização e da ocorrência." />
            <form onSubmit={handleCreateAuto} className="grid gap-6 xl:grid-cols-[1fr_310px]"><div className="space-y-6">
              <FormSection number="00" title="Identificação do auto" description="Informe o número que consta na versão física do documento."><Field label="Número do auto de infração" required><input name="numero_auto" required className={inputClass} placeholder="Digite o número impresso no auto físico" /></Field></FormSection>
              <FormSection
  number="01"
  title="Identificação do Contribuinte"
  description="Informe os dados cadastrais e o endereço do contribuinte fiscalizado."
>
  <div className="grid gap-4 md:grid-cols-2">
    <Field label="Nome / Razão Social" required>
      <input name="nome_contribuinte" required className={inputClass} placeholder="Nome da pessoa ou razão social" />
    </Field>

    <Field label="Nome Fantasia">
      <input name="nome_fantasia" className={inputClass} placeholder="Nome fantasia (opcional)" />
    </Field>

    <Field label="CPF ou CNPJ" required>
      <input name="documento" required className={inputClass} placeholder="Digite o CPF ou o CNPJ" />
    </Field>

    <Field label="CNAE da atividade" required>
      <input name="cnae" required className={inputClass} placeholder="Ex.: 5611-2/01" />
    </Field>
  </div>

  {/* Endereço do Contribuinte */}
  <div className="mt-4 grid gap-4 md:grid-cols-3">
    <Field label="Logradouro / Rua">
      <input name="rua" className={inputClass} placeholder="Rua / Avenida do contribuinte" />
    </Field>
    <Field label="Número">
      <input name="numero" className={inputClass} placeholder="Nº" />
    </Field>
    <Field label="Bairro">
      <input name="bairro" className={inputClass} placeholder="Bairro" />
    </Field>
  </div>
</FormSection>
              <FormSection number="02" title="Período da fiscalização" description="Registre a data e o horário de início e término da ação fiscal."><div className="grid gap-4 md:grid-cols-2"><Field label="Data de início" required><input name="data_inicio" type="date" required defaultValue={today()} className={inputClass} /></Field><Field label="Hora de início" required><input name="hora_inicio" type="time" required className={inputClass} /></Field><Field label="Data de término" required><input name="data_fim" type="date" required defaultValue={today()} className={inputClass} /></Field><Field label="Hora de término" required><input name="hora_fim" type="time" required className={inputClass} /></Field></div></FormSection>
              <FormSection
  number="03"
  title="Descrição da ocorrência"
  description="Informe o local exato e descreva objetivamente os fatos constatados durante a fiscalização."
>
  <div className="grid gap-4">
    <Field label="Endereço da Infração" required>
      <input
        name="local_ocorrencia"
        required
        className={inputClass}
        placeholder="Endereço / local onde a infração foi cometida"
      />
    </Field>

    <Field label="Descrição" required>
      <textarea
        name="descricao_detalhada"
        required
        rows={4}
        className={inputClass}
        placeholder="Relate os fatos observados, as condições encontradas e demais informações relevantes..."
      />
    </Field>
  </div>
</FormSection>
              <FormSection
  number="04"
  title="Enquadramento da infração"
  description="Selecione a natureza da infração, informe o fundamento legal e o valor base."
>
  <div className="grid gap-4 md:grid-cols-3">
    <Field label="Tipo de infração" required>
      <select name="tipo_infracao" required defaultValue="" className={inputClass}>
        <option value="" disabled>Selecione o tipo de infração</option>
        <option>Sanitária</option>
        <option>Ambiental</option>
        <option>Posturas municipais</option>
        <option>Funcionamento irregular</option>
        <option>Outra</option>
      </select>
    </Field>

    <Field label="Base legal" required>
      <input name="base_legal" required className={inputClass} placeholder="Lei, artigo, inciso ou dispositivo legal" />
    </Field>

   <Field label="Valor base da multa (UFMs)">
            <input name="valor_base" type="number" step="0.01" className={inputClass} placeholder="Ex: 15" />
          </Field>
        </div>
      </FormSection>
              <FormSection number="05" title="Assinatura do responsável" description="Informe se o responsável pelo estabelecimento assinou o auto."><Field label="O responsável assinou o auto?" required><select name="responsavel_assinou" required defaultValue="" className={inputClass}><option value="" disabled>Selecione uma opção</option><option value="Sim">Sim</option><option value="Não">Não</option></select></Field></FormSection>
              <FormSection number="06" title="Testemunha" description="Registre os dados da testemunha, se houver. Preferencialmente outro agente de fiscalização."><div className="grid gap-4 md:grid-cols-2"><Field label="Nome da testemunha"><input name="testemunha_nome" className={inputClass} placeholder="Nome completo" /></Field><Field label="Matrícula da testemunha"><input name="testemunha_matricula" className={inputClass} placeholder="Matrícula funcional" /></Field></div></FormSection>
              <FormSection number="07" title="Agente responsável pela lavratura" description="O agente responsável é identificado automaticamente pela sessão autenticada."><div className="grid gap-4 md:grid-cols-2"><Field label="Agente de fiscalização"><input readOnly value={fiscais.find((f) => f.matricula_fiscal === usuario?.matricula_fiscal)?.nome || usuario?.nome || "Agente não identificado"} className={`${inputClass} bg-muted`} /></Field><Field label="Matrícula"><input readOnly value={usuario?.matricula_fiscal || "Matrícula não vinculada à sessão"} className={`${inputClass} bg-muted`} /></Field></div></FormSection>
              <FormSection number="08" title="Observações" description="Acrescente informações complementares relevantes para o processo."><Field label="Observações"><textarea name="observacoes" rows={4} className="w-full resize-y border border-border bg-white p-3.5 text-sm outline-none focus:border-primary" placeholder="Informações adicionais..." /></Field></FormSection>
              <FormSection number="09" title="Imagens da fiscalização" description="Adicione fotografias que documentem a ocorrência (até 6 imagens, 2 MB cada)."><Field label="Adicionar imagens"><input name="imagens" type="file" accept="image/*" multiple className="block w-full border border-dashed border-border bg-muted/30 p-4 text-sm file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:font-bold file:text-primary-foreground" /></Field><p className="mt-2 text-xs text-muted-foreground">As imagens serão armazenadas no Supabase Storage, no bucket autos-evidencias.</p></FormSection>
            </div><aside><div className="sticky top-24 border border-border bg-card"><div className="border-b border-border p-5"><p className="font-['Segoe_UI'] text-lg font-bold">Resumo da lavratura</p></div><div className="space-y-5 p-5">{[["Número do auto", "Informado pelo fiscal"], ["Agente responsável", fiscais.find((f) => f.matricula_fiscal === usuario?.matricula_fiscal)?.nome || usuario?.nome || "Sessão autenticada"], ["Prazo de defesa", "15 dias após o início"], ["Situação inicial", "Em Aberto"]].map(([label, value]) => <div key={label}><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>)}<div className="border-l-2 border-amber-500 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><b>Atenção:</b> confira os dados antes de gerar o auto.</div><button disabled={busy} type="submit" className="flex h-12 w-full items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"><FilePlus2 size={18} /> {busy ? "Salvando..." : "Gerar auto"}</button><button type="reset" className="h-11 w-full border border-border text-sm font-bold hover:bg-muted">Limpar formulário</button></div></div></aside></form></div>}

        </main>
      </div>


{selectedAuto && (
  <div
    className="fixed inset-0 z-50 flex justify-end bg-black/40"
    onMouseDown={(event) =>
      event.target === event.currentTarget &&
      (setSelectedAuto(null), setEditMode(false))
    }
  >
    <aside className="h-full w-full max-w-[900px] overflow-y-auto bg-background shadow-2xl">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
        <div>
          <p className="font-['Segoe_UI'] text-xs font-bold text-primary">
            {selectedAuto.id}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Detalhes do auto
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedAuto(null);
            setEditMode(false);
          }}
          className="p-2 hover:bg-muted"
        >
          <X size={20} />
        </button>
      </div>

      <div className="p-5 md:p-7">
        {!editMode ? (
          <>
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-['Segoe_UI'] text-2xl font-bold">
                  {selectedAuto.razaoSocial || selectedAuto.contribuinte}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedAuto.documento}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto nº {selectedAuto.id}
                </p>
              </div>
              <StatusBadge status={selectedAuto.status} />
            </div>

            <div className="space-y-5">
              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  00 — Identificação do auto
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Número do auto" value={selectedAuto.id} />
                  <DetailField label="Data da lavratura" value={selectedAuto.data} />
                  <DetailField label="Prazo de defesa" value={formatDate(selectedAuto.prazo)} />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  01 — Identificação do contribuinte
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Razão social / Nome" value={selectedAuto.razaoSocial} />
                  <DetailField label="Nome fantasia" value={selectedAuto.nomeFantasia} />
                  <DetailField label="CPF / CNPJ" value={selectedAuto.documento} />
                  <DetailField label="CNAE" value={selectedAuto.cnae} />
                  <DetailField label="Rua" value={selectedAuto.rua} />
                  <DetailField label="Número" value={selectedAuto.numero} />
                  <DetailField label="Bairro" value={selectedAuto.bairro} />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  02 — Período da fiscalização
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Início" value={formatDateTime(selectedAuto.inicioFiscalizacao)} />
                  <DetailField label="Término" value={formatDateTime(selectedAuto.fimFiscalizacao)} />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  03 — Descrição da ocorrência
                </h3>
                <div className="space-y-4 p-4">
                  <DetailField label="Local da ocorrência" value={selectedAuto.local} />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Descrição detalhada
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7">
                      {selectedAuto.descricao || "Não informado"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  04 — Enquadramento da infração
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Tipo de infração" value={selectedAuto.infracao} />
                  <DetailField label="Base legal" value={selectedAuto.baseLegal} />
                  <DetailField
                    label="Valor base"
                    value={selectedAuto.valor_base != null ? `${selectedAuto.valor_base} UFMs` : "Não informado"}
                  />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  05 — Assinatura do responsável
                </h3>
                <div className="p-4">
                  <DetailField
                    label="O responsável assinou?"
                    value={
                      selectedAuto.responsavelAssinou === null
                        ? selectedAuto.assinatura || "Não informado"
                        : selectedAuto.responsavelAssinou ? "Sim" : "Não"
                    }
                  />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  06 — Testemunha
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Nome" value={selectedAuto.testemunhaNome} />
                  <DetailField label="Matrícula" value={selectedAuto.testemunhaMatricula} />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  07 — Agente responsável pela lavratura
                </h3>
                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <DetailField label="Agente" value={selectedAuto.fiscal} />
                  <DetailField label="Matrícula" value={selectedAuto.fiscalMatricula} />
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  08 — Observações
                </h3>
                <div className="p-4">
                  <p className="whitespace-pre-line text-sm leading-7">
                    {selectedAuto.observacoes || "Nenhuma observação informada."}
                  </p>
                </div>
              </section>

              <section className="border border-border bg-card">
                <h3 className="border-b border-border p-4 font-bold">
                  09 — Imagens da fiscalização
                </h3>
                <div className="space-y-3 p-4">
                  {selectedAuto.imagens.length > 0 ? (
                    selectedAuto.imagens.map((url, index) => (
                      <a
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-11 items-center gap-2 border border-border px-4 text-sm font-semibold text-primary hover:bg-muted"
                      >
                        <UploadCloud size={17} />
                        Visualizar imagem {index + 1}
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma imagem anexada.
                    </p>
                  )}

                  {selectedAuto.url && (
                    <a
                      href={selectedAuto.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-11 items-center gap-2 border border-border px-4 text-sm font-semibold text-primary hover:bg-muted"
                    >
                      <FileText size={17} />
                      Abrir documento anexado
                    </a>
                  )}
                </div>
              </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {podeGerenciarAuto(selectedAuto) ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex h-11 items-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground"
                  >
                    <Edit3 size={16} /> Editar auto
                  </button>
                  <button
                    onClick={() => setDeleteTarget(selectedAuto)}
                    className="flex h-11 items-center gap-2 border border-destructive px-5 text-sm font-bold text-destructive hover:bg-red-50"
                  >
                    <Trash2 size={16} /> Excluir auto
                  </button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Somente o agente responsável pela lavratura pode editar ou excluir este auto.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-5 font-['Segoe_UI'] text-2xl font-bold">
              Editar auto de infração
            </h2>
            <form onSubmit={handleUpdateAuto} className="space-y-4">
              <Field label="Número do auto" required>
                <input name="numero_auto" required defaultValue={selectedAuto.id} className={inputClass} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Data" required>
                  <input name="data_auto" type="date" required defaultValue={selectedAuto.dataISO} className={inputClass} />
                </Field>
                <Field label="Situação" required>
                  <select name="status_processo" defaultValue={selectedAuto.status} className={inputClass}>
                    {Object.keys(statusToDb).map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="border border-border bg-muted/40 p-3 text-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Agente responsável pela lavratura
                </span>
                <span className="mt-1 block font-semibold">
                  {selectedAuto.fiscal} — Matrícula {selectedAuto.fiscalMatricula}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  A autoria do auto não pode ser alterada.
                </span>
              </div>
              <Field label="Local da ocorrência" required>
                <input name="local_ocorrencia" required defaultValue={selectedAuto.local === "—" ? "" : selectedAuto.local} className={inputClass} />
              </Field>
              <Field label="Valor base da multa (UFMs)">
                <input name="valor_base" type="number" step="0.01" defaultValue={selectedAuto.valor_base ?? (selectedAuto.valor === "—" ? "" : selectedAuto.valor)} className={inputClass} placeholder="Ex: 15" />
              </Field>
              <Field label="Prazo de defesa">
                <input name="prazo_defesa" type="date" defaultValue={selectedAuto.prazo?.slice(0, 10) || ""} className={inputClass} />
              </Field>
              <Field label="Descrição detalhada" required>
                <textarea name="descricao_detalhada" required rows={6} defaultValue={selectedAuto.descricao} className="w-full border border-border bg-white p-3.5 text-sm outline-none focus:border-primary" />
              </Field>
              <Field label="URL da evidência">
                <input name="url_auto" type="url" defaultValue={selectedAuto.url || ""} className={inputClass} />
              </Field>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setEditMode(false)} className="h-10 border border-border px-5 text-sm font-bold">
                  Cancelar
                </button>
                <button disabled={busy} type="submit" className="h-10 bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60">
                  {busy ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </aside>
  </div>
)}


      {deleteTarget && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4"><div className="w-full max-w-md bg-card p-6 shadow-2xl"><div className="mb-5 grid h-12 w-12 place-items-center bg-red-50 text-destructive"><AlertTriangle size={23} /></div><h2 className="font-['Segoe_UI'] text-xl font-bold">Excluir auto de infração?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Deseja realmente excluir o auto <b className="text-foreground">{deleteTarget.id}</b>? Esta ação não poderá ser desfeita.</p><div className="mt-7 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="h-10 border border-border px-5 text-sm font-bold">Cancelar</button><button disabled={busy} onClick={confirmDelete} className="h-10 bg-destructive px-5 text-sm font-bold text-white disabled:opacity-60">{busy ? "Excluindo..." : "Confirmar exclusão"}</button></div></div></div>}
      {notice && <div className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 border-l-4 border-emerald-500 bg-[#163f32] px-5 py-4 text-sm font-semibold text-white shadow-xl"><Check size={18} className="text-emerald-300" />{notice}<button onClick={() => setNotice("")} className="ml-2 text-white/60"><X size={16} /></button></div>}
    </div>
  );
}

function AutoTable({ autos, onSelect }: { autos: Auto[]; onSelect: (item: Auto) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[860px]"><thead><tr className="border-b border-border bg-muted/60 text-left">{["Protocolo", "Contribuinte", "Infração", "Data", "Situação", ""].map((head, index) => <th key={`${head}-${index}`} className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{head}</th>)}</tr></thead><tbody className="divide-y divide-border">{autos.map((item) => <tr key={item.id_auto} onClick={() => onSelect(item)} className="cursor-pointer transition hover:bg-secondary/60"><td className="px-5 py-4 font-['Segoe_UI'] text-xs font-bold text-primary">{item.id}</td><td className="px-5 py-4"><p className="text-sm font-bold">{item.contribuinte}</p><p className="mt-1 font-['Segoe_UI'] text-[10px] text-muted-foreground">{item.documento}</p></td><td className="max-w-[220px] px-5 py-4 text-xs text-foreground/80">{item.infracao}</td><td className="px-5 py-4 text-xs font-semibold">{item.data}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4"><button aria-label={`Abrir ${item.id}`} className="p-2 text-muted-foreground hover:bg-muted hover:text-primary"><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div>;
}
function exportCsv(autos: Auto[]) {
  const rows = [["Protocolo", "Contribuinte", "Documento", "Infracao", "Data", "Local", "Fiscal", "Status"], ...autos.map((a) => [a.id, a.contribuinte, a.documento, a.infracao, a.data, a.local, a.fiscal, a.status])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "autos-de-infracao.csv"; anchor.click(); URL.revokeObjectURL(url);
}
