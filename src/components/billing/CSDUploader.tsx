"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileKey, 
  Upload, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  ShieldCheck,
  X
} from "lucide-react";
import { toast } from "sonner";

interface CSDUploaderProps {
  onUploadSuccess?: () => void;
  csdUploaded?: boolean;
  csdCertificateNumber?: string;
  csdValidUntil?: string;
}

export function CSDUploader({ 
  onUploadSuccess, 
  csdUploaded = false,
  csdCertificateNumber,
  csdValidUntil 
}: CSDUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cerInputRef = useRef<HTMLInputElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);

  const handleCerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.cer')) {
        setErrors({ ...errors, cer: "El archivo debe tener extensión .cer" });
        return;
      }
      setCerFile(file);
      setErrors({ ...errors, cer: "" });
    }
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.key')) {
        setErrors({ ...errors, key: "El archivo debe tener extensión .key" });
        return;
      }
      setKeyFile(file);
      setErrors({ ...errors, key: "" });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!cerFile) {
      newErrors.cer = "El archivo .cer es requerido";
    }

    if (!keyFile) {
      newErrors.key = "El archivo .key es requerido";
    }

    if (!password.trim()) {
      newErrors.password = "La contraseña del certificado es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleUpload = async () => {
    if (!validateForm()) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    setLoading(true);
    try {
      const cerBase64 = await fileToBase64(cerFile!);
      const keyBase64 = await fileToBase64(keyFile!);

      const res = await fetch("/api/billing/upload-csd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Certificate: cerBase64,
          PrivateKey: keyBase64,
          PrivateKeyPassword: password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al subir los certificados");
      }

      const data = await res.json();
      toast.success("Certificados CSD cargados correctamente");
      
      setCerFile(null);
      setKeyFile(null);
      setPassword("");
      
      if (cerInputRef.current) cerInputRef.current.value = "";
      if (keyInputRef.current) keyInputRef.current.value = "";
      
      onUploadSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al subir los certificados");
    } finally {
      setLoading(false);
    }
  };

  const clearFile = (type: 'cer' | 'key') => {
    if (type === 'cer') {
      setCerFile(null);
      if (cerInputRef.current) cerInputRef.current.value = "";
    } else {
      setKeyFile(null);
      if (keyInputRef.current) keyInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <FileKey className="h-4 w-4 sm:h-5 sm:w-5" />
          Certificados CSD
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Suba los certificados de sello digital (CSD) emitidos por el SAT para poder timbrar CFDI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {csdUploaded && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Certificados configurados correctamente
                </p>
                {csdCertificateNumber && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Número de certificado: {csdCertificateNumber}
                  </p>
                )}
                {csdValidUntil && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Válido hasta: {new Date(csdValidUntil).toLocaleDateString('es-MX')}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Puede subir nuevos certificados para reemplazar los actuales
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cerFile" className="text-sm">
              Archivo de Certificado (.cer) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                ref={cerInputRef}
                id="cerFile"
                type="file"
                data-testid="input-cer-file"
                accept=".cer"
                onChange={handleCerChange}
                className={`min-h-[44px] file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground ${errors.cer ? "border-destructive" : ""}`}
              />
              {cerFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs truncate flex-1">{cerFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => clearFile('cer')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {errors.cer && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.cer}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyFile" className="text-sm">
              Archivo de Llave Privada (.key) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                ref={keyInputRef}
                id="keyFile"
                type="file"
                data-testid="input-key-file"
                accept=".key"
                onChange={handleKeyChange}
                className={`min-h-[44px] file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground ${errors.key ? "border-destructive" : ""}`}
              />
              {keyFile && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs truncate flex-1">{keyFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => clearFile('key')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            {errors.key && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.key}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csdPassword" className="text-sm">
            Contraseña del Certificado <span className="text-destructive">*</span>
          </Label>
          <Input
            id="csdPassword"
            type="password"
            data-testid="input-csd-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors({ ...errors, password: "" });
            }}
            placeholder="Contraseña de la llave privada"
            className={`min-h-[44px] ${errors.password ? "border-destructive" : ""}`}
          />
          {errors.password && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.password}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            La contraseña que utilizó al generar el CSD en el SAT
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleUpload}
            disabled={loading || (!cerFile && !keyFile)}
            data-testid="button-upload-csd"
            className="min-h-[44px] w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Subir Certificados
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
