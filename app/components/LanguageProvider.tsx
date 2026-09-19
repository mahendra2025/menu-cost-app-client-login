'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DISH_COST_ITEMS } from '../../lib/dishCostMaster';

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
  'Upload a menu to continue.': 'आगे बढ़ने के लिए मेन्यू अपलोड करें।',
  'Detect dishes': 'व्यंजन पहचानें',
  'Detecting Dishes...': 'व्यंजन पहचाने जा रहे हैं…',
  'Refresh Detection Preview': 'पहचान फिर से चलाएँ',
  'Event & Menu': 'इवेंट और मेन्यू',
  Team: 'स्टाफ़',
  Expenses: 'खर्च',
  More: 'अधिक',
  'Costing progress': 'लागत प्रगति',
  'Main navigation': 'मुख्य नेविगेशन',
  'Menu Costing': 'मेन्यू कॉस्टिंग',
  'Ingredient requirements': 'सामग्री आवश्यकता',
  'Cost Review': 'लागत जाँच',
  'Dish costs': 'व्यंजन लागत',
  'Client quote': 'ग्राहक कोटेशन',
  'Save & Continue to Gas & Transport': 'सेव करें और गैस व परिवहन पर जाएँ',
  'Back to Grocery': 'किराना सूची पर वापस जाएँ',
  'Next: Grocery & Ingredients': 'अगला: किराना और सामग्री',
  'Back to Event & Menu': 'इवेंट और मेन्यू पर वापस जाएँ',
  'Remove Item': 'सामान हटाएँ',
  'Item name': 'सामान का नाम',
};

