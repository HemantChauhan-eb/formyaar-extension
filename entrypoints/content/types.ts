// Shared types for FormYaar extension

export interface FieldConfig {
  field_id: string;
  selectors: { type: "css" | "id" | "xpath"; value: string }[];
  explanation: string;
  required?: boolean;
}

export interface StepConfig {
  step: number;
  page_pattern: string;
  fields: FieldConfig[];
}

export interface FormConfig {
  form: string;
  version: number;
  site: string;
  steps: StepConfig[];
}

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
  | { type: "OPEN_URL"; url: string };

export type BackgroundResponse =
  | { response: string }
  | { success: boolean; order_id?: string; amount?: number; error?: string };
