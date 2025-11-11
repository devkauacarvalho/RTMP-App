import { useEffect } from "react";
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
  useEffect(() => {
    // Cleanup function to restore display after print
    const handleAfterPrint = () => {
      document.body.classList.remove('printing');
      const dashboard = document.getElementById('admin-dashboard');
      if (dashboard) {
        dashboard.style.display = '';
      }
    };

    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handlePrint = () => {
    // Add print class to body
    document.body.classList.add('printing');
    
    // Also hide the main dashboard directly
    const dashboard = document.getElementById('admin-dashboard');
    if (dashboard) {
      dashboard.style.display = 'none';
    }
    
    // Wait for class to be applied, then print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const calculateStayDuration = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print-content" data-print-content>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <DialogTitle>Cadastro Realizado com Sucesso!</DialogTitle>
              <DialogDescription>
                Confira os dados cadastrados abaixo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:text-black" id="registration-summary">
          {/* Header for print */}
          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">Hotel Pet Paradise</h1>
            <p className="text-muted-foreground">Comprovante de Cadastro</p>
          </div>

          {/* Tutor Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="w-5 h-5 text-primary" />
              <h3>Dados do Tutor</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Nome Completo</p>
                <p>{data.tutor.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">E-mail</p>
                <p>{data.tutor.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Telefone</p>
                <p>{data.tutor.phone}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 print:border-gray-300">
              <p className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Credenciais de Acesso
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Usuário</p>
                  <p className="font-mono bg-white px-2 py-1 rounded border">
                    {data.tutor.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Senha</p>
                  <p className="font-mono bg-white px-2 py-1 rounded border">
                    {data.tutor.password}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pet Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <PawPrint className="w-5 h-5 text-primary" />
              <h3>Dados do Pet</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Nome do Pet</p>
                <p>{data.pet.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Espécie</p>
                <p>{data.pet.species}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-muted-foreground">Raça</p>
                <p>{data.pet.breed}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-muted-foreground">Idade</p>
                <p>{data.pet.age}</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3 print:border-gray-300">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período de Estadia
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Check-in</p>
                  <p>{formatDate(data.pet.checkIn)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Check-out</p>
                  <p>{formatDate(data.pet.checkOut)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Duração</p>
                  <p>
                    {calculateStayDuration(data.pet.checkIn, data.pet.checkOut)}{" "}
                    dia(s)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Serviços Contratados
              </p>
              <div className="flex flex-wrap gap-2">
                {data.pet.services.map((service) => (
                  <Badge
                    key={service}
                    variant="secondary"
                    className="print:border print:border-gray-300"
                  >
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Footer for print */}
          <div className="hidden print:block text-center text-sm text-muted-foreground border-t pt-4 mt-6">
            <p>Hotel Pet Paradise - Cuidando do seu pet com carinho</p>
            <p>Data de emissão: {new Date().toLocaleDateString("pt-BR")}</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t print:hidden">
            <Button onClick={handlePrint} variant="outline" className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Cadastro
            </Button>
            <Button onClick={() => onOpenChange(false)} className="flex-1">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}