const fullAppHindi: Record<string, string> = {
  Menu: 'मेन्यू',
  Team: 'स्टाफ़',
  Expenses: 'खर्च',
  More: 'और',
  Pricing: 'कीमत',
  Quotation: 'कोटेशन',
  'All tools': 'सभी टूल',
  'Close menu': 'मेन्यू बंद करें',
  'Event & menu': 'इवेंट और मेन्यू',
  'Review menu': 'मेन्यू की जाँच',
  'Grocery list': 'किराना सूची',
  'Grocery requirements': 'किराने की आवश्यकता',
  'Function details': 'फंक्शन की जानकारी',
  'Add the function name and guest count before uploading its menu.': 'मेन्यू अपलोड करने से पहले फंक्शन का नाम और मेहमानों की संख्या भरें।',
  'Used for grocery quantities, manpower and pricing.': 'किराना मात्रा, स्टाफ़ और कीमत की गणना में उपयोग होगा।',
  'Upload a PDF or photo of the menu. Dishes will be detected automatically.': 'मेन्यू का PDF या फोटो अपलोड करें। व्यंजन अपने-आप पहचाने जाएँगे।',
  'Cost review': 'लागत की जाँच',
  'Ingredient index': 'सामग्री सूची',
  'Profile & plan': 'प्रोफ़ाइल और प्लान',
  'Drafts and completed costings': 'ड्राफ्ट और पूरी की गई लागत',
  'Function-wise ingredient needs': 'फंक्शन के अनुसार सामग्री',
  'Dish and per-cover costs': 'व्यंजन और प्रति प्लेट लागत',
  'Customer-ready quote': 'ग्राहक के लिए तैयार कोटेशन',
  'Your rate index': 'आपकी दरों की सूची',
  'Business and subscription': 'व्यवसाय और सब्सक्रिप्शन',
  Grocery: 'किराना सूची',
  Operations: 'संचालन',
  Disposable: 'डिस्पोज़ेबल',
  Dishes: 'व्यंजन',
  dishes: 'व्यंजन',
  Ingredient: 'सामग्री',
  Quantity: 'मात्रा',
  Unit: 'इकाई',
  Rate: 'दर',
  Amount: 'राशि',
  Total: 'कुल',
  Subtotal: 'उप-कुल',
  Status: 'स्थिति',
  Date: 'तारीख',
  Day: 'दिन',
  Meal: 'भोजन',
  Function: 'फंक्शन',
  Functions: 'फंक्शन',
  functions: 'फंक्शन',
  Guests: 'मेहमान',
  guests: 'मेहमान',
  Members: 'सदस्य',
  Covers: 'प्लेटें',
  Optional: 'वैकल्पिक',
  Required: 'ज़रूरी',
  Search: 'खोजें',
  All: 'सभी',
  Other: 'अन्य',
  Custom: 'कस्टम',
  Automatic: 'स्वचालित',
  Manual: 'मैन्युअल',
  Shared: 'साझा',
  Edit: 'संपादित करें',
  Save: 'सेव करें',
  Saving: 'सेव हो रहा है',
  'Saving…': 'सेव हो रहा है…',
  Cancel: 'रद्द करें',
  Close: 'बंद करें',
  Open: 'खोलें',
  Delete: 'हटाएँ',
  Remove: 'हटाएँ',
  Restore: 'वापस लाएँ',
  Archive: 'आर्काइव करें',
  Duplicate: 'कॉपी बनाएँ',
  Refresh: 'रीफ़्रेश करें',
  Review: 'जाँचें',
  Approved: 'स्वीकृत',
  Rejected: 'अस्वीकृत',
  Pending: 'लंबित',
  Draft: 'ड्राफ्ट',
  Ready: 'तैयार',
  Blocked: 'रुका हुआ',
  Selected: 'चुना गया',
  selected: 'चुने गए',
  Unresolved: 'अधूरा',
  'Not set': 'सेट नहीं',
  'Not started': 'शुरू नहीं हुआ',
  'Not subscribed': 'सब्सक्रिप्शन नहीं',
  'Not now': 'अभी नहीं',
  Yes: 'हाँ',
  No: 'नहीं',
  Loading: 'लोड हो रहा है',
  'Loading…': 'लोड हो रहा है…',
  'Loading...': 'लोड हो रहा है…',
  remaining: 'शेष',
  items: 'सामान',
  ingredients: 'सामग्री',
  costings: 'लागत रिकॉर्ड',
  meal: 'भोजन',
  meals: 'भोजन',
  'active item': 'सक्रिय सामान',
  'active items': 'सक्रिय सामान',
  'ingredient rate missing': 'सामग्री की दर गायब है',
  'ingredient rates missing': 'सामग्री की दरें गायब हैं',
  'Opening…': 'खुल रहा है…',
  'Starting new event…': 'नया इवेंट शुरू हो रहा है…',
  'Start New Costing': 'नई लागत शुरू करें',
  '+ New Costing': '+ नई लागत',
  'Add menu': 'मेन्यू जोड़ें',
  'Add My Menu': 'मेरा मेन्यू जोड़ें',
  'Edit menu': 'मेन्यू संपादित करें',
  'Save menu': 'मेन्यू सेव करें',
  'Back to Menu': 'मेन्यू पर वापस जाएँ',
  'Back to Upload': 'अपलोड पर वापस जाएँ',
  'Back to Detected Menu': 'पहचाने गए मेन्यू पर वापस जाएँ',
  'Detected Menu': 'पहचाना गया मेन्यू',
  'Review detected menu': 'पहचाना गया मेन्यू जाँचें',
  'Review what Menu Costing found': 'मेन्यू कॉस्टिंग ने जो पाया उसकी जाँच करें',
  'Review the detected dishes, make any correction, then use this menu.': 'पहचाने गए व्यंजनों की जाँच और सुधार करके इस मेन्यू का उपयोग करें।',
  'Fix wrong results or add a dish that was missed.': 'गलत परिणाम सुधारें या छूटा हुआ व्यंजन जोड़ें।',
  'Use This Menu': 'इस मेन्यू का उपयोग करें',
  'Merge with Current': 'मौजूदा मेन्यू में मिलाएँ',
  'Compare Source': 'स्रोत से तुलना करें',
  'Close source comparison': 'स्रोत तुलना बंद करें',
  'Original Menu': 'मूल मेन्यू',
  'Uploaded menu': 'अपलोड किया गया मेन्यू',
  'Pasted menu': 'पेस्ट किया गया मेन्यू',
  'Menu source line': 'मेन्यू की मूल लाइन',
  'Detection confidence': 'पहचान का भरोसा',
  'Detected dishes': 'पहचाने गए व्यंजन',
  'Function / Meal': 'फंक्शन / भोजन',
  'Select dishes manually': 'डिशें मैन्युअली चुनें',
  'Choose dishes directly from Dish Master without uploading a menu.': 'मेन्यू अपलोड किए बिना डिश मास्टर से सीधे डिशें चुनें।',
  'Manual Dish Selection': 'मैन्युअल डिश चयन',
  'e.g. Breakfast, Lunch, Reception': 'जैसे ब्रेकफास्ट, लंच, रिसेप्शन',
  'Enter guests': 'मेहमान दर्ज करें',
  'function needs guest count': 'फंक्शन के लिए मेहमानों की संख्या चाहिए',
  'functions need guest counts': 'फंक्शनों के लिए मेहमानों की संख्या चाहिए',
  'Enter guests for every detected function or meal before Done.': 'पूरा दबाने से पहले हर फंक्शन या भोजन के लिए मेहमानों की संख्या दर्ज करें।',
  'Not in Dish Master': 'डिश मास्टर में नहीं है',
  'per plate': 'प्रति प्लेट',
  'dish needs a manual rate': 'डिश के लिए मैनुअल रेट चाहिए',
  'dishes need manual rates': 'डिशों के लिए मैनुअल रेट चाहिए',
  'Enter ₹/plate for dishes not found in Dish Master.': 'डिश मास्टर में नहीं मिले व्यंजनों के लिए ₹/प्लेट रेट दर्ज करें।',
  'dishes detected': 'व्यंजन पहचाने गए',
  'Check the detected dishes, then tap Done to continue.': 'पहचाने गए व्यंजन जाँचें, फिर आगे बढ़ने के लिए पूरा दबाएँ।',
  Done: 'पूरा',
  'Menu dishes': 'मेन्यू के व्यंजन',
  'Search detected dishes': 'पहचाने गए व्यंजन खोजें',
  'Search dish or category': 'व्यंजन या श्रेणी खोजें',
  'Search dish, category or meal...': 'व्यंजन, श्रेणी या भोजन खोजें…',
  'Search dish...': 'व्यंजन खोजें…',
  'All categories': 'सभी श्रेणियाँ',
  'All meals': 'सभी भोजन',
  'Show all dishes': 'सभी व्यंजन दिखाएँ',
  'Select all': 'सभी चुनें',
  'Clear selection': 'चयन हटाएँ',
  'Clear filters': 'फ़िल्टर हटाएँ',
  'No dishes match your search': 'आपकी खोज से कोई व्यंजन नहीं मिला',
  'No matching dishes': 'कोई मिलता हुआ व्यंजन नहीं',
  'No matching dishes found.': 'कोई मिलता हुआ व्यंजन नहीं मिला।',
  'Try a different search, meal, or category.': 'दूसरी खोज, भोजन या श्रेणी आज़माएँ।',
  'Add Dish': 'व्यंजन जोड़ें',
  '+ Add Dish': '+ व्यंजन जोड़ें',
  '+ Add missed dish': '+ छूटा व्यंजन जोड़ें',
  'Add a missed or custom dish directly to the correct wedding meal.': 'छूटा या कस्टम व्यंजन सही शादी के भोजन में सीधे जोड़ें।',
  'Dish name': 'व्यंजन का नाम',
  'Dish Name': 'व्यंजन का नाम',
  Category: 'श्रेणी',
  'Enter missed dish': 'छूटा व्यंजन लिखें',
  'Enter dish name.': 'व्यंजन का नाम लिखें।',
  'Add to Menu': 'मेन्यू में जोड़ें',
  'Not a dish': 'यह व्यंजन नहीं है',
  'Remove dish': 'व्यंजन हटाएँ',
  'Possible missed': 'संभवतः छूटा हुआ',
  'Needs Review': 'जाँच ज़रूरी',
  'Need attention': 'ध्यान ज़रूरी',
  'Review required': 'जाँच ज़रूरी',
  'Looks correct': 'सही दिख रहा है',
  'No problems left': 'कोई समस्या बाकी नहीं',
  'Ready to continue': 'आगे बढ़ने के लिए तैयार',
  'Ready to save': 'सेव करने के लिए तैयार',
  'Continue to Manpower': 'स्टाफ़ पर जाएँ',
  'Add Selected & Continue to Manpower': 'चुने हुए जोड़ें और स्टाफ़ पर जाएँ',
  'Next: Manpower': 'अगला: स्टाफ़',
  'Manpower by Meal': 'भोजन के अनुसार स्टाफ़',
  'Meal-wise manpower costing': 'भोजन के अनुसार स्टाफ़ लागत',
  'Total manpower cost': 'कुल स्टाफ़ लागत',
  'Manpower cost': 'स्टाफ़ लागत',
  'Enter manpower only for this meal. Meal manpower total:': 'केवल इस भोजन का स्टाफ़ दर्ज करें। भोजन की कुल स्टाफ़ लागत:',
  'Set Chef, Helper, Waiter and specialist manpower separately for every meal. Each meal is costed independently.': 'हर भोजन के लिए शेफ, हेल्पर, वेटर और विशेषज्ञ स्टाफ़ अलग दर्ज करें। हर भोजन की लागत अलग निकलेगी।',
  'Next: Gas & Transport': 'अगला: गैस और परिवहन',
  'Back to Manpower': 'स्टाफ़ पर वापस जाएँ',
  'Gas & Transport': 'गैस और परिवहन',
  'Gas + Transport': 'गैस + परिवहन',
  'Gas + transport by function': 'फंक्शन के अनुसार गैस और परिवहन',
  'Gas cost': 'गैस की लागत',
  'Gas total': 'कुल गैस',
  Transport: 'परिवहन',
  'Transport total': 'कुल परिवहन',
  'Transport mode': 'परिवहन का तरीका',
  Vehicle: 'वाहन',
  Vehicles: 'वाहन',
  'Trips / vehicle': 'प्रति वाहन चक्कर',
  'Rate / trip': 'प्रति चक्कर दर',
  'Toll + parking': 'टोल + पार्किंग',
  'Loading / unloading': 'लोडिंग / अनलोडिंग',
  'Other transport': 'अन्य परिवहन',
  'How should transport be counted?': 'परिवहन की गणना कैसे हो?',
  'One Shared Event Transport': 'पूरे इवेंट का साझा परिवहन',
  'Function-wise Transport': 'फंक्शन के अनुसार परिवहन',
  'Count only trips required for this function.': 'केवल इस फंक्शन के ज़रूरी चक्कर गिनें।',
  'Use shared transport for one common event trip, or function-wise for separate meal trips.': 'एक साझा इवेंट यात्रा के लिए साझा परिवहन या हर भोजन की अलग यात्रा के लिए फंक्शन-वाइज चुनें।',
  'Save & Continue to Plastic': 'सेव करें और डिस्पोज़ेबल पर जाएँ',
  'Gas and transport costs saved.': 'गैस और परिवहन की लागत सेव हुई।',
  'Plastic & Disposable': 'प्लास्टिक और डिस्पोज़ेबल',
  'Plastic / disposable': 'प्लास्टिक / डिस्पोज़ेबल',
  'Plastic / disposable items': 'प्लास्टिक / डिस्पोज़ेबल सामान',
  'Disposable event cost': 'इवेंट की डिस्पोज़ेबल लागत',
  'Disposable total': 'कुल डिस्पोज़ेबल',
  '+ Add Item': '+ सामान जोड़ें',
  Item: 'सामान',
  'Rate / item': 'प्रति सामान दर',
  'Enter quantity and rate': 'मात्रा और दर दर्ज करें',
  'Plastic and disposable costs saved.': 'प्लास्टिक और डिस्पोज़ेबल लागत सेव हुई।',
  'Save & Continue to Pricing': 'सेव करें और कीमत पर जाएँ',
  'Back to Gas & Transport': 'गैस और परिवहन पर वापस जाएँ',
  'Food costing': 'भोजन लागत',
  'Dish costs': 'व्यंजन लागत',
  'Dish Cost Table': 'व्यंजन लागत तालिका',
  'Meal-wise Cost Summary': 'भोजन के अनुसार लागत सारांश',
  'Meal Food Total': 'भोजन की कुल खाद्य लागत',
  'Food / ingredient cost': 'भोजन / सामग्री लागत',
  'Food / Plate': 'प्रति प्लेट भोजन',
  'Cost / cover': 'प्रति प्लेट लागत',
  'Actual cost / plate': 'वास्तविक प्रति प्लेट लागत',
  'Base cost / plate': 'मूल प्रति प्लेट लागत',
  'Selling price / plate': 'प्रति प्लेट बिक्री कीमत',
  'Selling price / cover': 'प्रति प्लेट बिक्री कीमत',
  'Selling / cover': 'प्रति प्लेट बिक्री',
  'Suggested selling price / cover': 'सुझाई गई प्रति प्लेट कीमत',
  'Rate / cover': 'प्रति प्लेट दर',
  'Manual rate': 'मैन्युअल दर',
  'Manual Rate': 'मैन्युअल दर',
  'Add manual rate': 'मैन्युअल दर जोड़ें',
  'Add manual rates': 'मैन्युअल दरें जोड़ें',
  'Enter Manual Rate': 'मैन्युअल दर दर्ज करें',
  'Enter manual ₹/plate if needed': 'ज़रूरत हो तो मैन्युअल ₹/प्लेट दर्ज करें',
  'No usable automatic cost was found. Enter the dish cost per plate.': 'उपयोगी स्वचालित लागत नहीं मिली। व्यंजन की प्रति प्लेट लागत दर्ज करें।',
  'Missing rates': 'गायब दरें',
  'Rate missing': 'दर उपलब्ध नहीं',
  'No usable cost found': 'उपयोगी लागत नहीं मिली',
  'My Rate': 'मेरी दर',
  'Admin Rate': 'एडमिन दर',
  'Use Admin Rate': 'एडमिन दर उपयोग करें',
  'Using master rate': 'मास्टर दर उपयोग हो रही है',
  'Your ingredient rates': 'आपकी सामग्री दरें',
  'My Ingredient Rates': 'मेरी सामग्री दरें',
  'Ingredient Index': 'सामग्री सूची',
  'Ingredient purchase cost': 'सामग्री खरीद लागत',
  'Ingredient Requirements': 'सामग्री की आवश्यकता',
  'Required Qty': 'ज़रूरी मात्रा',
  'Total Qty': 'कुल मात्रा',
  'Purchase estimate': 'खरीद अनुमान',
  'Combined Grocery List': 'संयुक्त किराना सूची',
  'Function-wise grocery': 'फंक्शन के अनुसार किराना',
  'Review Grocery': 'किराना सूची जाँचें',
  'Download Grocery CSV': 'किराना CSV डाउनलोड करें',
  'Preparing grocery requirements…': 'किराना आवश्यकता तैयार हो रही है…',
  'Calculating recipes and ingredient quantities…': 'रेसिपी और सामग्री मात्रा की गणना हो रही है…',
  'All grocery rates available': 'सभी किराना दरें उपलब्ध हैं',
  'Pricing method': 'कीमत तय करने का तरीका',
  'Choose how to set your selling price': 'बिक्री कीमत तय करने का तरीका चुनें',
  'Markup on Cost': 'लागत पर मार्कअप',
  'Markup on cost': 'लागत पर मार्कअप',
  'Gross Margin': 'सकल मार्जिन',
  'Gross margin': 'सकल मार्जिन',
  'Target gross margin': 'लक्षित सकल मार्जिन',
  'Manual rate lets you enter the final selling amount per cover directly.': 'मैन्युअल दर में आप अंतिम प्रति प्लेट बिक्री राशि सीधे दर्ज कर सकते हैं।',
  'Markup adds a percentage to cost. Gross margin targets profit as a percentage of final selling price.': 'मार्कअप लागत पर प्रतिशत जोड़ता है। सकल मार्जिन अंतिम बिक्री कीमत में लाभ का प्रतिशत तय करता है।',
  'Expected profit': 'अनुमानित लाभ',
  Profit: 'लाभ',
  Loss: 'नुकसान',
  'Gross contribution': 'सकल योगदान',
  'Event revenue': 'इवेंट आय',
  'Real event cost': 'वास्तविक इवेंट लागत',
  'Total event cost': 'कुल इवेंट लागत',
  'Grand total': 'कुल योग',
  'Grand Total': 'कुल योग',
  'Total cost': 'कुल लागत',
  'Total selling': 'कुल बिक्री',
  'Selling price engine': 'बिक्री कीमत गणना',
  'Your selling price is ready': 'आपकी बिक्री कीमत तैयार है',
  'Pricing is ready for quotation': 'कोटेशन के लिए कीमत तैयार है',
  'Save Selling Price': 'बिक्री कीमत सेव करें',
  'Use Price & Create Quotation': 'कीमत उपयोग करें और कोटेशन बनाएँ',
  'Use Price → Quotation': 'कीमत उपयोग करें → कोटेशन',
  'Next: Final Costing': 'अगला: अंतिम लागत',
  'Next: Pricing': 'अगला: कीमत',
  'Back to Extra Cost': 'अतिरिक्त खर्च पर वापस जाएँ',
  'Final Costing': 'अंतिम लागत',
  'Cost summary': 'लागत सारांश',
  'Additional charges': 'अतिरिक्त शुल्क',
  'Extra amount': 'अतिरिक्त राशि',
  'Extra charge label': 'अतिरिक्त शुल्क का नाम',
  'Complete the missing cost details': 'गायब लागत जानकारी पूरी करें',
  'Finish cost details before pricing': 'कीमत तय करने से पहले लागत जानकारी पूरी करें',
  'Save this costing to history': 'इस लागत को इतिहास में सेव करें',
  'Save to History': 'इतिहास में सेव करें',
  'Update Saved History': 'सेव इतिहास अपडेट करें',
  'Saved to your account history database.': 'आपके खाते के इतिहास में सेव हुआ।',
  'This costing is saved in your account.': 'यह लागत आपके खाते में सेव है।',
  'Client Quotation': 'ग्राहक कोटेशन',
  'Quotation information': 'कोटेशन जानकारी',
  'Client name': 'ग्राहक का नाम',
  Venue: 'स्थान',
  'Client WhatsApp number': 'ग्राहक का WhatsApp नंबर',
  'Client-facing notes': 'ग्राहक के लिए नोट्स',
  'Optional message for the client': 'ग्राहक के लिए वैकल्पिक संदेश',
  'Commercial offer': 'व्यावसायिक प्रस्ताव',
  'Commercial Offer': 'व्यावसायिक प्रस्ताव',
  'Booking terms': 'बुकिंग की शर्तें',
  'Payment terms': 'भुगतान की शर्तें',
  'Terms & confirmation': 'शर्तें और पुष्टि',
  'Validity days': 'वैधता के दिन',
  'Show total amount?': 'कुल राशि दिखाएँ?',
  'Total quotation': 'कुल कोटेशन',
  'Save Quotation': 'कोटेशन सेव करें',
  'Download Client PDF': 'ग्राहक PDF डाउनलोड करें',
  'Share on WhatsApp': 'WhatsApp पर साझा करें',
  'Quotation saved.': 'कोटेशन सेव हुआ।',
  'Quotation status': 'कोटेशन की स्थिति',
  Sent: 'भेजा गया',
  Accepted: 'स्वीकार किया गया',
  'Quotation marked as sent.': 'कोटेशन भेजा गया के रूप में दर्ज हुआ।',
  'Quotation marked as accepted.': 'कोटेशन स्वीकार किया गया के रूप में दर्ज हुआ।',
  'Quotation marked as rejected.': 'कोटेशन अस्वीकार किया गया के रूप में दर्ज हुआ।',
  'Costing History': 'लागत इतिहास',
  'Menu Costing Library': 'मेन्यू कॉस्टिंग लाइब्रेरी',
  Drafts: 'ड्राफ्ट',
  'Completed Costings': 'पूरी की गई लागतें',
  'Saved history': 'सेव इतिहास',
  'Search client, event or date': 'ग्राहक, इवेंट या तारीख खोजें',
  'All dates': 'सभी तारीखें',
  'Most recent': 'सबसे नया',
  'Client A–Z': 'ग्राहक A–Z',
  'No completed costings yet': 'अभी कोई पूरी लागत नहीं है',
  'No matching costings': 'कोई मिलती हुई लागत नहीं',
  'Start a new costing or change the filters.': 'नई लागत शुरू करें या फ़िल्टर बदलें।',
  'Open Costing': 'लागत खोलें',
  'Duplicate as New': 'नई कॉपी बनाएँ',
  'Reuse this costing': 'इस लागत का फिर उपयोग करें',
  'Reuse a past wedding or event as a new costing instead of building the menu again.': 'मेन्यू दोबारा बनाने के बजाय पिछले इवेंट की लागत को नई लागत की तरह उपयोग करें।',
  'Copies menu, manpower, extras and rates into a fresh job. Event date is cleared.': 'मेन्यू, स्टाफ़, अतिरिक्त खर्च और दरें नई लागत में कॉपी होंगी। इवेंट तारीख खाली होगी।',
  'Business Profile': 'व्यवसाय प्रोफ़ाइल',
  'Business Name': 'व्यवसाय का नाम',
  'Owner Name': 'मालिक का नाम',
  'Mobile Number': 'मोबाइल नंबर',
  City: 'शहर',
  'Logo Text': 'लोगो टेक्स्ट',
  Role: 'भूमिका',
  Plan: 'प्लान',
  'Auto-saved': 'अपने-आप सेव',
  'Stored on this device': 'इस डिवाइस पर सेव',
  'Profile saved.': 'प्रोफ़ाइल सेव हुई।',
  'Save Profile': 'प्रोफ़ाइल सेव करें',
  Logout: 'लॉगआउट',
  'Remove My Saved Data': 'मेरा सेव डेटा हटाएँ',
  'Your Data & Access': 'आपका डेटा और पहुँच',
  'Account security': 'खाता सुरक्षा',
  'Change Password': 'पासवर्ड बदलें',
  'Current Password': 'मौजूदा पासवर्ड',
  'New Password': 'नया पासवर्ड',
  'Confirm New Password': 'नया पासवर्ड दोबारा लिखें',
  'Enter current password': 'मौजूदा पासवर्ड लिखें',
  'Minimum 8 characters': 'कम से कम 8 अक्षर',
  'Enter new password again': 'नया पासवर्ड फिर से लिखें',
  'Changing…': 'बदला जा रहा है…',
  'Password changed successfully.': 'पासवर्ड सफलतापूर्वक बदला गया।',
  'Monthly Pro': 'मासिक प्रो',
  'Billing status': 'बिलिंग स्थिति',
  'Next billing date': 'अगली बिलिंग तारीख',
  Renewal: 'नवीनीकरण',
  'Subscribe ₹999/month': '₹999/माह सब्सक्राइब करें',
  'Cancel renewal': 'नवीनीकरण रद्द करें',
  'Refresh status': 'स्थिति रीफ़्रेश करें',
  'Upgrade to Pro': 'प्रो में अपग्रेड करें',
  'Upgrade ₹999': '₹999 में अपग्रेड करें',
  'Upgrade to Pro · ₹999': 'प्रो में अपग्रेड करें · ₹999',
  'View History': 'इतिहास देखें',
  'Open Profile': 'प्रोफ़ाइल खोलें',
  'Open Ingredient Index': 'सामग्री सूची खोलें',
  'App locked': 'ऐप लॉक है',
  'Your plan is expired. Only Profile and Logout are available until renewal.': 'आपका प्लान समाप्त हो गया है। नवीनीकरण तक केवल प्रोफ़ाइल और लॉगआउट उपलब्ध हैं।',
  'Plan expired.': 'प्लान समाप्त।',
  'Free usage': 'मुफ़्त उपयोग',
  'Free limit reached. Completed costings stay saved.': 'मुफ़्त सीमा पूरी हुई। पूरी लागतें सेव रहेंगी।',
  'Keep costing with Pro.': 'प्रो के साथ लागत बनाना जारी रखें।',
  '5 free completed costings': '5 मुफ़्त पूरी लागतें',
  'Unlimited costings': 'असीमित लागतें',
  'Pro account': 'प्रो खाता',
  'Ingredient Cost Drivers': 'सामग्री लागत के मुख्य कारण',
  'What is driving this menu cost?': 'इस मेन्यू की लागत किससे बढ़ रही है?',
  'View cost drivers': 'लागत कारण देखें',
  'top drivers': 'मुख्य कारण',
  'Operations cost': 'संचालन लागत',
  'Loading operations cost…': 'संचालन लागत लोड हो रही है…',
  'Operations cost saved.': 'संचालन लागत सेव हुई।',
  'Food + manpower + gas + transport + disposable': 'भोजन + स्टाफ़ + गैस + परिवहन + डिस्पोज़ेबल',
  'Menu & Service': 'मेन्यू और सेवा',
  'Grocery & Ingredients': 'किराना और सामग्री',
  'Personal costing': 'व्यक्तिगत लागत',
  'Only your account': 'केवल आपका खाता',
  'Only client selling values are shown here.': 'यहाँ केवल ग्राहक की बिक्री कीमतें दिखाई जाती हैं।',
  'Loading pricing…': 'कीमत लोड हो रही है…',
  'Loading disposable cost…': 'डिस्पोज़ेबल लागत लोड हो रही है…',
  'Loading manpower…': 'स्टाफ़ लोड हो रहा है…',
  'Loading costing library…': 'लागत लाइब्रेरी लोड हो रही है…',
  'Set markup or target margin using the real event cost': 'वास्तविक इवेंट लागत से मार्कअप या लक्षित मार्जिन तय करें',
  'Cost basis': 'लागत का आधार',
  'These internal costs build the real event cost. The client quotation still uses the final selling rate.': 'इन अंदरूनी खर्चों से वास्तविक इवेंट लागत बनती है। ग्राहक कोटेशन में अंतिम बिक्री दर ही दिखाई जाएगी।',
  'LPG / gas': 'एलपीजी / गैस',
  'Pricing checklist': 'कीमत जाँच सूची',
  'Guest counts': 'मेहमानों की संख्या',
  'Price warning': 'कीमत चेतावनी',
  'Selling price is below event cost': 'बिक्री कीमत इवेंट लागत से कम है',
  'Review Functions': 'फंक्शन जाँचें',
  'Confirm each detected function and guest count before reviewing dishes.': 'व्यंजनों की जाँच से पहले हर पहचाने गए फंक्शन और मेहमानों की संख्या की पुष्टि करें।',
  'Guest count required': 'मेहमानों की संख्या ज़रूरी है',
  'Add plates, bowls, cups, spoons, packing and other single-use event items': 'प्लेट, कटोरी, कप, चम्मच, पैकिंग और अन्य एक बार उपयोग होने वाला सामान जोड़ें',
  'Quantity × purchase rate': 'मात्रा × खरीद दर',
  'Use Gas & Transport instead': 'इसके बजाय गैस और परिवहन उपयोग करें',
  'Plastic & disposable cost added to the event': 'इवेंट में जोड़ी गई प्लास्टिक और डिस्पोज़ेबल लागत',
  'Meal covers': 'भोजन प्लेटें',
  'Active items': 'सक्रिय सामान',
  'Step 2 of 3: calculate function-wise ingredient requirements': 'चरण 2 में से 3: फंक्शन के अनुसार सामग्री आवश्यकता निकालें',
  'Step 2 of 3: review function-wise ingredients, combined grocery and purchase cost': 'चरण 2 में से 3: फंक्शन-वाइज सामग्री, संयुक्त किराना और खरीद लागत जाँचें',
  Tempo: 'टेम्पो',
  'Cylinder size (kg)': 'सिलेंडर का आकार (किलो)',
  'Cylinder price': 'सिलेंडर की कीमत',
  'LPG used (kg)': 'उपयोग हुई एलपीजी (किलो)',
  'Cylinders used': 'उपयोग हुए सिलेंडर',
  'Rate × vehicles × trips + toll + loading + other': 'दर × वाहन × चक्कर + टोल + लोडिंग + अन्य',
  'Calculate LPG and vehicle cost before plastic and disposable cost': 'प्लास्टिक और डिस्पोज़ेबल से पहले एलपीजी और वाहन लागत निकालें',
  'Gas is function-wise. Transport can be shared for the event or entered separately for every function.': 'गैस फंक्शन के अनुसार है। परिवहन पूरे इवेंट के लिए साझा या हर फंक्शन के लिए अलग दर्ज किया जा सकता है।',
  'Transport method': 'परिवहन का तरीका',
  'LPG / Gas': 'एलपीजी / गैस',
  'Use actual kg, cylinder fraction or manual cost.': 'वास्तविक किलो, सिलेंडर का हिस्सा या मैन्युअल लागत उपयोग करें।',
  'Function-wise': 'फंक्शन के अनुसार',
  'Step 2 of 2: set manpower for each meal': 'चरण 2 में से 2: हर भोजन के लिए स्टाफ़ तय करें',
  'Step 2 of 2: set meal-wise manpower, then download the costing PDF': 'चरण 2 में से 2: भोजन के अनुसार स्टाफ़ तय करें, फिर लागत PDF डाउनलोड करें',
  'Rate / person': 'प्रति व्यक्ति दर',
  'Drafts, completed costings and reusable event records': 'ड्राफ्ट, पूरी लागतें और दोबारा उपयोग होने वाले इवेंट रिकॉर्ड',
  'Continue drafts, reopen completed events, duplicate repeat jobs, export PDFs and archive old records.': 'ड्राफ्ट जारी रखें, पूरे इवेंट दोबारा खोलें, बार-बार होने वाले काम कॉपी करें, PDF निकालें और पुराने रिकॉर्ड आर्काइव करें।',
  Completed: 'पूरा हुआ',
  'Server auto-saved': 'सर्वर पर अपने-आप सेव',
  'Active records': 'सक्रिय रिकॉर्ड',
  'Costed value': 'लागत मूल्य',
  'Active completed total': 'सक्रिय पूरी लागत का कुल',
  Unlimited: 'असीमित',
  'Last 7 days': 'पिछले 7 दिन',
  'Last 30 days': 'पिछले 30 दिन',
  'Last 90 days': 'पिछले 90 दिन',
  'Highest cost': 'सबसे अधिक लागत',
  'Step 4 of 6: review food, manpower and extra costs': 'चरण 4 में से 6: भोजन, स्टाफ़ और अतिरिक्त खर्च जाँचें',
  'Each meal uses its own member count. Repeated dishes are charged again in every meal where they appear.': 'हर भोजन में उसकी अपनी सदस्य संख्या उपयोग होती है। दोहराए गए व्यंजन जिस-जिस भोजन में हैं, उनकी लागत हर बार जुड़ेगी।',
  'Meal name': 'भोजन का नाम',
  'Review every dish and correct its base cost without leaving this page.': 'इस पेज से बाहर जाए बिना हर व्यंजन जाँचें और उसकी मूल लागत सुधारें।',
  'Dish cost summary': 'व्यंजन लागत सारांश',
  'food total': 'कुल भोजन लागत',
  'Enter rate or leave blank': 'दर दर्ज करें या खाली छोड़ें',
  'These dishes were not found in Dish Master or do not have a trusted rate. Review any estimate and enter your rate.': 'ये व्यंजन डिश मास्टर में नहीं मिले या इनकी भरोसेमंद दर नहीं है। अनुमान जाँचकर अपनी दर दर्ज करें।',
  'Add dishes to calculate food cost': 'भोजन लागत निकालने के लिए व्यंजन जोड़ें',
  'Paste or type the event menu, review the detected dishes, then return here for the complete cost.': 'इवेंट मेन्यू पेस्ट या टाइप करें, पहचाने गए व्यंजन जाँचें, फिर पूरी लागत के लिए यहाँ लौटें।',
  'Open Event': 'इवेंट खोलें',
  'Find a dish': 'व्यंजन खोजें',
  'Portion allocation:': 'हिस्सा आवंटन:',
  'automatic sharing is calculated separately inside every meal and category. You can also set a custom percentage for any dish: 50% charges half its base cost; 150% charges one-and-a-half times.': 'हर भोजन और श्रेणी में स्वचालित हिस्सा अलग निकाला जाता है। किसी भी व्यंजन के लिए कस्टम प्रतिशत भी तय कर सकते हैं: 50% पर आधी और 150% पर डेढ़ गुना मूल लागत जुड़ेगी।',
  'Dish & meal': 'व्यंजन और भोजन',
  'Serving quantity': 'परोसने की मात्रा',
  Portion: 'हिस्सा',
  'Adjusted / plate': 'समायोजित प्रति प्लेट',
  Action: 'कार्रवाई',
  Auto: 'स्वचालित',
  'Client-facing quotation': 'ग्राहक के लिए कोटेशन',
  'Create a professional client-facing offer without exposing internal costing': 'अंदरूनी लागत दिखाए बिना ग्राहक के लिए पेशेवर प्रस्ताव बनाएँ',
  'Remove term': 'शर्त हटाएँ',
  'Next step': 'अगला चरण',
  'Manpower complete → add gas and transport cost': 'स्टाफ़ पूरा → गैस और परिवहन लागत जोड़ें',
  'No completed-costing limit.': 'पूरी लागतों की कोई सीमा नहीं।',
  'Full Menu Costing access with secure recurring billing.': 'सुरक्षित आवर्ती भुगतान के साथ मेन्यू कॉस्टिंग की पूरी पहुँच।',
  '/ month': '/ माह',
  'Cancels after cycle': 'मौजूदा चक्र के बाद बंद होगा',
  'Online subscription is not available yet. Contact your account administrator to activate or renew your plan.': 'ऑनलाइन सब्सक्रिप्शन अभी उपलब्ध नहीं है। प्लान सक्रिय या नवीनीकृत करने के लिए अपने खाता एडमिन से संपर्क करें।',
  'Costing data': 'लागत डेटा',
  'Your event, menu, manpower and costing changes save automatically on this device. Your account administrator manages login access and subscription status.': 'आपके इवेंट, मेन्यू, स्टाफ़ और लागत के बदलाव इस डिवाइस पर अपने-आप सेव होते हैं। लॉगिन पहुँच और सब्सक्रिप्शन की स्थिति आपका खाता एडमिन संभालता है।',
  'Event details detected': 'इवेंट की जानकारी पहचानी गई',
  'Details found in the uploaded menu were saved automatically.': 'अपलोड किए गए मेन्यू में मिली जानकारी अपने-आप सेव हो गई।',
  'Menu needs attention': 'मेन्यू पर ध्यान ज़रूरी है',
  'AI recipe': 'AI रेसिपी',
  'Rates for new or corrected dishes': 'नए या सुधारे गए व्यंजनों की दरें',
  'Enter rate': 'दर दर्ज करें',
  'Merge mode will keep the existing version and skip these duplicates.': 'मर्ज मोड मौजूदा संस्करण रखेगा और इन दोहरावों को छोड़ देगा।',
  '5 / 5 FREE COSTINGS USED': '5 / 5 मुफ़्त लागतें उपयोग हुईं',
  'Your completed costings remain saved. Upgrade to Menu Costing Pro to start unlimited new costings.': 'आपकी पूरी लागतें सेव रहेंगी। असीमित नई लागतें शुरू करने के लिए मेन्यू कॉस्टिंग प्रो लें।',
  'Menu detection': 'मेन्यू पहचान',
  'Saved costing history': 'सेव लागत इतिहास',

  // Menu functions, meals and dish categories shown from saved/master data.
  Breakfast: 'नाश्ता',
  Lunch: 'दोपहर का भोजन',
  Dinner: 'रात्रि भोजन',
  'Hi-Tea': 'हाई-टी',
  'High Tea': 'हाई-टी',
  'Welcome Drink': 'स्वागत पेय',
  Starter: 'स्टार्टर',
  'Main Course': 'मुख्य भोजन',
  Sweet: 'मिठाई',
  Dessert: 'मिठाई',
  Beverage: 'पेय',
  Mocktail: 'मॉकटेल',
  Soup: 'सूप',
  Salad: 'सलाद',
  Rice: 'चावल',
  Bread: 'रोटी',
  Sabji: 'सब्ज़ी',
  Paneer: 'पनीर',
  'Dal / Kadhi': 'दाल / कढ़ी',
  'Ice Cream': 'आइसक्रीम',
  Farsan: 'फरसाण',
  Condiments: 'साथ में परोसी जाने वाली चीज़ें',
  Chaat: 'चाट',
  Chinese: 'चाइनीज़',
  Italian: 'इटालियन',
  Gujarati: 'गुजराती',
  Jain: 'जैन',
  Kathiyawadi: 'काठियावाड़ी',
  Kids: 'बच्चों के लिए',
  'Live Counter': 'लाइव काउंटर',
  Papad: 'पापड़',
  Paratha: 'पराठा',
  Punjabi: 'पंजाबी',
  Rajasthani: 'राजस्थानी',
  'Roti & Chapati': 'रोटी और चपाती',
  'South Indian': 'दक्षिण भारतीय',
  'South Indian Special': 'दक्षिण भारतीय विशेष',
  'Fried Farsan': 'तला हुआ फरसाण',
  'Steamed Farsan': 'भाप में पका फरसाण',
  'Gravy Sabji': 'ग्रेवी वाली सब्ज़ी',

  // Service styles and every staff role used by the manpower planner.
  Buffet: 'बुफ़े',
  'Table Service': 'टेबल सर्विस',
  'Packed Meal': 'पैक किया हुआ भोजन',
  'Event Manager': 'इवेंट मैनेजर',
  Supervisor: 'सुपरवाइज़र',
  Captain: 'कैप्टन',
  Waiter: 'वेटर',
  Ghati: 'घाटी',
  Girls: 'महिला स्टाफ़',
  Pyaro: 'प्यारो',
  Models: 'मॉडल',
  'CC Boy': 'सीसी बॉय',
  'Tie Waiter': 'टाई वेटर',
  Cook: 'रसोइया',
  'Assistant Cook': 'सहायक रसोइया',
  'Helper / Masi': 'हेल्पर / मासी',
  Helper: 'हेल्पर',
  Masi: 'मासी',
  Bartender: 'बारटेंडर',
  'Counter Attendant': 'काउंटर कर्मचारी',
  Dishwasher: 'बर्तन धोने वाला',
  Cleaning: 'सफाई कर्मचारी',
  Security: 'सुरक्षा कर्मचारी',
  Driver: 'ड्राइवर',
  'Packing Staff': 'पैकिंग स्टाफ़',
  'Juice / Mocktail Maker': 'जूस / मॉकटेल बनाने वाला',
  'Soup Cook': 'सूप रसोइया',
  'Starter Cook': 'स्टार्टर रसोइया',
  'Chaat Master': 'चाट मास्टर',
  'Chinese Cook': 'चाइनीज़ रसोइया',
  'Italian Cook': 'इटालियन रसोइया',
  'Indian Bread / Tandoor Cook': 'रोटी / तंदूर रसोइया',
  'Paan Counter': 'पान काउंटर',
  'Live Counter Cook': 'लाइव काउंटर रसोइया',
  'Dal / Sabji Cook': 'दाल / सब्ज़ी रसोइया',
  'Rice Cook': 'चावल रसोइया',
  'Sweet / Halwai': 'मिठाई / हलवाई',
  'Farsan Cook': 'फरसाण रसोइया',
  'Preparing PDF…': 'PDF तैयार हो रहा है…',
  'Next: Download PDF': 'अगला: PDF डाउनलोड करें',
  'manpower assignments': 'स्टाफ़ नियुक्तियाँ',
  people: 'लोग',

  // Plastic and disposable master items.
  Tissue: 'टिश्यू',
  Fuel: 'ईंधन',
  Napkin: 'नैपकिन',
  Cap: 'टोपी',
  'Cafe Cap': 'कैफ़े कैप',
  Gloves: 'दस्ताने',
  'Packing Roll': 'पैकिंग रोल',
  'Table Roll': 'टेबल रोल',
  'Disposable Cup': 'डिस्पोज़ेबल कप',
  Plates: 'प्लेटें',
  Spoon: 'चम्मच',
  'Silver Roll': 'सिल्वर रोल',
  Toothpick: 'टूथपिक',
  'Food Box': 'फूड बॉक्स',
  'Sweet Box': 'मिठाई का डिब्बा',
  'Garbage Bag': 'कचरा बैग',
  'Custom item': 'कस्टम सामान',
  'Enter the actual quantity you expect to use and your purchase rate. The total becomes part of the real event cost before markup or margin.': 'उपयोग की अनुमानित वास्तविक मात्रा और खरीद दर दर्ज करें। मार्कअप या मार्जिन से पहले इसका कुल वास्तविक इवेंट लागत में जुड़ेगा।',
  'Example: 330 plates × ₹6 = ₹1,980. Keep the legacy Fuel row at zero and use Gas & Transport for LPG/fuel.': 'उदाहरण: 330 प्लेट × ₹6 = ₹1,980। पुराने ईंधन वाले खाने में शून्य रखें और एलपीजी/ईंधन के लिए गैस और परिवहन का उपयोग करें।',

  // Ingredient and grocery vocabulary, including values rendered from APIs.
  'Set your own ingredient purchase rates without changing any other user\'s rates': 'दूसरे उपयोगकर्ता की दर बदले बिना अपनी सामग्री खरीद दरें तय करें',
  'Admin master': 'एडमिन मास्टर',
  'My custom rates': 'मेरी कस्टम दरें',
  'Admin defaults': 'एडमिन की डिफ़ॉल्ट दरें',
  Unsaved: 'सेव नहीं हुआ',
  'Rate changes': 'दर में बदलाव',
  'You can edit only the rate. Ingredient name, category and purchase unit are controlled by the Admin Ingredient Master.': 'आप केवल दर बदल सकते हैं। सामग्री का नाम, श्रेणी और खरीद इकाई एडमिन सामग्री मास्टर से नियंत्रित होते हैं।',
  'Save My Rates': 'मेरी दरें सेव करें',
  'Search ingredient...': 'सामग्री खोजें…',
  'Tenant rates': 'खाते की दरें',
  Recipes: 'रेसिपी',
  'My custom rate': 'मेरी कस्टम दर',
  'Your ingredient rates are saved. Your current and future dish costing now uses your personal rates.': 'आपकी सामग्री दरें सेव हो गई हैं। मौजूदा और भविष्य की व्यंजन लागत में अब आपकी निजी दरें उपयोग होंगी।',
  'Could not save your rates.': 'आपकी दरें सेव नहीं हो सकीं।',
  'Loading grocery requirements…': 'किराना आवश्यकता लोड हो रही है…',
  'Recipe quantities are scaled by each function\'s guest count. Ingredient cost uses your personal ingredient rate when available, otherwise the Admin master rate.': 'रेसिपी की मात्रा हर फंक्शन के मेहमानों के अनुसार तय होती है। उपलब्ध होने पर आपकी निजी सामग्री दर, अन्यथा एडमिन मास्टर दर उपयोग होती है।',
  'Separate meal lists': 'अलग-अलग भोजन सूचियाँ',
  'Total covers': 'कुल प्लेटें',
  'Sum of function guests': 'सभी फंक्शन के कुल मेहमान',
  'Recipes matched': 'मिलान हुई रेसिपी',
  'Dishes with ingredient recipes': 'सामग्री रेसिपी वाले व्यंजन',
  'Recipe attention': 'रेसिपी पर ध्यान दें',
  'These dishes stay in the menu, but their grocery quantities cannot be generated until a recipe is saved.': 'ये व्यंजन मेन्यू में रहेंगे, लेकिन रेसिपी सेव होने तक इनकी किराना मात्रा नहीं बन सकेगी।',
  'Used In': 'इनमें उपयोग',
  'Used In Dishes': 'इन व्यंजनों में उपयोग',
  'Missing recipe:': 'गायब रेसिपी:',
  'No recipe ingredients are available for this function yet.': 'इस फंक्शन के लिए अभी कोई रेसिपी सामग्री उपलब्ध नहीं है।',
  'Full event': 'पूरा इवेंट',
  'Breakfast, Lunch, Hi-Tea, Dinner and every other detected function are combined here for purchasing.': 'खरीदारी के लिए नाश्ता, दोपहर का भोजन, हाई-टी, रात्रि भोजन और अन्य सभी पहचाने गए फंक्शन यहाँ जोड़े गए हैं।',
  'Priced ingredients': 'दर वाली सामग्री',
  'Included in estimate': 'अनुमान में शामिल',
  'Add rate in Ingredient Index': 'सामग्री सूची में दर जोड़ें',
  'Based on available rates': 'उपलब्ध दरों के आधार पर',
  'Add recipes to generate the combined grocery list.': 'संयुक्त किराना सूची बनाने के लिए रेसिपी जोड़ें।',
  'Estimated Cost': 'अनुमानित लागत',
  Cost: 'लागत',
  kg: 'किलो',
  g: 'ग्राम',
  ltr: 'लीटर',
  ml: 'मिलीलीटर',
  packet: 'पैकेट',
  piece: 'पीस',
  portion: 'हिस्सा',
  scoop: 'स्कूप',
};

