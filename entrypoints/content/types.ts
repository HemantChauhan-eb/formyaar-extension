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
  | { type: "CREATE_PAYMENT"; form: string; coupon?: string }
  | { type: "OPEN_RAZORPAY"; order_id: string; amount: number }
  // Sent by the /pay page (relayed through the formyaar.in content script) the
  // instant Razorpay confirms, so the handoff back to the form doesn't wait for
  // the next poll tick. It is only a nudge to check *now* — the background
  // still verifies with the backend before unlocking anything.
  | { type: "PAYMENT_CHECK_NOW" }
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
