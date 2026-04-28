export interface Field {
  id: string;
  selector: string;
  explanation: string;
  required?: boolean;
}
export interface Guide {
  form: string;
  fields: Field[];
}

let currentGuide: Guide | null = null;
let currentIndex: number = 0;
let onNextCallback: ((field: Field) => void) | null = null;
let onCompleteCallback: (() => void) | null = null;

export function startGuide(
  guide: Guide,
  onNext: (field: Field) => void,
  onComplete: () => void,
) {
  currentGuide = guide;
  currentIndex = 0;
  onNextCallback = onNext;
  onCompleteCallback = onComplete;

  // Start with first field
  onNextCallback(currentGuide.fields[currentIndex]);
}

export function nextField() {
  if (!currentGuide || !onNextCallback || !onCompleteCallback) return;

  currentIndex++;

  if (currentIndex >= currentGuide.fields.length) {
    // All fields done
    onCompleteCallback();
    stopGuide();
    return;
  }

  onNextCallback(currentGuide.fields[currentIndex]);
}

export function stopGuide() {
  currentGuide = null;
  currentIndex = 0;
  onNextCallback = null;
  onCompleteCallback = null;
}

export function getCurrentIndex() {
  return currentIndex;
}

export function getTotalFields() {
  return currentGuide?.fields.length ?? 0;
}