const hindiTranslations = { ...hindi, ...fullAppHindi };

const hindiDishNames = new Map<string, string>();

DISH_COST_ITEMS.forEach((dish) => {
  const hindiName = dish.aliases?.find((alias) => /[\u0900-\u097f]/.test(alias));
  if (!hindiName) return;

  [dish.name, ...(dish.aliases ?? [])].forEach((name) => {
    if (!/[\u0900-\u097f]/.test(name)) {
      hindiDishNames.set(name.trim().toLowerCase(), hindiName);
    }
  });
});

const hindiIngredientNames: Record<string, string> = {
  Tomato: 'टमाटर',
  Potato: 'आलू',
  Onion: 'प्याज़',
  Ginger: 'अदरक',
  Garlic: 'लहसुन',
  'Green Chilli': 'हरी मिर्च',
  'Coriander Leaves': 'हरा धनिया',
  Cumin: 'जीरा',
  Turmeric: 'हल्दी',
  'Red Chilli Powder': 'लाल मिर्च पाउडर',
  'Coriander Powder': 'धनिया पाउडर',
  'Green Peas': 'मटर',
  Cauliflower: 'फूल गोभी',
  Capsicum: 'शिमला मिर्च',
  Curd: 'दही',
  Besan: 'बेसन',
  Atta: 'गेहूँ का आटा',
  Rava: 'सूजी',
  Ghee: 'घी',
  Milk: 'दूध',
  Cream: 'क्रीम',
  Cheese: 'चीज़',
  Butter: 'मक्खन',
  Khoya: 'खोया',
  Sugar: 'चीनी',
  Jaggery: 'गुड़',
  Honey: 'शहद',
  Oil: 'तेल',
  'Cooking Oil': 'खाना पकाने का तेल',
  Salt: 'नमक',
  'Black Pepper': 'काली मिर्च',
  Cardamom: 'इलायची',
  Cinnamon: 'दालचीनी',
  Saffron: 'केसर',
  Rice: 'चावल',
  'Basmati Rice': 'बासमती चावल',
  'Wheat Flour': 'गेहूँ का आटा',
  Maida: 'मैदा',
  'Corn Flour': 'कॉर्न फ्लोर',
  'Moong Dal': 'मूंग दाल',
  'Chana Dal': 'चना दाल',
  'Toor Dal': 'तूर दाल',
  'Urad Dal': 'उड़द दाल',
  Rajma: 'राजमा',
  Chickpeas: 'काबुली चना',
  Water: 'पानी',
  Lemon: 'नींबू',
  'Mint Leaves': 'पुदीना',
  Coconut: 'नारियल',
  Cashew: 'काजू',
  Almond: 'बादाम',
  Raisin: 'किशमिश',
  'Vegetables & Herbs': 'सब्ज़ियाँ और जड़ी-बूटियाँ',
  Fruits: 'फल',
  Dairy: 'डेयरी',
  'Grains & Flour': 'अनाज और आटा',
  'Pulses & Legumes': 'दालें',
  'Spices & Seasonings': 'मसाले',
  'Oils & Fats': 'तेल और वसा',
  'Sauces & Condiments': 'सॉस और साथ की चीज़ें',
  Beverages: 'पेय',
  Sweeteners: 'मिठास की सामग्री',
  'Bakery & Packaged': 'बेकरी और पैक सामान',
  gram: 'ग्राम',
};

