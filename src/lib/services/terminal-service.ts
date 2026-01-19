import { 
  PaymentTerminal, 
  PaymentIntent, 
  TerminalProvider, 
  TerminalDevice,
  TerminalLinkPreference,
  PaymentIntentStatus 
} from "@/types/printer";

const TERMINALS_STORAGE_KEY = "pos_payment_terminals";
const TERMINAL_PREFERENCE_KEY = "pos_terminal_link_preference";
const PAYMENT_INTENTS_KEY = "pos_payment_intents";

// Demo mode configuration - enables simulated payments without real API keys
const DEMO_MODE_KEY = "pos_terminal_demo_mode";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return true;
  // Default to demo mode if no real access token is configured
  const terminals = getTerminals();
  const hasRealToken = terminals.some(t => t.accessToken && t.accessToken.length > 20);
  return !hasRealToken;
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false");
}

export function getTerminals(): PaymentTerminal[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(TERMINALS_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveTerminals(terminals: PaymentTerminal[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TERMINALS_STORAGE_KEY, JSON.stringify(terminals));
}

export function getDefaultTerminal(): PaymentTerminal | null {
  const terminals = getTerminals();
  return terminals.find(t => t.isDefault && t.enabled && t.isConnected) || 
         terminals.find(t => t.enabled && t.isConnected) || 
         null;
}

export function hasConfiguredTerminal(): boolean {
  return getDefaultTerminal() !== null;
}

export function addTerminal(data: Omit<PaymentTerminal, 'id' | 'createdAt' | 'updatedAt'>): PaymentTerminal {
  const terminals = getTerminals();
  const now = new Date().toISOString();
  
  const newTerminal: PaymentTerminal = {
    ...data,
    id: `terminal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  };
  
  if (data.isDefault) {
    terminals.forEach(t => t.isDefault = false);
  }
  
  terminals.push(newTerminal);
  saveTerminals(terminals);
  return newTerminal;
}

export function updateTerminal(id: string, data: Partial<PaymentTerminal>): PaymentTerminal | null {
  const terminals = getTerminals();
  const index = terminals.findIndex(t => t.id === id);
  
  if (index === -1) return null;
  
  if (data.isDefault) {
    terminals.forEach(t => t.isDefault = false);
  }
  
  terminals[index] = {
    ...terminals[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };
  
  saveTerminals(terminals);
  return terminals[index];
}

export function deleteTerminal(id: string): boolean {
  const terminals = getTerminals();
  const filtered = terminals.filter(t => t.id !== id);
  
  if (filtered.length === terminals.length) return false;
  
  if (terminals.find(t => t.id === id)?.isDefault && filtered.length > 0) {
    filtered[0].isDefault = true;
  }
  
  saveTerminals(filtered);
  return true;
}

export function getTerminalLinkPreference(): TerminalLinkPreference {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(TERMINAL_PREFERENCE_KEY);
  return stored as TerminalLinkPreference;
}

export function setTerminalLinkPreference(preference: TerminalLinkPreference): void {
  if (typeof window === "undefined") return;
  if (preference === null) {
    localStorage.removeItem(TERMINAL_PREFERENCE_KEY);
  } else {
    localStorage.setItem(TERMINAL_PREFERENCE_KEY, preference);
  }
}

export function shouldShowTerminalLinkPrompt(): boolean {
  const preference = getTerminalLinkPreference();
  if (preference === "never_ask") return false;
  return !hasConfiguredTerminal();
}

function getPaymentIntents(): PaymentIntent[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PAYMENT_INTENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function savePaymentIntents(intents: PaymentIntent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYMENT_INTENTS_KEY, JSON.stringify(intents));
}

export function createPaymentIntent(terminalId: string, amount: number, externalReference?: string): PaymentIntent {
  const intents = getPaymentIntents();
  
  const newIntent: PaymentIntent = {
    id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    terminalId,
    amount,
    externalReference,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  
  intents.push(newIntent);
  savePaymentIntents(intents);
  return newIntent;
}

export function updatePaymentIntent(id: string, data: Partial<PaymentIntent>): PaymentIntent | null {
  const intents = getPaymentIntents();
  const index = intents.findIndex(i => i.id === id);
  
  if (index === -1) return null;
  
  intents[index] = {
    ...intents[index],
    ...data,
  };
  
  savePaymentIntents(intents);
  return intents[index];
}

export function getPaymentIntent(id: string): PaymentIntent | null {
  const intents = getPaymentIntents();
  return intents.find(i => i.id === id) || null;
}

export async function processPaymentWithTerminal(
  amount: number,
  externalReference?: string
): Promise<PaymentIntent> {
  const terminal = getDefaultTerminal();
  
  if (!terminal) {
    throw new Error("No hay terminal configurada");
  }
  
  const intent = createPaymentIntent(terminal.id, amount, externalReference);
  
  try {
    updatePaymentIntent(intent.id, { status: "processing" });
    
    // Check if we're in demo mode (no real API tokens)
    if (isDemoMode()) {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update intent to processing state
      const updatedIntent = updatePaymentIntent(intent.id, {
        status: "processing",
        paymentId: `demo_${Date.now()}`,
      });
      
      return updatedIntent || intent;
    }
    
    const response = await fetch('/api/terminals/payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminalId: terminal.id,
        deviceId: terminal.deviceId,
        provider: terminal.provider,
        accessToken: terminal.accessToken,
        amount,
        externalReference,
        intentId: intent.id,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al procesar el pago");
    }
    
    const result = await response.json();
    
    const updatedIntent = updatePaymentIntent(intent.id, {
      status: result.status,
      paymentId: result.paymentId,
      authorizationCode: result.authorizationCode,
      completedAt: result.status === "approved" ? new Date().toISOString() : undefined,
    });
    
    return updatedIntent || intent;
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    updatePaymentIntent(intent.id, { 
      status: "error",
      errorMessage,
    });
    throw error;
  }
}

// Track demo mode poll counts for simulated approval
const demoPollCounts: Record<string, number> = {};

export async function checkPaymentStatus(intentId: string): Promise<PaymentIntent> {
  const intent = getPaymentIntent(intentId);
  
  if (!intent) {
    throw new Error("Intent de pago no encontrado");
  }
  
  const terminal = getTerminals().find(t => t.id === intent.terminalId);
  
  if (!terminal) {
    throw new Error("Terminal no encontrada");
  }
  
  // Demo mode: simulate payment approval after 2-3 polls
  if (isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Track poll count for this intent
    demoPollCounts[intentId] = (demoPollCounts[intentId] || 0) + 1;
    const pollCount = demoPollCounts[intentId];
    
    // Approve after 2-3 polls (simulates customer inserting card and completing payment)
    if (pollCount >= 2) {
      delete demoPollCounts[intentId];
      
      const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const updatedIntent = updatePaymentIntent(intentId, {
        status: "approved",
        authorizationCode: authCode,
        paymentId: `demo_pay_${Date.now()}`,
        completedAt: new Date().toISOString(),
      });
      
      return updatedIntent || intent;
    }
    
    // Still processing
    return intent;
  }
  
  try {
    const response = await fetch('/api/terminals/payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intentId,
        deviceId: terminal.deviceId,
        provider: terminal.provider,
        accessToken: terminal.accessToken,
      }),
    });
    
    if (!response.ok) {
      throw new Error("Error al verificar estado del pago");
    }
    
    const result = await response.json();
    
    const updatedIntent = updatePaymentIntent(intentId, {
      status: result.status,
      paymentId: result.paymentId,
      authorizationCode: result.authorizationCode,
      completedAt: result.status === "approved" ? new Date().toISOString() : undefined,
      errorMessage: result.errorMessage,
    });
    
    return updatedIntent || intent;
    
  } catch (error) {
    throw error;
  }
}

export async function fetchTerminalDevices(
  provider: TerminalProvider,
  accessToken: string
): Promise<TerminalDevice[]> {
  try {
    const response = await fetch('/api/terminals/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, accessToken }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Error al obtener dispositivos");
    }
    
    const result = await response.json();
    return result.devices || [];
    
  } catch (error) {
    throw error;
  }
}

export async function testTerminalConnection(terminal: PaymentTerminal): Promise<boolean> {
  try {
    const response = await fetch('/api/terminals/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: terminal.provider,
        deviceId: terminal.deviceId,
        accessToken: terminal.accessToken,
      }),
    });
    
    if (!response.ok) {
      return false;
    }
    
    const result = await response.json();
    return result.connected === true;
    
  } catch (error) {
    return false;
  }
}

export function getTerminalName(provider: TerminalProvider): string {
  const terminals = getTerminals().filter(t => t.provider === provider);
  const count = terminals.length + 1;
  
  const providerNames: Record<TerminalProvider, string> = {
    mercadopago: "Mercado Pago",
    clip: "Clip",
  };
  
  return `${providerNames[provider]} ${count}`;
}
