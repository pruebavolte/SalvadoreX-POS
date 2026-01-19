"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Store, Plus, Check, ChevronRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Vertical {
  id: string;
  name: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  icon?: string;
  active: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [showNewVerticalForm, setShowNewVerticalForm] = useState(false);
  const [newVerticalName, setNewVerticalName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchVerticals();
  }, []);

  const fetchVerticals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/verticals");
      const data = await response.json();

      if (data.success) {
        setVerticals(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching verticals:", error);
      toast.error("Error al cargar los giros de negocio");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVertical = async (verticalId: string) => {
    setSelectedVertical(verticalId);
  };

  const handleCreateAndSelectVertical = async () => {
    if (!newVerticalName.trim()) {
      toast.error("Por favor escribe el nombre de tu giro de negocio");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/verticals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newVerticalName.toLowerCase().replace(/\s+/g, "_"),
          display_name: newVerticalName,
          description: `Giro de negocio: ${newVerticalName}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear el giro de negocio");
      }

      toast.success("Giro de negocio creado");
      setSelectedVertical(data.data.id);
      setShowNewVerticalForm(false);
      setNewVerticalName("");
      await fetchVerticals();
    } catch (error: any) {
      console.error("Error creating vertical:", error);
      toast.error(error.message || "Error al crear el giro de negocio");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedVertical) {
      toast.error("Por favor selecciona un giro de negocio");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/auth/update-vertical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ verticalId: selectedVertical }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar");
      }

      toast.success("Giro de negocio seleccionado");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error saving vertical:", error);
      toast.error(error.message || "Error al guardar el giro de negocio");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const filteredVerticals = verticals.filter((v) =>
    v.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold" data-testid="text-onboarding-title">
            ¡Bienvenido a SalvadoreX!
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Para configurar tu sistema de punto de venta, cuéntanos qué tipo de negocio tienes
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Selecciona tu Giro de Negocio
            </CardTitle>
            <CardDescription>
              Esto nos ayudará a configurar los módulos y terminología adecuados para tu negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Input
                placeholder="Buscar giro de negocio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-search-verticals"
              />
            </div>

            {filteredVerticals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredVerticals.map((vertical) => (
                  <button
                    key={vertical.id}
                    onClick={() => handleSelectVertical(vertical.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all hover-elevate",
                      selectedVertical === vertical.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                    data-testid={`button-select-vertical-${vertical.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{vertical.display_name}</div>
                        {vertical.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {vertical.description}
                          </p>
                        )}
                      </div>
                      {selectedVertical === vertical.id && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="text-center py-8 border rounded-lg bg-muted/50">
                <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  No encontramos "{searchTerm}"
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  ¿Deseas agregarlo como nuevo giro de negocio?
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setNewVerticalName(searchTerm);
                    setShowNewVerticalForm(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear "{searchTerm}"
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay giros de negocio disponibles
              </div>
            )}

            <div className="border-t pt-6">
              {!showNewVerticalForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowNewVerticalForm(true)}
                  className="w-full min-h-[44px]"
                  data-testid="button-show-new-vertical-form"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mi giro no está en la lista
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <Label className="font-medium">Agregar nuevo giro de negocio</Label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      placeholder="Ej: Papelería, Ferretería, Gimnasio..."
                      value={newVerticalName}
                      onChange={(e) => setNewVerticalName(e.target.value)}
                      className="flex-1"
                      data-testid="input-new-vertical-name"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowNewVerticalForm(false);
                          setNewVerticalName("");
                        }}
                        disabled={saving}
                        className="min-h-[44px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateAndSelectVertical}
                        disabled={saving || !newVerticalName.trim()}
                        className="min-h-[44px]"
                        data-testid="button-create-vertical"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Crear
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={saving}
            className="order-2 sm:order-1 min-h-[44px]"
            data-testid="button-skip-onboarding"
          >
            Omitir por ahora
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving || !selectedVertical}
            className="order-1 sm:order-2 min-h-[44px]"
            data-testid="button-continue-onboarding"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
