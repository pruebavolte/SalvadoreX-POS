"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  speechToText,
  textToSpeech,
  parseVoiceCommand,
  fuzzySearchProduct,
} from "@/lib/services/elevenlabs";
import { VoiceOrderResult } from "@/types/api";
import { Product } from "@/types/database";

export type VoiceStatus = "inactive" | "listening" | "processing" | "speaking";

interface UseVoiceOrdersProps {
  products: Product[];
  onAddProduct: (product: Product, quantity: number) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onShowTotal: () => void;
  onFinishSale: () => void;
  onCancelSale: () => void;
}

export function useVoiceOrders({
  products,
  onAddProduct,
  onRemoveProduct,
  onUpdateQuantity,
  onShowTotal,
  onFinishSale,
  onCancelSale,
}: UseVoiceOrdersProps) {
  const [status, setStatus] = useState<VoiceStatus>("inactive");
  const [transcription, setTranscription] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar soporte del navegador
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        setIsSupported(hasMediaDevices);
      } catch (err) {
        setIsSupported(false);
      }
    };
    checkSupport();
  }, []);

  // Reproducir feedback auditivo
  const playFeedback = useCallback(async (text: string) => {
    try {
      setStatus("speaking");
      const audioBlob = await textToSpeech(text);

      // En producción, reproducir el audio
      // const audioUrl = URL.createObjectURL(audioBlob);
      // const audio = new Audio(audioUrl);
      // await audio.play();
      // audio.onended = () => {
      //   setStatus("inactive");
      // };

      // Por ahora solo simulamos
      setTimeout(() => {
        setStatus("inactive");
      }, 1000);
    } catch (err) {
      console.error("Error al reproducir feedback:", err);
      setStatus("inactive");
    }
  }, []);

  // Procesar comando de voz
  const processCommand = useCallback(
    async (transcription: string): Promise<VoiceOrderResult> => {
      const command = parseVoiceCommand(transcription);
      let message = "";
      let success = false;

      try {
        switch (command.type) {
          case "add": {
            if (!command.product || !command.quantity) {
              message = "No pude entender el producto o la cantidad";
              break;
            }

            // Buscar producto
            const productNames = products.map((p) => p.name);
            const matches = fuzzySearchProduct(command.product, productNames);

            if (matches.length === 0) {
              message = `No encontré el producto "${command.product}"`;
              break;
            }

            if (matches.length > 1) {
              message = `Encontré varios productos: ${matches.slice(0, 3).join(", ")}. Por favor especifica mejor`;
              break;
            }

            const product = products.find((p) => p.name === matches[0]);
            if (!product) {
              message = "Error al encontrar el producto";
              break;
            }

            onAddProduct(product, command.quantity);
            message = `Agregué ${command.quantity} ${product.name}`;
            success = true;
            break;
          }

          case "remove": {
            if (!command.product) {
              message = "No pude entender qué producto quitar";
              break;
            }

            const productNames = products.map((p) => p.name);
            const matches = fuzzySearchProduct(command.product, productNames);

            if (matches.length === 0) {
              message = `No encontré el producto "${command.product}"`;
              break;
            }

            const product = products.find((p) => p.name === matches[0]);
            if (!product) {
              message = "Error al encontrar el producto";
              break;
            }

            onRemoveProduct(product.id);
            message = `Quité ${product.name}`;
            success = true;
            break;
          }

          case "update": {
            if (!command.product || !command.quantity) {
              message = "No pude entender el producto o la cantidad";
              break;
            }

            const productNames = products.map((p) => p.name);
            const matches = fuzzySearchProduct(command.product, productNames);

            if (matches.length === 0) {
              message = `No encontré el producto "${command.product}"`;
              break;
            }

            const product = products.find((p) => p.name === matches[0]);
            if (!product) {
              message = "Error al encontrar el producto";
              break;
            }

            onUpdateQuantity(product.id, command.quantity);
            message = `Actualicé ${product.name} a ${command.quantity}`;
            success = true;
            break;
          }

          case "total":
            onShowTotal();
            message = "Aquí está el total";
            success = true;
            break;

          case "finish":
            onFinishSale();
            message = "Finalizando venta";
            success = true;
            break;

          case "cancel":
            onCancelSale();
            message = "Venta cancelada";
            success = true;
            break;

          case "search": {
            if (!command.product) {
              message = "No pude entender qué buscar";
              break;
            }

            const productNames = products.map((p) => p.name);
            const matches = fuzzySearchProduct(command.product, productNames);

            if (matches.length === 0) {
              message = `No encontré productos para "${command.product}"`;
            } else {
              message = `Encontré: ${matches.slice(0, 3).join(", ")}`;
              success = true;
            }
            break;
          }

          default:
            message = "No entendí el comando";
        }
      } catch (err) {
        message = "Error al procesar el comando";
        console.error(err);
      }

      return {
        transcription,
        command,
        success,
        message,
      };
    },
    [products, onAddProduct, onRemoveProduct, onUpdateQuantity, onShowTotal, onFinishSale, onCancelSale]
  );

  // Iniciar grabación
  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError("Tu navegador no soporta grabación de audio");
      return;
    }

    try {
      setStatus("listening");
      setTranscription("");
      setFeedback("");
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Detener el stream
        stream.getTracks().forEach((track) => track.stop());

        // Procesar audio
        try {
          setStatus("processing");
          const text = await speechToText(audioBlob);
          setTranscription(text);

          const result = await processCommand(text);
          setFeedback(result.message);

          await playFeedback(result.message);
        } catch (err) {
          setError("Error al procesar el audio");
          setStatus("inactive");
        }
      };

      mediaRecorder.start();

      // Auto-detener después de 10 segundos
      silenceTimeoutRef.current = setTimeout(() => {
        stopListening();
      }, 10000);
    } catch (err) {
      console.error("Error al iniciar grabación:", err);
      setError("Error al acceder al micrófono");
      setStatus("inactive");
    }
  }, [isSupported, processCommand, playFeedback]);

  // Detener grabación
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    status,
    transcription,
    feedback,
    error,
    isSupported,
    startListening,
    stopListening,
  };
}
