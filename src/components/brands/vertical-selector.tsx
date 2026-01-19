"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import type { Vertical } from "@/types/brand";

interface VerticalSelectorProps {
  selectedVerticalId?: string;
  onSelect: (vertical: Vertical) => void;
  showModules?: boolean;
}

export function VerticalSelector({
  selectedVerticalId,
  onSelect,
  showModules = false,
}: VerticalSelectorProps) {
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | undefined>(selectedVerticalId);

  useEffect(() => {
    fetchVerticals();
  }, []);

  const fetchVerticals = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/verticals");
      const data = await response.json();

      if (data.success) {
        setVerticals(data.data);
      }
    } catch (error) {
      console.error("Error fetching verticals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (vertical: Vertical) => {
    setSelected(vertical.id);
    onSelect(vertical);
  };

  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="h-8 w-8" /> : null;
  };

  const getEnabledModulesCount = (modules: any) => {
    if (!modules || typeof modules !== "object") return 0;
    return Object.values(modules).filter((v) => v === true).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Selecciona tu tipo de negocio</h2>
        <p className="text-muted-foreground">
          Cada tipo de negocio incluye módulos y configuraciones optimizadas para tu giro
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {verticals.map((vertical) => {
          const isSelected = selected === vertical.id;
          const modulesCount = getEnabledModulesCount(vertical.default_modules);

          return (
            <Card
              key={vertical.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg relative",
                isSelected && "ring-2 ring-primary shadow-lg"
              )}
              onClick={() => handleSelect(vertical)}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                  <Check className="h-4 w-4" />
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {getIcon(vertical.icon)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{vertical.display_name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  {vertical.description}
                </CardDescription>
              </CardHeader>

              {showModules && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Módulos incluidos:</span>
                      <Badge variant="secondary">{modulesCount} módulos</Badge>
                    </div>

                    {/* Show some key modules */}
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(vertical.default_modules || {})
                        .filter(([_, enabled]) => enabled)
                        .slice(0, 4)
                        .map(([key]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      {modulesCount > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{modulesCount - 4} más
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {verticals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hay tipos de negocio disponibles
        </div>
      )}
    </div>
  );
}
