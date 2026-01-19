"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, Sparkles, CheckCircle2, Globe, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/language-context";
import { useMenuDigitalTranslations } from "@/lib/translations/menu-digital";

interface DigitalizeMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DigitalizeMenuDialog({
  open,
  onOpenChange,
  onSuccess,
}: DigitalizeMenuDialogProps) {
  const { language } = useLanguage();
  const t = useMenuDigitalTranslations(language);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [currentImage, setCurrentImage] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [currentProductName, setCurrentProductName] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generateAIImages, setGenerateAIImages] = useState(false);
  const [searchWebImages, setSearchWebImages] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
    }
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const processImages = async () => {
    if (selectedFiles.length === 0) {
      toast.error(t.selectAtLeastOne);
      return;
    }

    setIsProcessing(true);
    setTotalImages(selectedFiles.length);
    setCurrentImage(1);
    setProgress(0);
    const imageWord = selectedFiles.length > 1 ? t.images : t.image;
    setProcessingStep(`${t.preparing} ${selectedFiles.length} ${imageWord}...`);

    try {
      // Step 1: Preparing
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(10);

      // Step 2: Uploading
      setProcessingStep(`${t.uploading} ${imageWord}...`);
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      setProgress(20);

      // Step 3: Processing with AI using streaming
      setProcessingStep(`${t.analyzingWithAI}...`);
      setProgress(30);

      // Add the image source parameters to the form data
      formData.append("generateAIImages", generateAIImages.toString());
      formData.append("searchWebImages", searchWebImages.toString());

      const response = await fetch("/api/menu-digital/process-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(t.errorMessage);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result: any = {};

      if (reader) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'analyzing') {
                  setProcessingStep(`🔍 Analizando menú...`);
                  setProgress(35);
                } else if (data.type === 'extracted') {
                  setProcessingStep(`✓ ${data.count} productos encontrados`);
                  setProgress(50);
                } else if (data.type === 'generating_image') {
                  setCurrentProductName(data.productName);
                  setIsGeneratingImage(true);
                  setProcessingStep(`Generando imagen IA: ${data.productName}`);
                  const progressValue = 50 + ((data.current / data.total) * 40);
                  setProgress(Math.round(progressValue));
                } else if (data.type === 'searching_image') {
                  setCurrentProductName(data.productName);
                  setIsGeneratingImage(true);
                  setProcessingStep(`Buscando imagen: ${data.productName}`);
                  const progressValue = 50 + ((data.current / data.total) * 40);
                  setProgress(Math.round(progressValue));
                } else if (data.type === 'image_found') {
                  setIsGeneratingImage(false);
                  setProcessingStep(`Imagen encontrada: ${data.productName}`);
                } else if (data.type === 'image_not_found') {
                  setIsGeneratingImage(false);
                  setProcessingStep(`Sin imagen: ${data.productName}`);
                } else if (data.type === 'image_generated') {
                  setIsGeneratingImage(false);
                  setProcessingStep(`Imagen generada: ${data.productName}`);
                } else if (data.type === 'product_saved') {
                  setProcessingStep(`💾 Guardado: ${data.productName}`);
                  const progressValue = 50 + ((data.current / data.total) * 40);
                  setProgress(Math.round(progressValue));
                } else if (data.type === 'complete') {
                  setIsGeneratingImage(false);
                  result = data.result;
                  setProgress(100);
                  setProcessingStep('✅ Completado');
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }

      // Progress already at 100 from streaming
      await new Promise(resolve => setTimeout(resolve, 300));

      // Show success message with details
      const totalProcessed = (result.productsAdded || 0) + (result.productsUpdated || 0);
      const successMsg = result.productsUpdated > 0
        ? `✓ ${result.productsAdded} productos nuevos, ${result.productsUpdated} actualizados`
        : t.successMessage.replace("{count}", result.productsAdded.toString());

      toast.success(successMsg, {
        description: result.totalExtracted > totalProcessed
          ? t.duplicatedProducts.replace("{count}", (result.totalExtracted - totalProcessed).toString())
          : undefined,
      });

      // Small delay before closing to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

      onSuccess();
      onOpenChange(false);

      // Reset state
      setSelectedFiles([]);
      setProcessingStep("");
      setProgress(0);
      setCurrentImage(0);
      setTotalImages(0);
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error(t.errorMessage);
      setProgress(0);
      setProcessingStep("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setSelectedFiles([]);
      setProcessingStep("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t.digitalizationTitle}
          </DialogTitle>
          <DialogDescription>
            {t.digitalizationDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {selectedFiles.length === 0 ? (
            <>
              {/* Camera Option */}
              <Button
                variant="outline"
                className="w-full h-24 border-2 border-dashed hover:border-primary transition-colors"
                onClick={handleCameraCapture}
                disabled={isProcessing}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8" />
                  <span className="font-semibold">{t.takePhoto}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.useCamera}
                  </span>
                </div>
              </Button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
                multiple
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    {t.or}
                  </span>
                </div>
              </div>

              {/* File Upload Option */}
              <Button
                variant="outline"
                className="w-full h-24 border-2 border-dashed hover:border-primary transition-colors"
                onClick={handleFileUpload}
                disabled={isProcessing}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8" />
                  <span className="font-semibold">{t.uploadFile}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.selectFromDevice}
                  </span>
                </div>
              </Button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                multiple
              />
            </>
          ) : (
            <>
              {/* Preview Selected Files */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  {t.filesSelected} ({selectedFiles.length})
                </h4>
                <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Source Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Fuente de imágenes</h4>
                
                {/* Web Image Search Toggle (Primary - Default ON) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border-2 border-primary/20">
                  <div className="space-y-0.5">
                    <Label htmlFor="web-images" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      Buscar imágenes en internet
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Recomendado</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Busca en bancos de imágenes (Pexels, Unsplash)
                    </p>
                  </div>
                  <Switch
                    id="web-images"
                    checked={searchWebImages}
                    onCheckedChange={setSearchWebImages}
                    disabled={isProcessing}
                    data-testid="switch-web-images"
                  />
                </div>

                {/* AI Image Generation Toggle (Secondary - Default OFF) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai-images" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Generar imágenes con IA
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Crea imágenes con inteligencia artificial (requiere créditos)
                    </p>
                  </div>
                  <Switch
                    id="ai-images"
                    checked={generateAIImages}
                    onCheckedChange={setGenerateAIImages}
                    disabled={isProcessing}
                    data-testid="switch-ai-images"
                  />
                </div>
              </div>

              {/* Processing Status */}
              {isProcessing && processingStep && (
                <div className="space-y-3 p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    {progress === 100 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    <span className="text-sm font-medium flex-1">{processingStep}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {progress}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />

                  {/* Show current product being processed with image generation */}
                  {isGeneratingImage && currentProductName && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-black/20 p-2 rounded">
                      <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                      <span>Creando imagen con IA para <span className="font-semibold">{currentProductName}</span></span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedFiles([])}
                  disabled={isProcessing}
                >
                  {t.change}
                </Button>
                <Button
                  className="flex-1"
                  onClick={processImages}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t.digitalize}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
