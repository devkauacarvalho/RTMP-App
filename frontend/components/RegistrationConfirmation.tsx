import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  pets: Pet[];
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

    const hasPets = data.pets && data.pets.length > 0;
    
    const protocol = hasPets && data.pets[0].id
      ? `PET-${data.pets[0].id.toString().replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
      : `TUTOR-${Date.now().toString().slice(-6)}`;

    const emissionDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isNoPetLogin = data.tutor.password.startsWith("nopet_");

    let petsHtml = "";
    if (hasPets) {
      petsHtml = data.pets.map((pet, index) => {
        const durationDays = calculateStayDuration(pet.checkIn, pet.checkOut);
        const servicesHtml = pet.services && pet.services.length > 0
          ? pet.services.map((s) => `
              <span style="display:inline-block; padding: 4px 10px; margin: 3px 4px 3px 0; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11px; font-weight: 600; color: #1e293b;">
                🐾 ${s}
              </span>
            `).join("")
          : `<span style="font-size: 12px; color: #64748b;">Nenhum serviço extra selecionado.</span>`;

        return `
          <div class="card" style="margin-top: 15px;">
            <div class="card-title">🐾 Dados do Pet ${index + 1} & Período de Estadia</div>
            <div class="grid-4" style="margin-bottom: 10px;">
              <div><div class="field-label">Nome do Pet</div><div class="field-value">${pet.name}</div></div>
              <div><div class="field-label">Espécie</div><div class="field-value">${pet.species || "—"}</div></div>
              <div><div class="field-label">Raça</div><div class="field-value">${pet.breed || "Não informada"}</div></div>
              <div><div class="field-label">Idade</div><div class="field-value">${pet.age ? `${pet.age} ano(s)` : "—"}</div></div>
            </div>
            <div class="grid-3 sub-box">
              <div><div class="field-label">📅 Check-in</div><div class="field-value">${formatDate(pet.checkIn)}</div></div>
              <div><div class="field-label">📅 Check-out</div><div class="field-value">${formatDate(pet.checkOut)}</div></div>
              <div><div class="field-label">⏱️ Duração da Estadia</div><div class="field-value">${durationDays} dia(s)</div></div>
            </div>
            <div style="margin-top: 15px;">
              <div class="card-title" style="border: none; font-size: 12px; margin-bottom: 5px;">Serviços Contratados:</div>
              <div>${servicesHtml}</div>
            </div>
          </div>
        `;
      }).join("");
    } else {
      petsHtml = `
        <div class="card" style="margin-top: 15px; text-align: center; color: #64748b;">
          Nenhum pet cadastrado no momento.
        </div>
      `;
    }

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
        <title>Comprovante de Cadastro - Pet La Belle</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; font-size: 12px; line-height: 1.4; }
          .container { width: 100%; max-width: 100%; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand-logo { width: 40px; height: 40px; background: #0f172a; color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
          .brand-text h1 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .brand-text p { margin: 2px 0 0; font-size: 10px; color: #64748b; font-weight: 500; }
          .meta-info { text-align: right; }
          .badge-voucher { display: inline-block; background: #f1f5f9; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 10px; text-transform: uppercase; color: #475569; border: 1px solid #cbd5e1; margin-bottom: 6px; }
          .meta-text { margin: 2px 0; font-size: 11px; color: #334155; }
          .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
          .card-highlight { background: #f8fafc; border: 2px solid #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
          .card-title { font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
          .highlight-title { font-size: 13px; font-weight: 800; color: #1d4ed8; text-transform: uppercase; margin-bottom: 6px; }
          .highlight-subtitle { font-size: 11px; color: #3b82f6; margin-top: 0; margin-bottom: 12px; font-weight: 500; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; }
          .field-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field-value { font-size: 13px; color: #0f172a; font-weight: 600; }
          .sub-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
          .cred-box { background: #ffffff; border: 1px solid #bfdbfe; padding: 10px 12px; border-radius: 6px; }
          .cred-label { font-size: 10px; color: #2563eb; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; }
          .cred-value { font-size: 14px; font-family: monospace; font-weight: 800; color: #1e3a8a; }
          .footer { margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; color: #64748b; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="brand">
              <div class="brand-logo">🐾</div>
              <div class="brand-text">
                <h1>Pet La Belle</h1>
                <p>Hospedagem, Recreação & Monitoramento ao Vivo 24h</p>
              </div>
            </div>
            <div class="meta-info">
              <div class="badge-voucher">Comprovante de Cadastro</div>
              <p class="meta-text">Protocolo: <strong>${protocol}</strong></p>
              <p class="meta-text">Emissão: ${emissionDate}</p>
            </div>
          </div>

          <div class="card">
            <div class="card-title">👤 Dados do Tutor / Responsável</div>
            <div class="grid-3">
              <div><div class="field-label">Nome Completo</div><div class="field-value">${data.tutor.name}</div></div>
              <div><div class="field-label">E-mail</div><div class="field-value">${data.tutor.email || "—"}</div></div>
              <div><div class="field-label">Telefone / WhatsApp</div><div class="field-value">${data.tutor.phone || "—"}</div></div>
            </div>
          </div>

          ${!isNoPetLogin ? `
          <div class="card-highlight">
            <div class="highlight-title">🔑 Credenciais de Acesso ao Pet Monitor</div>
            <p class="highlight-subtitle">Acesse o aplicativo pelo navegador para acompanhar seu pet em tempo real.</p>
            <div class="grid-2">
              <div class="cred-box"><div class="cred-label">Usuário de Acesso (Login)</div><div class="cred-value">${data.tutor.username}</div></div>
              <div class="cred-box"><div class="cred-label">Senha Temporária</div><div class="cred-value">${data.tutor.password}</div></div>
            </div>
          </div>
          ` : ''}

          ${petsHtml}

          <div class="footer">
            <p><strong>Pet La Belle</strong> • Sistema de Gestão e Monitoramento</p>
            <p>Este comprovante foi gerado digitalmente e serve como confirmação de cadastro no sistema.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    printDoc.open();
    printDoc.write(htmlContent);
    printDoc.close();

    printIframe.onload = () => {
      setTimeout(() => {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(printIframe), 1000);
      }, 500);
    };
  };

  if (!data) return null;
  const isNoPetLogin = data.tutor.password.startsWith("nopet_");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center">
          <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-1">Cadastro Concluído!</DialogTitle>
          <DialogDescription className="text-blue-100 text-base">
            O tutor foi registrado com sucesso no sistema.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 max-h-[60vh] overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 className="font-semibold flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-200 border-b pb-2">
              <User className="w-4 h-4 text-primary" /> Tutor Responsável
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Nome</p><p className="font-medium text-sm">{data.tutor.name}</p></div>
              <div><p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Telefone</p><p className="font-medium text-sm">{data.tutor.phone}</p></div>
            </div>
          </div>

          {!isNoPetLogin && (
            <div className="bg-blue-50 dark:bg-indigo-950/40 rounded-lg p-5 border border-blue-100 dark:border-indigo-800 shadow-sm">
              <h4 className="font-bold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
                <Key className="w-4 h-4" /> Acesso ao Portal (Câmeras ao Vivo)
              </h4>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-4 font-medium">Informe estes dados ao tutor para acesso imediato.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-100 dark:border-slate-700">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Login</p>
                  <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 break-all">{data.tutor.username}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded p-3 border border-blue-100 dark:border-slate-700">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Senha</p>
                  <p className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200 break-all">{data.tutor.password}</p>
                </div>
              </div>
            </div>
          )}

          {data.pets && data.pets.length > 0 ? (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2 text-slate-800 dark:text-slate-200 pl-1">
                <PawPrint className="w-4 h-4 text-primary" /> Pets Registrados ({data.pets.length})
              </h4>
              
              {data.pets.map((pet, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        {pet.name}
                        {pet.species && <Badge variant="secondary" className="text-[10px] h-5">{pet.species}</Badge>}
                      </h5>
                      <p className="text-xs text-muted-foreground mt-0.5">{pet.breed || "Raça não informada"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-slate-500 flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> {calculateStayDuration(pet.checkIn, pet.checkOut)} dia(s)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded">
                    <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Check-in</p><p className="text-sm font-medium">{formatDate(pet.checkIn)}</p></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Check-out</p><p className="text-sm font-medium">{formatDate(pet.checkOut)}</p></div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2 flex items-center gap-1"><Building2 className="w-3 h-3"/> Serviços Inclusos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {pet.services && pet.services.length > 0 ? (
                        pet.services.map((service, i) => (
                          <Badge key={i} variant="outline" className="bg-white dark:bg-slate-900 text-[10px] py-0">{service}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nenhum serviço selecionado</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 shadow-sm text-center">
              <PawPrint className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Tutor registrado sem pets no momento.</p>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          <Button variant="outline" className="flex-1 border-slate-200 dark:border-slate-700" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Comprovante
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white" onClick={() => onOpenChange(false)}>
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}