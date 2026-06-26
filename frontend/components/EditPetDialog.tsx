import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const SERVICES = ["Hospedagem", "Recreação", "Banho e Tosa"];

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  services: string[];
  check_in?: string;
  check_out?: string;
  tutorName?: string;
}

interface EditPetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: Pet | null;
  onSaved: (updated: Pet) => void;
}

const toDateInput = (val?: string) => {
  if (!val) return "";
  return val.split("T")[0];
};

export function EditPetDialog({ open, onOpenChange, pet, onSaved }: EditPetDialogProps) {
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pet) {
      setName(pet.name || "");
      setSpecies(pet.species || "");
      setBreed(pet.breed || "");
      setAge(pet.age || "");
      setSelectedServices(pet.services || []);
      setCheckIn(toDateInput(pet.check_in));
      setCheckOut(toDateInput(pet.check_out));
    }
  }, [pet]);

  const toggleService = (s: string) => {
    setSelectedServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("petmonitor_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pets/${pet.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, species, breed, age, services: selectedServices, checkIn, checkOut }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Erro ao atualizar pet."); return; }

      toast.success("Pet atualizado com sucesso!");
      onSaved({ ...pet, name, species, breed, age, services: selectedServices, check_in: checkIn, check_out: checkOut });
      onOpenChange(false);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pet</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-pet-name">Nome</Label>
              <Input id="edit-pet-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pet-species">Espécie</Label>
              <Input id="edit-pet-species" value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Cão, Gato..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-pet-breed">Raça</Label>
              <Input id="edit-pet-breed" value={breed} onChange={(e) => setBreed(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pet-age">Idade</Label>
              <Input id="edit-pet-age" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Ex: 3 anos" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-pet-checkin">Check-in</Label>
              <Input id="edit-pet-checkin" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pet-checkout">Check-out</Label>
              <Input id="edit-pet-checkout" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Serviços Contratados</Label>
            <div className="flex gap-4">
              {SERVICES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-pet-service-${s}`}
                    checked={selectedServices.includes(s)}
                    onCheckedChange={() => toggleService(s)}
                  />
                  <label htmlFor={`edit-pet-service-${s}`} className="text-sm cursor-pointer">{s}</label>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
