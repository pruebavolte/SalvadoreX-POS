// ElevenLabs service - Preparado para conexión futura
// Por ahora usa lógica mock para simulación

import { VoiceCommand, VoiceOrderResult } from "@/types/api";

// Simular reconocimiento de voz
export async function speechToText(audioBlob: Blob): Promise<string> {
  // Simulación: retornar texto de ejemplo
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // En producción, aquí iría la llamada real a ElevenLabs API
  // const formData = new FormData();
  // formData.append('audio', audioBlob);
  // const response = await fetch('/api/elevenlabs/speech-to-text', {
  //   method: 'POST',
  //   body: formData,
  // });
  // return response.json();

  return "agrega 3 coca colas y 2 sabritas";
}

// Simular síntesis de voz
export async function textToSpeech(text: string): Promise<Blob> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  // En producción, aquí iría la llamada real a ElevenLabs API
  // const response = await fetch('/api/elevenlabs/text-to-speech', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text }),
  // });
  // return response.blob();

  // Por ahora retornamos un blob vacío
  return new Blob([], { type: "audio/mpeg" });
}

// Procesar comando de voz y extraer intención
export function parseVoiceCommand(transcription: string): VoiceCommand {
  const text = transcription.toLowerCase().trim();

  // Detectar comandos de agregar
  const addPatterns = [
    /agrega?r?\s+(\d+)\s+(.+)/,
    /añad[ei]r?\s+(\d+)\s+(.+)/,
    /pone?r?\s+(\d+)\s+(.+)/,
    /(\d+)\s+(.+)/,
  ];

  for (const pattern of addPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: "add",
        quantity: parseInt(match[1]),
        product: match[2].trim(),
        confidence: 0.9,
      };
    }
  }

  // Detectar comandos de quitar
  const removePatterns = [
    /quita?r?\s+(.+)/,
    /elimina?r?\s+(.+)/,
    /borra?r?\s+(.+)/,
  ];

  for (const pattern of removePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: "remove",
        product: match[1].trim(),
        confidence: 0.85,
      };
    }
  }

  // Detectar comandos de actualizar
  const updatePatterns = [
    /cambia?r?\s+(.+)\s+a\s+(\d+)/,
    /modifica?r?\s+(.+)\s+a\s+(\d+)/,
  ];

  for (const pattern of updatePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: "update",
        product: match[1].trim(),
        quantity: parseInt(match[2]),
        confidence: 0.85,
      };
    }
  }

  // Detectar comandos de búsqueda
  if (text.includes("busca") || text.includes("encuentra")) {
    const product = text.replace(/busca?r?|encuentra?r?/g, "").trim();
    return {
      type: "search",
      product,
      confidence: 0.8,
    };
  }

  // Detectar comando de total
  if (text.includes("total") || text.includes("cuánto") || text.includes("cuenta")) {
    return {
      type: "total",
      confidence: 0.95,
    };
  }

  // Detectar comando de finalizar
  if (text.includes("finaliza") || text.includes("termina") || text.includes("cobra")) {
    return {
      type: "finish",
      confidence: 0.9,
    };
  }

  // Detectar comando de cancelar
  if (text.includes("cancela") || text.includes("borra todo")) {
    return {
      type: "cancel",
      confidence: 0.9,
    };
  }

  // Comando no reconocido
  return {
    type: "search",
    product: text,
    confidence: 0.5,
  };
}

// Búsqueda fuzzy de productos por nombre
export function fuzzySearchProduct(query: string, productNames: string[]): string[] {
  const queryLower = query.toLowerCase();

  // Búsqueda exacta
  const exactMatches = productNames.filter((name) =>
    name.toLowerCase().includes(queryLower)
  );

  if (exactMatches.length > 0) {
    return exactMatches;
  }

  // Búsqueda con similitud (Levenshtein simplificado)
  const fuzzyMatches = productNames.filter((name) => {
    const nameLower = name.toLowerCase();
    const words = queryLower.split(" ");

    return words.some((word) => {
      if (word.length < 3) return false;
      return nameLower.includes(word) || similarity(word, nameLower) > 0.6;
    });
  });

  return fuzzyMatches;
}

// Calcular similitud simple entre dos strings
function similarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;

  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }

  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }

  return (longerLength - editDistance(longer, shorter)) / longerLength;
}

// Distancia de edición (Levenshtein)
function editDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }

  return costs[s2.length];
}
