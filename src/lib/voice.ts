import { LANGS, type Lang } from "./i18n";

export const EMERGENCY_TYPES = ["medical", "rescue", "child", "elderly", "medicine", "shelter", "food", "water", "other"] as const;
export type EmergencyType = (typeof EMERGENCY_TYPES)[number];

export function priorityFor(t: string): "critical" | "high" | "normal" {
  if (["medical", "rescue", "child", "elderly"].includes(t)) return "critical";
  if (["medicine", "shelter"].includes(t)) return "high";
  return "normal";
}

const speechCode = (l: Lang) => LANGS.find((x) => x.code === l)?.speech ?? "en-IN";

export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = speechCode(lang);
  window.speechSynthesis.speak(u);
  return true;
}

// Keywords across languages mapped to emergency types
const KEYWORDS: Record<EmergencyType, string[]> = {
  medical: ["medical", "doctor", "injur", "hurt", "hospital", "వైద్య", "डॉक्टर", "चिकित्सा", "वैद्यकीय", "மருத்துவ", "চিকিৎসা", "ವೈದ್ಯ", "വൈദ്യ", "ડૉક્ટર", "તબીબી", "طبی", "ڈاکٹر"],
  rescue: ["rescue", "trapped", "stuck", "రక్షణ", "బచావ", "बचाव", "மீட்பு", "উদ্ধার", "ರಕ್ಷಣೆ", "രക്ഷ", "બચાવ", "ریسکیو", "بچاؤ"],
  child: ["child", "baby", "పిల్ల", "बच्च", "बाल", "குழந்தை", "শিশু", "ಮಗು", "കുട്ടി", "બાળ", "بچہ"],
  elderly: ["elder", "old", "వృద్ధ", "बुज़ुर्ग", "बुजुर्ग", "वृद्ध", "முதிய", "বয়স্ক", "ಹಿರಿಯ", "വയോ", "વૃદ્ધ", "بزرگ"],
  medicine: ["medicine", "tablet", "మందు", "दवा", "औषध", "மருந்து", "ওষুধ", "ಔಷಧ", "മരുന്ന്", "દવા", "دوا"],
  shelter: ["shelter", "house", "ఆశ్రయ", "आश्रय", "निवारा", "தங்கு", "আশ্রয়", "ಆಶ್ರಯ", "അഭയ", "આશ્રય", "پناہ"],
  food: ["food", "hungry", "ఆహార", "అన్నం", "भोजन", "खाना", "अन्न", "உணவு", "খাদ্য", "খাবার", "ಆಹಾರ", "ഭക്ഷണ", "ખોરાક", "کھانا"],
  water: ["water", "నీ", "पानी", "पाणी", "தண்ணீர்", "জল", "পানি", "ನೀರು", "വെള്ളം", "પાણી", "پانی"],
  other: [],
};

export function matchEmergency(text: string): EmergencyType | null {
  const s = text.toLowerCase();
  for (const t of EMERGENCY_TYPES) if (KEYWORDS[t].some((k) => s.includes(k.toLowerCase()))) return t;
  return null;
}

export function listen(lang: Lang, onText: (t: string) => void, onEnd?: () => void): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) return false;
  const r = new SR();
  r.lang = speechCode(lang);
  r.interimResults = false;
  r.maxAlternatives = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.onresult = (e: any) => onText(e.results[0][0].transcript);
  r.onend = () => onEnd?.();
  r.onerror = () => onEnd?.();
  r.start();
  return true;
}
