"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Bot, User, ChefHat, Search, X, Volume2, ShoppingCart, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface ElevenLabsVoiceAgentProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onPlaceOrder?: () => Promise<void>;
  cart?: CartItem[];
  language?: string;
  agentId?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export function ElevenLabsVoiceAgent({
  products,
  onAddToCart,
  onPlaceOrder,
  cart = [],
  language = "es",
  agentId = "agent_5201kahzqda2fgpas8jhsep7xnvc",
}: ElevenLabsVoiceAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [addedItems, setAddedItems] = useState<{name: string, quantity: number}[]>([]);
  const [orderComplete, setOrderComplete] = useState(false);
  const [autoStartAttempted, setAutoStartAttempted] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [noiseLevel, setNoiseLevel] = useState<number>(0);
  const recentlyAddedRef = useRef<Set<string>>(new Set());
  const productsRef = useRef(products);
  const onAddToCartRef = useRef(onAddToCart);
  const startConversationRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noiseCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const lastActivityTimeRef = useRef<number>(Date.now());
  const noiseLevelRef = useRef<number>(0);
  const conversationRef = useRef<any>(null);
  const MAX_RECONNECT_ATTEMPTS = 3;
  const SILENCE_TIMEOUT = 15000; // 15 segundos de silencio antes de desconectar
  const NOISE_THRESHOLD = 0.01; // Umbral de ruido mínimo para considerar actividad
  const MAX_NOISE_LEVEL = 0.3; // Nivel máximo de ruido aceptable

  // Keep refs updated
  productsRef.current = products;
  onAddToCartRef.current = onAddToCart;

  // Voice Activity Detection (VAD) - Detectar actividad de voz
  const initializeAudioAnalysis = useCallback(async (stream: MediaStream) => {
    try {
      // Crear AudioContext para análisis de audio
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn("AudioContext no disponible en este navegador");
        return;
      }

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      microphoneRef.current = microphone;
      streamRef.current = stream;

      // Analizar nivel de ruido periódicamente
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      noiseCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedNoise = average / 255;
        
        setNoiseLevel(normalizedNoise);
        noiseLevelRef.current = normalizedNoise;

        // Si el ruido es muy alto constantemente, puede ser ruido de fondo
        if (normalizedNoise > MAX_NOISE_LEVEL && !conversationRef.current?.isSpeaking) {
          console.warn("⚠️ Nivel de ruido alto detectado:", normalizedNoise);
        }
      }, 500);

      // Verificar actividad periódicamente
      activityCheckIntervalRef.current = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTimeRef.current;
        
        // Si no hay actividad por mucho tiempo y hay ruido constante, puede ser ruido de fondo
        if (timeSinceLastActivity > SILENCE_TIMEOUT && noiseLevelRef.current > NOISE_THRESHOLD) {
          console.warn("⚠️ Posible ruido de fondo detectado - silenciando");
          // No desconectar, solo registrar
        }
      }, 2000);
    } catch (error) {
      console.error("Error inicializando análisis de audio:", error);
    }
  }, []);

  // Limpiar análisis de audio
  const cleanupAudioAnalysis = useCallback(() => {
    if (noiseCheckIntervalRef.current) {
      clearInterval(noiseCheckIntervalRef.current);
      noiseCheckIntervalRef.current = null;
    }
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
    microphoneRef.current = null;
  }, []);

  // Detectar si un mensaje es un comando válido o solo ruido/conversación
  const isValidCommand = useCallback((message: string): boolean => {
    if (!message || message.trim().length < 3) return false;

    const lowerMessage = message.toLowerCase().trim();
    
    // Patrones que indican comandos válidos
    const commandPatterns = [
      // Comandos de orden
      /quiero|dame|dame|necesito|puedo tener|agrega|añade|pon|ponme/i,
      /quiero|want|need|can i have|add|put/i,
      // Números seguidos de productos
      /\d+\s+(coca|hamburguesa|pizza|taco|refresco|cerveza|agua|producto)/i,
      // Nombres de productos comunes
      /(hamburguesa|pizza|taco|refresco|cerveza|agua|coca|sabritas|papas)/i,
      // Comandos de acción
      /(cuánto|total|finalizar|terminar|cancelar|quitar|eliminar)/i,
    ];

    // Si el mensaje es muy corto o solo contiene palabras de relleno, probablemente es ruido
    const fillerWords = /^(ah|eh|um|uh|mmm|sí|si|no|ok|okay|bueno|well|yes|yeah)$/i;
    if (fillerWords.test(lowerMessage)) return false;

    // Verificar si contiene patrones de comando
    const hasCommandPattern = commandPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Verificar longitud mínima (comandos válidos suelen ser más largos)
    const hasMinimumLength = lowerMessage.length >= 5 || hasCommandPattern;

    return hasCommandPattern || hasMinimumLength;
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Normalize text for better matching (remove accents)
  const normalizeText = (str: string) =>
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Find product by name (fuzzy matching)
  const findProductByName = useCallback((name: string): Product | undefined => {
    const normalizedName = normalizeText(name);

    // Exact match first
    let found = productsRef.current.find(p => normalizeText(p.name) === normalizedName);
    if (found) return found;

    // Partial match
    found = productsRef.current.find(p => normalizeText(p.name).includes(normalizedName));
    if (found) return found;

    // Reverse partial match
    found = productsRef.current.find(p => normalizedName.includes(normalizeText(p.name)));
    if (found) return found;

    // Word-by-word match
    const nameWords = normalizedName.split(' ').filter(w => w.length > 2);
    found = productsRef.current.find(p => {
      const productWords = normalizeText(p.name).split(' ').filter(w => w.length > 2);
      return nameWords.some(word => productWords.some(pw => pw.includes(word) || word.includes(pw)));
    });

    return found;
  }, []);

  // Add product to cart
  const addProductToCart = useCallback((productName: string, quantity: number = 1) => {
    const product = findProductByName(productName);

    if (product) {
      for (let i = 0; i < quantity; i++) {
        onAddToCartRef.current(product);
      }

      setAddedItems(prev => [...prev, { name: product.name, quantity }]);

      // Add system message
      setMessages(prev => [...prev, {
        role: "system",
        content: `🛒 ${quantity}x ${product.name} agregado al carrito`,
        timestamp: new Date(),
      }]);

      toast.success(`🛒 ${quantity}x ${product.name} agregado al carrito`);
      console.log(`🛒 Agregado al carrito: ${quantity}x ${product.name}`);
      return true;
    } else {
      console.log(`⚠️ Producto no encontrado: ${productName}`);
      return false;
    }
  }, [findProductByName]);

  // Detect products mentioned in the AI response and add to cart
  const detectAndAddProducts = useCallback((text: string) => {
    const normalizedText = normalizeText(text);
    const lowerText = text.toLowerCase();

    // Check if this is an order summary/confirmation (should NOT add products)
    const orderSummaryPatterns = [
      /entonces ser[ií]a|su orden es|tu orden es|your order is|so that.s|that would be/i,
      /es correcto|is that correct|está listo|are you ready|completar.*pedido|complete.*order/i,
      /¿es correcto\?|is correct\?/i,
    ];

    const isOrderSummary = orderSummaryPatterns.some(pattern => pattern.test(lowerText));

    // Check if order has been sent/confirmed (trigger place order)
    const orderSentPatterns = [
      /pedido ha sido enviado|order has been sent|order has been placed/i,
      /que lo disfrutes|enjoy your meal|enjoy your order/i,
      /pedido confirmado|order confirmed|order is confirmed/i,
      /gracias por tu pedido|thank you for your order/i,
    ];

    if (orderSentPatterns.some(pattern => pattern.test(lowerText))) {
      console.log("🎉 Pedido confirmado por el agente - ejecutando orden");
      setOrderComplete(true);

      // Execute the place order function if available and cart has items
      if (onPlaceOrder && cart.length > 0) {
        setMessages(prev => [...prev, {
          role: "system",
          content: language === "es" ? "✅ Procesando tu pedido..." : "✅ Processing your order...",
          timestamp: new Date(),
        }]);

        onPlaceOrder().then(() => {
          setMessages(prev => [...prev, {
            role: "system",
            content: language === "es" ? "🎉 ¡Pedido realizado con éxito!" : "🎉 Order placed successfully!",
            timestamp: new Date(),
          }]);
          toast.success(language === "es" ? "¡Pedido realizado con éxito!" : "Order placed successfully!");
        }).catch((error) => {
          console.error("Error placing order:", error);
          toast.error(language === "es" ? "Error al realizar el pedido" : "Error placing order");
        });
      }
      return;
    }

    // Check if order is being finalized (but not yet sent)
    const orderCompletePatterns = [
      /excelente.*orden|excellent.*order|perfecto.*orden|perfect.*order/i,
      /está listo para|ready to|completar su pedido|complete your order/i,
    ];

    if (orderCompletePatterns.some(pattern => pattern.test(lowerText))) {
      setOrderComplete(true);
      console.log("🏁 Orden marcada como completa - no se agregarán más productos");
      return;
    }

    // If order is complete or this is a summary, don't add products
    if (orderComplete || isOrderSummary) {
      console.log("⏭️ Saltando detección (resumen o orden completa)");
      return;
    }

    // Check for NEW item confirmation patterns (not summaries)
    // Much broader patterns to catch when agent acknowledges a product order
    const newItemPatterns = [
      /^claro|^entendido|^anotado|te anoto|te agrego|lo añado|está añadido|has pedido|has añadido/i,
      /^perfecto|^excelente|^muy bien|^ok|^de acuerdo/i,
      /^sure|^noted|^got it|i.ll add|adding|you.ve ordered|you.ve added/i,
      /agregando|añadiendo|lo agrego|lo añado|a tu pedido|to your order/i,
    ];

    const hasNewItemConfirmation = newItemPatterns.some(pattern => pattern.test(lowerText));
    if (!hasNewItemConfirmation) return;

    // Number word mappings
    const numberWords: Record<string, number> = {
      'un': 1, 'uno': 1, 'una': 1,
      'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
      'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
      'one': 1, 'a': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    };

    // Try to find mentioned products
    productsRef.current.forEach(product => {
      const productName = normalizeText(product.name);

      // Check if product is mentioned in the text
      if (normalizedText.includes(productName)) {
        // Check if recently added (prevent duplicates within 10 seconds)
        if (recentlyAddedRef.current.has(productName)) {
          console.log(`⏭️ "${product.name}" ya agregado recientemente`);
          return;
        }

        let quantity = 1;

        // Look for quantity patterns
        const quantityPatterns = [
          new RegExp(`(\\d+)\\s*(?:x\\s*)?${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
          new RegExp(`${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:x\\s*)?(\\d+)`, 'i'),
        ];

        for (const pattern of quantityPatterns) {
          const match = normalizedText.match(pattern);
          if (match && match[1]) {
            quantity = parseInt(match[1]) || 1;
            break;
          }
        }

        // Check for word quantities
        if (quantity === 1) {
          for (const [word, num] of Object.entries(numberWords)) {
            if (normalizedText.includes(`${word} ${productName}`)) {
              quantity = num;
              break;
            }
          }
        }

        // Mark as recently added
        recentlyAddedRef.current.add(productName);
        setTimeout(() => recentlyAddedRef.current.delete(productName), 10000);

        addProductToCart(product.name, quantity);
      }
    });
  }, [addProductToCart, orderComplete, onPlaceOrder, cart.length, language]);

  // Initialize the Eleven Labs conversation hook with client tools
  const conversation = useConversation({
    onConnect: () => {
      console.log("🟢 Conectado al agente de voz");
      setIsConnected(true);
      setConnectionError(null);
      setAddedItems([]);
      setOrderComplete(false);
      recentlyAddedRef.current.clear();
      reconnectAttemptsRef.current = 0;
      const now = Date.now();
      setLastActivityTime(now);
      lastActivityTimeRef.current = now;

      // Inicializar análisis de audio si hay stream
      if (streamRef.current) {
        initializeAudioAnalysis(streamRef.current);
      }

      // Resetear timeout de silencio
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        if (isConnected && !conversation.isSpeaking) {
          console.log("⏱️ Timeout de silencio - verificando conexión");
          // No desconectar automáticamente, solo registrar
        }
      }, SILENCE_TIMEOUT);

      // Send menu context to the agent immediately after connection
      const productList = productsRef.current.map(p =>
        `- ${p.name}: $${p.price.toFixed(2)}`
      ).join("\n");

      const contextMessage = language === "es"
        ? `INSTRUCCIONES IMPORTANTES:
1. SIEMPRE habla en español, nunca en inglés.
2. Saluda al cliente en español y pregunta qué desea ordenar.
3. Estos son los productos disponibles:\n${productList}

REGLAS DE CONFIRMACIÓN:
- Cuando el cliente pida un producto, INMEDIATAMENTE confirma diciendo "Perfecto, [nombre exacto del producto]" o "Claro, [nombre exacto del producto]".
- NO preguntes si quiere agregarlo, agrégalo automáticamente.
- Siempre usa el nombre exacto del producto del menú.
- Después de confirmar, pregunta si desea algo más.
- IGNORA ruido de fondo, conversaciones no dirigidas a ti, o sonidos ambientales.
- SOLO responde a comandos claros relacionados con pedidos.`
        : `MENU CONTEXT: These are the available products to order:\n${productList}\n\nWhen the customer orders something, immediately confirm by saying the exact product name. Don't ask if they want to add it, just confirm it's added.\n\nIGNORE background noise, conversations not directed at you, or ambient sounds.\nONLY respond to clear commands related to orders.`;

      // Use sendContextualUpdate to inform the agent about the menu
      setTimeout(() => {
        try {
          conversation.sendContextualUpdate(contextMessage);
          console.log("📋 Contexto del menú enviado al agente");
        } catch (error) {
          console.error("Error enviando contexto:", error);
        }
      }, 500);

      toast.success(language === "es"
        ? "Conectado al agente de voz"
        : "Connected to voice agent"
      );
    },
    onDisconnect: () => {
      console.log("🔴 Desconectado del agente de voz");
      setIsConnected(false);
      cleanupAudioAnalysis();
      reconnectAttemptsRef.current = 0;
      toast.info(language === "es"
        ? "Conversación finalizada"
        : "Conversation ended"
      );
    },
    onMessage: (message) => {
      console.log("📩 Mensaje recibido:", message);

      // Actualizar tiempo de última actividad
      const now = Date.now();
      setLastActivityTime(now);
      lastActivityTimeRef.current = now;

      // Resetear timeout de silencio
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      silenceTimeoutRef.current = setTimeout(() => {
        if (isConnected && !conversation.isSpeaking) {
          console.log("⏱️ Sin actividad detectada");
        }
      }, SILENCE_TIMEOUT);

      // Handle different message types
      if (message.source === "user") {
        const messageText = message.message || "";
        
        // Validar si es un comando válido antes de procesar
        if (!isValidCommand(messageText)) {
          console.log("⚠️ Mensaje ignorado (no es un comando válido):", messageText);
          return; // Ignorar ruido o conversaciones no dirigidas
        }

        const userMessage: Message = {
          role: "user",
          content: messageText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMessage]);
      } else if (message.source === "ai") {
        const assistantMessage: Message = {
          role: "assistant",
          content: message.message || "",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Try to detect product mentions and add to cart
        detectAndAddProducts(message.message || "");
      }
    },
    onError: (error: any) => {
      console.error("❌ Error en el agente:", error);
      setConnectionError(error?.message || "Error desconocido");
      
      // Intentar reconectar si no se ha excedido el límite
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS && isConnected) {
        reconnectAttemptsRef.current += 1;
        console.log(`🔄 Intento de reconexión ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}`);
        
        setTimeout(() => {
          if (startConversationRef.current) {
            startConversationRef.current().catch(console.error);
          }
        }, 2000 * reconnectAttemptsRef.current);
      } else {
        toast.error(language === "es"
          ? "Error en la conexión con el agente. Por favor, intenta reconectar manualmente."
          : "Error connecting to agent. Please try reconnecting manually."
        );
      }
    },
  });

  // Mantener referencia actualizada del conversation
  conversationRef.current = conversation;

  // Start conversation with the agent
  const startConversation = async () => {
    if (isInitializing || isConnected) {
      console.log("⏸️ Ya hay una conexión o inicialización en curso");
      return;
    }

    try {
      setIsInitializing(true);
      setConnectionError(null);
      console.log("🚀 Iniciando conversación con agente:", agentId);
      console.log("📋 Productos disponibles:", products.map(p => p.name));

      // Verificar soporte del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no soporta grabación de audio. Por favor, usa Chrome, Firefox, Edge o Safari.");
      }

      // Request microphone permission with better error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
          } 
        });
        streamRef.current = stream;
        
        // Inicializar análisis de audio
        await initializeAudioAnalysis(stream);
      } catch (micError: any) {
        if (micError.name === "NotAllowedError" || micError.name === "PermissionDeniedError") {
          throw new Error("Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en la configuración del navegador.");
        } else if (micError.name === "NotFoundError" || micError.name === "DevicesNotFoundError") {
          throw new Error("No se encontró ningún micrófono. Por favor, conecta un micrófono.");
        } else if (micError.name === "NotReadableError" || micError.name === "TrackStartError") {
          throw new Error("El micrófono está siendo usado por otra aplicación. Por favor, cierra otras aplicaciones que usen el micrófono.");
        } else {
          throw new Error(`Error al acceder al micrófono: ${micError.message}`);
        }
      }

      // Get signed URL from our backend with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      let signedUrlResponse: Response;
      try {
        signedUrlResponse = await fetch("/api/elevenlabs-agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId,
            products,
            language,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === "AbortError") {
          throw new Error("Tiempo de espera agotado al conectar con el servidor. Por favor, verifica tu conexión a internet.");
        }
        throw new Error(`Error al conectar con el servidor: ${fetchError.message}`);
      }

      if (!signedUrlResponse.ok) {
        const errorData = await signedUrlResponse.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(errorData.error || "Failed to get agent configuration");
      }

      const { signedUrl, context } = await signedUrlResponse.json();
      console.log("📋 Contexto del agente:", context);

      // Start the session with signed URL
      await conversation.startSession({
        signedUrl,
      });

      setIsInitializing(false);
    } catch (error: any) {
      console.error("Error starting conversation:", error);
      setIsInitializing(false);
      setConnectionError(error.message);
      
      // Limpiar recursos en caso de error
      cleanupAudioAnalysis();
      
      toast.error(language === "es"
        ? error.message || "No se pudo iniciar la conversación. Verifica el acceso al micrófono."
        : error.message || "Could not start conversation. Check microphone access."
      );
    }
  };

  // End conversation
  const endConversation = async () => {
    try {
      cleanupAudioAnalysis();
      await conversation.endSession();
      reconnectAttemptsRef.current = 0;
      setConnectionError(null);
    } catch (error) {
      console.error("Error ending conversation:", error);
      // Forzar limpieza incluso si hay error
      cleanupAudioAnalysis();
      setIsConnected(false);
    }
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      cleanupAudioAnalysis();
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [cleanupAudioAnalysis]);

  // Store startConversation in ref for auto-start
  startConversationRef.current = startConversation;

  // Auto-start conversation if microphone permission is already granted (mejorado para compatibilidad)
  useEffect(() => {
    if (autoStartAttempted || isConnected || isInitializing) return;

    const checkAndAutoStart = async () => {
      try {
        // Verificar soporte de Permissions API (no disponible en todos los navegadores)
        if ('permissions' in navigator && 'query' in navigator.permissions) {
          try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });

            if (permissionStatus.state === 'granted') {
              console.log("🎤 Permiso de micrófono ya otorgado - iniciando automáticamente");
              setAutoStartAttempted(true);
              // Small delay to ensure component is fully mounted
              setTimeout(() => {
                if (startConversationRef.current && !isConnected) {
                  startConversationRef.current();
                }
              }, 1000);
              return;
            }
          } catch (permError) {
            // Permissions API puede fallar en algunos navegadores
            console.log("⚠️ Permissions API no disponible o falló:", permError);
          }
        }
        
        console.log("🎤 Permiso de micrófono no verificado - esperando clic del usuario");
        setAutoStartAttempted(true);
      } catch (error) {
        // permissions.query may not be supported in all browsers
        console.log("🎤 No se pudo verificar permisos - esperando clic del usuario");
        setAutoStartAttempted(true);
      }
    };

    // Pequeño delay para asegurar que el componente esté montado
    const timeoutId = setTimeout(checkAndAutoStart, 500);
    return () => clearTimeout(timeoutId);
  }, [autoStartAttempted, isConnected, isInitializing]);

  // Get status color only
  const getStatusColor = () => {
    if (!isConnected) return "bg-gray-500";
    if (conversation.isSpeaking) return "bg-blue-500";
    if (conversation.status === "connected") return "bg-green-500";
    if (conversation.status === "connecting") return "bg-yellow-500";
    return "bg-gray-500";
  };

  const statusColor = getStatusColor();

  return (
    <div className="flex flex-col md:flex-row h-full bg-background">
      {/* Mobile: Call button at top, fixed */}
      <div className="md:hidden flex flex-col items-center py-6 px-4 border-b bg-background sticky top-0 z-10">
        {/* Status indicator */}

        {/* Large call button */}
        <button
          onClick={isConnected ? endConversation : startConversation}
          disabled={isInitializing}
          className={cn(
            "w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95",
            isConnected
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : isInitializing
              ? "bg-yellow-500 hover:bg-yellow-600 text-white opacity-75 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          )}
        >
          {isInitializing ? (
            <Loader2 className="h-12 w-12 animate-spin" />
          ) : isConnected ? (
            <PhoneOff className="h-12 w-12" />
          ) : (
            <Phone className="h-12 w-12" />
          )}
        </button>

        {/* Error message */}
        {connectionError && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-xs">
            <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">{connectionError}</span>
            </div>
          </div>
        )}

        <p className="text-base font-medium mt-3 text-center">
          {isConnected ? (
            <span className="text-red-500">
              {language === "es" ? "Toca para terminar" : "Tap to end"}
            </span>
          ) : (
            language === "es" ? "Toca para ordenar" : "Tap to order"
          )}
        </p>

        {/* Speaking indicator - mobile */}
        {isConnected && conversation.isSpeaking && (
          <div className="mt-2 flex items-center gap-2 text-blue-500">
            <Volume2 className="h-4 w-4 animate-pulse" />
            <span className="text-sm">{language === "es" ? "Hablando..." : "Speaking..."}</span>
          </div>
        )}

        {/* Added items - mobile */}
        {addedItems.length > 0 && (
          <div className="mt-4 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg w-full max-w-xs">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-medium">
                {language === "es" ? "En tu pedido:" : "In your order:"}
              </span>
            </div>
            <div className="mt-1 text-sm text-green-600 dark:text-green-400">
              {addedItems.map((item, i) => (
                <span key={i}>
                  {item.quantity}x {item.name}
                  {i < addedItems.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Scrollable menu */}
      <div className="md:hidden flex-1 overflow-y-auto">
        <div className="p-3 border-b sticky top-0 bg-background z-10 flex items-center justify-between">
          <p className="text-sm font-semibold">
            {language === "es" ? "🍽️ Menú" : "🍽️ Menu"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8 w-8 p-0"
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {showSearch && (
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={language === "es" ? "Buscar productos..." : "Search products..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        )}

        <div className="p-3 grid grid-cols-2 gap-2">
          {(searchTerm ? filteredProducts : products).map((product) => (
            <div
              key={product.id}
              className="bg-background border rounded-xl p-2.5 hover:border-primary/50 transition-all"
            >
              {product.image_url ? (
                <div className="relative w-full aspect-square rounded-lg overflow-hidden mb-2">
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 64px"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                  <ChefHat className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
              <p className="text-sm font-semibold text-primary mt-1">
                ${product.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Products Panel - Left side */}
      <div className="hidden md:flex w-80 border-r flex-shrink-0 flex-col bg-muted/30">
        <div className="p-3 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">
            {language === "es" ? "🍽️ Menú" : "🍽️ Menu"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSearch(!showSearch)}
            className="h-8 w-8 p-0"
          >
            {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {showSearch && (
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder={language === "es" ? "Buscar productos..." : "Search products..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(searchTerm ? filteredProducts : products).map((product) => (
            <div
              key={product.id}
              className="bg-background border rounded-xl p-3 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex gap-3 items-center">
                {product.image_url ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <ChefHat className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm line-clamp-2">
                    {product.name}
                  </p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {product.description}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-primary mt-1">
                    ${product.price.toFixed(2)} {product.currency}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Main Area - Call button centered, transcript below */}
      <div className="hidden md:flex flex-1 flex-col min-w-0">


        {/* Center area with call button */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Main call button - Large and centered */}
          <button
            onClick={isConnected ? endConversation : startConversation}
            disabled={isInitializing}
            className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl active:scale-95",
              isConnected
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                : isInitializing
                ? "bg-yellow-500 hover:bg-yellow-600 text-white opacity-75 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            )}
          >
            {isInitializing ? (
              <Loader2 className="h-14 w-14 animate-spin" />
            ) : isConnected ? (
              <PhoneOff className="h-14 w-14" />
            ) : (
              <Phone className="h-14 w-14" />
            )}
          </button>

          {/* Error message - Desktop */}
          {connectionError && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-md">
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="break-words">{connectionError}</span>
              </div>
            </div>
          )}

          <p className="text-lg font-medium mt-4 text-center">
            {isConnected ? (
              <span className="text-red-500">
                {language === "es" ? "Toca para terminar" : "Tap to end"}
              </span>
            ) : (
              language === "es" ? "Toca para ordenar" : "Tap to order"
            )}
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            {language === "es" ? "Agente de voz con IA" : "AI Voice Agent"}
          </p>

          {/* Speaking indicator */}
          {isConnected && conversation.isSpeaking && (
            <div className="mt-4 flex items-center gap-2 text-blue-500">
              <Volume2 className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">
                {language === "es" ? "Hablando..." : "Speaking..."}
              </span>
            </div>
          )}

          {/* Added items summary */}
          {addedItems.length > 0 && (
            <div className="mt-6 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl max-w-sm">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-medium">
                  {language === "es" ? "En tu pedido:" : "In your order:"}
                </span>
              </div>
              <div className="mt-1.5 text-sm text-green-600 dark:text-green-400">
                {addedItems.map((item, i) => (
                  <span key={i}>
                    {item.quantity}x {item.name}
                    {i < addedItems.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transcript area - Desktop only, Bottom, scrollable */}
        {messages.length > 0 && (
          <div className="border-t bg-muted/30 max-h-48 overflow-y-auto">
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground px-1">
                {language === "es" ? "Transcripción" : "Transcript"}
              </p>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "text-sm px-3 py-1.5 rounded-lg",
                    message.role === "user" && "bg-primary/10 text-right",
                    message.role === "assistant" && "bg-muted",
                    message.role === "system" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-center text-xs"
                  )}
                >
                  {message.role !== "system" && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {message.role === "user" ? "Tú:" : "Agente:"}
                    </span>
                  )}
                  <span>{message.content}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
