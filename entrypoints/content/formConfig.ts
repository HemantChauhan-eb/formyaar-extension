// Canonical FormYaar autofill config shape + a fail-closed validator.
//
// Configs are fetched live from the backend and executed against a real
// government form *after the user has paid*, so a malformed push must never
// run. `validateFormConfig()` structurally checks the parts the engine
// actually depends on (form → steps → fields → selector/value_source) and
// returns null on anything broken, so the caller can fall back to a bundled /
// last-good config instead of half-filling the form.
//
// It is deliberately lenient about the rest: unknown field `type`s and any
// extra keys are preserved and left for the runtime to handle (the fill switch
// skips types it doesn't know). That way a forward-compatible config pushed to
// newer builds doesn't hard-fail older ones — it just fills what it can.

export type FieldType =
  | "text"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "button_click";

export interface FieldConfig {
  field_id: string;
  type: FieldType;
  selector: string;
  value_source: string;
  explanation?: string;
  static_value?: string | boolean;
  match_by?: "value" | "text";
  format?: string;
  min_delay_ms?: number;
  force_enable?: boolean;
  defence_selector?: string;
  // Injected at fill time (not present in the config file itself).
  _step?: number;
}

export interface StepCompletion {
  title?: string;
  subtitle?: string;
  manual_steps?: string[];
  info?: string;
}

export interface PageCoach {
  selector: string;
  message: string;
}

export interface StepConfig {
  step: number;
  fields: FieldConfig[];
  page_pattern?: string;
  page?: string;
  stop_message?: string;
  stepy_index?: number;
  is_token_page?: boolean;
  guidance_only?: boolean;
  auto_advance?: boolean;
  completion?: StepCompletion;
  page_coach?: PageCoach;
}

export interface FormConfig {
  form: string;
  version: number;
  site: string;
  steps: StepConfig[];
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Returns the typed config, or null (with the reason logged) if it's
 * structurally unsafe to run. Fail-closed: any problem in the parts the fill
 * engine relies on rejects the *whole* config — better to fall back than to
 * mis-fill a government form. `reason` is returned via the out-param so the
 * caller can forward it to telemetry.
 */
export function validateFormConfig(
  raw: unknown,
  out?: { reason?: string },
): FormConfig | null {
  const bad = (reason: string): null => {
    if (out) out.reason = reason;
    console.warn(`FormYaar: rejecting invalid form config — ${reason}`);
    return null;
  };

  if (!isObj(raw)) return bad("not an object");
  if (typeof raw.form !== "string" || !raw.form) return bad("missing 'form'");
  if (!Array.isArray(raw.steps) || raw.steps.length === 0)
    return bad("missing or empty 'steps'");

  for (let i = 0; i < raw.steps.length; i++) {
    const s = raw.steps[i];
    if (!isObj(s)) return bad(`step[${i}] is not an object`);
    if (typeof s.step !== "number") return bad(`step[${i}].step is not a number`);
    if (!Array.isArray(s.fields)) return bad(`step[${i}].fields is not an array`);

    for (let j = 0; j < s.fields.length; j++) {
      const f = s.fields[j];
      const at = `step[${i}].fields[${j}]`;
      if (!isObj(f)) return bad(`${at} is not an object`);
      if (typeof f.field_id !== "string" || !f.field_id)
        return bad(`${at}.field_id missing`);
      if (typeof f.type !== "string") return bad(`${at}.type missing`);
      if (typeof f.selector !== "string" || !f.selector)
        return bad(`${at}.selector missing`);
      if (typeof f.value_source !== "string")
        return bad(`${at}.value_source missing`);
    }
  }

  // Structurally sound. Extra keys / unknown enums are preserved as-is.
  return raw as unknown as FormConfig;
}