const dynamicHindiTranslations: Array<[
  RegExp,
  (...matches: string[]) => string,
]> = [
  [/^(\d+) dishes already saved$/, (count) => `${count} व्यंजन पहले से सेव हैं`],
  [/^(\d+) dishes selected$/, (count) => `${count} व्यंजन चुने गए`],
  [/^(\d+) selected$/, (count) => `${count} चुने गए`],
  [/^(\d+) dishes$/, (count) => `${count} व्यंजन`],
  [/^(\d+) menu lines$/, (count) => `${count} मेन्यू लाइनें`],
  [/^(\d+) menu lines are ready to check\.$/, (count) => `${count} मेन्यू लाइनें जाँच के लिए तैयार हैं।`],
  [/^(\d+) guests$/, (count) => `${count} मेहमान`],
  [/^Guests for (.+)$/, (name) => `${name} के मेहमान`],
  [/^Step (\d+) of (\d+)$/, (step, total) => `चरण ${step}, कुल ${total}`],
  [/^(\d+) of (\d+) complete$/, (done, total) => `${total} में से ${done} पूरे`],
  [/^(\d+) items$/, (count) => `${count} सामान`],
  [/^(\d+) ingredients$/, (count) => `${count} सामग्री`],
  [/^(\d+) functions$/, (count) => `${count} फंक्शन`],
  [/^(\d+) meals$/, (count) => `${count} भोजन`],
  [/^(\d+) costings$/, (count) => `${count} लागत रिकॉर्ड`],
  [/^Meal (\d+)$/, (number) => `भोजन ${number}`],
  [/^Meal (\d+) · (.+) guests$/, (number, count) => `भोजन ${number} · ${count} मेहमान`],
  [/^Function (\d+) · (.+) guests$/, (number, count) => `फंक्शन ${number} · ${count} मेहमान`],
  [/^(\d+) active items?$/, (count) => `${count} सक्रिय सामान`],
  [/^(\d+) manpower assignments?$/, (count) => `${count} स्टाफ़ नियुक्तियाँ`],
  [/^(\d+) people$/, (count) => `${count} लोग`],
  [/^(\d+) recipes matched$/, (count) => `${count} रेसिपी का मिलान हुआ`],
  [/^(\d+) ingredients$/, (count) => `${count} सामग्री`],
  [/^(\d+) ingredient rates? missing$/, (count) => `${count} सामग्री की दर गायब है`],
  [/^(\d+) dishes? without a saved recipe$/, (count) => `${count} व्यंजनों की रेसिपी सेव नहीं है`],
  [/^Missing recipe: (.+)$/, (names) => `गायब रेसिपी: ${names}`],
  [/^(.+) estimated ingredient cost$/, (value) => `${value} अनुमानित सामग्री लागत`],
  [/^Rate for (.+) in (.+)$/, (role, meal) => `${translateHindiText(meal)} में ${translateHindiText(role)} की दर`],
  [/^(.+) \/ cover$/, (value) => `${value} / प्लेट`],
  [/^Save My Rates \((\d+)\)$/, (count) => `मेरी दरें सेव करें (${count})`],
  [/^(.+) remaining$/, (value) => `${value} शेष`],
  [/^(.+) used$/, (value) => `${value} उपयोग हुआ`],
  [/^Remove (.+)$/, (name) => `${name} हटाएँ`],
  [/^Edit (.+)$/, (name) => `${name} संपादित करें`],
  [/^Delete (.+)$/, (name) => `${name} हटाएँ`],
  [/^Open (.+)$/, (name) => `${name} खोलें`],
  [/^Back to (.+)$/, (name) => `${translateHindiText(name)} पर वापस जाएँ`],
  [/^Next: (.+)$/, (name) => `अगला: ${translateHindiText(name)}`],
];

