import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  CheckCircle2,
  Printer,
  User,
  PawPrint,
  Key,
  Calendar,
  Building2,
  Clock,
} from "lucide-react";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  tutorName: string;
  services: string[];
  checkIn: string;
  checkOut: string;
}

interface Tutor {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
  password: string;
}

interface RegistrationData {
  tutor: Tutor;
  pet: Pet;
}

interface RegistrationConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RegistrationData | null;
}

export function RegistrationConfirmation({
  open,
  onOpenChange,
  data,
}: RegistrationConfirmationProps) {
  const calculateStayDuration = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    if (!data) return;

    const protocol = data.pet.id
      ? `PET-${data.pet.id.toString().replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
      : `PET-${Date.now().toString().slice(-6)}`;

    const emissionDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const durationDays = calculateStayDuration(data.pet.checkIn, data.pet.checkOut);

    const servicesHtml = data.pet.services && data.pet.services.length > 0
      ? data.pet.services.map((s) => `
          <span style="display:inline-block; padding: 4px 10px; margin: 3px 4px 3px 0; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1e293b;">
            🐾 ${s}
          </span>
        `).join("")
      : `<span style="font-size: 12px; color: #64748b;">Nenhum serviço extra selecionado.</span>`;

    // Criação de iframe isolado para garantir 100% de precisão sem bloqueios do Radix UI
    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0px";
    printIframe.style.height = "0px";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);

    const printDoc = printIframe.contentWindow?.document;
    if (!printDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante de Cadastro - Hotel Pet Paradise</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 12px;
            line-height: 1.4;
          }
          .container {
            width: 100%;
            max-width: 100%;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .brand {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .brand-logo {
            width: 42px;
            height: 42px;
            background: #0f172a;
            color: #ffffff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .brand-text h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .brand-text p {
            margin: 2px 0 0 0;
            font-size: 11px;
            color: #475569;
            font-weight: 500;
          }
          .meta-info {
            text-align: right;
          }
          .badge-voucher {
            display: inline-block;
            background: #e2e8f0;
            border: 1px solid #cbd5e1;
            color: #0f172a;
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .meta-text {
            margin: 3px 0 0 0;
            font-size: 10px;
            color: #64748b;
          }
          .card {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 12px;
            background: #ffffff;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .card-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 10px;
          }
          .field-label {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .field-value {
            font-size: 13px;
            font-weight: 600;
            color: #0f172a;
          }
          .card-highlight {
            border: 2px solid #4f46e5;
            background: #f8fafc;
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .highlight-title {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #4338ca;
            border-bottom: 1px solid #c7d2fe;
            padding-bottom: 6px;
            margin-bottom: 6px;
          }
          .highlight-subtitle {
            font-size: 10.5px;
            color: #475569;
            margin: 0 0 10px 0;
          }
          .cred-box {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .cred-label {
            font-size: 9.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .cred-value {
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
          }
          .sub-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 8px 10px;
          }
          .signatures {
            margin-top: 24px;
            padding-top: 12px;
            border-top: 1px solid #cbd5e1;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .terms-text {
            font-size: 9.5px;
            color: #64748b;
            line-height: 1.4;
            margin-bottom: 30px;
          }
          .sign-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
          .sign-block {
            text-align: center;
          }
          .sign-line {
            border-top: 1px solid #0f172a;
            padding-top: 4px;
          }
          .sign-name {
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .sign-role {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            margin: 2px 0 0 0;
          }
          .footer {
            margin-top: 20px;
            padding-top: 8px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            font-size: 9px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <div class="brand">
              <div class="brand-logo">🐾</div>
              <div class="brand-text">
                <h1>Hotel Pet Paradise</h1>
                <p>Hospedagem, Recreação & Monitoramento ao Vivo 24h</p>
              </div>
            </div>
            <div class="meta-info">
              <div class="badge-voucher">Comprovante de Hospedagem</div>
              <p class="meta-text">Protocolo: <strong>${protocol}</strong></p>
              <p class="meta-text">Emissão: ${emissionDate}</p>
            </div>
          </div>

          <!-- Tutor Info -->
          <div class="card">
            <div class="card-title">👤 Dados do Tutor / Responsável</div>
            <div class="grid-3">
              <div>
                <div class="field-label">Nome Completo</div>
                <div class="field-value">${data.tutor.name}</div>
              </div>
              <div>
                <div class="field-label">E-mail</div>
                <div class="field-value">${data.tutor.email || "—"}</div>
              </div>
              <div>
                <div class="field-label">Telefone / WhatsApp</div>
                <div class="field-value">${data.tutor.phone || "—"}</div>
              </div>
            </div>
          </div>

          <!-- Credentials Box -->
          <div class="card-highlight">
            <div class="highlight-title">🔑 Credenciais de Acesso ao Pet Monitor (Câmeras ao Vivo)</div>
            <p class="highlight-subtitle">
              Acesse o aplicativo pelo navegador do seu celular ou computador para acompanhar seu pet em tempo real.
            </p>
            <div class="grid-2">
              <div class="cred-box">
                <div class="cred-label">Usuário de Acesso (Login)</div>
                <div class="cred-value">${data.tutor.username}</div>
              </div>
              <div class="cred-box">
                <div class="cred-label">Senha Temporária</div>
                <div class="cred-value">${data.tutor.password}</div>
              </div>
            </div>
          </div>

          <!-- Pet Info & Stay -->
          <div class="card">
            <div class="card-title">🐾 Dados do Pet & Período de Estadia</div>
            
            <div class="grid-4" style="margin-bottom: 10px;">
              <div>
                <div class="field-label">Nome do Pet</div>
                <div class="field-value">${data.pet.name}</div>
              </div>
              <div>
                <div class="field-label">Espécie</div>
                <div class="field-value">${data.pet.species || "—"}</div>
              </div>
              <div>
                <div class="field-label">Raça</div>
                <div class="field-value">${data.pet.breed || "Não informada"}</div>
              </div>
              <div>
                <div class="field-label">Idade</div>
                <div class="field-value">${data.pet.age ? `${data.pet.age} ano(s)` : "—"}</div>
              </div>
            </div>

            <div class="grid-3 sub-box">
              <div>
                <div class="field-label">📅 Check-in</div>
                <div class="field-value">${formatDate(data.pet.checkIn)}</div>
              </div>
              <div>
                <div class="field-label">📅 Check-out</div>
                <div class="field-value">${formatDate(data.pet.checkOut)}</div>
              </div>
              <div>
                <div class="field-label">⏱️ Duração da Estadia</div>
                <div class="field-value">${durationDays} dia(s)</div>
              </div>
            </div>
          </div>

          <!-- Contracted Services -->
          <div class="card">
            <div class="card-title">🏨 Serviços Contratados & Acesso a Câmeras</div>
            <div>
              ${servicesHtml}
            </div>
          </div>

          <!-- Signatures & Terms -->
          <div class="signatures">
            <p class="terms-text">
              * Declaro que as informações cadastrais e de saúde do pet são verdadeiras. Estou ciente de que as credenciais acima fornecem acesso exclusivo às câmeras das áreas contratadas durante o período de hospedagem e que a senha pode ser alterada no primeiro login.
            </p>

            <div class="sign-grid">
              <div class="sign-block">
                <div class="sign-line">
                  <p class="sign-name">${data.tutor.name}</p>
                  <p class="sign-role">Assinatura do Tutor / Responsável</p>
                </div>
              </div>
              <div class="sign-block">
                <div class="sign-line">
                  <p class="sign-name">Hotel Pet Paradise</p>
                  <p class="sign-role">Recepção / Responsável pelo Check-in</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            Hotel Pet Paradise • Sistema Pet Monitor • Cuidando do seu pet com carinho, segurança e transparência.
          </div>

        </div>
      </body>
      </html>
    `;

    printDoc.open();
    printDoc.write(htmlContent);
    printDoc.close();

    // Dispara a impressão a partir do iframe isolado
    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      // Remove o iframe após o diálogo de impressão fechar
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 2000);
    }, 250);
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 dark:bg-emerald-950/60 p-3 rounded-full text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Cadastro Realizado com Sucesso!</DialogTitle>
              <DialogDescription>
                Confira os dados do tutor e do pet cadastrados abaixo. Você pode imprimir o comprovante agora ou fechar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 text-slate-900 dark:text-slate-100" id="registration-summary">
          
          {/* ── Section: Tutor Information ──────────────────────────────────── */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              <User className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">Dados do Tutor</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Nome Completo</p>
                <p className="font-semibold mt-0.5">{data.tutor.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">E-mail</p>
                <p className="font-medium mt-0.5">{data.tutor.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Telefone / WhatsApp</p>
                <p className="font-medium mt-0.5">{data.tutor.phone || "—"}</p>
              </div>
            </div>
          </div>

          {/* ── Section: Credentials Highlight Box ──────────────────────────── */}
          <div className="rounded-lg border-2 border-indigo-200 dark:border-indigo-900/60 p-4 bg-indigo-50/70 dark:bg-indigo-950/30">
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-indigo-200/80 dark:border-indigo-900/40">
              <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-sm text-indigo-950 dark:text-indigo-200 uppercase tracking-wide">
                Credenciais de Acesso ao Pet Monitor (Câmeras ao Vivo)
              </h3>
            </div>
            
            <p className="text-xs text-indigo-800 dark:text-indigo-300 mb-3">
              Acesse o sistema pelo navegador do seu celular ou computador para acompanhar seu pet em tempo real.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                <p className="text-xs text-muted-foreground font-medium">Usuário (Login)</p>
                <p className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                  {data.tutor.username}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-950 p-2.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                <p className="text-xs text-muted-foreground font-medium">Senha Temporária</p>
                <p className="font-mono font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                  {data.tutor.password}
                </p>
              </div>
            </div>
          </div>

          {/* ── Section: Pet Details & Stay Period ───────────────────────────── */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              <PawPrint className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">Dados do Pet & Estadia</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Nome do Pet</p>
                <p className="font-bold text-base mt-0.5">{data.pet.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Espécie</p>
                <p className="font-medium mt-0.5">{data.pet.species || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Raça</p>
                <p className="font-medium mt-0.5">{data.pet.breed || "Não informada"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Idade</p>
                <p className="font-medium mt-0.5">{data.pet.age ? `${data.pet.age} ano(s)` : "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3 rounded-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm">
              <div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Check-in
                </p>
                <p className="font-semibold mt-1">{formatDate(data.pet.checkIn)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Check-out
                </p>
                <p className="font-semibold mt-1">{formatDate(data.pet.checkOut)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Duração
                </p>
                <p className="font-semibold mt-1 text-primary">
                  {calculateStayDuration(data.pet.checkIn, data.pet.checkOut)} dia(s)
                </p>
              </div>
            </div>
          </div>

          {/* ── Section: Contracted Services & Cameras ──────────────────────── */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm uppercase tracking-wide">Serviços Contratados & Acesso a Câmeras</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {data.pet.services && data.pet.services.length > 0 ? (
                data.pet.services.map((service) => (
                  <Badge
                    key={service}
                    variant="secondary"
                    className="text-xs px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-semibold shadow-xs"
                  >
                    🐾 {service}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum serviço extra selecionado.</p>
              )}
            </div>
          </div>

          {/* ── Action Buttons ──────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex-1 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
            >
              <Printer className="w-4 h-4 mr-2 text-slate-700 dark:text-slate-300" />
              Imprimir Comprovante
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              Concluir & Fechar
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}