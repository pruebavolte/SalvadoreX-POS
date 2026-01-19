"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  QrCode,
  Download,
  Printer,
  Share2,
  Link2,
  Copy,
  Edit2,
  Check,
  X,
  Mail,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuUrl: string;
  restaurantName?: string;
  onUrlChange?: (newUrl: string) => void;
  canEdit?: boolean;
  language?: string;
}

export function QRModal({
  open,
  onOpenChange,
  menuUrl,
  restaurantName = "Menú Digital",
  onUrlChange,
  canEdit = false,
  language = "es",
}: QRModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUrl, setEditedUrl] = useState(menuUrl);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const t = {
    es: {
      title: "Código QR del Menú",
      description: "Comparte tu menú digital con tus clientes",
      download: "Descargar",
      print: "Imprimir",
      share: "Compartir",
      copyUrl: "Copiar URL",
      copied: "¡Copiado!",
      menuUrl: "URL del menú",
      editUrl: "Editar URL",
      saveUrl: "Guardar",
      cancel: "Cancelar",
      shareVia: "Compartir vía",
      whatsapp: "WhatsApp",
      email: "Email",
      copyLink: "Copiar enlace",
      scanQr: "Escanea el código QR para ver el menú",
      orUseUrl: "O usa esta URL:",
      urlUpdated: "URL actualizada correctamente",
      urlError: "Error al actualizar la URL",
      downloadSuccess: "QR descargado correctamente",
      printInstructions: "Usa Ctrl+P o Cmd+P para imprimir",
    },
    en: {
      title: "Menu QR Code",
      description: "Share your digital menu with your customers",
      download: "Download",
      print: "Print",
      share: "Share",
      copyUrl: "Copy URL",
      copied: "Copied!",
      menuUrl: "Menu URL",
      editUrl: "Edit URL",
      saveUrl: "Save",
      cancel: "Cancel",
      shareVia: "Share via",
      whatsapp: "WhatsApp",
      email: "Email",
      copyLink: "Copy link",
      scanQr: "Scan the QR code to view the menu",
      orUseUrl: "Or use this URL:",
      urlUpdated: "URL updated successfully",
      urlError: "Error updating URL",
      downloadSuccess: "QR downloaded successfully",
      printInstructions: "Use Ctrl+P or Cmd+P to print",
    },
  };

  const text = t[language as keyof typeof t] || t.es;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      toast.success(text.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Error al copiar");
    }
  };

  const handleDownload = () => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    // Create a canvas to convert SVG to PNG
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;

      // Draw white background
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // Download
      const link = document.createElement("a");
      link.download = `qr-menu-${restaurantName.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
      toast.success(text.downloadSuccess);
    };
    img.src = url;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión");
      return;
    }

    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR - ${restaurantName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .qr-container {
              text-align: center;
            }
            h1 {
              margin-bottom: 20px;
              font-size: 24px;
            }
            .qr-code {
              margin: 20px 0;
            }
            .qr-code svg {
              width: 300px;
              height: 300px;
            }
            p {
              color: #666;
              font-size: 14px;
              margin-top: 20px;
            }
            .url {
              font-size: 12px;
              color: #999;
              word-break: break-all;
              max-width: 300px;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${restaurantName}</h1>
            <div class="qr-code">${svgData}</div>
            <p>${text.scanQr}</p>
            <p class="url">${menuUrl}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurantName,
          text: `${text.scanQr}: ${restaurantName}`,
          url: menuUrl,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast.error("Error al compartir");
        }
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`${restaurantName}\n${text.scanQr}\n${menuUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Menú Digital - ${restaurantName}`);
    const body = encodeURIComponent(`${text.scanQr}\n\n${menuUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSaveUrl = () => {
    if (onUrlChange && editedUrl !== menuUrl) {
      onUrlChange(editedUrl);
      toast.success(text.urlUpdated);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedUrl(menuUrl);
    setIsEditing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {text.title}
          </DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* QR Code */}
          <div
            ref={qrRef}
            className="flex justify-center p-4 bg-white rounded-lg border"
          >
            <QRCodeSVG
              value={menuUrl}
              size={160}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          {/* Restaurant Name */}
          <div className="text-center">
            <h3 className="font-semibold">{restaurantName}</h3>
            <p className="text-xs text-muted-foreground">{text.scanQr}</p>
          </div>

          <Separator />

          {/* URL Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{text.orUseUrl}</Label>
            {isEditing && canEdit ? (
              <div className="flex gap-2">
                <Input
                  value={editedUrl}
                  onChange={(e) => setEditedUrl(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" variant="ghost" onClick={handleSaveUrl}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-muted rounded-md text-sm break-all">
                  {menuUrl}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyUrl}
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    className="flex-shrink-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs">{text.download}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="text-xs">{text.print}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2"
              onClick={handleShare}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs">{text.share}</span>
            </Button>
          </div>

          {/* Share Options */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">{text.shareVia}</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8"
                onClick={handleShareWhatsApp}
              >
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs">{text.whatsapp}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8"
                onClick={handleShareEmail}
              >
                <Mail className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs">{text.email}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-8"
                onClick={handleCopyUrl}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span className="text-xs">{text.copyLink}</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
