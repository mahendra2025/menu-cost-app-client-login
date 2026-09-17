'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type AppLanguage = 'en' | 'hi';

const LANGUAGE_STORAGE_KEY = 'menu_cost_language';

const hindi: Record<string, string> = {
  Event: 'इवेंट',
  Cost: 'लागत',
  'Final Costing': 'अंतिम लागत',
  Profile: 'प्रोफ़ाइल',
  History: 'इतिहास',
  Quote: 'कोटेशन',
  Ingredients: 'सामग्री',
  'Event Details': 'इवेंट की जानकारी',
  'Create Event': 'इवेंट बनाएँ',
  'Detected menu': 'पहचाना गया मेन्यू',
  Manpower: 'स्टाफ़',
  'Extra Cost': 'अतिरिक्त खर्च',
  'Event and menu': 'इवेंट और मेन्यू',
  'Calculate price': 'कीमत की गणना',
  'Price and profit': 'कीमत और मुनाफ़ा',
  'Business settings': 'व्यवसाय सेटिंग्स',
  Active: 'सक्रिय',
  'Sign out': 'साइन आउट',
  'Saved work': 'सेव किया गया काम',
  'Costing workflow': 'लागत बनाने की प्रक्रिया',
  'Costing library': 'लागत लाइब्रेरी',
  'Need a clean estimate?': 'साफ़ अनुमान चाहिए?',
  'Complete each step in order. Your work saves automatically.': 'हर चरण क्रम से पूरा करें। आपका काम अपने-आप सेव होता है।',
  'Catering workspace': 'कैटरिंग कार्यक्षेत्र',
  'Plan, price and present every event with confidence.': 'हर इवेंट की योजना, कीमत और प्रस्तुति भरोसे के साथ करें।',
  Step: 'चरण',
  of: 'में से',
  Workspace: 'कार्यक्षेत्र',
  'Opening Menu Costing App...': 'मेन्यू कॉस्टिंग ऐप खुल रहा है…',
  'App language': 'ऐप की भाषा',
  'Choose the language used for navigation and key workflow instructions.': 'नेविगेशन और मुख्य निर्देशों के लिए भाषा चुनें।',
  English: 'English',
  Hindi: 'हिन्दी',
  'Language preference': 'भाषा की पसंद',
  'Saved on this device and applied immediately.': 'इस डिवाइस पर सेव होती है और तुरंत लागू होती है।',
  'Step 6 of 6: business profile, plan status and logout': 'चरण 6 में से 6: व्यवसाय प्रोफ़ाइल, प्लान की स्थिति और लॉगआउट',
  'Set up this function': 'इस फंक्शन की जानकारी भरें',
  'Name the meal or celebration and confirm its guest count.': 'भोजन या समारोह का नाम और मेहमानों की संख्या दर्ज करें।',
  'Function name': 'फंक्शन का नाम',
  'e.g. Sangeet dinner': 'जैसे संगीत डिनर',
  'Use the name your team will recognise.': 'वही नाम रखें जिसे आपकी टीम पहचानती है।',
  'Guests for this function': 'इस फंक्शन के मेहमान',
  'Used to calculate ingredient quantities.': 'सामग्री की मात्रा निकालने के लिए उपयोग होगा।',
  'Add dishes for this function': 'इस फंक्शन के व्यंजन जोड़ें',
  'Upload a menu or paste its text. You can review every detected dish before saving.': 'मेन्यू अपलोड करें या उसका टेक्स्ट पेस्ट करें। सेव करने से पहले हर पहचाने गए व्यंजन की जाँच कर सकते हैं।',
  'Upload a menu': 'मेन्यू अपलोड करें',
  'Best for a PDF, printed menu or phone photo.': 'PDF, प्रिंटेड मेन्यू या फोन फोटो के लिए बेहतर।',
  'Choose PDF or photo': 'PDF या फोटो चुनें',
  'Reading menu…': 'मेन्यू पढ़ा जा रहा है…',
  'PDF up to 15 MB · photos up to 20 MB': 'PDF 15 MB तक · फोटो 20 MB तक',
  'Paste menu text': 'मेन्यू टेक्स्ट पेस्ट करें',
  'Best when you already have the menu in WhatsApp or a document.': 'जब मेन्यू WhatsApp या किसी दस्तावेज़ में हो।',
  'Use sample': 'नमूना देखें',
  Clear: 'साफ़ करें',
  'No menu text yet': 'अभी मेन्यू टेक्स्ट नहीं है',
  'Browse Dish Master': 'डिश मास्टर खोलें',
  'Loading Dishes…': 'व्यंजन लोड हो रहे हैं…',
  'Already costed these dishes? Add them directly without detection.': 'इन व्यंजनों की लागत पहले से है? इन्हें सीधे जोड़ें।',
  'Review detected dishes': 'पहचाने गए व्यंजन जाँचें',
  'Upload a menu or paste text to continue.': 'आगे बढ़ने के लिए मेन्यू अपलोड करें या टेक्स्ट पेस्ट करें।',
  'Detect dishes': 'व्यंजन पहचानें',
  'Detecting Dishes...': 'व्यंजन पहचाने जा रहे हैं…',
  'Refresh Detection Preview': 'पहचान फिर से चलाएँ',
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'hi' || saved === 'en') setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
  }, [language]);

  const setLanguage = useCallback((next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (text) => language === 'hi' ? hindi[text] ?? text : text,
  }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
