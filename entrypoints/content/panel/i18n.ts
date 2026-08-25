// Hindi support for the Android app's panel screens (home, chooser, intake
// wizard, document upload, resume card). Extension-side rendering never
// calls applyLang(), so this is silent, zero-effect dead weight on desktop —
// data-i18n attributes sit in the markup unused, and the English text they
// wrap is exactly what was already there.
//
// Scoped to what the app actually shows: fillingScreen/verifyScreen/
// celebration/payment/operator/recover markup is either unreachable from the
// app's own navigation (app-shell.html never targets those screens) or
// deliberately left for a later pass — see formyaar-backend/NOTES.md.

export type Lang = "en" | "hi";

export const STRINGS: Record<string, { en: string; hi: string }> = {
  // ── Home ──────────────────────────────────────────────────────────
  "home.title": { en: "Get your PAN card made.", hi: "अपना PAN कार्ड बनवाएं।" },
  "home.subtitle": {
    en: "We type the entire government form for you. You just check it and submit.",
    hi: "हम पूरा सरकारी फॉर्म आपके लिए भरते हैं। आप बस जांचें और सबमिट करें।",
  },
  "home.cta": { en: "Start — it takes 5 minutes", hi: "शुरू करें — सिर्फ 5 मिनट लगेंगे" },
  "home.price_note": {
    en: "₹39 · pay only when your details are ready",
    hi: "₹39 · भुगतान तभी करें जब आपकी जानकारी तैयार हो",
  },
  "home.trust1_html": {
    en: "Your details are saved <strong>only on this device</strong> — never on our servers",
    hi: "आपकी जानकारी <strong>सिर्फ इसी डिवाइस पर</strong> सेव होती है — कभी हमारे सर्वर पर नहीं",
  },
  "home.trust2_html": {
    en: "<strong>Full refund</strong> if the government rejects your form",
    hi: "सरकार द्वारा अस्वीकार होने पर <strong>पूरा रिफंड</strong>",
  },
  "home.trust3": {
    en: "You review everything before it's submitted",
    hi: "सबमिट करने से पहले आप सब कुछ जांच लेते हैं",
  },
  "home.coming_soon": {
    en: "Coming soon — Aadhaar · Driving Licence · Passport · Voter ID",
    hi: "जल्द आ रहा है — आधार · ड्राइविंग लाइसेंस · पासपोर्ट · वोटर आईडी",
  },
  "home.operator": { en: "Cafe operator?", hi: "कैफे ऑपरेटर?" },
  "home.recover": { en: "Already paid? Recover", hi: "पहले से भुगतान किया है? रिकवर करें" },
  "home.footer_note": {
    en: "Not affiliated with any government entity. FormYaar is a private service. Anonymous usage events are collected to improve it.",
    hi: "यह किसी भी सरकारी संस्था से संबद्ध नहीं है। FormYaar एक निजी सेवा है। इसे बेहतर बनाने के लिए अनाम उपयोग डेटा एकत्र किया जाता है।",
  },
  "home.clear_data_title": {
    en: "Delete my saved details",
    hi: "मेरी सेव की गई जानकारी हटाएं",
  },

  // ── Chooser ───────────────────────────────────────────────────────
  "chooser.header": { en: "Choose your application", hi: "अपना आवेदन चुनें" },
  "chooser.title": { en: "What do you need?", hi: "आपको क्या चाहिए?" },
  "chooser.sub": {
    en: "Pick one — we'll fill that government form for you.",
    hi: "एक चुनें — हम वह सरकारी फॉर्म आपके लिए भरेंगे।",
  },
  "chooser.opt_new_title": { en: "New PAN card", hi: "नया PAN कार्ड" },
  "chooser.opt_new_sub": {
    en: "You don't have a PAN yet",
    hi: "आपके पास अभी तक PAN नहीं है",
  },
  "chooser.opt_correction_title": {
    en: "Correct existing PAN",
    hi: "मौजूदा PAN में सुधार करें",
  },
  "chooser.opt_correction_sub": {
    en: "Name, DOB, photo, address & more",
    hi: "नाम, जन्म तिथि, फोटो, पता और अन्य",
  },
  "chooser.opt_minor_title": { en: "PAN for a minor", hi: "नाबालिग के लिए PAN" },
  "chooser.opt_minor_sub": {
    en: "Applicant is under 18",
    hi: "आवेदक की उम्र 18 वर्ष से कम है",
  },
  "chooser.soon": { en: "Soon", hi: "जल्द आ रहा" },
  "chooser.hint_html": {
    en: "Not sure? Pick <strong>Correct existing PAN</strong> only if you already hold one — applying twice is an offence.",
    hi: "पक्का नहीं? <strong>मौजूदा PAN में सुधार</strong> तभी चुनें जब आपके पास पहले से एक हो — दोबारा आवेदन करना अपराध है।",
  },

  // ── Wizard chrome ─────────────────────────────────────────────────
  "wizard.header_subtitle": { en: "Your details · ~5 min", hi: "आपकी जानकारी · ~5 मिनट" },
  "wizard.continue": { en: "Continue", hi: "जारी रखें" },
  "wizard.save_continue": { en: "Save & continue →", hi: "सेव करें और आगे बढ़ें →" },
  "wizard.privacy": {
    en: "Saved on your device only — never sent to us",
    hi: "केवल आपके डिवाइस पर सेव — हमें कभी नहीं भेजा जाता",
  },
  "wizard.step1": { en: "Step 1 of 5", hi: "चरण 1/5" },
  "wizard.step2": { en: "Step 2 of 5", hi: "चरण 2/5" },
  "wizard.step3": { en: "Step 3 of 5", hi: "चरण 3/5" },
  "wizard.step4": { en: "Step 4 of 5", hi: "चरण 4/5" },
  "wizard.step5": { en: "Step 5 of 5", hi: "चरण 5/5" },

  // Pane 1 — name
  "wizard.p1_title": { en: "What's your name?", hi: "आपका नाम क्या है?" },
  "wizard.p1_sub": {
    en: "Exactly as printed on your Aadhaar card.",
    hi: "बिल्कुल वैसा ही जैसा आपके आधार कार्ड पर छपा है।",
  },
  "field.first_name": { en: "First name", hi: "पहला नाम" },
  "field.middle_name": { en: "Middle name", hi: "मध्य नाम" },
  "field.middle_short": { en: "Middle", hi: "मध्य नाम" },
  "field.last_name": { en: "Last name", hi: "अंतिम नाम" },
  "field.dob": { en: "Date of birth", hi: "जन्म तिथि" },
  "field.gender": { en: "Gender", hi: "लिंग" },
  "opt.male": { en: "Male", hi: "पुरुष" },
  "opt.female": { en: "Female", hi: "महिला" },
  "opt.transgender": { en: "Transgender", hi: "ट्रांसजेंडर" },

  // Pane 2 — contact
  "wizard.p2_title": { en: "How do we reach you?", hi: "हम आपसे कैसे संपर्क करें?" },
  "wizard.p2_sub": {
    en: "The government sends your e-PAN to this email.",
    hi: "सरकार आपका ई-पैन इसी ईमेल पर भेजेगी।",
  },
  "field.email": { en: "Email", hi: "ईमेल" },
  "field.mobile": { en: "Mobile number", hi: "मोबाइल नंबर" },
  "wizard.mobile_hint": {
    en: "If you leave your application midway, we may call this number to see if we can help.",
    hi: "अगर आप आवेदन बीच में छोड़ देते हैं, तो हम मदद के लिए इस नंबर पर कॉल कर सकते हैं।",
  },

  // Pane 3 — Aadhaar
  "wizard.p3_title": { en: "Your Aadhaar", hi: "आपका आधार" },
  "wizard.p3_sub": {
    en: "We only ask for the last 4 digits — never your full number. This stays on your device.",
    hi: "हम केवल अंतिम 4 अंक मांगते हैं — कभी भी पूरा नंबर नहीं। यह आपके डिवाइस पर ही रहता है।",
  },
  "field.aadhaar_last4": { en: "Last 4 digits of Aadhaar", hi: "आधार के अंतिम 4 अंक" },
  "field.aadhaar_pin": { en: "PIN code as per Aadhaar", hi: "आधार के अनुसार पिन कोड" },

  // Pane 4 — family
  "wizard.p4_title": { en: "Your parents' names", hi: "आपके माता-पिता के नाम" },
  "wizard.p4_sub": {
    en: "The PAN form asks for both. One of them gets printed on the card.",
    hi: "PAN फॉर्म दोनों नाम मांगता है। इनमें से एक कार्ड पर छपेगा।",
  },
  "field.father_first": { en: "Father's first name", hi: "पिता का पहला नाम" },
  "field.father_last": { en: "Father's last name", hi: "पिता का अंतिम नाम" },
  "field.mother_first": { en: "Mother's first name", hi: "माता का पहला नाम" },
  "field.mother_last": { en: "Mother's last name", hi: "माता का अंतिम नाम" },
  "field.single_parent": { en: "Single parent?", hi: "एकल अभिभावक?" },
  "opt.no": { en: "No", hi: "नहीं" },
  "opt.yes": { en: "Yes", hi: "हाँ" },
  "field.parent_on_card": { en: "Whose name on the card?", hi: "कार्ड पर किसका नाम?" },
  "opt.fathers": { en: "Father's", hi: "पिता का" },
  "opt.mothers": { en: "Mother's", hi: "माता का" },

  // Pane 5 — final
  "wizard.p5_title": { en: "Last step", hi: "आखिरी चरण" },
  "wizard.p5_sub": {
    en: "A few details the income tax department requires.",
    hi: "आयकर विभाग को चाहिए कुछ और जानकारी।",
  },
  "field.proof_of_pan": { en: "Proof of your existing PAN", hi: "आपके मौजूदा PAN का प्रमाण" },
  "opt.pan_copy": { en: "Copy of PAN card", hi: "PAN कार्ड की कॉपी" },
  "opt.pan_allotment": { en: "Copy of PAN allotment letter", hi: "PAN आवंटन पत्र की कॉपी" },
  "opt.no_document": { en: "No document", hi: "कोई दस्तावेज़ नहीं" },
  "wizard.proof_pan_hint": {
    en: "What you'll upload to prove the PAN you're correcting",
    hi: "जिस PAN में सुधार कर रहे हैं उसे साबित करने के लिए आप जो अपलोड करेंगे",
  },
  "field.wants_physical": {
    en: "Do you want a physical PAN card?",
    hi: "क्या आपको फिजिकल PAN कार्ड चाहिए?",
  },
  "opt.yes_101": { en: "Yes — ₹101", hi: "हाँ — ₹101" },
  "opt.no_66": { en: "No — ₹66", hi: "नहीं — ₹66" },
  "wizard.physical_hint": {
    en: "\"No\" means e-PAN only, sent to your email. This is the government's fee, not ours.",
    hi: "“नहीं” का मतलब है केवल ई-पैन, जो आपके ईमेल पर भेजा जाएगा। यह सरकार की फीस है, हमारी नहीं।",
  },
  "field.income_source": { en: "Source of income", hi: "आय का स्रोत" },
  "wizard.select_all": { en: "Select all that apply", hi: "जो भी लागू हो, चुनें" },
  "opt.salary": { en: "Salary", hi: "वेतन" },
  "opt.business": { en: "Business", hi: "व्यवसाय" },
  "opt.house_property": { en: "House property", hi: "गृह संपत्ति" },
  "opt.other_sources": { en: "Other sources", hi: "अन्य स्रोत" },
  "opt.capital_gains": { en: "Capital gains", hi: "पूंजीगत लाभ" },
  "opt.no_income": { en: "No income", hi: "कोई आय नहीं" },
  "field.place": { en: "Place (district)", hi: "स्थान (जिला)" },
  "wizard.place_hint": {
    en: "The city where you're filing this application",
    hi: "वह शहर जहां आप यह आवेदन कर रहे हैं",
  },
  "field.proof_of_dob": { en: "Proof of date of birth", hi: "जन्म तिथि का प्रमाण" },
  "opt.select_document": { en: "Select a document…", hi: "एक दस्तावेज़ चुनें…" },
  "opt.birth_cert": { en: "Birth Certificate", hi: "जन्म प्रमाण पत्र" },
  "opt.matric_cert": { en: "Matriculation Certificate", hi: "मैट्रिकुलेशन प्रमाण पत्र" },
  "opt.matric_marksheet": { en: "Matriculation Marksheet", hi: "मैट्रिकुलेशन मार्कशीट" },
  "opt.driving_license": { en: "Driving License", hi: "ड्राइविंग लाइसेंस" },
  "opt.passport": { en: "Passport", hi: "पासपोर्ट" },
  "opt.voter_id": { en: "Voter ID", hi: "वोटर आईडी" },
  "opt.pension_order": { en: "Pension Payment Order", hi: "पेंशन भुगतान आदेश" },
  "wizard.proof_dob_hint": {
    en: "The document you'll upload as proof",
    hi: "प्रमाण के रूप में आप जो दस्तावेज़ अपलोड करेंगे",
  },
  "field.is_defence": { en: "Are you a defence personnel?", hi: "क्या आप रक्षा कर्मी हैं?" },
  "field.defence_branch": { en: "Defence branch", hi: "रक्षा शाखा" },
  "opt.army": { en: "Army", hi: "सेना" },
  "opt.air_force": { en: "Air Force", hi: "वायु सेना" },
  "field.address_same": {
    en: "Is your current address the same as your Aadhaar address?",
    hi: "क्या आपका वर्तमान पता आपके आधार पते जैसा ही है?",
  },
  "wizard.address_hint": {
    en: "\"Yes\" uses the regular Aadhaar eKYC application. \"No\" switches to the PAN application with supporting documents, so you can enter your current address.",
    hi: "“हाँ” सामान्य आधार eKYC आवेदन उपयोग करता है। “नहीं” सहायक दस्तावेज़ों वाले PAN आवेदन पर ले जाता है, ताकि आप अपना वर्तमान पता दर्ज कर सकें।",
  },
  "wizard.optional_summary": { en: "+ Optional — passport, TIN", hi: "+ वैकल्पिक — पासपोर्ट, टिन" },
  "field.passport_number": { en: "Passport number", hi: "पासपोर्ट नंबर" },
  "field.tin_number": { en: "TIN number", hi: "टिन नंबर" },

  // ── Document upload screen (app-only) ────────────────────────────
  "docs.subtitle": { en: "Your document · optional", hi: "आपका दस्तावेज़ · वैकल्पिक" },
  "docs.intro": {
    en: "Required to verify your date of birth — Aadhaar is no longer accepted for this. Pick the document you'll submit as proof.",
    hi: "आपकी जन्म तिथि सत्यापित करने के लिए आवश्यक — इसके लिए अब आधार स्वीकार नहीं है। जो दस्तावेज़ आप प्रमाण के रूप में जमा करेंगे, उसे चुनें।",
  },
  "docs.choose_file": { en: "Choose file", hi: "फ़ाइल चुनें" },
  "docs.choose_different": { en: "Choose a different file", hi: "दूसरी फ़ाइल चुनें" },
  "docs.skip_for_now": { en: "Skip for now", hi: "अभी छोड़ें" },
  "docs.continue": { en: "Continue", hi: "जारी रखें" },
  "docs.file_type_note": { en: "PDF or photo · one file", hi: "PDF या फोटो · एक फ़ाइल" },
  "docs.view": { en: "View", hi: "देखें" },
  "docs.remove": { en: "Remove", hi: "हटाएं" },
  "docs.view_note": {
    en: "View the final document before continuing — if it's unclear, upload it again yourself.",
    hi: "आगे बढ़ने से पहले अंतिम दस्तावेज़ देख लें — अगर यह स्पष्ट नहीं है, तो इसे दोबारा खुद अपलोड करें।",
  },
  "docs.limit_note": {
    en: "Limit is 300 KB. Compressing makes it slightly blurrier.",
    hi: "सीमा 300 KB है। कंप्रेस करने से यह थोड़ा धुंधला हो जाएगा।",
  },
  "docs.cancel": { en: "Cancel", hi: "रद्द करें" },
  "docs.compress": { en: "Compress", hi: "कंप्रेस करें" },
  "docs.compress_it": { en: "Compress it", hi: "इसे कंप्रेस करें" },
  "docs.working": { en: "Working…", hi: "काम जारी है…" },
  "docs.stays_on_phone": { en: "Stays on your phone", hi: "आपके फोन पर ही रहता है" },
  "docs.oversize_title": {
    en: "This file is {0} KB — too big for the form",
    hi: "यह फ़ाइल {0} KB की है — फॉर्म के लिए बहुत बड़ी",
  },
  "docs.picker_error": {
    en: "couldn't open the file picker on this device",
    hi: "इस डिवाइस पर फ़ाइल पिकर नहीं खुल सका",
  },
  "docs.address_block_title": { en: "We can't help with this one yet.", hi: "इसमें हम अभी मदद नहीं कर सकते।" },
  "docs.address_block_body": {
    en: "A current address that differs from your Aadhaar needs a different government form, which this app doesn't fill yet. On a computer, the FormYaar extension does handle it.",
    hi: "आधार से अलग वर्तमान पते के लिए एक अलग सरकारी फॉर्म चाहिए, जो यह ऐप अभी नहीं भरता। कंप्यूटर पर, FormYaar एक्सटेंशन इसे संभाल सकता है।",
  },
  "app.browser_only_alert": {
    en: "This screen fills the form from inside the FormYaar app. In a browser there's nothing to fill.",
    hi: "यह स्क्रीन FormYaar ऐप के अंदर से फॉर्म भरती है। ब्राउज़र में भरने के लिए कुछ नहीं है।",
  },

  // ── AO code check (app-shell.html) ───────────────────────────────
  "ao.checking": { en: "Checking AO code availability…", hi: "AO कोड की उपलब्धता जांची जा रही है…" },
  "ao.not_recognised": {
    en: "✗ PIN code not recognised — please double-check it",
    hi: "✗ पिन कोड पहचाना नहीं गया — कृपया दोबारा जांचें",
  },
  "ao.available": { en: "✓ AO code available for your area", hi: "✓ आपके क्षेत्र के लिए AO कोड उपलब्ध है" },
  "ao.unavailable_title": {
    en: "✗ We don't have the AO code for this area yet",
    hi: "✗ हमारे पास अभी इस क्षेत्र के लिए AO कोड नहीं है",
  },
  "ao.unavailable_body": {
    en: "FormYaar can't complete this form correctly without it. Please write to us and we'll add your area.",
    hi: "इसके बिना FormYaar यह फॉर्म सही से पूरा नहीं कर सकता। कृपया हमें लिखें, हम आपका क्षेत्र जोड़ देंगे।",
  },
  "ao.error_title": { en: "✗ Couldn't check your AO code", hi: "✗ आपका AO कोड जांचा नहीं जा सका" },
  "ao.error_body": { en: "Check your internet connection, then", hi: "अपना इंटरनेट कनेक्शन जांचें, फिर" },
  "ao.retry": { en: "Retry", hi: "फिर से कोशिश करें" },

  // ── Resume / pending session card (app-shell.html) ───────────────
  "resume.started": { en: "Started {0} — ready to continue", hi: "{0} को शुरू किया — आगे बढ़ने के लिए तैयार" },
  "resume.discard": { en: "Discard", hi: "हटाएं" },
  "resume.continue": { en: "Continue →", hi: "जारी रखें →" },
  "resume.discard_confirm": {
    en: "Discard this application and the details you typed?",
    hi: "यह आवेदन और आपकी टाइप की गई जानकारी हटाएं?",
  },
  "resume.form_pan_new": { en: "PAN Card — New", hi: "PAN कार्ड — नया" },
  "resume.form_pan_correction": {
    en: "PAN Card — Changes / Correction",
    hi: "PAN कार्ड — बदलाव / सुधार",
  },

  // ── Language toggle itself ────────────────────────────────────────
  // Full words, not abbreviations — someone who reads only Hindi needs to
  // recognise this as the language switch without already knowing what "EN"
  // or a clipped "हिं" means.
  "lang.toggle_label": { en: "हिंदी", hi: "English" },
};

export function t(key: string, lang: Lang, subs?: (string | number)[]): string {
  const entry = STRINGS[key];
  let str = entry ? (entry[lang] ?? entry.en) : key;
  if (subs) subs.forEach((s, i) => (str = str.replace(`{${i}}`, String(s))));
  return str;
}

let currentLang: Lang = "en";
export function getLang(): Lang {
  return currentLang;
}
export function setLang(lang: Lang): void {
  currentLang = lang;
}

/**
 * Walks every element under `root` carrying a data-i18n* attribute and sets
 * its text/html/placeholder/title from STRINGS. Safe to call repeatedly (on
 * load, and again each time the toggle is pressed) and safe to call on a
 * root that has no such elements at all — which is what happens every time
 * the desktop extension's own code runs, since it never calls this.
 */
export function applyLang(lang: Lang, root: ParentNode = document): void {
  setLang(lang);
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n!, lang);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml!, lang);
  });
  root.querySelectorAll<HTMLInputElement>("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh!, lang);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-title]").forEach((el) => {
    const val = t(el.dataset.i18nTitle!, lang);
    el.title = val;
    el.setAttribute("aria-label", val);
  });
}
