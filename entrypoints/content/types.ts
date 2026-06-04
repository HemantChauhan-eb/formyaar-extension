// Extension message types for background ↔ content communication

export type ExtensionMessage =
  | { type: "START_GUIDE"; form: string }
  | { type: "OPEN_PANEL" }
  | { type: "STOP_GUIDE" }
  | { type: "PAYMENT_VERIFIED" }
  | {
      type: "AI_CHAT";
      fieldId: string;
      fieldExplanation: string;
      userMessage: string;
    }
  | { type: "CREATE_PAYMENT"; form: string }
  | { type: "OPEN_RAZORPAY"; order_id: string; amount: number }
  | { type: "OPEN_URL"; url: string }
  | {
      type: "TELEMETRY_EVENT";
      payload: {
        event: string;
        form: string;
        metadata: Record<string, unknown>;
      };
    };

export type BackgroundResponse =
  | { response: string }
  | { success: boolean; order_id?: string; amount?: number; error?: string };