function translateHindiText(input: string): string {
  if (!input.trim() || /[\u0900-\u097f]/.test(input)) return input;

  const leading = input.match(/^\s*/)?.[0] ?? '';
  const trailing = input.match(/\s*$/)?.[0] ?? '';
  const text = input.trim();
  const exact = hindiTranslations[text]
    ?? hindiIngredientNames[text]
    ?? hindiDishNames.get(text.toLowerCase());
  if (exact) return `${leading}${exact}${trailing}`;

  for (const [pattern, replacement] of dynamicHindiTranslations) {
    const match = text.match(pattern);
    if (match) return `${leading}${replacement(...match.slice(1))}${trailing}`;
  }

  return input;
}

type TranslatedValue = { original: string; translated: string };

function HindiInterfaceTranslator({ language }: { language: AppLanguage }) {
  const textRecords = useRef(new Map<Text, TranslatedValue>());
  const attributeRecords = useRef(new Map<Element, Map<string, TranslatedValue>>());

  useEffect(() => {
    const restoreEnglish = () => {
      textRecords.current.forEach(({ original, translated }, node) => {
        if (node.nodeValue === translated) node.nodeValue = original;
      });
      attributeRecords.current.forEach((attributes, element) => {
        attributes.forEach(({ original, translated }, name) => {
          if (element.getAttribute(name) === translated) element.setAttribute(name, original);
        });
      });
      textRecords.current.clear();
      attributeRecords.current.clear();
    };

    if (language !== 'hi') {
      restoreEnglish();
      return;
    }

    const skippedTags = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT']);

    const isInsideCustomerApp = (node: Node) => {
      const element = node.nodeType === Node.ELEMENT_NODE
        ? node as Element
        : node.parentElement;
      return Boolean(element?.closest('.client-theme'));
    };

    const shouldSkip = (node: Node) => {
      const parent = node.nodeType === Node.ELEMENT_NODE
        ? node as Element
        : node.parentElement;
      if (!parent || !isInsideCustomerApp(node)) return true;
      return Boolean(
        skippedTags.has(parent.tagName)
        || parent.closest('[data-no-translate]')
        || parent.closest('[contenteditable="true"]'),
      );
    };

    const translateTextNode = (node: Text) => {
      if (shouldSkip(node) || !node.nodeValue) return;
      const current = node.nodeValue;
      const existing = textRecords.current.get(node);
      if (existing?.translated === current) return;

      const translated = translateHindiText(current);
      if (translated === current) return;
      textRecords.current.set(node, { original: current, translated });
      node.nodeValue = translated;
    };

    const translateAttributes = (element: Element) => {
      if (
        !isInsideCustomerApp(element)
        || element.closest('[data-no-translate]')
        || element.closest('[contenteditable="true"]')
      ) return;
      for (const name of ['placeholder', 'aria-label', 'title']) {
        const current = element.getAttribute(name);
        if (!current) continue;
        const previous = attributeRecords.current.get(element)?.get(name);
        if (previous?.translated === current) continue;
        const translated = translateHindiText(current);
        if (translated === current) continue;

        let attributes = attributeRecords.current.get(element);
        if (!attributes) {
          attributes = new Map();
          attributeRecords.current.set(element, attributes);
        }
        attributes.set(name, { original: current, translated });
        element.setAttribute(name, translated);
      }
    };

    const translateTree = (root: Node) => {
      if (!isInsideCustomerApp(root)) return;
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;

      const element = root as Element;
      translateAttributes(element);
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let node = walker.nextNode();
      while (node) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);
        else translateAttributes(node as Element);
        node = walker.nextNode();
      }
    };

    let frame = 0;
    const pending = new Set<Node>();
    const schedule = (node: Node) => {
      pending.add(node);
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        pending.forEach(translateTree);
        pending.clear();
      });
    };

    document.querySelectorAll('.client-theme').forEach(translateTree);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const target = mutation.target.nodeType === Node.TEXT_NODE
          ? mutation.target.parentElement
          : mutation.target as Element;
        const customerRoot = target?.closest?.('.client-theme');
        if (customerRoot) schedule(customerRoot);
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node as Element).matches('.client-theme')) {
            schedule(node);
          }
        });
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'aria-label', 'title'],
    });

    const nativeConfirm = window.confirm;
    const nativeAlert = window.alert;
    window.confirm = (message) => nativeConfirm.call(window, translateHindiText(String(message)));
    window.alert = (message) => nativeAlert.call(window, translateHindiText(String(message)));

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.confirm = nativeConfirm;
      window.alert = nativeAlert;
      restoreEnglish();
    };
  }, [language]);

  return null;
}

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
    t: (text) => language === 'hi' ? translateHindiText(text) : text,
  }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
      <HindiInterfaceTranslator language={language} />
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
