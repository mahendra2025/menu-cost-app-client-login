export const CATEGORIES = [
  'Welcome Drink',
  'Mocktail',
  'Soup',
  'Starter',
  'Chaat',
  'Chinese',
  'Italian',
  'South Indian',
  'Punjabi',
  'Paneer',
  'Sabji',
  'Kathiyawadi',
  'Rajasthani',
  'Gujarati',
  'Dal / Kadhi',
  'Rice',
  'Bread',
  'Sweet',
  'Ice Cream',
  'Salad',
  'Papad',
  'Farsan',
  'Beverage',
  'Live Counter',
  'Breakfast',
  'Jain',
  'Kids',
  'Condiments',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type DishCostItem = {
  name: string;
  category: Category;
  rate: number;
  servingQuantity?: number;
  servingUnit?: string;
  aliases?: string[];
};

function normalizeCatalogKey(value: string) {
  return value.trim().toLowerCase();
}

const DISH_MASTER_STORAGE_KEY = 'menu_cost_dish_master_v1';

export const CATEGORY_BASE_COST: Record<Category, number> = {
  'Welcome Drink': 18,
  Mocktail: 35,
  Soup: 22,
  Starter: 55,
  Chaat: 38,
  Chinese: 45,
  Italian: 58,
  'South Indian': 42,
  Punjabi: 68,
  Paneer: 78,
  Sabji: 48,
  Kathiyawadi: 50,
  Rajasthani: 52,
  Gujarati: 44,
  'Dal / Kadhi': 24,
  Rice: 24,
  Bread: 18,
  Sweet: 42,
  'Ice Cream': 32,
  Salad: 10,
  Papad: 5,
  Farsan: 24,
  Beverage: 16,
  'Live Counter': 70,
  Breakfast: 55,
  Jain: 55,
  Kids: 42,
  Condiments: 6,
};

const DISH_COST_ITEMS_PART_1: readonly DishCostItem[] = [
  

// Welcome Drink
{ name: 'Orange Juice', category: 'Welcome Drink', rate: 18, aliases: ["orange juice","fresh orange juice","santra juice","ऑरेंज जूस","ઓરેન્જ જ્યુસ"] },
{ name: 'Apple Juice', category: 'Welcome Drink', rate: 22, aliases: ["apple juice","fresh apple juice","seb juice","एप्पल जूस","એપલ જ્યુસ"] },
{ name: 'Pineapple Juice', category: 'Welcome Drink', rate: 20, aliases: ["pineapple juice","ananas juice","पाइनएप्पल जूस","પાઇનએપલ જ્યુસ"] },
{ name: 'Watermelon Juice', category: 'Welcome Drink', rate: 18, aliases: ["watermelon juice","tarbooj juice","वॉटरमेलन जूस","વોટરમેલન જ્યુસ"] },
{ name: 'Muskmelon Juice', category: 'Welcome Drink', rate: 20, aliases: ["muskmelon juice","kharbuja juice","मस्कमेलन जूस","મસ્કમેલન જ્યુસ"] },
{ name: 'Mango Juice', category: 'Welcome Drink', rate: 22, aliases: ["mango juice","aam juice","मैंगो जूस","મેંગો જ્યુસ"] },
{ name: 'Grape Juice', category: 'Welcome Drink', rate: 22, aliases: ["grape juice","angoor juice","ग्रेप जूस","ગ્રેપ જ્યુસ"] },
{ name: 'Pomegranate Juice', category: 'Welcome Drink', rate: 28, aliases: ["pomegranate juice","anar juice","पोमेग्रेनेट जूस","પોમેગ્રેનેટ જ્યુસ"] },
{ name: 'Guava Juice', category: 'Welcome Drink', rate: 20, aliases: ["guava juice","amrud juice","गुआवा जूस","ગુઆવા જ્યુસ"] },
{ name: 'Lychee Juice', category: 'Welcome Drink', rate: 24, aliases: ["lychee juice","litchi juice","लीची जूस","લીચી જ્યુસ"] },
{ name: 'Kiwi Juice', category: 'Welcome Drink', rate: 28, aliases: ["kiwi juice","कीवी जूस","કીવી જ્યુસ"] },
{ name: 'Mixed Fruit Juice', category: 'Welcome Drink', rate: 24, aliases: ["mixed fruit juice","mix fruit juice","fruit juice","मिक्स्ड फ्रूट जूस","મિક્સ્ડ ફ્રૂટ જ્યુસ"] },
{ name: 'Strawberry Juice', category: 'Welcome Drink', rate: 25, aliases: ["strawberry juice","स्ट्रॉबेरी जूस","સ્ટ્રૉબેરી જ્યુસ"] },
{ name: 'Peach Juice', category: 'Welcome Drink', rate: 24, aliases: ["peach juice","पीच जूस","પીચ જ્યુસ"] },

{ name: 'Jaljeera', category: 'Welcome Drink', rate: 18, aliases: ["jaljeera","jal jeera","जलजीरा","જલજીરા"] },
{ name: 'Mint Jaljeera', category: 'Welcome Drink', rate: 20, aliases: ["mint jaljeera","pudina jaljeera","मिंट जलजीरा","મિંટ જલજીરા"] },
{ name: 'Kokum Sharbat', category: 'Welcome Drink', rate: 20, aliases: ["kokum sharbat","kokum drink","कोकम शरबत","કોકમ શરબત"] },
{ name: 'Aam Panna', category: 'Welcome Drink', rate: 20, aliases: ["aam panna","mango panna","आम पन्ना","આમ પન્ના"] },
{ name: 'Nimbu Pani', category: 'Welcome Drink', rate: 16, aliases: ["nimbu pani","lemon water","lemon drink","नींबू पानी","લીંબુ પાણી"] },
{ name: 'Masala Nimbu Pani', category: 'Welcome Drink', rate: 18, aliases: ["masala nimbu pani","masala lemon water","मसाला नींबू पानी","મસાલા લીંબુ પાણી"] },
{ name: 'Shikanji', category: 'Welcome Drink', rate: 18, aliases: ["shikanji","shikanjvi","शिकंजी","શિકંજી"] },
{ name: 'Mint Lemonade', category: 'Welcome Drink', rate: 22, aliases: ["mint lemonade","pudina lemonade","मिंट लेमोनेड","મિંટ લેમોનેડ"] },
{ name: 'Fresh Lime Water', category: 'Welcome Drink', rate: 18, aliases: ["fresh lime water","lime water","फ्रेश लाइम वॉटर","ફ્રેશ લાઇમ વોટર"] },
{ name: 'Fresh Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ["fresh lime soda","lime soda","फ्रेश लाइम सोडा","ફ્રેશ લાઇમ સોડા"] },
{ name: 'Sweet Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ["sweet lime soda","स्वीट लाइम सोडा","સ્વીટ લાઇમ સોડા"] },
{ name: 'Salted Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ["salted lime soda","salt lime soda","सॉल्टेड लाइम सोडा","સૉલ્ટેડ લાઇમ સોડા"] },

{ name: 'Rose Sharbat', category: 'Welcome Drink', rate: 18, aliases: ["rose sharbat","gulab sharbat","रोज़ शरबत","રોજ઼ શરબત"] },
{ name: 'Khus Sharbat', category: 'Welcome Drink', rate: 18, aliases: ["khus sharbat","khas sharbat","खस शरबत","ખસ શરબત"] },
{ name: 'Badam Sharbat', category: 'Welcome Drink', rate: 26, aliases: ["badam sharbat","almond sharbat","बादाम शरबत","બદામ શરબત"] },
{ name: 'Kesar Sharbat', category: 'Welcome Drink', rate: 24, aliases: ["kesar sharbat","saffron sharbat","केसर शरबत","કેસર શરબત"] },
{ name: 'Orange Sharbat', category: 'Welcome Drink', rate: 18, aliases: ["orange sharbat","ऑरेंज शरबत","ઓરેન્જ શરબત"] },
{ name: 'Pineapple Sharbat', category: 'Welcome Drink', rate: 18, aliases: ["pineapple sharbat","पाइनएप्पल शरबत","પાઇનએપલ શરબત"] },
{ name: 'Raw Mango Sharbat', category: 'Welcome Drink', rate: 20, aliases: ["raw mango sharbat","kacchi keri sharbat","रॉ मैंगो शरबत","રૉ મેંગો શરબત"] },
{ name: 'Bel Sharbat', category: 'Welcome Drink', rate: 22, aliases: ["bel sharbat","bael sharbat","बेल शरबत","બેલ શરબત"] },

{ name: 'Sweet Lassi', category: 'Welcome Drink', rate: 24, aliases: ["sweet lassi","lassi sweet","स्वीट लस्सी","સ્વીટ લસ્સી"] },
{ name: 'Salted Lassi', category: 'Welcome Drink', rate: 22, aliases: ["salted lassi","namkeen lassi","सॉल्टेड लस्सी","સૉલ્ટેડ લસ્સી"] },
{ name: 'Mango Lassi', category: 'Welcome Drink', rate: 28, aliases: ["mango lassi","aam lassi","मैंगो लस्सी","મેંગો લસ્સી"] },
{ name: 'Rose Lassi', category: 'Welcome Drink', rate: 26, aliases: ["rose lassi","gulab lassi","रोज़ लस्सी","રોજ઼ લસ્સી"] },
{ name: 'Kesar Lassi', category: 'Welcome Drink', rate: 28, aliases: ["kesar lassi","saffron lassi","केसर लस्सी","કેસર લસ્સી"] },
{ name: 'Dry Fruit Lassi', category: 'Welcome Drink', rate: 32, aliases: ["dry fruit lassi","dryfruit lassi","ड्राई फ्रूट लस्सी","ડ્રાઈ ફ્રૂટ લસ્સી"] },
{ name: 'Chaas', category: 'Welcome Drink', rate: 16, aliases: ["chaas","buttermilk","chhach","छाछ","છાશ"] },
{ name: 'Masala Chaas', category: 'Welcome Drink', rate: 18, aliases: ["masala chaas","masala buttermilk","मसाला छाछ","મસાલા છાશ"] },
{ name: 'Pudina Chaas', category: 'Welcome Drink', rate: 18, aliases: ["pudina chaas","mint buttermilk","पुदीना छाछ","ફુદીનો છાશ"] },

{ name: 'Cold Coffee', category: 'Welcome Drink', rate: 28, aliases: ["cold coffee","iced coffee","कोल्ड कॉफी","કોલ્ડ કોફી"] },
{ name: 'Chocolate Milkshake', category: 'Welcome Drink', rate: 32, aliases: ["chocolate milkshake","chocolate shake","चॉकलेट मिल्कशेक","ચૉકલેટ મિલ્કશેક"] },
{ name: 'Vanilla Milkshake', category: 'Welcome Drink', rate: 30, aliases: ["vanilla milkshake","vanilla shake","वनीला मिल्कशेक","વનીલા મિલ્કશેક"] },
{ name: 'Strawberry Milkshake', category: 'Welcome Drink', rate: 32, aliases: ["strawberry milkshake","strawberry shake","स्ट्रॉबेरी मिल्कशेक","સ્ટ્રૉબેરી મિલ્કશેક"] },
{ name: 'Mango Milkshake', category: 'Welcome Drink', rate: 32, aliases: ["mango milkshake","mango shake","मैंगो मिल्कशेक","મેંગો મિલ્કશેક"] },
{ name: 'Chikoo Milkshake', category: 'Welcome Drink', rate: 32, aliases: ["chikoo milkshake","chikoo shake","sapota shake","चीकू मिल्कशेक","ચીકૂ મિલ્કશેક"] },
{ name: 'Banana Milkshake', category: 'Welcome Drink', rate: 28, aliases: ["banana milkshake","banana shake","बनाना मिल्कशेक","બનાના મિલ્કશેક"] },
{ name: 'Kesar Badam Milk', category: 'Welcome Drink', rate: 30, aliases: ["kesar badam milk","saffron almond milk","केसर बादाम मिल्क","કેસર બદામ મિલ્ક"] },
{ name: 'Thandai', category: 'Welcome Drink', rate: 30, aliases: ["thandai","badam thandai","ठंडाई","ઠંડાઈ"] },

{ name: 'Tender Coconut Water', category: 'Welcome Drink', rate: 35, aliases: ["tender coconut water","coconut water","nariyal pani","टेंडर कोकोनट वॉटर","ટેંડર કોકોનટ વોટર"] },
{ name: 'Sugarcane Juice', category: 'Welcome Drink', rate: 24, aliases: ["sugarcane juice","ganne ka juice","शुगरकेन जूस","શેરડી જ્યુસ"] },
{ name: 'Sattu Sharbat', category: 'Welcome Drink', rate: 20, aliases: ["sattu sharbat","sattu drink","सत्तू शरबत","સત્તૂ શરબત"] },
{ name: 'Sol Kadhi', category: 'Welcome Drink', rate: 22, aliases: ["sol kadhi","solkadhi","सोल कढ़ी","સોલ કઢી"] },
{ name: 'Kokum Soda', category: 'Welcome Drink', rate: 24, aliases: ["kokum soda","कोकम सोडा","કોકમ સોડા"] },
{ name: 'Jeera Soda', category: 'Welcome Drink', rate: 20, aliases: ["jeera soda","cumin soda","जीरा सोडा","જીરુ સોડા"] },
{ name: 'Masala Soda', category: 'Welcome Drink', rate: 20, aliases: ["masala soda","मसाला सोडा","મસાલા સોડા"] },


// Mocktail

{ name: 'Virgin Mojito', category: 'Mocktail', rate: 35, aliases: ["virgin mojito","mint mojito","classic virgin mojito","वर्जिन मोजिटो","વર્જિન મોજિટો"] },
{ name: 'Blue Lagoon', category: 'Mocktail', rate: 38, aliases: ["blue lagoon","blue lagoon mocktail","ब्लू लैगून","બ્લૂ લૈગૂન"] },
{ name: 'Fruit Punch', category: 'Mocktail', rate: 36, aliases: ["fruit punch","mixed fruit punch","फ्रूट पंच","ફ્રૂટ પંચ"] },
{ name: 'Green Apple Mojito', category: 'Mocktail', rate: 38, aliases: ["green apple mojito","apple mojito","ग्रीन एप्पल मोजिटो","ગ્રીન એપલ મોજિટો"] },
{ name: 'Watermelon Mojito', category: 'Mocktail', rate: 38, aliases: ["watermelon mojito","tarbooj mojito","वॉटरमेलन मोजिटो","વોટરમેલન મોજિટો"] },
{ name: 'Strawberry Mojito', category: 'Mocktail', rate: 40, aliases: ["strawberry mojito","स्ट्रॉबेरी मोजिटो","સ્ટ્રૉબેરી મોજિટો"] },
{ name: 'Kiwi Mojito', category: 'Mocktail', rate: 42, aliases: ["kiwi mojito","कीवी मोजिटो","કીવી મોજિટો"] },
{ name: 'Orange Mojito', category: 'Mocktail', rate: 38, aliases: ["orange mojito","ऑरेंज मोजिटो","ઓરેન્જ મોજિટો"] },
{ name: 'Pineapple Mojito', category: 'Mocktail', rate: 40, aliases: ["pineapple mojito","पाइनएप्पल मोजिटो","પાઇનએપલ મોજિટો"] },
{ name: 'Mango Mojito', category: 'Mocktail', rate: 40, aliases: ["mango mojito","aam mojito","मैंगो मोजिटो","મેંગો મોજિટો"] },
{ name: 'Peach Mojito', category: 'Mocktail', rate: 42, aliases: ["peach mojito","पीच मोजिटो","પીચ મોજિટો"] },
{ name: 'Lychee Mojito', category: 'Mocktail', rate: 42, aliases: ["lychee mojito","litchi mojito","लीची मोजिटो","લીચી મોજિટો"] },
{ name: 'Pomegranate Mojito', category: 'Mocktail', rate: 44, aliases: ["pomegranate mojito","anar mojito","पोमेग्रेनेट मोजिटो","પોમેગ્રેનેટ મોજિટો"] },
{ name: 'Passion Fruit Mojito', category: 'Mocktail', rate: 45, aliases: ["passion fruit mojito","passionfruit mojito","पैशन फ्रूट मोजिटो","પૈશન ફ્રૂટ મોજિટો"] },

{ name: 'Virgin Pina Colada', category: 'Mocktail', rate: 42, aliases: ["virgin pina colada","pina colada","pineapple coconut mocktail","वर्जिन पीना कोलाडा","વર્જિન પીના કોલાડા"] },
{ name: 'Virgin Mary', category: 'Mocktail', rate: 40, aliases: ["virgin mary","tomato mocktail","वर्जिन मैरी","વર્જિન મૈરી"] },
{ name: 'Virgin Sangria', category: 'Mocktail', rate: 45, aliases: ["virgin sangria","non alcoholic sangria","fruit sangria","वर्जिन संग्रिया","વર્જિન સંગ્રિયા"] },
{ name: 'Virgin Margarita', category: 'Mocktail', rate: 42, aliases: ["virgin margarita","lime margarita mocktail","वर्जिन मार्गरीटा","વર્જિન માર્ગરીટા"] },
{ name: 'Virgin Cosmopolitan', category: 'Mocktail', rate: 45, aliases: ["virgin cosmopolitan","virgin cosmo","वर्जिन कॉस्मोपॉलिटन","વર્જિન કૉસ્મોપૉલિટન"] },
{ name: 'Virgin Sunrise', category: 'Mocktail', rate: 40, aliases: ["virgin sunrise","orange sunrise mocktail","वर्जिन सनराइज़","વર્જિન સનરાઇજ઼"] },
{ name: 'Virgin Daiquiri', category: 'Mocktail', rate: 42, aliases: ["virgin daiquiri","lime daiquiri mocktail","वर्जिन डाइक्विरी","વર્જિન ડાઇક્વિરી"] },

{ name: 'Mango Tango', category: 'Mocktail', rate: 42, aliases: ["mango tango","mango tango mocktail","मैंगो टैंगो","મેંગો ટૈંગો"] },
{ name: 'Orange Blossom', category: 'Mocktail', rate: 40, aliases: ["orange blossom","orange blossom mocktail","ऑरेंज ब्लॉसम","ઓરેન્જ બ્લૉસમ"] },
{ name: 'Pineapple Punch', category: 'Mocktail', rate: 40, aliases: ["pineapple punch","पाइनएप्पल पंच","પાઇનએપલ પંચ"] },
{ name: 'Mango Punch', category: 'Mocktail', rate: 40, aliases: ["mango punch","मैंगो पंच","મેંગો પંચ"] },
{ name: 'Berry Blast', category: 'Mocktail', rate: 45, aliases: ["berry blast","mixed berry mocktail","बेरी ब्लस्ट","બેરી બ્લસ્ટ"] },
{ name: 'Tropical Punch', category: 'Mocktail', rate: 42, aliases: ["tropical punch","tropical fruit punch","ट्रॉपिकल पंच","ટ્રૉપિકલ પંચ"] },
{ name: 'Citrus Punch', category: 'Mocktail', rate: 38, aliases: ["citrus punch","citrus mocktail","सिट्रस पंच","સિટ્રસ પંચ"] },
{ name: 'Summer Punch', category: 'Mocktail', rate: 40, aliases: ["summer punch","summer fruit punch","समर पंच","સમર પંચ"] },
{ name: 'Royal Fruit Punch', category: 'Mocktail', rate: 48, aliases: ["royal fruit punch","premium fruit punch","रॉयल फ्रूट पंच","રૉયલ ફ્રૂટ પંચ"] },

{ name: 'Green Apple Cooler', category: 'Mocktail', rate: 38, aliases: ["green apple cooler","apple cooler","ग्रीन एप्पल कूलर","ગ્રીન એપલ કૂલર"] },
{ name: 'Watermelon Cooler', category: 'Mocktail', rate: 38, aliases: ["watermelon cooler","tarbooj cooler","वॉटरमेलन कूलर","વોટરમેલન કૂલર"] },
{ name: 'Mint Cooler', category: 'Mocktail', rate: 35, aliases: ["mint cooler","pudina cooler","मिंट कूलर","મિંટ કૂલર"] },
{ name: 'Cucumber Cooler', category: 'Mocktail', rate: 36, aliases: ["cucumber cooler","kheera cooler","कुकुंबर कूलर","કુકુંબર કૂલર"] },
{ name: 'Lemon Mint Cooler', category: 'Mocktail', rate: 36, aliases: ["lemon mint cooler","lime mint cooler","लेमन मिंट कूलर","લેમન મિંટ કૂલર"] },
{ name: 'Orange Cooler', category: 'Mocktail', rate: 38, aliases: ["orange cooler","ऑरेंज कूलर","ઓરેન્જ કૂલર"] },
{ name: 'Pineapple Cooler', category: 'Mocktail', rate: 40, aliases: ["pineapple cooler","पाइनएप्पल कूलर","પાઇનએપલ કૂલર"] },
{ name: 'Mango Cooler', category: 'Mocktail', rate: 40, aliases: ["mango cooler","मैंगो कूलर","મેંગો કૂલર"] },
{ name: 'Kiwi Cooler', category: 'Mocktail', rate: 42, aliases: ["kiwi cooler","कीवी कूलर","કીવી કૂલર"] },
{ name: 'Strawberry Cooler', category: 'Mocktail', rate: 42, aliases: ["strawberry cooler","स्ट्रॉबेरी कूलर","સ્ટ્રૉબેરી કૂલર"] },
{ name: 'Lychee Cooler', category: 'Mocktail', rate: 42, aliases: ["lychee cooler","litchi cooler","लीची कूलर","લીચી કૂલર"] },
{ name: 'Peach Cooler', category: 'Mocktail', rate: 42, aliases: ["peach cooler","पीच कूलर","પીચ કૂલર"] },
{ name: 'Passion Fruit Cooler', category: 'Mocktail', rate: 45, aliases: ["passion fruit cooler","passionfruit cooler","पैशन फ्रूट कूलर","પૈશન ફ્રૂટ કૂલર"] },

{ name: 'Rose Lemonade', category: 'Mocktail', rate: 36, aliases: ["rose lemonade","gulab lemonade","रोज़ लेमोनेड","રોજ઼ લેમોનેડ"] },
{ name: 'Mint Lemonade', category: 'Mocktail', rate: 35, aliases: ["mint lemonade","pudina lemonade","मिंट लेमोनेड","મિંટ લેમોનેડ"] },
{ name: 'Strawberry Lemonade', category: 'Mocktail', rate: 40, aliases: ["strawberry lemonade","स्ट्रॉबेरी लेमोनेड","સ્ટ્રૉબેરી લેમોનેડ"] },
{ name: 'Watermelon Lemonade', category: 'Mocktail', rate: 38, aliases: ["watermelon lemonade","वॉटरमेलन लेमोनेड","વોટરમેલન લેમોનેડ"] },
{ name: 'Blueberry Lemonade', category: 'Mocktail', rate: 44, aliases: ["blueberry lemonade","ब्लूबेरी लेमोनेड","બ્લૂબેરી લેમોનેડ"] },
{ name: 'Peach Lemonade', category: 'Mocktail', rate: 42, aliases: ["peach lemonade","पीच लेमोनेड","પીચ લેમોનેડ"] },
{ name: 'Lychee Lemonade', category: 'Mocktail', rate: 42, aliases: ["lychee lemonade","litchi lemonade","लीची लेमोनेड","લીચી લેમોનેડ"] },
{ name: 'Pink Lemonade', category: 'Mocktail', rate: 38, aliases: ["pink lemonade","पिंक लेमोनेड","પિંક લેમોનેડ"] },
{ name: 'Masala Lemonade', category: 'Mocktail', rate: 35, aliases: ["masala lemonade","spiced lemonade","मसाला लेमोनेड","મસાલા લેમોનેડ"] },

{ name: 'Blue Curacao Fizz', category: 'Mocktail', rate: 42, aliases: ["blue curacao fizz","blue fizz","ब्लू क्युरासाओ फिज़","બ્લૂ ક્યુરાસાઓ ફિજ઼"] },
{ name: 'Green Apple Fizz', category: 'Mocktail', rate: 40, aliases: ["green apple fizz","apple fizz","ग्रीन एप्पल फिज़","ગ્રીન એપલ ફિજ઼"] },
{ name: 'Orange Fizz', category: 'Mocktail', rate: 38, aliases: ["orange fizz","ऑरेंज फिज़","ઓરેન્જ ફિજ઼"] },
{ name: 'Lemon Fizz', category: 'Mocktail', rate: 35, aliases: ["lemon fizz","lime fizz","लेमन फिज़","લેમન ફિજ઼"] },
{ name: 'Strawberry Fizz', category: 'Mocktail', rate: 42, aliases: ["strawberry fizz","स्ट्रॉबेरी फिज़","સ્ટ્રૉબેરી ફિજ઼"] },
{ name: 'Kiwi Fizz', category: 'Mocktail', rate: 42, aliases: ["kiwi fizz","कीवी फिज़","કીવી ફિજ઼"] },
{ name: 'Rose Fizz', category: 'Mocktail', rate: 38, aliases: ["rose fizz","gulab fizz","रोज़ फिज़","રોજ઼ ફિજ઼"] },
{ name: 'Ginger Fizz', category: 'Mocktail', rate: 38, aliases: ["ginger fizz","adrak fizz","जिंजर फिज़","આદુ ફિજ઼"] },

{ name: 'Kala Khatta Mocktail', category: 'Mocktail', rate: 35, aliases: ["kala khatta mocktail","kala khatta","काला खट्टा मॉकटेल","કાલા ખટ્ટા મોકટેલ"] },
{ name: 'Kokum Fizz', category: 'Mocktail', rate: 38, aliases: ["kokum fizz","kokum mocktail","कोकम फिज़","કોકમ ફિજ઼"] },
{ name: 'Jaljeera Fizz', category: 'Mocktail', rate: 35, aliases: ["jaljeera fizz","jal jeera fizz","जलजीरा फिज़","જલજીરા ફિજ઼"] },
{ name: 'Aam Panna Fizz', category: 'Mocktail', rate: 38, aliases: ["aam panna fizz","mango panna fizz","आम पन्ना फिज़","આમ પન્ના ફિજ઼"] },
{ name: 'Masala Cola', category: 'Mocktail', rate: 32, aliases: ["masala cola","masala coke","मसाला कोला","મસાલા કોલા"] },
{ name: 'Jeera Cola', category: 'Mocktail', rate: 32, aliases: ["jeera cola","jeera coke","जीरा कोला","જીરુ કોલા"] },
{ name: 'Nimbu Masala Soda', category: 'Mocktail', rate: 32, aliases: ["nimbu masala soda","lemon masala soda","नींबू मसाला सोडा","લીંબુ મસાલા સોડા"] },
{ name: 'Khus Lime Soda', category: 'Mocktail', rate: 35, aliases: ["khus lime soda","khus soda","खस लाइम सोडा","ખસ લાઇમ સોડા"] },
{ name: 'Rose Lime Soda', category: 'Mocktail', rate: 35, aliases: ["rose lime soda","gulab lime soda","रोज़ लाइम सोडा","રોજ઼ લાઇમ સોડા"] },

{ name: 'Black Currant Mocktail', category: 'Mocktail', rate: 42, aliases: ["black currant mocktail","blackcurrant mocktail","ब्लैक करंट मॉकटेल","બ્લૈક કરંટ મોકટેલ"] },
{ name: 'Cranberry Mocktail', category: 'Mocktail', rate: 45, aliases: ["cranberry mocktail","cranberry cooler","क्रैनबेरी मॉकटेल","ક્રૈનબેરી મોકટેલ"] },
{ name: 'Blueberry Mocktail', category: 'Mocktail', rate: 45, aliases: ["blueberry mocktail","ब्लूबेरी मॉकटेल","બ્લૂબેરી મોકટેલ"] },
{ name: 'Raspberry Mocktail', category: 'Mocktail', rate: 46, aliases: ["raspberry mocktail","रास्पबेरी मॉकटेल","રાસ્પબેરી મોકટેલ"] },
{ name: 'Mixed Berry Mocktail', category: 'Mocktail', rate: 48, aliases: ["mixed berry mocktail","berry mix mocktail","मिक्स्ड बेरी मॉकटेल","મિક્સ્ડ બેરી મોકટેલ"] },

{ name: 'Guava Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ["guava chilli mocktail","chilli guava","spicy guava","गुआवा चिली मॉकटेल","ગુઆવા ચિલી મોકટેલ"] },
{ name: 'Pineapple Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ["pineapple chilli mocktail","spicy pineapple","पाइनएप्पल चिली मॉकटेल","પાઇનએપલ ચિલી મોકટેલ"] },
{ name: 'Mango Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ["mango chilli mocktail","spicy mango","मैंगो चिली मॉकटेल","મેંગો ચિલી મોકટેલ"] },
{ name: 'Watermelon Basil Mocktail', category: 'Mocktail', rate: 42, aliases: ["watermelon basil mocktail","watermelon basil cooler","वॉटरमेलन बेसिल मॉकटेल","વોટરમેલન બેસિલ મોકટેલ"] },
{ name: 'Cucumber Basil Cooler', category: 'Mocktail', rate: 40, aliases: ["cucumber basil cooler","cucumber basil mocktail","कुकुंबर बेसिल कूलर","કુકુંબર બેસિલ કૂલર"] },
{ name: 'Orange Basil Cooler', category: 'Mocktail', rate: 42, aliases: ["orange basil cooler","orange basil mocktail","ऑरेंज बेसिल कूलर","ઓરેન્જ બેસિલ કૂલર"] },

{ name: 'Cinderella Mocktail', category: 'Mocktail', rate: 45, aliases: ["cinderella mocktail","cinderella drink","सिंड्रेला मॉकटेल","સિંડ્રેલા મોકટેલ"] },
{ name: 'Shirley Temple', category: 'Mocktail', rate: 42, aliases: ["shirley temple","shirley temple mocktail","शर्ली टेम्पल","શર્લી ટેમ્પલ"] },
{ name: 'Purple Rain Mocktail', category: 'Mocktail', rate: 45, aliases: ["purple rain mocktail","purple rain","पर्पल रेन मॉकटेल","પર્પલ રેન મોકટેલ"] },
{ name: 'Ocean Blue Mocktail', category: 'Mocktail', rate: 45, aliases: ["ocean blue mocktail","ocean blue","ओशन ब्लू मॉकटेल","ઓશન બ્લૂ મોકટેલ"] },
{ name: 'Sunset Mocktail', category: 'Mocktail', rate: 42, aliases: ["sunset mocktail","tropical sunset","सनसेट मॉकटेल","સનસેટ મોકટેલ"] },
{ name: 'Rainbow Mocktail', category: 'Mocktail', rate: 48, aliases: ["rainbow mocktail","rainbow drink","रेनबो मॉकटेल","રેનબો મોકટેલ"] },
{ name: 'Electric Lemonade', category: 'Mocktail', rate: 45, aliases: ["electric lemonade","blue electric lemonade","इलेक्ट्रिक लेमोनेड","ઇલેક્ટ્રિક લેમોનેડ"] },
{ name: 'Red Velvet Mocktail', category: 'Mocktail', rate: 48, aliases: ["red velvet mocktail","रेड वेलवेट मॉकटेल","રેડ વેલવેટ મોકટેલ"] },

{ name: 'Tender Coconut Cooler', category: 'Mocktail', rate: 48, aliases: ["tender coconut cooler","coconut cooler","nariyal cooler","टेंडर कोकोनट कूलर","ટેંડર કોકોનટ કૂલર"] },
{ name: 'Coconut Pineapple Cooler', category: 'Mocktail', rate: 48, aliases: ["coconut pineapple cooler","pineapple coconut cooler","कोकोनट पाइनएप्पल कूलर","કોકોનટ પાઇનએપલ કૂલર"] },
{ name: 'Coconut Mint Cooler', category: 'Mocktail', rate: 46, aliases: ["coconut mint cooler","mint coconut cooler","कोकोनट मिंट कूलर","કોકોનટ મિંટ કૂલર"] },


// Soup

{ name: 'Tomato Soup', category: 'Soup', rate: 22, aliases: ["tomato soup","classic tomato soup","टोमेटो सूप","ટામેટા સૂપ"] },
{ name: 'Cream of Tomato Soup', category: 'Soup', rate: 26, aliases: ["cream of tomato soup","creamy tomato soup","क्रीम ऑफ टोमेटो सूप","ક્રીમ ઑફ ટામેટા સૂપ"] },
{ name: 'Tomato Basil Soup', category: 'Soup', rate: 28, aliases: ["tomato basil soup","basil tomato soup","टोमेटो बेसिल सूप","ટામેટા બેસિલ સૂપ"] },
{ name: 'Roasted Tomato Soup', category: 'Soup', rate: 28, aliases: ["roasted tomato soup","roast tomato soup","रोस्टेड टोमेटो सूप","રોસ્ટેડ ટામેટા સૂપ"] },
{ name: 'Tomato Dhaniya Shorba', category: 'Soup', rate: 27, aliases: ["tomato dhaniya shorba","tamatar dhaniya shorba","टोमेटो धनिया शोरबा","ટામેટા ધાણા શોરબા"] },

{ name: 'Manchow Soup', category: 'Soup', rate: 24, aliases: ["manchow soup","veg manchow soup","vegetable manchow soup","मंचाउ सूप","મંચાઉ સૂપ"] },
{ name: 'Hot and Sour Soup', category: 'Soup', rate: 25, aliases: ["hot and sour soup","hot & sour soup","veg hot and sour soup","हॉट एंड सावर सूप","હૉટ એંડ સાવર સૂપ"] },
{ name: 'Sweet Corn Soup', category: 'Soup', rate: 24, aliases: ["sweet corn soup","veg sweet corn soup","स्वीट कॉर्न सूप","સ્વીટ કોર્ન સૂપ"] },
{ name: 'Vegetable Clear Soup', category: 'Soup', rate: 22, aliases: ["vegetable clear soup","veg clear soup","वेजिटेबल क्लियर सूप","વેજિટેબલ ક્લિયર સૂપ"] },
{ name: 'Chinese Clear Soup', category: 'Soup', rate: 23, aliases: ["chinese clear soup","chinese vegetable clear soup","चाइनीज़ क्लियर सूप","ચાઇનીજ઼ ક્લિયર સૂપ"] },
{ name: 'Lemon Coriander Soup', category: 'Soup', rate: 25, aliases: ["lemon coriander soup","lemon dhaniya soup","लेमन कोरिएंडर सूप","લેમન કોથમીર સૂપ"] },
{ name: 'Veg Noodle Soup', category: 'Soup', rate: 26, aliases: ["veg noodle soup","vegetable noodle soup","वेज नूडल सूप","વેજ નૂડલ સૂપ"] },
{ name: 'Schezwan Soup', category: 'Soup', rate: 27, aliases: ["schezwan soup","szechuan soup","veg schezwan soup","शेज़वान सूप","શેજ઼વાન સૂપ"] },
{ name: 'Wonton Soup', category: 'Soup', rate: 30, aliases: ["wonton soup","veg wonton soup","वॉन्टन सूप","વૉન્ટન સૂપ"] },
{ name: 'Talumein Soup', category: 'Soup', rate: 28, aliases: ["talumein soup","talumeen soup","veg talumein soup","तालुमेन सूप","તાલુમેન સૂપ"] },
{ name: 'Dragon Soup', category: 'Soup', rate: 28, aliases: ["dragon soup","veg dragon soup","ड्रैगन सूप","ડ્રૈગન સૂપ"] },
{ name: 'Burnt Garlic Soup', category: 'Soup', rate: 28, aliases: ["burnt garlic soup","veg burnt garlic soup","बर्न्ट गार्लिक सूप","બર્ન્ટ લસણ સૂપ"] },
{ name: 'Chilli Garlic Soup', category: 'Soup', rate: 27, aliases: ["chilli garlic soup","chili garlic soup","चिली गार्लिक सूप","ચિલી લસણ સૂપ"] },
{ name: 'Ginger Garlic Soup', category: 'Soup', rate: 27, aliases: ["ginger garlic soup","adrak garlic soup","जिंजर गार्लिक सूप","આદુ લસણ સૂપ"] },
{ name: 'Mushroom Manchow Soup', category: 'Soup', rate: 30, aliases: ["mushroom manchow soup","मशरूम मंचाउ सूप","મશરૂમ મંચાઉ સૂપ"] },
{ name: 'Paneer Manchow Soup', category: 'Soup', rate: 31, aliases: ["paneer manchow soup","पनीर मंचाउ सूप","પનીર મંચાઉ સૂપ"] },
{ name: 'Baby Corn Manchow Soup', category: 'Soup', rate: 29, aliases: ["baby corn manchow soup","बेबी कॉर्न मंचाउ सूप","બેબી કોર્ન મંચાઉ સૂપ"] },
{ name: 'Spinach Manchow Soup', category: 'Soup', rate: 28, aliases: ["spinach manchow soup","palak manchow soup","स्पिनच मंचाउ सूप","સ્પિનચ મંચાઉ સૂપ"] },

{ name: 'Cream of Mushroom Soup', category: 'Soup', rate: 30, aliases: ["cream of mushroom soup","creamy mushroom soup","क्रीम ऑफ मशरूम सूप","ક્રીમ ઑફ મશરૂમ સૂપ"] },
{ name: 'Mushroom Soup', category: 'Soup', rate: 27, aliases: ["mushroom soup","veg mushroom soup","मशरूम सूप","મશરૂમ સૂપ"] },
{ name: 'Cream of Vegetable Soup', category: 'Soup', rate: 28, aliases: ["cream of vegetable soup","creamy vegetable soup","क्रीम ऑफ वेजिटेबल सूप","ક્રીમ ઑફ વેજિટેબલ સૂપ"] },
{ name: 'Cream of Spinach Soup', category: 'Soup', rate: 28, aliases: ["cream of spinach soup","creamy spinach soup","cream of palak soup","क्रीम ऑफ स्पिनच सूप","ક્રીમ ઑફ સ્પિનચ સૂપ"] },
{ name: 'Cream of Broccoli Soup', category: 'Soup', rate: 32, aliases: ["cream of broccoli soup","creamy broccoli soup","क्रीम ऑफ ब्रोकली सूप","ક્રીમ ઑફ બ્રોકલી સૂપ"] },
{ name: 'Cream of Corn Soup', category: 'Soup', rate: 28, aliases: ["cream of corn soup","creamy corn soup","क्रीम ऑफ कॉर्न सूप","ક્રીમ ઑફ કોર્ન સૂપ"] },
{ name: 'Cream of Peas Soup', category: 'Soup', rate: 27, aliases: ["cream of peas soup","green peas soup","क्रीम ऑफ पीज़ सूप","ક્રીમ ઑફ પીજ઼ સૂપ"] },
{ name: 'Cream of Carrot Soup', category: 'Soup', rate: 27, aliases: ["cream of carrot soup","creamy carrot soup","क्रीम ऑफ कैरट सूप","ક્રીમ ઑફ કૈરટ સૂપ"] },
{ name: 'Cream of Pumpkin Soup', category: 'Soup', rate: 28, aliases: ["cream of pumpkin soup","creamy pumpkin soup","क्रीम ऑफ पम्पकिन सूप","ક્રીમ ઑફ પમ્પકિન સૂપ"] },
{ name: 'Cream of Asparagus Soup', category: 'Soup', rate: 35, aliases: ["cream of asparagus soup","asparagus soup","क्रीम ऑफ एस्पैरागस सूप","ક્રીમ ઑફ એસ્પૈરાગસ સૂપ"] },
{ name: 'Cream of Celery Soup', category: 'Soup', rate: 32, aliases: ["cream of celery soup","celery soup","क्रीम ऑफ सेलरी सूप","ક્રીમ ઑફ સેલરી સૂપ"] },
{ name: 'Cream of Cauliflower Soup', category: 'Soup', rate: 29, aliases: ["cream of cauliflower soup","creamy cauliflower soup","क्रीम ऑफ कॉलीफ्लावर सूप","ક્રીમ ઑફ કૉલીફ્લાવર સૂપ"] },

{ name: 'Broccoli Almond Soup', category: 'Soup', rate: 36, aliases: ["broccoli almond soup","broccoli badam soup","ब्रोकली आलमंड सूप","બ્રોકલી આલમંડ સૂપ"] },
{ name: 'Broccoli Cheese Soup', category: 'Soup', rate: 38, aliases: ["broccoli cheese soup","cheesy broccoli soup","ब्रोकली चीज़ सूप","બ્રોકલી ચીઝ સૂપ"] },
{ name: 'Spinach Almond Soup', category: 'Soup', rate: 34, aliases: ["spinach almond soup","palak badam soup","स्पिनच आलमंड सूप","સ્પિનચ આલમંડ સૂપ"] },
{ name: 'Carrot Almond Soup', category: 'Soup', rate: 32, aliases: ["carrot almond soup","carrot badam soup","कैरट आलमंड सूप","કૈરટ આલમંડ સૂપ"] },
{ name: 'Pumpkin Almond Soup', category: 'Soup', rate: 34, aliases: ["pumpkin almond soup","pumpkin badam soup","पम्पकिन आलमंड सूप","પમ્પકિન આલમંડ સૂપ"] },
{ name: 'Mushroom Almond Soup', category: 'Soup', rate: 36, aliases: ["mushroom almond soup","mushroom badam soup","मशरूम आलमंड सूप","મશરૂમ આલમંડ સૂપ"] },
{ name: 'Almond Soup', category: 'Soup', rate: 38, aliases: ["almond soup","badam soup","आलमंड सूप","આલમંડ સૂપ"] },

{ name: 'Minestrone Soup', category: 'Soup', rate: 30, aliases: ["minestrone soup","vegetable minestrone soup","मिनेस्ट्रोन सूप","મિનેસ્ટ્રોન સૂપ"] },
{ name: 'Italian Vegetable Soup', category: 'Soup', rate: 29, aliases: ["italian vegetable soup","italian veg soup","इटालियन वेजिटेबल सूप","ઇટાલિયન વેજિટેબલ સૂપ"] },
{ name: 'Pasta Vegetable Soup', category: 'Soup', rate: 30, aliases: ["pasta vegetable soup","vegetable pasta soup","पास्ता वेजिटेबल सूप","પાસ્તા વેજિટેબલ સૂપ"] },
{ name: 'Mediterranean Vegetable Soup', category: 'Soup', rate: 32, aliases: ["mediterranean vegetable soup","mediterranean veg soup","मेडिटरेनियन वेजिटेबल सूप","મેડિટરેનિયન વેજિટેબલ સૂપ"] },
{ name: 'Mexican Bean Soup', category: 'Soup', rate: 32, aliases: ["mexican bean soup","mexican beans soup","मेक्सिकन बीन सूप","મેક્સિકન બીન સૂપ"] },
{ name: 'Mexican Tortilla Soup', category: 'Soup', rate: 34, aliases: ["mexican tortilla soup","veg tortilla soup","मेक्सिकन टॉर्टिला सूप","મેક્સિકન ટૉર્ટિલા સૂપ"] },
{ name: 'Mexican Corn Soup', category: 'Soup', rate: 31, aliases: ["mexican corn soup","मेक्सिकन कॉर्न सूप","મેક્સિકન કોર્ન સૂપ"] },
{ name: 'Tuscan Vegetable Soup', category: 'Soup', rate: 34, aliases: ["tuscan vegetable soup","tuscan veg soup","टस्कन वेजिटेबल सूप","ટસ્કન વેજિટેબલ સૂપ"] },
{ name: 'French Onion Soup', category: 'Soup', rate: 32, aliases: ["french onion soup","फ्रेंच अनियन सूप","ફ્રેંચ ડુંગળી સૂપ"] },
{ name: 'Potato Leek Soup', category: 'Soup', rate: 32, aliases: ["potato leek soup","leek potato soup","पोटैटो लीक सूप","બટાકા લીક સૂપ"] },

{ name: 'Thai Coconut Soup', category: 'Soup', rate: 36, aliases: ["thai coconut soup","coconut thai soup","थाई कोकोनट सूप","થાઈ કોકોનટ સૂપ"] },
{ name: 'Thai Vegetable Soup', category: 'Soup', rate: 34, aliases: ["thai vegetable soup","thai veg soup","थाई वेजिटेबल सूप","થાઈ વેજિટેબલ સૂપ"] },
{ name: 'Tom Yum Soup', category: 'Soup', rate: 35, aliases: ["tom yum soup","veg tom yum soup","टॉम यम सूप","ટૉમ યમ સૂપ"] },
{ name: 'Tom Kha Soup', category: 'Soup', rate: 38, aliases: ["tom kha soup","veg tom kha soup","टॉम खा सूप","ટૉમ ખા સૂપ"] },
{ name: 'Thai Lemongrass Soup', category: 'Soup', rate: 35, aliases: ["thai lemongrass soup","lemongrass soup","थाई लेमनग्रास सूप","થાઈ લેમનગ્રાસ સૂપ"] },
{ name: 'Thai Ginger Soup', category: 'Soup', rate: 35, aliases: ["thai ginger soup","थाई जिंजर सूप","થાઈ આદુ સૂપ"] },

{ name: 'Mulligatawny Soup', category: 'Soup', rate: 30, aliases: ["mulligatawny soup","mulligatawny shorba","मलिगटॉनी सूप","મલિગટૉની સૂપ"] },
{ name: 'Dal Shorba', category: 'Soup', rate: 24, aliases: ["dal shorba","daal shorba","दाल शोरबा","દાળ શોરબા"] },
{ name: 'Moong Dal Shorba', category: 'Soup', rate: 25, aliases: ["moong dal shorba","moong daal shorba","मूंग दाल शोरबा","મૂંગ દાળ શોરબા"] },
{ name: 'Masoor Dal Shorba', category: 'Soup', rate: 25, aliases: ["masoor dal shorba","masoor daal shorba","मसूर दाल शोरबा","મસૂર દાળ શોરબા"] },
{ name: 'Palak Shorba', category: 'Soup', rate: 26, aliases: ["palak shorba","spinach shorba","पालक शोरबा","પાલક શોરબા"] },
{ name: 'Tamatar Shorba', category: 'Soup', rate: 24, aliases: ["tamatar shorba","tomato shorba","टमाटर शोरबा","ટમેટા શોરબા"] },
{ name: 'Makki Shorba', category: 'Soup', rate: 26, aliases: ["makki shorba","corn shorba","मक्की शोरबा","મક્કી શોરબા"] },
{ name: 'Subz Shorba', category: 'Soup', rate: 26, aliases: ["subz shorba","sabz shorba","vegetable shorba","सब्ज़ शोरबा","સબ્જ઼ શોરબા"] },
{ name: 'Badam Shorba', category: 'Soup', rate: 36, aliases: ["badam shorba","almond shorba","बादाम शोरबा","બદામ શોરબા"] },
{ name: 'Mushroom Shorba', category: 'Soup', rate: 30, aliases: ["mushroom shorba","मशरूम शोरबा","મશરૂમ શોરબા"] },
{ name: 'Broccoli Shorba', category: 'Soup', rate: 32, aliases: ["broccoli shorba","ब्रोकली शोरबा","બ્રોકલી શોરબા"] },
{ name: 'Corn Palak Shorba', category: 'Soup', rate: 29, aliases: ["corn palak shorba","spinach corn shorba","कॉर्न पालक शोरबा","કોર્ન પાલક શોરબા"] },
{ name: 'Lauki Shorba', category: 'Soup', rate: 24, aliases: ["lauki shorba","bottle gourd soup","लौकी शोरबा","લૌકી શોરબા"] },

{ name: 'Carrot Ginger Soup', category: 'Soup', rate: 28, aliases: ["carrot ginger soup","carrot adrak soup","कैरट जिंजर सूप","કૈરટ આદુ સૂપ"] },
{ name: 'Pumpkin Ginger Soup', category: 'Soup', rate: 29, aliases: ["pumpkin ginger soup","पम्पकिन जिंजर सूप","પમ્પકિન આદુ સૂપ"] },
{ name: 'Beetroot Soup', category: 'Soup', rate: 27, aliases: ["beetroot soup","beet soup","बीटरूट सूप","બીટરૂટ સૂપ"] },
{ name: 'Carrot Beetroot Soup', category: 'Soup', rate: 28, aliases: ["carrot beetroot soup","carrot beet soup","कैरट बीटरूट सूप","કૈરટ બીટરૂટ સૂપ"] },
{ name: 'Spinach Corn Soup', category: 'Soup', rate: 28, aliases: ["spinach corn soup","palak corn soup","स्पिनच कॉर्न सूप","સ્પિનચ કોર્ન સૂપ"] },
{ name: 'Broccoli Corn Soup', category: 'Soup', rate: 30, aliases: ["broccoli corn soup","ब्रोकली कॉर्न सूप","બ્રોકલી કોર્ન સૂપ"] },
{ name: 'Mushroom Corn Soup', category: 'Soup', rate: 30, aliases: ["mushroom corn soup","मशरूम कॉर्न सूप","મશરૂમ કોર્ન સૂપ"] },
{ name: 'Mixed Vegetable Soup', category: 'Soup', rate: 25, aliases: ["mixed vegetable soup","mix vegetable soup","mixed veg soup","मिक्स्ड वेजिटेबल सूप","મિક્સ્ડ વેજિટેબલ સૂપ"] },
{ name: 'Garden Fresh Vegetable Soup', category: 'Soup', rate: 26, aliases: ["garden fresh vegetable soup","garden vegetable soup","गार्डन फ्रेश वेजिटेबल सूप","ગાર્ડન ફ્રેશ વેજિટેબલ સૂપ"] },
{ name: 'Cabbage Soup', category: 'Soup', rate: 24, aliases: ["cabbage soup","patta gobhi soup","कैबेज सूप","કૈબેજ સૂપ"] },
{ name: 'Bottle Gourd Soup', category: 'Soup', rate: 24, aliases: ["bottle gourd soup","lauki soup","बॉटल गॉर्ड सूप","બૉટલ ગૉર્ડ સૂપ"] },
{ name: 'Zucchini Soup', category: 'Soup', rate: 30, aliases: ["zucchini soup","ज़ुकीनी सूप","જ઼ુકીની સૂપ"] },
{ name: 'Green Peas Mint Soup', category: 'Soup', rate: 28, aliases: ["green peas mint soup","peas mint soup","ग्रीन पीज़ मिंट सूप","ગ્રીન પીજ઼ મિંટ સૂપ"] },
{ name: 'Corn Capsicum Soup', category: 'Soup', rate: 28, aliases: ["corn capsicum soup","कॉर्न कैप्सिकम सूप","કોર્ન કૈપ્સિકમ સૂપ"] },

{ name: 'Cheese Corn Soup', category: 'Soup', rate: 32, aliases: ["cheese corn soup","cheesy corn soup","चीज़ कॉर्न सूप","ચીઝ કોર્ન સૂપ"] },
{ name: 'Paneer Corn Soup', category: 'Soup', rate: 31, aliases: ["paneer corn soup","पनीर कॉर्न सूप","પનીર કોર્ન સૂપ"] },
{ name: 'Paneer Clear Soup', category: 'Soup', rate: 30, aliases: ["paneer clear soup","पनीर क्लियर सूप","પનીર ક્લિયર સૂપ"] },
{ name: 'Tofu Vegetable Soup', category: 'Soup', rate: 32, aliases: ["tofu vegetable soup","tofu veg soup","टोफू वेजिटेबल सूप","ટોફૂ વેજિટેબલ સૂપ"] },
{ name: 'Tofu Clear Soup', category: 'Soup', rate: 31, aliases: ["tofu clear soup","टोफू क्लियर सूप","ટોફૂ ક્લિયર સૂપ"] },

{ name: 'Quinoa Vegetable Soup', category: 'Soup', rate: 36, aliases: ["quinoa vegetable soup","quinoa veg soup","क्विनोआ वेजिटेबल सूप","ક્વિનોઆ વેજિટેબલ સૂપ"] },
{ name: 'Oats Vegetable Soup', category: 'Soup', rate: 30, aliases: ["oats vegetable soup","oats veg soup","ओट्स वेजिटेबल सूप","ઓટ્સ વેજિટેબલ સૂપ"] },
{ name: 'Barley Vegetable Soup', category: 'Soup', rate: 31, aliases: ["barley vegetable soup","jau vegetable soup","बार्ली वेजिटेबल सूप","બાર્લી વેજિટેબલ સૂપ"] },
{ name: 'Lentil Vegetable Soup', category: 'Soup', rate: 30, aliases: ["lentil vegetable soup","lentil veg soup","लेंटिल वेजिटेबल सूप","લેંટિલ વેજિટેબલ સૂપ"] },
{ name: 'Healthy Green Soup', category: 'Soup', rate: 32, aliases: ["healthy green soup","green detox soup","हेल्दी ग्रीन सूप","હેલ્દી ગ્રીન સૂપ"] },
{ name: 'Detox Vegetable Soup', category: 'Soup', rate: 32, aliases: ["detox vegetable soup","vegetable detox soup","डीटॉक्स वेजिटेबल सूप","ડીટૉક્સ વેજિટેબલ સૂપ"] },
{ name: 'Seven Vegetable Soup', category: 'Soup', rate: 30, aliases: ["seven vegetable soup","7 vegetable soup","सेवन वेजिटेबल सूप","સેવન વેજિટેબલ સૂપ"] },

{ name: 'Sweet Corn Almond Soup', category: 'Soup', rate: 36, aliases: ["sweet corn almond soup","corn badam soup","स्वीट कॉर्न आलमंड सूप","સ્વીટ કોર્ન આલમંડ સૂપ"] },
{ name: 'Broccoli Walnut Soup', category: 'Soup', rate: 38, aliases: ["broccoli walnut soup","broccoli akhrot soup","ब्रोकली वॉलनट सूप","બ્રોકલી વૉલનટ સૂપ"] },
{ name: 'Mushroom Truffle Soup', category: 'Soup', rate: 45, aliases: ["mushroom truffle soup","truffle mushroom soup","मशरूम ट्रफल सूप","મશરૂમ ટ્રફલ સૂપ"] },
{ name: 'Roasted Bell Pepper Soup', category: 'Soup', rate: 34, aliases: ["roasted bell pepper soup","roasted capsicum soup","रोस्टेड बेल पेपर सूप","રોસ્ટેડ બેલ પેપર સૂપ"] },
{ name: 'Roasted Pumpkin Soup', category: 'Soup', rate: 32, aliases: ["roasted pumpkin soup","roast pumpkin soup","रोस्टेड पम्पकिन सूप","રોસ્ટેડ પમ્પકિન સૂપ"] },
{ name: 'Roasted Garlic Soup', category: 'Soup', rate: 32, aliases: ["roasted garlic soup","roast garlic soup","रोस्टेड गार्लिक सूप","રોસ્ટેડ લસણ સૂપ"] },
{ name: 'Roasted Vegetable Soup', category: 'Soup', rate: 32, aliases: ["roasted vegetable soup","roast vegetable soup","रोस्टेड वेजिटेबल सूप","રોસ્ટેડ વેજિટેબલ સૂપ"] },
// Starter — Paneer

{ name: 'Paneer Tikka', category: 'Starter', rate: 58, aliases: ["paneer tikka","classic paneer tikka","पनीर टिक्का","પનીર ટિક્કા"] },
{ name: 'Malai Paneer Tikka', category: 'Starter', rate: 62, aliases: ["malai paneer tikka","paneer malai tikka","मलाई पनीर टिक्का","મલાઈ પનીર ટિક્કા"] },
{ name: 'Achari Paneer Tikka', category: 'Starter', rate: 62, aliases: ["achari paneer tikka","achar paneer tikka","अचारी पनीर टिक्का","અચારી પનીર ટિક્કા"] },
{ name: 'Hariyali Paneer Tikka', category: 'Starter', rate: 62, aliases: ["hariyali paneer tikka","green paneer tikka","हरियाली पनीर टिक्का","હરિયાળી પનીર ટિક્કા"] },
{ name: 'Lasooni Paneer Tikka', category: 'Starter', rate: 64, aliases: ["lasooni paneer tikka","lahsuni paneer tikka","garlic paneer tikka","लसूनी पनीर टिक्का","લસૂની પનીર ટિક્કા"] },
{ name: 'Afghani Paneer Tikka', category: 'Starter', rate: 66, aliases: ["afghani paneer tikka","paneer afghani tikka","अफगानी पनीर टिक्का","અફગાની પનીર ટિક્કા"] },
{ name: 'Pahadi Paneer Tikka', category: 'Starter', rate: 64, aliases: ["pahadi paneer tikka","pahaadi paneer tikka","पहाड़ी पनीर टिक्का","પહાડ઼ી પનીર ટિક્કા"] },
{ name: 'Tandoori Paneer Tikka', category: 'Starter', rate: 62, aliases: ["tandoori paneer tikka","tandoor paneer tikka","तंदूरी पनीर टिक्का","તંદૂરી પનીર ટિક્કા"] },
{ name: 'Kali Mirch Paneer Tikka', category: 'Starter', rate: 64, aliases: ["kali mirch paneer tikka","pepper paneer tikka","काली मिर्च पनीर टिक्का","કાલી મરચું પનીર ટિક્કા"] },
{ name: 'Peri Peri Paneer Tikka', category: 'Starter', rate: 66, aliases: ["peri peri paneer tikka","peri-peri paneer tikka","पेरी पेरी पनीर टिक्का","પેરી પેરી પનીર ટિક્કા"] },
{ name: 'Cheese Paneer Tikka', category: 'Starter', rate: 70, aliases: ["cheese paneer tikka","cheesy paneer tikka","चीज़ पनीर टिक्का","ચીઝ પનીર ટિક્કા"] },
{ name: 'Stuffed Paneer Tikka', category: 'Starter', rate: 72, aliases: ["stuffed paneer tikka","bharwa paneer tikka","स्टफ्ड पनीर टिक्का","સ્ટફ્ડ પનીર ટિક્કા"] },
{ name: 'Paneer Shashlik', category: 'Starter', rate: 64, aliases: ["paneer shashlik","paneer shaslik","पनीर शाशलिक","પનીર શાશલિક"] },
{ name: 'Paneer Seekh Kebab', category: 'Starter', rate: 65, aliases: ["paneer seekh kebab","paneer seekh kabab","पनीर सीख कबाब","પનીર સીખ કબાબ"] },
{ name: 'Paneer Malai Seekh', category: 'Starter', rate: 68, aliases: ["paneer malai seekh","malai paneer seekh","पनीर मलाई सीख","પનીર મલાઈ સીખ"] },
{ name: 'Paneer Angara', category: 'Starter', rate: 66, aliases: ["paneer angara","angara paneer starter","पनीर अंगारा","પનીર અંગારા"] },
{ name: 'Paneer Hariyali', category: 'Starter', rate: 64, aliases: ["paneer hariyali","paneer hariyali starter","hariyali paneer starter","पनीर हरियाली","પનીર હરિયાળી"] },
{ name: 'Paneer 65', category: 'Starter', rate: 62, aliases: ["paneer 65","paneer sixty five","पनीर 65","પનીર 65"] },
{ name: 'Paneer Pakoda', category: 'Starter', rate: 55, aliases: ["paneer pakoda","paneer pakora","पनीर पकौड़ा","પનીર પકોડા"] },
{ name: 'Paneer Fingers', category: 'Starter', rate: 60, aliases: ["paneer fingers","crispy paneer fingers","पनीर फिंगर्स","પનીર ફિંગર્સ"] },
{ name: 'Paneer Cheese Balls', category: 'Starter', rate: 65, aliases: ["paneer cheese balls","cheese paneer balls","पनीर चीज़ बॉल्स","પનીર ચીઝ બૉલ્સ"] },
{ name: 'Paneer Corn Balls', category: 'Starter', rate: 62, aliases: ["paneer corn balls","corn paneer balls","पनीर कॉर्न बॉल्स","પનીર કોર્ન બૉલ્સ"] },
{ name: 'Paneer Kurkure', category: 'Starter', rate: 64, aliases: ["paneer kurkure","crispy paneer kurkure","पनीर कुरकुरे","પનીર કુરકુરે"] },

// Starter — Kebab and Tandoori

{ name: 'Hara Bhara Kebab', category: 'Starter', rate: 55, aliases: ["hara bhara kebab","hara bhara kabab","हरा भरा कबाब","હરા ભરા કબાબ"] },
{ name: 'Veg Seekh Kebab', category: 'Starter', rate: 54, aliases: ["veg seekh kebab","vegetable seekh kabab","वेज सीख कबाब","વેજ સીખ કબાબ"] },
{ name: 'Subz Seekh Kebab', category: 'Starter', rate: 56, aliases: ["subz seekh kebab","sabz seekh kabab","सब्ज़ सीख कबाब","સબ્જ઼ સીખ કબાબ"] },
{ name: 'Dahi Ke Kebab', category: 'Starter', rate: 60, aliases: ["dahi ke kebab","dahi kebab","dahi kabab","दही के कबाब","દહીં કે કબાબ"] },
{ name: 'Dahi Sholay', category: 'Starter', rate: 62, aliases: ["dahi sholay","dahi ke sholay","दही शोले","દહીં શોલે"] },
{ name: 'Corn Seekh Kebab', category: 'Starter', rate: 58, aliases: ["corn seekh kebab","sweet corn seekh kabab","कॉर्न सीख कबाब","કોર્ન સીખ કબાબ"] },
{ name: 'Mushroom Seekh Kebab', category: 'Starter', rate: 62, aliases: ["mushroom seekh kebab","mushroom seekh kabab","मशरूम सीख कबाब","મશરૂમ સીખ કબાબ"] },
{ name: 'Beetroot Kebab', category: 'Starter', rate: 56, aliases: ["beetroot kebab","beetroot kabab","beet kebab","बीटरूट कबाब","બીટરૂટ કબાબ"] },
{ name: 'Rajma Kebab', category: 'Starter', rate: 54, aliases: ["rajma kebab","rajma kabab","राजमा कबाब","રાજમા કબાબ"] },
{ name: 'Chana Dal Kebab', category: 'Starter', rate: 52, aliases: ["chana dal kebab","chana daal kabab","चना दाल कबाब","ચણા દાળ કબાબ"] },
{ name: 'Moong Dal Kebab', category: 'Starter', rate: 54, aliases: ["moong dal kebab","moong daal kabab","मूंग दाल कबाब","મૂંગ દાળ કબાબ"] },
{ name: 'Soya Seekh Kebab', category: 'Starter', rate: 55, aliases: ["soya seekh kebab","soy seekh kabab","सोया सीख कबाब","સોયા સીખ કબાબ"] },
{ name: 'Soya Chaap Tikka', category: 'Starter', rate: 58, aliases: ["soya chaap tikka","soy chaap tikka","सोया चाप टिक्का","સોયા ચાપ ટિક્કા"] },
{ name: 'Malai Soya Chaap', category: 'Starter', rate: 62, aliases: ["malai soya chaap","soya malai chaap","मलाई सोया चाप","મલાઈ સોયા ચાપ"] },
{ name: 'Achari Soya Chaap', category: 'Starter', rate: 60, aliases: ["achari soya chaap","achar soya chaap","अचारी सोया चाप","અચારી સોયા ચાપ"] },
{ name: 'Afghani Soya Chaap', category: 'Starter', rate: 64, aliases: ["afghani soya chaap","soya afghani chaap","अफगानी सोया चाप","અફગાની સોયા ચાપ"] },
{ name: 'Tandoori Soya Chaap', category: 'Starter', rate: 60, aliases: ["tandoori soya chaap","tandoor soya chaap","तंदूरी सोया चाप","તંદૂરી સોયા ચાપ"] },
{ name: 'Tandoori Mushroom', category: 'Starter', rate: 62, aliases: ["tandoori mushroom","tandoor mushroom","तंदूरी मशरूम","તંદૂરી મશરૂમ"] },
{ name: 'Stuffed Tandoori Mushroom', category: 'Starter', rate: 68, aliases: ["stuffed tandoori mushroom","bharwa tandoori mushroom","स्टफ्ड तंदूरी मशरूम","સ્ટફ્ડ તંદૂરી મશરૂમ"] },
{ name: 'Tandoori Aloo', category: 'Starter', rate: 52, aliases: ["tandoori aloo","tandoor potato","तंदूरी आलू","તંદૂરી આલૂ"] },
{ name: 'Bharwa Tandoori Aloo', category: 'Starter', rate: 58, aliases: ["bharwa tandoori aloo","stuffed tandoori aloo","भरवां तंदूरी आलू","ભરવા તંદૂરી આલૂ"] },
{ name: 'Tandoori Broccoli', category: 'Starter', rate: 68, aliases: ["tandoori broccoli","tandoor broccoli","तंदूरी ब्रोकली","તંદૂરી બ્રોકલી"] },
{ name: 'Malai Broccoli', category: 'Starter', rate: 72, aliases: ["malai broccoli","broccoli malai tikka","मलाई ब्रोकली","મલાઈ બ્રોકલી"] },
{ name: 'Tandoori Gobhi', category: 'Starter', rate: 55, aliases: ["tandoori gobhi","tandoori cauliflower","तंदूरी गोभी","તંદૂરી ગોબી"] },
{ name: 'Veg Galouti Kebab', category: 'Starter', rate: 62, aliases: ["veg galouti kebab","vegetable galouti kabab","वेज गलौटी कबाब","વેજ ગલૌટી કબાબ"] },
{ name: 'Kathal Galouti Kebab', category: 'Starter', rate: 65, aliases: ["kathal galouti kebab","jackfruit galouti kebab","कटहल गलौटी कबाब","કટહલ ગલૌટી કબાબ"] },

// Starter — Chinese and Indo-Chinese

{ name: 'Spring Roll', category: 'Starter', rate: 52, aliases: ["spring roll","veg spring roll","vegetable spring roll","स्प्रिंग रोल","સ્પ્રિંગ રોલ"] },
{ name: 'Cheese Spring Roll', category: 'Starter', rate: 58, aliases: ["cheese spring roll","cheesy spring roll","चीज़ स्प्रिंग रोल","ચીઝ સ્પ્રિંગ રોલ"] },
{ name: 'Paneer Spring Roll', category: 'Starter', rate: 60, aliases: ["paneer spring roll","पनीर स्प्रिंग रोल","પનીર સ્પ્રિંગ રોલ"] },
{ name: 'Schezwan Spring Roll', category: 'Starter', rate: 56, aliases: ["schezwan spring roll","szechuan spring roll","शेज़वान स्प्रिंग रोल","શેજ઼વાન સ્પ્રિંગ રોલ"] },
{ name: 'Paneer Chilli', category: 'Starter', rate: 60, aliases: ["paneer chilli","paneer chili","chilli paneer","पनीर चिली","પનીર ચિલી"] },
{ name: 'Dry Paneer Manchurian', category: 'Starter', rate: 62, aliases: ["dry paneer manchurian","paneer manchurian dry","ड्राई पनीर मंचूरियन","ડ્રાઈ પનીર મંચૂરિયન"] },
{ name: 'Crispy Paneer', category: 'Starter', rate: 62, aliases: ["crispy paneer","crispy fried paneer","क्रिस्पी पनीर","ક્રિસ્પી પનીર"] },
{ name: 'Honey Chilli Paneer', category: 'Starter', rate: 65, aliases: ["honey chilli paneer","honey chili paneer","हनी चिली पनीर","હની ચિલી પનીર"] },
{ name: 'Schezwan Paneer', category: 'Starter', rate: 64, aliases: ["schezwan paneer","schezwan paneer dry","szechuan paneer dry","शेज़वान पनीर","શેજ઼વાન પનીર"] },
{ name: 'Dragon Paneer', category: 'Starter', rate: 66, aliases: ["dragon paneer","paneer dragon","ड्रैगन पनीर","ડ્રૈગન પનીર"] },
{ name: 'Kung Pao Paneer', category: 'Starter', rate: 68, aliases: ["kung pao paneer","kungpao paneer","कुंग पाओ पनीर","કુંગ પાઓ પનીર"] },
{ name: 'Paneer Salt and Pepper', category: 'Starter', rate: 64, aliases: ["paneer salt and pepper","salt pepper paneer","पनीर सॉल्ट एंड पेपर","પનીર સૉલ્ટ એંડ પેપર"] },
{ name: 'Veg Manchurian Dry', category: 'Starter', rate: 52, aliases: ["veg manchurian dry","dry veg manchurian","वेज मंचूरियन ड्राई","વેજ મંચૂરિયન ડ્રાઈ"] },
{ name: 'Veg Crispy', category: 'Starter', rate: 54, aliases: ["veg crispy","crispy vegetables","वेज क्रिस्पी","વેજ ક્રિસ્પી"] },
{ name: 'Veg 65', category: 'Starter', rate: 52, aliases: ["veg 65","vegetable 65","वेज 65","વેજ 65"] },
{ name: 'Crispy Corn', category: 'Starter', rate: 54, aliases: ["crispy corn","crispy sweet corn","क्रिस्पी कॉर्न","ક્રિસ્પી કોર્ન"] },
{ name: 'Corn Chilli', category: 'Starter', rate: 54, aliases: ["corn chilli","chilli corn","chili corn","कॉर्न चिली","કોર્ન ચિલી"] },
{ name: 'Corn Salt and Pepper', category: 'Starter', rate: 56, aliases: ["corn salt and pepper","salt pepper corn","कॉर्न सॉल्ट एंड पेपर","કોર્ન સૉલ્ટ એંડ પેપર"] },
{ name: 'Baby Corn Chilli', category: 'Starter', rate: 56, aliases: ["baby corn chilli","baby corn chili","बेबी कॉर्न चिली","બેબી કોર્ન ચિલી"] },
{ name: 'Baby Corn Manchurian', category: 'Starter', rate: 56, aliases: ["baby corn manchurian","babycorn manchurian","बेबी कॉर्न मंचूरियन","બેબી કોર્ન મંચૂરિયન"] },
{ name: 'Crispy Baby Corn', category: 'Starter', rate: 58, aliases: ["crispy baby corn","baby corn crispy","क्रिस्पी बेबी कॉर्न","ક્રિસ્પી બેબી કોર્ન"] },
{ name: 'Honey Chilli Potato', category: 'Starter', rate: 50, aliases: ["honey chilli potato","honey chili potato","हनी चिली पोटैटो","હની ચિલી બટાકા"] },
{ name: 'Chilli Potato', category: 'Starter', rate: 48, aliases: ["chilli potato","chili potato","चिली पोटैटो","ચિલી બટાકા"] },
{ name: 'Schezwan Potato', category: 'Starter', rate: 50, aliases: ["schezwan potato","szechuan potato","शेज़वान पोटैटो","શેજ઼વાન બટાકા"] },
{ name: 'Mushroom Chilli', category: 'Starter', rate: 60, aliases: ["mushroom chilli","mushroom chili","मशरूम चिली","મશરૂમ ચિલી"] },
{ name: 'Mushroom Manchurian', category: 'Starter', rate: 60, aliases: ["mushroom manchurian","dry mushroom manchurian","मशरूम मंचूरियन","મશરૂમ મંચૂરિયન"] },
{ name: 'Crispy Mushroom', category: 'Starter', rate: 62, aliases: ["crispy mushroom","crispy fried mushroom","क्रिस्पी मशरूम","ક્રિસ્પી મશરૂમ"] },
{ name: 'Mushroom Salt and Pepper', category: 'Starter', rate: 62, aliases: ["mushroom salt and pepper","salt pepper mushroom","मशरूम सॉल्ट एंड पेपर","મશરૂમ સૉલ્ટ એંડ પેપર"] },
{ name: 'Gobhi Manchurian Dry', category: 'Starter', rate: 52, aliases: ["gobhi manchurian dry","cauliflower manchurian dry","गोभी मंचूरियन ड्राई","ગોબી મંચૂરિયન ડ્રાઈ"] },
{ name: 'Crispy Gobhi', category: 'Starter', rate: 52, aliases: ["crispy gobhi","crispy cauliflower","क्रिस्पी गोभी","ક્રિસ્પી ગોબી"] },
{ name: 'Chilli Garlic Gobhi', category: 'Starter', rate: 54, aliases: ["chilli garlic gobhi","chili garlic cauliflower","चिली गार्लिक गोभी","ચિલી લસણ ગોબી"] },
{ name: 'Chinese Bhel', category: 'Starter', rate: 48, aliases: ["chinese bhel","crispy chinese bhel","चाइनीज़ भेल","ચાઇનીજ઼ ભેલ"] },
{ name: 'Veg Momos', category: 'Starter', rate: 52, aliases: ["veg momos","vegetable momos","वेज मोमोज़","વેજ મોમોજ઼"] },
{ name: 'Fried Veg Momos', category: 'Starter', rate: 55, aliases: ["fried veg momos","fried vegetable momos","फ्राइड वेज मोमोज़","ફ્રાઇડ વેજ મોમોજ઼"] },
{ name: 'Tandoori Veg Momos', category: 'Starter', rate: 60, aliases: ["tandoori veg momos","tandoor vegetable momos","तंदूरी वेज मोमोज़","તંદૂરી વેજ મોમોજ઼"] },
{ name: 'Paneer Momos', category: 'Starter', rate: 58, aliases: ["paneer momos","पनीर मोमोज़","પનીર મોમોજ઼"] },
{ name: 'Fried Paneer Momos', category: 'Starter', rate: 62, aliases: ["fried paneer momos","फ्राइड पनीर मोमोज़","ફ્રાઇડ પનીર મોમોજ઼"] },

// Starter — Fried and Indian

{ name: 'Veg Cutlet', category: 'Starter', rate: 42, aliases: ["veg cutlet","vegetable cutlet","वेज कटलेट","વેજ કટલેટ"] },
{ name: 'Cheese Cutlet', category: 'Starter', rate: 52, aliases: ["cheese cutlet","cheesy cutlet","चीज़ कटलेट","ચીઝ કટલેટ"] },
{ name: 'Corn Cutlet', category: 'Starter', rate: 48, aliases: ["corn cutlet","sweet corn cutlet","कॉर्न कटलेट","કોર્ન કટલેટ"] },
{ name: 'Beetroot Cutlet', category: 'Starter', rate: 48, aliases: ["beetroot cutlet","beet cutlet","बीटरूट कटलेट","બીટરૂટ કટલેટ"] },
{ name: 'Veg Croquette', category: 'Starter', rate: 52, aliases: ["veg croquette","vegetable croquette","वेज क्रोकेट","વેજ ક્રોકેટ"] },
{ name: 'Cheese Corn Croquette', category: 'Starter', rate: 58, aliases: ["cheese corn croquette","corn cheese croquette","चीज़ कॉर्न क्रोकेट","ચીઝ કોર્ન ક્રોકેટ"] },
{ name: 'Veg Lollipop', category: 'Starter', rate: 52, aliases: ["veg lollipop","vegetable lollipop","वेज लॉलीपॉप","વેજ લૉલીપૉપ"] },
{ name: 'Paneer Lollipop', category: 'Starter', rate: 60, aliases: ["paneer lollipop","पनीर लॉलीपॉप","પનીર લૉલીપૉપ"] },
{ name: 'Corn Cheese Balls', category: 'Starter', rate: 58, aliases: ["corn cheese balls","cheese corn balls","कॉर्न चीज़ बॉल्स","કોર્ન ચીઝ બૉલ્સ"] },
{ name: 'Veg Cheese Balls', category: 'Starter', rate: 58, aliases: ["veg cheese balls","vegetable cheese balls","वेज चीज़ बॉल्स","વેજ ચીઝ બૉલ્સ"] },
{ name: 'Potato Cheese Balls', category: 'Starter', rate: 55, aliases: ["potato cheese balls","aloo cheese balls","पोटैटो चीज़ बॉल्स","બટાકા ચીઝ બૉલ્સ"] },
{ name: 'Spinach Cheese Balls', category: 'Starter', rate: 58, aliases: ["spinach cheese balls","palak cheese balls","स्पिनच चीज़ बॉल्स","સ્પિનચ ચીઝ બૉલ્સ"] },
{ name: 'Stuffed Mushroom', category: 'Starter', rate: 65, aliases: ["stuffed mushroom","bharwa mushroom","स्टफ्ड मशरूम","સ્ટફ્ડ મશરૂમ"] },
{ name: 'Mushroom Duplex', category: 'Starter', rate: 66, aliases: ["mushroom duplex","duplex mushroom","मशरूम डुप्लेक्स","મશરૂમ ડુપ્લેક્સ"] },
{ name: 'Mushroom Cheese Balls', category: 'Starter', rate: 64, aliases: ["mushroom cheese balls","cheese mushroom balls","मशरूम चीज़ बॉल्स","મશરૂમ ચીઝ બૉલ્સ"] },
{ name: 'Aloo Nazakat', category: 'Starter', rate: 56, aliases: ["aloo nazakat","potato nazakat","आलू नज़ाकत","આલૂ નજ઼ાકત"] },
{ name: 'Aloo 65', category: 'Starter', rate: 48, aliases: ["aloo 65","potato 65","आलू 65","આલૂ 65"] },
{ name: 'Sabudana Vada', category: 'Starter', rate: 44, aliases: ["sabudana vada","sago vada","साबूदाना वड़ा","સાબૂદાના વડા"] },
{ name: 'Batata Vada', category: 'Starter', rate: 42, aliases: ["batata vada","aloo vada","बटाटा वड़ा","બટાટા વડા"] },
{ name: 'Bread Roll', category: 'Starter', rate: 44, aliases: ["bread roll","potato bread roll","ब्रेड रोल","બ્રેડ રોલ"] },
{ name: 'Cheese Bread Roll', category: 'Starter', rate: 52, aliases: ["cheese bread roll","cheesy bread roll","चीज़ ब्रेड रोल","ચીઝ બ્રેડ રોલ"] },
{ name: 'Veg Samosa', category: 'Starter', rate: 42, aliases: ["veg samosa","vegetable samosa","वेज समोसा","વેજ સમોસા"] },
{ name: 'Mini Samosa', category: 'Starter', rate: 36, aliases: ["mini samosa","cocktail samosa","मिनी समोसा","મિની સમોસા"] },
{ name: 'Punjabi Samosa', category: 'Starter', rate: 44, aliases: ["punjabi samosa","large samosa","पंजाबी समोसा","પંજાબી સમોસા"] },
{ name: 'Onion Pakoda', category: 'Starter', rate: 38, aliases: ["onion pakoda","onion pakora","pyaz pakoda","अनियन पकौड़ा","ડુંગળી પકોડા"] },
{ name: 'Mix Veg Pakoda', category: 'Starter', rate: 42, aliases: ["mix veg pakoda","mixed vegetable pakora","मिक्स वेज पकौड़ा","મિક્સ વેજ પકોડા"] },
{ name: 'Palak Pakoda', category: 'Starter', rate: 40, aliases: ["palak pakoda","spinach pakora","पालक पकौड़ा","પાલક પકોડા"] },
{ name: 'Corn Pakoda', category: 'Starter', rate: 44, aliases: ["corn pakoda","sweet corn pakora","कॉर्न पकौड़ा","કોર્ન પકોડા"] },
{ name: 'Baby Corn Pakoda', category: 'Starter', rate: 48, aliases: ["baby corn pakoda","baby corn pakora","बेबी कॉर्न पकौड़ा","બેબી કોર્ન પકોડા"] },
{ name: 'Cheese Pakoda', category: 'Starter', rate: 58, aliases: ["cheese pakoda","cheese pakora","चीज़ पकौड़ा","ચીઝ પકોડા"] },
{ name: 'Mirchi Bhajiya', category: 'Starter', rate: 38, aliases: ["mirchi bhajiya","mirchi pakoda","chilli bhajiya","मिर्ची भजिया","મરચાં ભજીયા"] },
{ name: 'Kanda Bhajiya', category: 'Starter', rate: 38, aliases: ["kanda bhajiya","pyaz bhajiya","कांदा भजिया","કાંદા ભજીયા"] },
{ name: 'Methi Gota', category: 'Starter', rate: 42, aliases: ["methi gota","methi na gota","मेथी गोटा","મેથી ગોટા"] },
{ name: 'Dal Vada', category: 'Starter', rate: 42, aliases: ["dal vada","daal vada","दाल वड़ा","દાળ વડા"] },
{ name: 'Moong Dal Pakoda', category: 'Starter', rate: 42, aliases: ["moong dal pakoda","moong daal pakora","मूंग दाल पकौड़ा","મૂંગ દાળ પકોડા"] },

// Starter — Continental and Premium

{ name: 'French Fries', category: 'Starter', rate: 42, aliases: ["french fries","potato fries","फ्रेंच फ्राइज","ફ્રેંચ ફ્રાઇજ"] },
{ name: 'Peri Peri Fries', category: 'Starter', rate: 48, aliases: ["peri peri fries","peri-peri fries","पेरी पेरी फ्राइज","પેરી પેરી ફ્રાઇજ"] },
{ name: 'Cheese Fries', category: 'Starter', rate: 55, aliases: ["cheese fries","cheesy fries","चीज़ फ्राइज","ચીઝ ફ્રાઇજ"] },
{ name: 'Potato Wedges', category: 'Starter', rate: 46, aliases: ["potato wedges","seasoned potato wedges","पोटैटो वेजेस","બટાકા વેજેસ"] },
{ name: 'Peri Peri Potato Wedges', category: 'Starter', rate: 50, aliases: ["peri peri potato wedges","peri-peri wedges","पेरी पेरी पोटैटो वेजेस","પેરી પેરી બટાકા વેજેસ"] },
{ name: 'Hash Browns', category: 'Starter', rate: 48, aliases: ["hash browns","hash brown","हैश ब्राउन्स","હૈશ બ્રાઉન્સ"] },
{ name: 'Garlic Bread', category: 'Starter', rate: 46, aliases: ["garlic bread","classic garlic bread","गार्लिक ब्रेड","લસણ બ્રેડ"] },
{ name: 'Cheese Garlic Bread', category: 'Starter', rate: 55, aliases: ["cheese garlic bread","cheesy garlic bread","चीज़ गार्लिक ब्रेड","ચીઝ લસણ બ્રેડ"] },
{ name: 'Bruschetta', category: 'Starter', rate: 58, aliases: ["bruschetta","tomato bruschetta","ब्रुशेटा","બ્રુશેટા"] },
{ name: 'Cheese Chilli Toast', category: 'Starter', rate: 54, aliases: ["cheese chilli toast","cheese chili toast","चीज़ चिली टोस्ट","ચીઝ ચિલી ટોસ્ટ"] },
{ name: 'Veg Canape', category: 'Starter', rate: 58, aliases: ["veg canape","vegetable canape","veg canapé","वेज कनापे","વેજ કનાપે"] },
{ name: 'Corn Canape', category: 'Starter', rate: 60, aliases: ["corn canape","sweet corn canape","कॉर्न कनापे","કોર્ન કનાપે"] },
{ name: 'Paneer Canape', category: 'Starter', rate: 64, aliases: ["paneer canape","paneer canapé","पनीर कनापे","પનીર કનાપે"] },
{ name: 'Stuffed Cheese Jalapeno', category: 'Starter', rate: 62, aliases: ["stuffed cheese jalapeno","cheese jalapeno poppers","स्टफ्ड चीज़ जलापेनो","સ્ટફ્ડ ચીઝ જલાપેનો"] },
{ name: 'Jalapeno Cheese Balls', category: 'Starter', rate: 60, aliases: ["jalapeno cheese balls","jalapeño cheese balls","जलापेनो चीज़ बॉल्स","જલાપેનો ચીઝ બૉલ્સ"] },
{ name: 'Mozzarella Sticks', category: 'Starter', rate: 65, aliases: ["mozzarella sticks","cheese sticks","मोज़रेला स्टिक्स","મોજ઼રેલા સ્ટિક્સ"] },
{ name: 'Onion Rings', category: 'Starter', rate: 48, aliases: ["onion rings","crispy onion rings","अनियन रिंग्स","ડુંગળી રિંગ્સ"] },
{ name: 'Nachos with Salsa', category: 'Starter', rate: 52, aliases: ["nachos with salsa","nachos salsa","नाचोज़ विथ साल्सा","નાચોજ઼ વિથ સાલ્સા"] },
{ name: 'Loaded Nachos', category: 'Starter', rate: 65, aliases: ["loaded nachos","cheesy loaded nachos","लोडेड नाचोज़","લોડેડ નાચોજ઼"] },
{ name: 'Mini Veg Pizza', category: 'Starter', rate: 62, aliases: ["mini veg pizza","mini vegetable pizza","मिनी वेज पिज़्ज़ा","મિની વેજ પિજ઼્જ઼ા"] },
{ name: 'Mini Cheese Pizza', category: 'Starter', rate: 65, aliases: ["mini cheese pizza","mini cheesy pizza","मिनी चीज़ पिज़्ज़ा","મિની ચીઝ પિજ઼્જ઼ા"] },
{ name: 'Veg Quesadilla', category: 'Starter', rate: 64, aliases: ["veg quesadilla","vegetable quesadilla","वेज क्वेसाडिला","વેજ ક્વેસાડિલા"] },
{ name: 'Cheese Quesadilla', category: 'Starter', rate: 68, aliases: ["cheese quesadilla","cheesy quesadilla","चीज़ क्वेसाडिला","ચીઝ ક્વેસાડિલા"] },
{ name: 'Veg Tacos', category: 'Starter', rate: 62, aliases: ["veg tacos","vegetable tacos","वेज टाकोस","વેજ ટાકોસ"] },
{ name: 'Mexican Corn Cups', category: 'Starter', rate: 56, aliases: ["mexican corn cups","mexican sweet corn cup","मेक्सिकन कॉर्न कप्स","મેક્સિકન કોર્ન કપ્સ"] },
{ name: 'Cheese Fondue Bites', category: 'Starter', rate: 72, aliases: ["cheese fondue bites","fondue cheese bites","चीज़ फॉन्ड्यू बाइट्स","ચીઝ ફૉન્ડ્યૂ બાઇટ્સ"] },

// Starter — Gujarati and Regional

{ name: 'Khandvi', category: 'Starter', rate: 42, aliases: ["khandvi","patudi","खंडवी","ખાંડવી"] },
{ name: 'Khaman', category: 'Starter', rate: 40, aliases: ["khaman","khaman dhokla","खमण","ખમણ"] },
{ name: 'Nylon Khaman', category: 'Starter', rate: 42, aliases: ["nylon khaman","nylon dhokla","नायलॉन खमण","નાયલૉન ખમણ"] },
{ name: 'White Dhokla', category: 'Starter', rate: 40, aliases: ["white dhokla","khatta dhokla","व्हाइट ढोकला","વ્હાઇટ ઢોકળા"] },
{ name: 'Sandwich Dhokla', category: 'Starter', rate: 46, aliases: ["sandwich dhokla","layered dhokla","सैंडविच ढोकला","સૈંડવિચ ઢોકળા"] },
{ name: 'Mini Patra', category: 'Starter', rate: 44, aliases: ["mini patra","aloo vadi","alu vadi","मिनी पात्रा","મિની પાત્રા"] },
{ name: 'Lilva Kachori', category: 'Starter', rate: 48, aliases: ["lilva kachori","tuvar lilva kachori","लीलवा कचौरी","લીલવા કચોરી"] },
{ name: 'Dry Fruit Kachori', category: 'Starter', rate: 58, aliases: ["dry fruit kachori","dryfruit kachori","ड्राई फ्रूट कचौरी","ડ્રાઈ ફ્રૂટ કચોરી"] },
{ name: 'Raj Kachori', category: 'Starter', rate: 58, aliases: ["raj kachori","royal kachori","राज कचौरी","રાજ કચોરી"] },
{ name: 'Pyaz Kachori', category: 'Starter', rate: 48, aliases: ["pyaz kachori","onion kachori","प्याज़ कचौरी","પ્યાજ઼ કચોરી"] },
{ name: 'Dal Kachori', category: 'Starter', rate: 46, aliases: ["dal kachori","daal kachori","दाल कचौरी","દાળ કચોરી"] },
{ name: 'Mini Kachori', category: 'Starter', rate: 38, aliases: ["mini kachori","cocktail kachori","मिनी कचौरी","મિની કચોરી"] },
{ name: 'Rajasthani Mirchi Vada', category: 'Starter', rate: 46, aliases: ["rajasthani mirchi vada","jodhpuri mirchi vada","राजस्थानी मिर्ची वड़ा","રાજસ્થાની મરચાં વડા"] },
{ name: 'Makai Chevdo Cups', category: 'Starter', rate: 48, aliases: ["makai chevdo cups","corn chevda cups","मकई चेवड़ा कप्स","મકઈ ચેવડ઼ા કપ્સ"] },
 
  // Starter — Paneer

{ name: 'Paneer Tikka', category: 'Starter', rate: 58, aliases: ["paneer tikka","classic paneer tikka","पनीर टिक्का","પનીર ટિક્કા"] },
{ name: 'Malai Paneer Tikka', category: 'Starter', rate: 62, aliases: ["malai paneer tikka","paneer malai tikka","मलाई पनीर टिक्का","મલાઈ પનીર ટિક્કા"] },
{ name: 'Achari Paneer Tikka', category: 'Starter', rate: 62, aliases: ["achari paneer tikka","achar paneer tikka","अचारी पनीर टिक्का","અચારી પનીર ટિક્કા"] },
{ name: 'Hariyali Paneer Tikka', category: 'Starter', rate: 62, aliases: ["hariyali paneer tikka","green paneer tikka","हरियाली पनीर टिक्का","હરિયાળી પનીર ટિક્કા"] },
{ name: 'Lasooni Paneer Tikka', category: 'Starter', rate: 64, aliases: ["lasooni paneer tikka","lahsuni paneer tikka","garlic paneer tikka","लसूनी पनीर टिक्का","લસૂની પનીર ટિક્કા"] },
{ name: 'Afghani Paneer Tikka', category: 'Starter', rate: 66, aliases: ["afghani paneer tikka","paneer afghani tikka","अफगानी पनीर टिक्का","અફગાની પનીર ટિક્કા"] },
{ name: 'Pahadi Paneer Tikka', category: 'Starter', rate: 64, aliases: ["pahadi paneer tikka","pahaadi paneer tikka","पहाड़ी पनीर टिक्का","પહાડ઼ી પનીર ટિક્કા"] },
{ name: 'Tandoori Paneer Tikka', category: 'Starter', rate: 62, aliases: ["tandoori paneer tikka","tandoor paneer tikka","तंदूरी पनीर टिक्का","તંદૂરી પનીર ટિક્કા"] },
{ name: 'Kali Mirch Paneer Tikka', category: 'Starter', rate: 64, aliases: ["kali mirch paneer tikka","pepper paneer tikka","काली मिर्च पनीर टिक्का","કાલી મરચું પનીર ટિક્કા"] },
{ name: 'Peri Peri Paneer Tikka', category: 'Starter', rate: 66, aliases: ["peri peri paneer tikka","peri-peri paneer tikka","पेरी पेरी पनीर टिक्का","પેરી પેરી પનીર ટિક્કા"] },
{ name: 'Cheese Paneer Tikka', category: 'Starter', rate: 70, aliases: ["cheese paneer tikka","cheesy paneer tikka","चीज़ पनीर टिक्का","ચીઝ પનીર ટિક્કા"] },
{ name: 'Stuffed Paneer Tikka', category: 'Starter', rate: 72, aliases: ["stuffed paneer tikka","bharwa paneer tikka","स्टफ्ड पनीर टिक्का","સ્ટફ્ડ પનીર ટિક્કા"] },
{ name: 'Paneer Shashlik', category: 'Starter', rate: 64, aliases: ["paneer shashlik","paneer shaslik","पनीर शाशलिक","પનીર શાશલિક"] },
{ name: 'Paneer Seekh Kebab', category: 'Starter', rate: 65, aliases: ["paneer seekh kebab","paneer seekh kabab","पनीर सीख कबाब","પનીર સીખ કબાબ"] },
{ name: 'Paneer Malai Seekh', category: 'Starter', rate: 68, aliases: ["paneer malai seekh","malai paneer seekh","पनीर मलाई सीख","પનીર મલાઈ સીખ"] },
{ name: 'Paneer Angara', category: 'Starter', rate: 66, aliases: ["paneer angara","angara paneer starter","पनीर अंगारा","પનીર અંગારા"] },
{ name: 'Paneer Hariyali', category: 'Starter', rate: 64, aliases: ["paneer hariyali","paneer hariyali starter","hariyali paneer starter","पनीर हरियाली","પનીર હરિયાળી"] },
{ name: 'Paneer 65', category: 'Starter', rate: 62, aliases: ["paneer 65","paneer sixty five","पनीर 65","પનીર 65"] },
{ name: 'Paneer Pakoda', category: 'Starter', rate: 55, aliases: ["paneer pakoda","paneer pakora","पनीर पकौड़ा","પનીર પકોડા"] },
{ name: 'Paneer Fingers', category: 'Starter', rate: 60, aliases: ["paneer fingers","crispy paneer fingers","पनीर फिंगर्स","પનીર ફિંગર્સ"] },
{ name: 'Paneer Cheese Balls', category: 'Starter', rate: 65, aliases: ["paneer cheese balls","cheese paneer balls","पनीर चीज़ बॉल्स","પનીર ચીઝ બૉલ્સ"] },
{ name: 'Paneer Corn Balls', category: 'Starter', rate: 62, aliases: ["paneer corn balls","corn paneer balls","पनीर कॉर्न बॉल्स","પનીર કોર્ન બૉલ્સ"] },
{ name: 'Paneer Kurkure', category: 'Starter', rate: 64, aliases: ["paneer kurkure","crispy paneer kurkure","पनीर कुरकुरे","પનીર કુરકુરે"] },

// Starter — Kebab and Tandoori

{ name: 'Hara Bhara Kebab', category: 'Starter', rate: 55, aliases: ["hara bhara kebab","hara bhara kabab","हरा भरा कबाब","હરા ભરા કબાબ"] },
{ name: 'Veg Seekh Kebab', category: 'Starter', rate: 54, aliases: ["veg seekh kebab","vegetable seekh kabab","वेज सीख कबाब","વેજ સીખ કબાબ"] },
{ name: 'Subz Seekh Kebab', category: 'Starter', rate: 56, aliases: ["subz seekh kebab","sabz seekh kabab","सब्ज़ सीख कबाब","સબ્જ઼ સીખ કબાબ"] },
{ name: 'Dahi Ke Kebab', category: 'Starter', rate: 60, aliases: ["dahi ke kebab","dahi kebab","dahi kabab","दही के कबाब","દહીં કે કબાબ"] },
{ name: 'Dahi Sholay', category: 'Starter', rate: 62, aliases: ["dahi sholay","dahi ke sholay","दही शोले","દહીં શોલે"] },
{ name: 'Corn Seekh Kebab', category: 'Starter', rate: 58, aliases: ["corn seekh kebab","sweet corn seekh kabab","कॉर्न सीख कबाब","કોર્ન સીખ કબાબ"] },
{ name: 'Mushroom Seekh Kebab', category: 'Starter', rate: 62, aliases: ["mushroom seekh kebab","mushroom seekh kabab","मशरूम सीख कबाब","મશરૂમ સીખ કબાબ"] },
{ name: 'Beetroot Kebab', category: 'Starter', rate: 56, aliases: ["beetroot kebab","beetroot kabab","beet kebab","बीटरूट कबाब","બીટરૂટ કબાબ"] },
{ name: 'Rajma Kebab', category: 'Starter', rate: 54, aliases: ["rajma kebab","rajma kabab","राजमा कबाब","રાજમા કબાબ"] },
{ name: 'Chana Dal Kebab', category: 'Starter', rate: 52, aliases: ["chana dal kebab","chana daal kabab","चना दाल कबाब","ચણા દાળ કબાબ"] },
{ name: 'Moong Dal Kebab', category: 'Starter', rate: 54, aliases: ["moong dal kebab","moong daal kabab","मूंग दाल कबाब","મૂંગ દાળ કબાબ"] },
{ name: 'Soya Seekh Kebab', category: 'Starter', rate: 55, aliases: ["soya seekh kebab","soy seekh kabab","सोया सीख कबाब","સોયા સીખ કબાબ"] },
{ name: 'Soya Chaap Tikka', category: 'Starter', rate: 58, aliases: ["soya chaap tikka","soy chaap tikka","सोया चाप टिक्का","સોયા ચાપ ટિક્કા"] },
{ name: 'Malai Soya Chaap', category: 'Starter', rate: 62, aliases: ["malai soya chaap","soya malai chaap","मलाई सोया चाप","મલાઈ સોયા ચાપ"] },
{ name: 'Achari Soya Chaap', category: 'Starter', rate: 60, aliases: ["achari soya chaap","achar soya chaap","अचारी सोया चाप","અચારી સોયા ચાપ"] },
{ name: 'Afghani Soya Chaap', category: 'Starter', rate: 64, aliases: ["afghani soya chaap","soya afghani chaap","अफगानी सोया चाप","અફગાની સોયા ચાપ"] },
{ name: 'Tandoori Soya Chaap', category: 'Starter', rate: 60, aliases: ["tandoori soya chaap","tandoor soya chaap","तंदूरी सोया चाप","તંદૂરી સોયા ચાપ"] },
{ name: 'Tandoori Mushroom', category: 'Starter', rate: 62, aliases: ["tandoori mushroom","tandoor mushroom","तंदूरी मशरूम","તંદૂરી મશરૂમ"] },
{ name: 'Stuffed Tandoori Mushroom', category: 'Starter', rate: 68, aliases: ["stuffed tandoori mushroom","bharwa tandoori mushroom","स्टफ्ड तंदूरी मशरूम","સ્ટફ્ડ તંદૂરી મશરૂમ"] },
{ name: 'Tandoori Aloo', category: 'Starter', rate: 52, aliases: ["tandoori aloo","tandoor potato","तंदूरी आलू","તંદૂરી આલૂ"] },
{ name: 'Bharwa Tandoori Aloo', category: 'Starter', rate: 58, aliases: ["bharwa tandoori aloo","stuffed tandoori aloo","भरवां तंदूरी आलू","ભરવા તંદૂરી આલૂ"] },
{ name: 'Tandoori Broccoli', category: 'Starter', rate: 68, aliases: ["tandoori broccoli","tandoor broccoli","तंदूरी ब्रोकली","તંદૂરી બ્રોકલી"] },
{ name: 'Malai Broccoli', category: 'Starter', rate: 72, aliases: ["malai broccoli","broccoli malai tikka","मलाई ब्रोकली","મલાઈ બ્રોકલી"] },
{ name: 'Tandoori Gobhi', category: 'Starter', rate: 55, aliases: ["tandoori gobhi","tandoori cauliflower","तंदूरी गोभी","તંદૂરી ગોબી"] },
{ name: 'Veg Galouti Kebab', category: 'Starter', rate: 62, aliases: ["veg galouti kebab","vegetable galouti kabab","वेज गलौटी कबाब","વેજ ગલૌટી કબાબ"] },
{ name: 'Kathal Galouti Kebab', category: 'Starter', rate: 65, aliases: ["kathal galouti kebab","jackfruit galouti kebab","कटहल गलौटी कबाब","કટહલ ગલૌટી કબાબ"] },

// Starter — Chinese and Indo-Chinese

{ name: 'Spring Roll', category: 'Starter', rate: 52, aliases: ["spring roll","veg spring roll","vegetable spring roll","स्प्रिंग रोल","સ્પ્રિંગ રોલ"] },
{ name: 'Cheese Spring Roll', category: 'Starter', rate: 58, aliases: ["cheese spring roll","cheesy spring roll","चीज़ स्प्रिंग रोल","ચીઝ સ્પ્રિંગ રોલ"] },
{ name: 'Paneer Spring Roll', category: 'Starter', rate: 60, aliases: ["paneer spring roll","पनीर स्प्रिंग रोल","પનીર સ્પ્રિંગ રોલ"] },
{ name: 'Schezwan Spring Roll', category: 'Starter', rate: 56, aliases: ["schezwan spring roll","szechuan spring roll","शेज़वान स्प्रिंग रोल","શેજ઼વાન સ્પ્રિંગ રોલ"] },
{ name: 'Paneer Chilli', category: 'Starter', rate: 60, aliases: ["paneer chilli","paneer chili","chilli paneer","पनीर चिली","પનીર ચિલી"] },
{ name: 'Dry Paneer Manchurian', category: 'Starter', rate: 62, aliases: ["dry paneer manchurian","paneer manchurian dry","ड्राई पनीर मंचूरियन","ડ્રાઈ પનીર મંચૂરિયન"] },
{ name: 'Crispy Paneer', category: 'Starter', rate: 62, aliases: ["crispy paneer","crispy fried paneer","क्रिस्पी पनीर","ક્રિસ્પી પનીર"] },
{ name: 'Honey Chilli Paneer', category: 'Starter', rate: 65, aliases: ["honey chilli paneer","honey chili paneer","हनी चिली पनीर","હની ચિલી પનીર"] },
{ name: 'Schezwan Paneer', category: 'Starter', rate: 64, aliases: ["schezwan paneer","schezwan paneer dry","szechuan paneer dry","शेज़वान पनीर","શેજ઼વાન પનીર"] },
{ name: 'Dragon Paneer', category: 'Starter', rate: 66, aliases: ["dragon paneer","paneer dragon","ड्रैगन पनीर","ડ્રૈગન પનીર"] },
{ name: 'Kung Pao Paneer', category: 'Starter', rate: 68, aliases: ["kung pao paneer","kungpao paneer","कुंग पाओ पनीर","કુંગ પાઓ પનીર"] },
{ name: 'Paneer Salt and Pepper', category: 'Starter', rate: 64, aliases: ["paneer salt and pepper","salt pepper paneer","पनीर सॉल्ट एंड पेपर","પનીર સૉલ્ટ એંડ પેપર"] },
{ name: 'Veg Manchurian Dry', category: 'Starter', rate: 52, aliases: ["veg manchurian dry","dry veg manchurian","वेज मंचूरियन ड्राई","વેજ મંચૂરિયન ડ્રાઈ"] },
{ name: 'Veg Crispy', category: 'Starter', rate: 54, aliases: ["veg crispy","crispy vegetables","वेज क्रिस्पी","વેજ ક્રિસ્પી"] },
{ name: 'Veg 65', category: 'Starter', rate: 52, aliases: ["veg 65","vegetable 65","वेज 65","વેજ 65"] },
{ name: 'Crispy Corn', category: 'Starter', rate: 54, aliases: ["crispy corn","crispy sweet corn","क्रिस्पी कॉर्न","ક્રિસ્પી કોર્ન"] },
{ name: 'Corn Chilli', category: 'Starter', rate: 54, aliases: ["corn chilli","chilli corn","chili corn","कॉर्न चिली","કોર્ન ચિલી"] },
{ name: 'Corn Salt and Pepper', category: 'Starter', rate: 56, aliases: ["corn salt and pepper","salt pepper corn","कॉर्न सॉल्ट एंड पेपर","કોર્ન સૉલ્ટ એંડ પેપર"] },
{ name: 'Baby Corn Chilli', category: 'Starter', rate: 56, aliases: ["baby corn chilli","baby corn chili","बेबी कॉर्न चिली","બેબી કોર્ન ચિલી"] },
{ name: 'Baby Corn Manchurian', category: 'Starter', rate: 56, aliases: ["baby corn manchurian","babycorn manchurian","बेबी कॉर्न मंचूरियन","બેબી કોર્ન મંચૂરિયન"] },
{ name: 'Crispy Baby Corn', category: 'Starter', rate: 58, aliases: ["crispy baby corn","baby corn crispy","क्रिस्पी बेबी कॉर्न","ક્રિસ્પી બેબી કોર્ન"] },
{ name: 'Honey Chilli Potato', category: 'Starter', rate: 50, aliases: ["honey chilli potato","honey chili potato","हनी चिली पोटैटो","હની ચિલી બટાકા"] },
{ name: 'Chilli Potato', category: 'Starter', rate: 48, aliases: ["chilli potato","chili potato","चिली पोटैटो","ચિલી બટાકા"] },
{ name: 'Schezwan Potato', category: 'Starter', rate: 50, aliases: ["schezwan potato","szechuan potato","शेज़वान पोटैटो","શેજ઼વાન બટાકા"] },
{ name: 'Mushroom Chilli', category: 'Starter', rate: 60, aliases: ["mushroom chilli","mushroom chili","मशरूम चिली","મશરૂમ ચિલી"] },
{ name: 'Mushroom Manchurian', category: 'Starter', rate: 60, aliases: ["mushroom manchurian","dry mushroom manchurian","मशरूम मंचूरियन","મશરૂમ મંચૂરિયન"] },
{ name: 'Crispy Mushroom', category: 'Starter', rate: 62, aliases: ["crispy mushroom","crispy fried mushroom","क्रिस्पी मशरूम","ક્રિસ્પી મશરૂમ"] },
{ name: 'Mushroom Salt and Pepper', category: 'Starter', rate: 62, aliases: ["mushroom salt and pepper","salt pepper mushroom","मशरूम सॉल्ट एंड पेपर","મશરૂમ સૉલ્ટ એંડ પેપર"] },
{ name: 'Gobhi Manchurian Dry', category: 'Starter', rate: 52, aliases: ["gobhi manchurian dry","cauliflower manchurian dry","गोभी मंचूरियन ड्राई","ગોબી મંચૂરિયન ડ્રાઈ"] },
{ name: 'Crispy Gobhi', category: 'Starter', rate: 52, aliases: ["crispy gobhi","crispy cauliflower","क्रिस्पी गोभी","ક્રિસ્પી ગોબી"] },
{ name: 'Chilli Garlic Gobhi', category: 'Starter', rate: 54, aliases: ["chilli garlic gobhi","chili garlic cauliflower","चिली गार्लिक गोभी","ચિલી લસણ ગોબી"] },
{ name: 'Chinese Bhel', category: 'Starter', rate: 48, aliases: ["chinese bhel","crispy chinese bhel","चाइनीज़ भेल","ચાઇનીજ઼ ભેલ"] },
{ name: 'Veg Momos', category: 'Starter', rate: 52, aliases: ["veg momos","vegetable momos","वेज मोमोज़","વેજ મોમોજ઼"] },
{ name: 'Fried Veg Momos', category: 'Starter', rate: 55, aliases: ["fried veg momos","fried vegetable momos","फ्राइड वेज मोमोज़","ફ્રાઇડ વેજ મોમોજ઼"] },
{ name: 'Tandoori Veg Momos', category: 'Starter', rate: 60, aliases: ["tandoori veg momos","tandoor vegetable momos","तंदूरी वेज मोमोज़","તંદૂરી વેજ મોમોજ઼"] },
{ name: 'Paneer Momos', category: 'Starter', rate: 58, aliases: ["paneer momos","पनीर मोमोज़","પનીર મોમોજ઼"] },
{ name: 'Fried Paneer Momos', category: 'Starter', rate: 62, aliases: ["fried paneer momos","फ्राइड पनीर मोमोज़","ફ્રાઇડ પનીર મોમોજ઼"] },

// Starter — Fried and Indian

{ name: 'Veg Cutlet', category: 'Starter', rate: 42, aliases: ["veg cutlet","vegetable cutlet","वेज कटलेट","વેજ કટલેટ"] },
{ name: 'Cheese Cutlet', category: 'Starter', rate: 52, aliases: ["cheese cutlet","cheesy cutlet","चीज़ कटलेट","ચીઝ કટલેટ"] },
{ name: 'Corn Cutlet', category: 'Starter', rate: 48, aliases: ["corn cutlet","sweet corn cutlet","कॉर्न कटलेट","કોર્ન કટલેટ"] },
{ name: 'Beetroot Cutlet', category: 'Starter', rate: 48, aliases: ["beetroot cutlet","beet cutlet","बीटरूट कटलेट","બીટરૂટ કટલેટ"] },
{ name: 'Veg Croquette', category: 'Starter', rate: 52, aliases: ["veg croquette","vegetable croquette","वेज क्रोकेट","વેજ ક્રોકેટ"] },
{ name: 'Cheese Corn Croquette', category: 'Starter', rate: 58, aliases: ["cheese corn croquette","corn cheese croquette","चीज़ कॉर्न क्रोकेट","ચીઝ કોર્ન ક્રોકેટ"] },
{ name: 'Veg Lollipop', category: 'Starter', rate: 52, aliases: ["veg lollipop","vegetable lollipop","वेज लॉलीपॉप","વેજ લૉલીપૉપ"] },
{ name: 'Paneer Lollipop', category: 'Starter', rate: 60, aliases: ["paneer lollipop","पनीर लॉलीपॉप","પનીર લૉલીપૉપ"] },
{ name: 'Corn Cheese Balls', category: 'Starter', rate: 58, aliases: ["corn cheese balls","cheese corn balls","कॉर्न चीज़ बॉल्स","કોર્ન ચીઝ બૉલ્સ"] },
{ name: 'Veg Cheese Balls', category: 'Starter', rate: 58, aliases: ["veg cheese balls","vegetable cheese balls","वेज चीज़ बॉल्स","વેજ ચીઝ બૉલ્સ"] },
{ name: 'Potato Cheese Balls', category: 'Starter', rate: 55, aliases: ["potato cheese balls","aloo cheese balls","पोटैटो चीज़ बॉल्स","બટાકા ચીઝ બૉલ્સ"] },
{ name: 'Spinach Cheese Balls', category: 'Starter', rate: 58, aliases: ["spinach cheese balls","palak cheese balls","स्पिनच चीज़ बॉल्स","સ્પિનચ ચીઝ બૉલ્સ"] },
{ name: 'Stuffed Mushroom', category: 'Starter', rate: 65, aliases: ["stuffed mushroom","bharwa mushroom","स्टफ्ड मशरूम","સ્ટફ્ડ મશરૂમ"] },
{ name: 'Mushroom Duplex', category: 'Starter', rate: 66, aliases: ["mushroom duplex","duplex mushroom","मशरूम डुप्लेक्स","મશરૂમ ડુપ્લેક્સ"] },
{ name: 'Mushroom Cheese Balls', category: 'Starter', rate: 64, aliases: ["mushroom cheese balls","cheese mushroom balls","मशरूम चीज़ बॉल्स","મશરૂમ ચીઝ બૉલ્સ"] },
{ name: 'Aloo Nazakat', category: 'Starter', rate: 56, aliases: ["aloo nazakat","potato nazakat","आलू नज़ाकत","આલૂ નજ઼ાકત"] },
{ name: 'Aloo 65', category: 'Starter', rate: 48, aliases: ["aloo 65","potato 65","आलू 65","આલૂ 65"] },
{ name: 'Sabudana Vada', category: 'Starter', rate: 44, aliases: ["sabudana vada","sago vada","साबूदाना वड़ा","સાબૂદાના વડા"] },
{ name: 'Batata Vada', category: 'Starter', rate: 42, aliases: ["batata vada","aloo vada","बटाटा वड़ा","બટાટા વડા"] },
{ name: 'Bread Roll', category: 'Starter', rate: 44, aliases: ["bread roll","potato bread roll","ब्रेड रोल","બ્રેડ રોલ"] },
{ name: 'Cheese Bread Roll', category: 'Starter', rate: 52, aliases: ["cheese bread roll","cheesy bread roll","चीज़ ब्रेड रोल","ચીઝ બ્રેડ રોલ"] },
{ name: 'Veg Samosa', category: 'Starter', rate: 42, aliases: ["veg samosa","vegetable samosa","वेज समोसा","વેજ સમોસા"] },
{ name: 'Mini Samosa', category: 'Starter', rate: 36, aliases: ["mini samosa","cocktail samosa","मिनी समोसा","મિની સમોસા"] },
{ name: 'Punjabi Samosa', category: 'Starter', rate: 44, aliases: ["punjabi samosa","large samosa","पंजाबी समोसा","પંજાબી સમોસા"] },
{ name: 'Onion Pakoda', category: 'Starter', rate: 38, aliases: ["onion pakoda","onion pakora","pyaz pakoda","अनियन पकौड़ा","ડુંગળી પકોડા"] },
{ name: 'Mix Veg Pakoda', category: 'Starter', rate: 42, aliases: ["mix veg pakoda","mixed vegetable pakora","मिक्स वेज पकौड़ा","મિક્સ વેજ પકોડા"] },
{ name: 'Palak Pakoda', category: 'Starter', rate: 40, aliases: ["palak pakoda","spinach pakora","पालक पकौड़ा","પાલક પકોડા"] },
{ name: 'Corn Pakoda', category: 'Starter', rate: 44, aliases: ["corn pakoda","sweet corn pakora","कॉर्न पकौड़ा","કોર્ન પકોડા"] },
{ name: 'Baby Corn Pakoda', category: 'Starter', rate: 48, aliases: ["baby corn pakoda","baby corn pakora","बेबी कॉर्न पकौड़ा","બેબી કોર્ન પકોડા"] },
{ name: 'Cheese Pakoda', category: 'Starter', rate: 58, aliases: ["cheese pakoda","cheese pakora","चीज़ पकौड़ा","ચીઝ પકોડા"] },
{ name: 'Mirchi Bhajiya', category: 'Starter', rate: 38, aliases: ["mirchi bhajiya","mirchi pakoda","chilli bhajiya","मिर्ची भजिया","મરચાં ભજીયા"] },
{ name: 'Kanda Bhajiya', category: 'Starter', rate: 38, aliases: ["kanda bhajiya","pyaz bhajiya","कांदा भजिया","કાંદા ભજીયા"] },
{ name: 'Methi Gota', category: 'Starter', rate: 42, aliases: ["methi gota","methi na gota","मेथी गोटा","મેથી ગોટા"] },
{ name: 'Dal Vada', category: 'Starter', rate: 42, aliases: ["dal vada","daal vada","दाल वड़ा","દાળ વડા"] },
{ name: 'Moong Dal Pakoda', category: 'Starter', rate: 42, aliases: ["moong dal pakoda","moong daal pakora","मूंग दाल पकौड़ा","મૂંગ દાળ પકોડા"] },

// Starter — Continental and Premium

{ name: 'French Fries', category: 'Starter', rate: 42, aliases: ["french fries","potato fries","फ्रेंच फ्राइज","ફ્રેંચ ફ્રાઇજ"] },
{ name: 'Peri Peri Fries', category: 'Starter', rate: 48, aliases: ["peri peri fries","peri-peri fries","पेरी पेरी फ्राइज","પેરી પેરી ફ્રાઇજ"] },
{ name: 'Cheese Fries', category: 'Starter', rate: 55, aliases: ["cheese fries","cheesy fries","चीज़ फ्राइज","ચીઝ ફ્રાઇજ"] },
{ name: 'Potato Wedges', category: 'Starter', rate: 46, aliases: ["potato wedges","seasoned potato wedges","पोटैटो वेजेस","બટાકા વેજેસ"] },
{ name: 'Peri Peri Potato Wedges', category: 'Starter', rate: 50, aliases: ["peri peri potato wedges","peri-peri wedges","पेरी पेरी पोटैटो वेजेस","પેરી પેરી બટાકા વેજેસ"] },
{ name: 'Hash Browns', category: 'Starter', rate: 48, aliases: ["hash browns","hash brown","हैश ब्राउन्स","હૈશ બ્રાઉન્સ"] },
{ name: 'Garlic Bread', category: 'Starter', rate: 46, aliases: ["garlic bread","classic garlic bread","गार्लिक ब्रेड","લસણ બ્રેડ"] },
{ name: 'Cheese Garlic Bread', category: 'Starter', rate: 55, aliases: ["cheese garlic bread","cheesy garlic bread","चीज़ गार्लिक ब्रेड","ચીઝ લસણ બ્રેડ"] },
{ name: 'Bruschetta', category: 'Starter', rate: 58, aliases: ["bruschetta","tomato bruschetta","ब्रुशेटा","બ્રુશેટા"] },
{ name: 'Cheese Chilli Toast', category: 'Starter', rate: 54, aliases: ["cheese chilli toast","cheese chili toast","चीज़ चिली टोस्ट","ચીઝ ચિલી ટોસ્ટ"] },
{ name: 'Veg Canape', category: 'Starter', rate: 58, aliases: ["veg canape","vegetable canape","veg canapé","वेज कनापे","વેજ કનાપે"] },
{ name: 'Corn Canape', category: 'Starter', rate: 60, aliases: ["corn canape","sweet corn canape","कॉर्न कनापे","કોર્ન કનાપે"] },
{ name: 'Paneer Canape', category: 'Starter', rate: 64, aliases: ["paneer canape","paneer canapé","पनीर कनापे","પનીર કનાપે"] },
{ name: 'Stuffed Cheese Jalapeno', category: 'Starter', rate: 62, aliases: ["stuffed cheese jalapeno","cheese jalapeno poppers","स्टफ्ड चीज़ जलापेनो","સ્ટફ્ડ ચીઝ જલાપેનો"] },
{ name: 'Jalapeno Cheese Balls', category: 'Starter', rate: 60, aliases: ["jalapeno cheese balls","jalapeño cheese balls","जलापेनो चीज़ बॉल्स","જલાપેનો ચીઝ બૉલ્સ"] },
{ name: 'Mozzarella Sticks', category: 'Starter', rate: 65, aliases: ["mozzarella sticks","cheese sticks","मोज़रेला स्टिक्स","મોજ઼રેલા સ્ટિક્સ"] },
{ name: 'Onion Rings', category: 'Starter', rate: 48, aliases: ["onion rings","crispy onion rings","अनियन रिंग्स","ડુંગળી રિંગ્સ"] },
{ name: 'Nachos with Salsa', category: 'Starter', rate: 52, aliases: ["nachos with salsa","nachos salsa","नाचोज़ विथ साल्सा","નાચોજ઼ વિથ સાલ્સા"] },
{ name: 'Loaded Nachos', category: 'Starter', rate: 65, aliases: ["loaded nachos","cheesy loaded nachos","लोडेड नाचोज़","લોડેડ નાચોજ઼"] },
{ name: 'Mini Veg Pizza', category: 'Starter', rate: 62, aliases: ["mini veg pizza","mini vegetable pizza","मिनी वेज पिज़्ज़ा","મિની વેજ પિજ઼્જ઼ા"] },
{ name: 'Mini Cheese Pizza', category: 'Starter', rate: 65, aliases: ["mini cheese pizza","mini cheesy pizza","मिनी चीज़ पिज़्ज़ा","મિની ચીઝ પિજ઼્જ઼ા"] },
{ name: 'Veg Quesadilla', category: 'Starter', rate: 64, aliases: ["veg quesadilla","vegetable quesadilla","वेज क्वेसाडिला","વેજ ક્વેસાડિલા"] },
{ name: 'Cheese Quesadilla', category: 'Starter', rate: 68, aliases: ["cheese quesadilla","cheesy quesadilla","चीज़ क्वेसाडिला","ચીઝ ક્વેસાડિલા"] },
{ name: 'Veg Tacos', category: 'Starter', rate: 62, aliases: ["veg tacos","vegetable tacos","वेज टाकोस","વેજ ટાકોસ"] },
{ name: 'Mexican Corn Cups', category: 'Starter', rate: 56, aliases: ["mexican corn cups","mexican sweet corn cup","मेक्सिकन कॉर्न कप्स","મેક્સિકન કોર્ન કપ્સ"] },
{ name: 'Cheese Fondue Bites', category: 'Starter', rate: 72, aliases: ["cheese fondue bites","fondue cheese bites","चीज़ फॉन्ड्यू बाइट्स","ચીઝ ફૉન્ડ્યૂ બાઇટ્સ"] },

// Starter — Gujarati and Regional

{ name: 'Khandvi', category: 'Starter', rate: 42, aliases: ["khandvi","patudi","खंडवी","ખાંડવી"] },
{ name: 'Khaman', category: 'Starter', rate: 40, aliases: ["khaman","khaman dhokla","खमण","ખમણ"] },
{ name: 'Nylon Khaman', category: 'Starter', rate: 42, aliases: ["nylon khaman","nylon dhokla","नायलॉन खमण","નાયલૉન ખમણ"] },
{ name: 'White Dhokla', category: 'Starter', rate: 40, aliases: ["white dhokla","khatta dhokla","व्हाइट ढोकला","વ્હાઇટ ઢોકળા"] },
{ name: 'Sandwich Dhokla', category: 'Starter', rate: 46, aliases: ["sandwich dhokla","layered dhokla","सैंडविच ढोकला","સૈંડવિચ ઢોકળા"] },
{ name: 'Mini Patra', category: 'Starter', rate: 44, aliases: ["mini patra","aloo vadi","alu vadi","मिनी पात्रा","મિની પાત્રા"] },
{ name: 'Lilva Kachori', category: 'Starter', rate: 48, aliases: ["lilva kachori","tuvar lilva kachori","लीलवा कचौरी","લીલવા કચોરી"] },
{ name: 'Dry Fruit Kachori', category: 'Starter', rate: 58, aliases: ["dry fruit kachori","dryfruit kachori","ड्राई फ्रूट कचौरी","ડ્રાઈ ફ્રૂટ કચોરી"] },
{ name: 'Raj Kachori', category: 'Starter', rate: 58, aliases: ["raj kachori","royal kachori","राज कचौरी","રાજ કચોરી"] },
{ name: 'Pyaz Kachori', category: 'Starter', rate: 48, aliases: ["pyaz kachori","onion kachori","प्याज़ कचौरी","પ્યાજ઼ કચોરી"] },
{ name: 'Dal Kachori', category: 'Starter', rate: 46, aliases: ["dal kachori","daal kachori","दाल कचौरी","દાળ કચોરી"] },
{ name: 'Mini Kachori', category: 'Starter', rate: 38, aliases: ["mini kachori","cocktail kachori","मिनी कचौरी","મિની કચોરી"] },
{ name: 'Rajasthani Mirchi Vada', category: 'Starter', rate: 46, aliases: ["rajasthani mirchi vada","jodhpuri mirchi vada","राजस्थानी मिर्ची वड़ा","રાજસ્થાની મરચાં વડા"] },
{ name: 'Makai Chevdo Cups', category: 'Starter', rate: 48, aliases: ["makai chevdo cups","corn chevda cups","मकई चेवड़ा कप्स","મકઈ ચેવડ઼ા કપ્સ"] },

];

const DISH_COST_ITEMS_PART_2: readonly DishCostItem[] = [

// Chinese — Noodles

{ name: 'Veg Hakka Noodles', category: 'Chinese', rate: 45, aliases: ["veg hakka noodles","vegetable hakka noodles","hakka noodles","वेज हक्का नूडल्स","વેજ હક્કા નૂડલ્સ"] },
{ name: 'Schezwan Noodles', category: 'Chinese', rate: 48, aliases: ["schezwan noodles","szechuan noodles","veg schezwan noodles","शेज़वान नूडल्स","શેજ઼વાન નૂડલ્સ"] },
{ name: 'Chilli Garlic Noodles', category: 'Chinese', rate: 48, aliases: ["chilli garlic noodles","chili garlic noodles","चिली गार्लिक नूडल्स","ચિલી લસણ નૂડલ્સ"] },
{ name: 'Singapore Noodles', category: 'Chinese', rate: 50, aliases: ["singapore noodles","singapore style noodles","सिंगापुर नूडल्स","સિંગાપુર નૂડલ્સ"] },
{ name: 'Shanghai Noodles', category: 'Chinese', rate: 50, aliases: ["shanghai noodles","shanghai style noodles","शंघाई नूडल्स","શંઘાઈ નૂડલ્સ"] },
{ name: 'Hong Kong Noodles', category: 'Chinese', rate: 52, aliases: ["hong kong noodles","hongkong noodles","हॉन्ग कॉन्ग नूडल्स","હૉન્ગ કૉન્ગ નૂડલ્સ"] },
{ name: 'Pan Fried Noodles', category: 'Chinese', rate: 54, aliases: ["pan fried noodles","pan-fried noodles","पन फ्राइड नूडल्स","પન ફ્રાઇડ નૂડલ્સ"] },
{ name: 'American Chopsuey', category: 'Chinese', rate: 55, aliases: ["american chopsuey","american chop suey","अमेरिकन चॉप्सी","અમેરિકન ચૉપ્સી"] },
{ name: 'Chinese Chopsuey', category: 'Chinese', rate: 54, aliases: ["chinese chopsuey","chinese chop suey","चाइनीज़ चॉप्सी","ચાઇનીજ઼ ચૉપ્સી"] },
{ name: 'Triple Schezwan Noodles', category: 'Chinese', rate: 58, aliases: ["triple schezwan noodles","triple szechuan noodles","ट्रिपल शेज़वान नूडल्स","ટ્રિપલ શેજ઼વાન નૂડલ્સ"] },
{ name: 'Burnt Garlic Noodles', category: 'Chinese', rate: 50, aliases: ["burnt garlic noodles","burnt garlic hakka noodles","बर्न्ट गार्लिक नूडल्स","બર્ન્ટ લસણ નૂડલ્સ"] },
{ name: 'Ginger Garlic Noodles', category: 'Chinese', rate: 48, aliases: ["ginger garlic noodles","adrak garlic noodles","जिंजर गार्लिक नूडल्स","આદુ લસણ નૂડલ્સ"] },
{ name: 'Black Pepper Noodles', category: 'Chinese', rate: 50, aliases: ["black pepper noodles","pepper noodles","ब्लैक पेपर नूडल्स","બ્લૈક પેપર નૂડલ્સ"] },
{ name: 'Hot Garlic Noodles', category: 'Chinese', rate: 50, aliases: ["hot garlic noodles","spicy garlic noodles","हॉट गार्लिक नूडल्स","હૉટ લસણ નૂડલ્સ"] },
{ name: 'Vegetable Chow Mein', category: 'Chinese', rate: 46, aliases: ["vegetable chow mein","veg chow mein","chowmein","वेजिटेबल चाउ मीन","વેજિટેબલ ચાઉ મીન"] },
{ name: 'Paneer Hakka Noodles', category: 'Chinese', rate: 56, aliases: ["paneer hakka noodles","paneer noodles","पनीर हक्का नूडल्स","પનીર હક્કા નૂડલ્સ"] },
{ name: 'Mushroom Hakka Noodles', category: 'Chinese', rate: 54, aliases: ["mushroom hakka noodles","mushroom noodles","मशरूम हक्का नूडल्स","મશરૂમ હક્કા નૂડલ્સ"] },
{ name: 'Baby Corn Noodles', category: 'Chinese', rate: 52, aliases: ["baby corn noodles","babycorn noodles","बेबी कॉर्न नूडल्स","બેબી કોર્ન નૂડલ્સ"] },
{ name: 'Mixed Vegetable Noodles', category: 'Chinese', rate: 48, aliases: ["mixed vegetable noodles","mix veg noodles","मिक्स्ड वेजिटेबल नूडल्स","મિક્સ્ડ વેજિટેબલ નૂડલ્સ"] },
{ name: 'Broccoli Noodles', category: 'Chinese', rate: 54, aliases: ["broccoli noodles","veg broccoli noodles","ब्रोकली नूडल्स","બ્રોકલી નૂડલ્સ"] },
{ name: 'Tofu Noodles', category: 'Chinese', rate: 56, aliases: ["tofu noodles","tofu hakka noodles","टोफू नूडल्स","ટોફૂ નૂડલ્સ"] },
{ name: 'Rice Noodles', category: 'Chinese', rate: 52, aliases: ["rice noodles","veg rice noodles","vegetable rice noodles","राइस नूडल्स","રાઇસ નૂડલ્સ"] },
{ name: 'Glass Noodles', category: 'Chinese', rate: 54, aliases: ["glass noodles","veg glass noodles","vegetable glass noodles","ग्लस्स नूडल्स","ગ્લસ્સ નૂડલ્સ"] },

// Chinese — Fried Rice

{ name: 'Veg Fried Rice', category: 'Chinese', rate: 45, aliases: ["veg fried rice","vegetable fried rice","वेज फ्राइड राइस","વેજ ફ્રાઇડ રાઇસ"] },
{ name: 'Schezwan Fried Rice', category: 'Chinese', rate: 48, aliases: ["schezwan fried rice","szechuan fried rice","schezwan rice","शेज़वान फ्राइड राइस","શેજ઼વાન ફ્રાઇડ રાઇસ"] },
{ name: 'Chilli Garlic Fried Rice', category: 'Chinese', rate: 48, aliases: ["chilli garlic fried rice","chili garlic fried rice","चिली गार्लिक फ्राइड राइस","ચિલી લસણ ફ્રાઇડ રાઇસ"] },
{ name: 'Burnt Garlic Fried Rice', category: 'Chinese', rate: 50, aliases: ["burnt garlic fried rice","garlic burnt rice","बर्न्ट गार्लिक फ्राइड राइस","બર્ન્ટ લસણ ફ્રાઇડ રાઇસ"] },
{ name: 'Singapore Fried Rice', category: 'Chinese', rate: 50, aliases: ["singapore fried rice","singapore rice","सिंगापुर फ्राइड राइस","સિંગાપુર ફ્રાઇડ રાઇસ"] },
{ name: 'Shanghai Fried Rice', category: 'Chinese', rate: 50, aliases: ["shanghai fried rice","shanghai rice","शंघाई फ्राइड राइस","શંઘાઈ ફ્રાઇડ રાઇસ"] },
{ name: 'Hong Kong Fried Rice', category: 'Chinese', rate: 52, aliases: ["hong kong fried rice","hongkong fried rice","हॉन्ग कॉन्ग फ्राइड राइस","હૉન્ગ કૉન્ગ ફ્રાઇડ રાઇસ"] },
{ name: 'Triple Schezwan Fried Rice', category: 'Chinese', rate: 58, aliases: ["triple schezwan fried rice","triple szechuan rice","ट्रिपल शेज़वान फ्राइड राइस","ટ્રિપલ શેજ઼વાન ફ્રાઇડ રાઇસ"] },
{ name: 'Mushroom Fried Rice', category: 'Chinese', rate: 52, aliases: ["mushroom fried rice","veg mushroom rice","मशरूम फ्राइड राइस","મશરૂમ ફ્રાઇડ રાઇસ"] },
{ name: 'Paneer Fried Rice', category: 'Chinese', rate: 54, aliases: ["paneer fried rice","paneer rice chinese","पनीर फ्राइड राइस","પનીર ફ્રાઇડ રાઇસ"] },
{ name: 'Baby Corn Fried Rice', category: 'Chinese', rate: 50, aliases: ["baby corn fried rice","babycorn fried rice","बेबी कॉर्न फ्राइड राइस","બેબી કોર્ન ફ્રાઇડ રાઇસ"] },
{ name: 'Corn Fried Rice', category: 'Chinese', rate: 48, aliases: ["corn fried rice","sweet corn fried rice","कॉर्न फ्राइड राइस","કોર્ન ફ્રાઇડ રાઇસ"] },
{ name: 'Broccoli Fried Rice', category: 'Chinese', rate: 52, aliases: ["broccoli fried rice","veg broccoli rice","ब्रोकली फ्राइड राइस","બ્રોકલી ફ્રાઇડ રાઇસ"] },
{ name: 'Tofu Fried Rice', category: 'Chinese', rate: 54, aliases: ["tofu fried rice","veg tofu rice","टोफू फ्राइड राइस","ટોફૂ ફ્રાઇડ રાઇસ"] },
{ name: 'Black Pepper Fried Rice', category: 'Chinese', rate: 50, aliases: ["black pepper fried rice","pepper fried rice","ब्लैक पेपर फ्राइड राइस","બ્લૈક પેપર ફ્રાઇડ રાઇસ"] },
{ name: 'Ginger Fried Rice', category: 'Chinese', rate: 48, aliases: ["ginger fried rice","adrak fried rice","जिंजर फ्राइड राइस","આદુ ફ્રાઇડ રાઇસ"] },
{ name: 'Garlic Fried Rice', category: 'Chinese', rate: 48, aliases: ["garlic fried rice","lasoon fried rice","गार्लिक फ्राइड राइस","લસણ ફ્રાઇડ રાઇસ"] },
{ name: 'Lemon Fried Rice', category: 'Chinese', rate: 48, aliases: ["lemon fried rice","lime fried rice","लेमन फ्राइड राइस","લેમન ફ્રાઇડ રાઇસ"] },
{ name: 'Basil Fried Rice', category: 'Chinese', rate: 52, aliases: ["basil fried rice","thai basil fried rice","बेसिल फ्राइड राइस","બેસિલ ફ્રાઇડ રાઇસ"] },
{ name: 'Manchurian Fried Rice', category: 'Chinese', rate: 56, aliases: ["manchurian fried rice","veg manchurian rice","मंचूरियन फ्राइड राइस","મંચૂરિયન ફ્રાઇડ રાઇસ"] },

// Chinese — Manchurian

{ name: 'Veg Manchurian Gravy', category: 'Chinese', rate: 46, aliases: ["veg manchurian gravy","vegetable manchurian gravy","वेज मंचूरियन ग्रेवी","વેજ મંચૂરિયન ગ્રેવી"] },
{ name: 'Veg Manchurian Dry', category: 'Chinese', rate: 48, aliases: ["veg manchurian dry","dry veg manchurian","वेज मंचूरियन ड्राई","વેજ મંચૂરિયન ડ્રાઈ"] },
{ name: 'Paneer Manchurian Gravy', category: 'Chinese', rate: 58, aliases: ["paneer manchurian gravy","paneer manchurian","पनीर मंचूरियन ग्रेवी","પનીર મંચૂરિયન ગ્રેવી"] },
{ name: 'Paneer Manchurian Dry', category: 'Chinese', rate: 60, aliases: ["paneer manchurian dry","dry paneer manchurian","पनीर मंचूरियन ड्राई","પનીર મંચૂરિયન ડ્રાઈ"] },
{ name: 'Baby Corn Manchurian', category: 'Chinese', rate: 54, aliases: ["baby corn manchurian","babycorn manchurian","बेबी कॉर्न मंचूरियन","બેબી કોર્ન મંચૂરિયન"] },
{ name: 'Mushroom Manchurian', category: 'Chinese', rate: 58, aliases: ["mushroom manchurian","veg mushroom manchurian","मशरूम मंचूरियन","મશરૂમ મંચૂરિયન"] },
{ name: 'Gobhi Manchurian Gravy', category: 'Chinese', rate: 50, aliases: ["gobhi manchurian gravy","cauliflower manchurian gravy","गोभी मंचूरियन ग्रेवी","ગોબી મંચૂરિયન ગ્રેવી"] },
{ name: 'Gobhi Manchurian Dry', category: 'Chinese', rate: 52, aliases: ["gobhi manchurian dry","dry cauliflower manchurian","गोभी मंचूरियन ड्राई","ગોબી મંચૂરિયન ડ્રાઈ"] },
{ name: 'Tofu Manchurian', category: 'Chinese', rate: 58, aliases: ["tofu manchurian","veg tofu manchurian","टोफू मंचूरियन","ટોફૂ મંચૂરિયન"] },
{ name: 'Corn Manchurian', category: 'Chinese', rate: 52, aliases: ["corn manchurian","sweet corn manchurian","कॉर्न मंचूरियन","કોર્ન મંચૂરિયન"] },

// Chinese — Paneer Gravies

{ name: 'Chilli Paneer Gravy', category: 'Chinese', rate: 60, aliases: ["chilli paneer gravy","chili paneer gravy","paneer chilli gravy","चिली पनीर ग्रेवी","ચિલી પનીર ગ્રેવી"] },
{ name: 'Chilli Paneer Dry', category: 'Chinese', rate: 62, aliases: ["chilli paneer dry","dry chilli paneer","paneer chilli dry","चिली पनीर ड्राई","ચિલી પનીર ડ્રાઈ"] },
{ name: 'Schezwan Paneer', category: 'Chinese', rate: 62, aliases: ["schezwan paneer","szechuan paneer","शेज़वान पनीर","શેજ઼વાન પનીર"] },
{ name: 'Hot Garlic Paneer', category: 'Chinese', rate: 62, aliases: ["hot garlic paneer","paneer hot garlic","हॉट गार्लिक पनीर","હૉટ લસણ પનીર"] },
{ name: 'Honey Chilli Paneer', category: 'Chinese', rate: 64, aliases: ["honey chilli paneer","honey chili paneer","हनी चिली पनीर","હની ચિલી પનીર"] },
{ name: 'Dragon Paneer', category: 'Chinese', rate: 66, aliases: ["dragon paneer","paneer dragon","ड्रैगन पनीर","ડ્રૈગન પનીર"] },
{ name: 'Kung Pao Paneer', category: 'Chinese', rate: 66, aliases: ["kung pao paneer","kungpao paneer","कुंग पाओ पनीर","કુંગ પાઓ પનીર"] },
{ name: 'Black Pepper Paneer', category: 'Chinese', rate: 64, aliases: ["black pepper paneer","pepper paneer","ब्लैक पेपर पनीर","બ્લૈક પેપર પનીર"] },
{ name: 'Paneer in Garlic Sauce', category: 'Chinese', rate: 62, aliases: ["paneer in garlic sauce","garlic sauce paneer","पनीर इन गार्लिक सॉस","પનીર ઇન લસણ સૉસ"] },
{ name: 'Paneer in Hot Bean Sauce', category: 'Chinese', rate: 64, aliases: ["paneer in hot bean sauce","hot bean paneer","पनीर इन हॉट बीन सॉस","પનીર ઇન હૉટ બીન સૉસ"] },
{ name: 'Paneer in Black Bean Sauce', category: 'Chinese', rate: 66, aliases: ["paneer in black bean sauce","black bean paneer","पनीर इन ब्लैक बीन सॉस","પનીર ઇન બ્લૈક બીન સૉસ"] },
{ name: 'Sweet and Sour Paneer', category: 'Chinese', rate: 62, aliases: ["sweet and sour paneer","sweet sour paneer","स्वीट एंड सावर पनीर","સ્વીટ એંડ સાવર પનીર"] },
{ name: 'Paneer Salt and Pepper', category: 'Chinese', rate: 62, aliases: ["paneer salt and pepper","salt pepper paneer","पनीर सॉल्ट एंड पेपर","પનીર સૉલ્ટ એંડ પેપર"] },

// Chinese — Vegetable Gravies

{ name: 'Vegetable in Hot Garlic Sauce', category: 'Chinese', rate: 52, aliases: ["vegetable in hot garlic sauce","veg hot garlic sauce","वेजिटेबल इन हॉट गार्लिक सॉस","વેજિટેબલ ઇન હૉટ લસણ સૉસ"] },
{ name: 'Vegetable in Schezwan Sauce', category: 'Chinese', rate: 52, aliases: ["vegetable in schezwan sauce","veg schezwan gravy","वेजिटेबल इन शेज़वान सॉस","વેજિટેબલ ઇન શેજ઼વાન સૉસ"] },
{ name: 'Vegetable in Black Bean Sauce', category: 'Chinese', rate: 54, aliases: ["vegetable in black bean sauce","veg black bean sauce","वेजिटेबल इन ब्लैक बीन सॉस","વેજિટેબલ ઇન બ્લૈક બીન સૉસ"] },
{ name: 'Vegetable in Garlic Sauce', category: 'Chinese', rate: 52, aliases: ["vegetable in garlic sauce","veg garlic sauce","वेजिटेबल इन गार्लिक सॉस","વેજિટેબલ ઇન લસણ સૉસ"] },
{ name: 'Vegetable in Sweet and Sour Sauce', category: 'Chinese', rate: 52, aliases: ["vegetable in sweet and sour sauce","sweet sour vegetables","वेजिटेबल इन स्वीट एंड सावर सॉस","વેજિટેબલ ઇન સ્વીટ એંડ સાવર સૉસ"] },
{ name: 'Vegetable in Oyster Style Sauce', category: 'Chinese', rate: 54, aliases: ["vegetable in oyster style sauce","veg oyster sauce","वेजिटेबल इन ओय्स्टेर स्ट्य्ले सॉस","વેજિટેબલ ઇન ઓય્સ્ટેર સ્ટ્ય્લે સૉસ"] },
{ name: 'Vegetable in Chilli Basil Sauce', category: 'Chinese', rate: 54, aliases: ["vegetable in chilli basil sauce","veg chilli basil","वेजिटेबल इन चिली बेसिल सॉस","વેજિટેબલ ઇન ચિલી બેસિલ સૉસ"] },
{ name: 'Vegetable in Burnt Garlic Sauce', category: 'Chinese', rate: 54, aliases: ["vegetable in burnt garlic sauce","burnt garlic vegetables","वेजिटेबल इन बर्न्ट गार्लिक सॉस","વેજિટેબલ ઇન બર્ન્ટ લસણ સૉસ"] },
{ name: 'Chinese Mixed Vegetable', category: 'Chinese', rate: 50, aliases: ["chinese mixed vegetable","chinese mix veg","चाइनीज़ मिक्स्ड वेजिटेबल","ચાઇનીજ઼ મિક્સ્ડ વેજિટેબલ"] },
{ name: 'Stir Fried Vegetables', category: 'Chinese', rate: 50, aliases: ["stir fried vegetables","stir fry vegetables","स्टर फ्राइड वेजिटेबल्स","સ્ટર ફ્રાઇડ વેજિટેબલ્સ"] },
{ name: 'Exotic Vegetables in Garlic Sauce', category: 'Chinese', rate: 58, aliases: ["exotic vegetables in garlic sauce","exotic veg garlic sauce","एग्ज़ॉटिक वेजिटेबल्स इन गार्लिक सॉस","એગ્જ઼ૉટિક વેજિટેબલ્સ ઇન લસણ સૉસ"] },
{ name: 'Exotic Vegetables in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ["exotic vegetables in black pepper sauce","exotic veg pepper sauce","एग्ज़ॉटिक वेजिटेबल्स इन ब्लैक पेपर सॉस","એગ્જ઼ૉટિક વેજિટેબલ્સ ઇન બ્લૈક પેપર સૉસ"] },

// Chinese — Mushroom, Baby Corn and Broccoli

{ name: 'Chilli Mushroom', category: 'Chinese', rate: 58, aliases: ["chilli mushroom","chili mushroom","चिली मशरूम","ચિલી મશરૂમ"] },
{ name: 'Mushroom in Hot Garlic Sauce', category: 'Chinese', rate: 60, aliases: ["mushroom in hot garlic sauce","hot garlic mushroom","मशरूम इन हॉट गार्लिक सॉस","મશરૂમ ઇન હૉટ લસણ સૉસ"] },
{ name: 'Mushroom in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ["mushroom in black pepper sauce","black pepper mushroom","मशरूम इन ब्लैक पेपर सॉस","મશરૂમ ઇન બ્લૈક પેપર સૉસ"] },
{ name: 'Mushroom in Schezwan Sauce', category: 'Chinese', rate: 60, aliases: ["mushroom in schezwan sauce","schezwan mushroom","मशरूम इन शेज़वान सॉस","મશરૂમ ઇન શેજ઼વાન સૉસ"] },
{ name: 'Baby Corn Chilli', category: 'Chinese', rate: 54, aliases: ["baby corn chilli","baby corn chili","बेबी कॉर्न चिली","બેબી કોર્ન ચિલી"] },
{ name: 'Baby Corn in Hot Garlic Sauce', category: 'Chinese', rate: 56, aliases: ["baby corn in hot garlic sauce","hot garlic baby corn","बेबी कॉर्न इन हॉट गार्लिक सॉस","બેબી કોર્ન ઇન હૉટ લસણ સૉસ"] },
{ name: 'Baby Corn in Schezwan Sauce', category: 'Chinese', rate: 56, aliases: ["baby corn in schezwan sauce","schezwan baby corn","बेबी कॉर्न इन शेज़वान सॉस","બેબી કોર્ન ઇન શેજ઼વાન સૉસ"] },
{ name: 'Broccoli in Garlic Sauce', category: 'Chinese', rate: 58, aliases: ["broccoli in garlic sauce","garlic broccoli","ब्रोकली इन गार्लिक सॉस","બ્રોકલી ઇન લસણ સૉસ"] },
{ name: 'Broccoli in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ["broccoli in black pepper sauce","pepper broccoli","ब्रोकली इन ब्लैक पेपर सॉस","બ્રોકલી ઇન બ્લૈક પેપર સૉસ"] },
{ name: 'Broccoli Mushroom Stir Fry', category: 'Chinese', rate: 62, aliases: ["broccoli mushroom stir fry","mushroom broccoli stir fry","ब्रोकली मशरूम स्टर फ्राई","બ્રોકલી મશરૂમ સ્ટર ફ્રાઈ"] },
{ name: 'Baby Corn Mushroom Gravy', category: 'Chinese', rate: 58, aliases: ["baby corn mushroom gravy","babycorn mushroom gravy","बेबी कॉर्न मशरूम ग्रेवी","બેબી કોર્ન મશરૂમ ગ્રેવી"] },

// Chinese — Tofu

{ name: 'Chilli Tofu', category: 'Chinese', rate: 58, aliases: ["chilli tofu","chili tofu","चिली टोफू","ચિલી ટોફૂ"] },
{ name: 'Schezwan Tofu', category: 'Chinese', rate: 60, aliases: ["schezwan tofu","szechuan tofu","शेज़वान टोफू","શેજ઼વાન ટોફૂ"] },
{ name: 'Tofu in Hot Garlic Sauce', category: 'Chinese', rate: 60, aliases: ["tofu in hot garlic sauce","hot garlic tofu","टोफू इन हॉट गार्लिक सॉस","ટોફૂ ઇન હૉટ લસણ સૉસ"] },
{ name: 'Tofu in Black Bean Sauce', category: 'Chinese', rate: 62, aliases: ["tofu in black bean sauce","black bean tofu","टोफू इन ब्लैक बीन सॉस","ટોફૂ ઇન બ્લૈક બીન સૉસ"] },
{ name: 'Kung Pao Tofu', category: 'Chinese', rate: 62, aliases: ["kung pao tofu","kungpao tofu","कुंग पाओ टोफू","કુંગ પાઓ ટોફૂ"] },
{ name: 'Sweet and Sour Tofu', category: 'Chinese', rate: 60, aliases: ["sweet and sour tofu","sweet sour tofu","स्वीट एंड सावर टोफू","સ્વીટ એંડ સાવર ટોફૂ"] },
{ name: 'Tofu Salt and Pepper', category: 'Chinese', rate: 60, aliases: ["tofu salt and pepper","salt pepper tofu","टोफू सॉल्ट एंड पेपर","ટોફૂ સૉલ્ટ એંડ પેપર"] },

// Chinese — Crispy and Dry Dishes

{ name: 'Crispy Corn', category: 'Chinese', rate: 52, aliases: ["crispy corn","crispy sweet corn","क्रिस्पी कॉर्न","ક્રિસ્પી કોર્ન"] },
{ name: 'Corn Salt and Pepper', category: 'Chinese', rate: 52, aliases: ["corn salt and pepper","salt pepper corn","कॉर्न सॉल्ट एंड पेपर","કોર્ન સૉલ્ટ એંડ પેપર"] },
{ name: 'Crispy Baby Corn', category: 'Chinese', rate: 54, aliases: ["crispy baby corn","baby corn crispy","क्रिस्पी बेबी कॉर्न","ક્રિસ્પી બેબી કોર્ન"] },
{ name: 'Baby Corn Salt and Pepper', category: 'Chinese', rate: 56, aliases: ["baby corn salt and pepper","salt pepper baby corn","बेबी कॉर्न सॉल्ट एंड पेपर","બેબી કોર્ન સૉલ્ટ એંડ પેપર"] },
{ name: 'Crispy Mushroom', category: 'Chinese', rate: 58, aliases: ["crispy mushroom","crispy fried mushroom","क्रिस्पी मशरूम","ક્રિસ્પી મશરૂમ"] },
{ name: 'Mushroom Salt and Pepper', category: 'Chinese', rate: 58, aliases: ["mushroom salt and pepper","salt pepper mushroom","मशरूम सॉल्ट एंड पेपर","મશરૂમ સૉલ્ટ એંડ પેપર"] },
{ name: 'Crispy Vegetables', category: 'Chinese', rate: 52, aliases: ["crispy vegetables","veg crispy","क्रिस्पी वेजिटेबल्स","ક્રિસ્પી વેજિટેબલ્સ"] },
{ name: 'Vegetable Salt and Pepper', category: 'Chinese', rate: 52, aliases: ["vegetable salt and pepper","veg salt pepper","वेजिटेबल सॉल्ट एंड पेपर","વેજિટેબલ સૉલ્ટ એંડ પેપર"] },
{ name: 'Honey Chilli Potato', category: 'Chinese', rate: 48, aliases: ["honey chilli potato","honey chili potato","हनी चिली पोटैटो","હની ચિલી બટાકા"] },
{ name: 'Chilli Potato', category: 'Chinese', rate: 46, aliases: ["chilli potato","chili potato","चिली पोटैटो","ચિલી બટાકા"] },
{ name: 'Schezwan Potato', category: 'Chinese', rate: 48, aliases: ["schezwan potato","szechuan potato","शेज़वान पोटैटो","શેજ઼વાન બટાકા"] },
{ name: 'Crispy Lotus Stem', category: 'Chinese', rate: 62, aliases: ["crispy lotus stem","crispy kamal kakdi","क्रिस्पी लोटस स्टेम","ક્રિસ્પી લોટસ સ્ટેમ"] },
{ name: 'Honey Chilli Lotus Stem', category: 'Chinese', rate: 64, aliases: ["honey chilli lotus stem","honey chili kamal kakdi","हनी चिली लोटस स्टेम","હની ચિલી લોટસ સ્ટેમ"] },
{ name: 'Crispy Spinach', category: 'Chinese', rate: 50, aliases: ["crispy spinach","crispy palak","क्रिस्पी स्पिनच","ક્રિસ્પી સ્પિનચ"] },
{ name: 'Chinese Bhel', category: 'Chinese', rate: 46, aliases: ["chinese bhel","crispy chinese bhel","चाइनीज़ भेल","ચાઇનીજ઼ ભેલ"] },

// Chinese — Momos and Rolls

{ name: 'Veg Steamed Momos', category: 'Chinese', rate: 48, aliases: ["veg steamed momos","vegetable steamed momos","steamed veg momos","वेज स्टीम्ड मोमोज़","વેજ સ્ટીમ્ડ મોમોજ઼"] },
{ name: 'Veg Fried Momos', category: 'Chinese', rate: 52, aliases: ["veg fried momos","fried vegetable momos","वेज फ्राइड मोमोज़","વેજ ફ્રાઇડ મોમોજ઼"] },
{ name: 'Veg Schezwan Momos', category: 'Chinese', rate: 54, aliases: ["veg schezwan momos","schezwan vegetable momos","वेज शेज़वान मोमोज़","વેજ શેજ઼વાન મોમોજ઼"] },
{ name: 'Paneer Momos', category: 'Chinese', rate: 56, aliases: ["paneer momos","steamed paneer momos","पनीर मोमोज़","પનીર મોમોજ઼"] },
{ name: 'Fried Paneer Momos', category: 'Chinese', rate: 60, aliases: ["fried paneer momos","paneer fried momos","फ्राइड पनीर मोमोज़","ફ્રાઇડ પનીર મોમોજ઼"] },
{ name: 'Mushroom Momos', category: 'Chinese', rate: 56, aliases: ["mushroom momos","veg mushroom momos","मशरूम मोमोज़","મશરૂમ મોમોજ઼"] },
{ name: 'Cheese Corn Momos', category: 'Chinese', rate: 60, aliases: ["cheese corn momos","corn cheese momos","चीज़ कॉर्न मोमोज़","ચીઝ કોર્ન મોમોજ઼"] },
{ name: 'Veg Spring Roll', category: 'Chinese', rate: 50, aliases: ["veg spring roll","vegetable spring roll","वेज स्प्रिंग रोल","વેજ સ્પ્રિંગ રોલ"] },
{ name: 'Paneer Spring Roll', category: 'Chinese', rate: 56, aliases: ["paneer spring roll","पनीर स्प्रिंग रोल","પનીર સ્પ્રિંગ રોલ"] },
{ name: 'Schezwan Spring Roll', category: 'Chinese', rate: 54, aliases: ["schezwan spring roll","szechuan spring roll","शेज़वान स्प्रिंग रोल","શેજ઼વાન સ્પ્રિંગ રોલ"] },

// Chinese — Combo Dishes

{ name: 'Hakka Noodles with Manchurian', category: 'Chinese', rate: 72, aliases: ["hakka noodles with manchurian","noodles manchurian combo","हक्का नूडल्स विथ मंचूरियन","હક્કા નૂડલ્સ વિથ મંચૂરિયન"] },
{ name: 'Fried Rice with Manchurian', category: 'Chinese', rate: 72, aliases: ["fried rice with manchurian","rice manchurian combo","फ्राइड राइस विथ मंचूरियन","ફ્રાઇડ રાઇસ વિથ મંચૂરિયન"] },
{ name: 'Schezwan Rice with Manchurian', category: 'Chinese', rate: 76, aliases: ["schezwan rice with manchurian","schezwan manchurian combo","शेज़वान राइस विथ मंचूरियन","શેજ઼વાન રાઇસ વિથ મંચૂરિયન"] },
{ name: 'Triple Schezwan Rice', category: 'Chinese', rate: 78, aliases: ["triple schezwan rice","triple szechuan rice combo","ट्रिपल शेज़वान राइस","ટ્રિપલ શેજ઼વાન રાઇસ"] },
{ name: 'Chinese Combo Plate', category: 'Chinese', rate: 82, aliases: ["chinese combo plate","veg chinese combo","चाइनीज़ कोम्बो प्लते","ચાઇનીજ઼ કોમ્બો પ્લતે"] },

// Italian — Pasta

{ name: 'White Sauce Pasta', category: 'Italian', rate: 58, aliases: ["white sauce pasta","creamy white sauce pasta","alfredo pasta","व्हाइट सॉस पास्ता","વ્હાઇટ સૉસ પાસ્તા"] },
{ name: 'Red Sauce Pasta', category: 'Italian', rate: 56, aliases: ["red sauce pasta","tomato sauce pasta","arrabbiata pasta","रेड सॉस पास्ता","રેડ સૉસ પાસ્તા"] },
{ name: 'Pink Sauce Pasta', category: 'Italian', rate: 60, aliases: ["pink sauce pasta","rose sauce pasta","पिंक सॉस पास्ता","પિંક સૉસ પાસ્તા"] },
{ name: 'Pesto Pasta', category: 'Italian', rate: 64, aliases: ["pesto pasta","basil pesto pasta","पेस्टो पास्ता","પેસ્ટો પાસ્તા"] },
{ name: 'Aglio Olio Pasta', category: 'Italian', rate: 58, aliases: ["aglio olio pasta","aglio e olio pasta","garlic olive oil pasta","आलियो ओलियो पास्ता","આલિયો ઓલિયો પાસ્તા"] },
{ name: 'Arrabbiata Pasta', category: 'Italian', rate: 58, aliases: ["arrabbiata pasta","penne arrabbiata","अर्राबियाता पास्ता","અર્રાબિયાતા પાસ્તા"] },
{ name: 'Alfredo Pasta', category: 'Italian', rate: 62, aliases: ["alfredo pasta","creamy alfredo pasta","अल्फ्रेडो पास्ता","અલ્ફ્રેડો પાસ્તા"] },
{ name: 'Mac and Cheese', category: 'Italian', rate: 64, aliases: ["mac and cheese","macaroni and cheese","mac n cheese","मक एंड चीज़","મક એંડ ચીઝ"] },
{ name: 'Cheese Pasta', category: 'Italian', rate: 62, aliases: ["cheese pasta","cheesy pasta","चीज़ पास्ता","ચીઝ પાસ્તા"] },
{ name: 'Garlic Cream Pasta', category: 'Italian', rate: 62, aliases: ["garlic cream pasta","creamy garlic pasta","गार्लिक क्रीम पास्ता","લસણ ક્રીમ પાસ્તા"] },
{ name: 'Tomato Basil Pasta', category: 'Italian', rate: 58, aliases: ["tomato basil pasta","basil tomato pasta","टोमेटो बेसिल पास्ता","ટામેટા બેસિલ પાસ્તા"] },
{ name: 'Mushroom White Sauce Pasta', category: 'Italian', rate: 64, aliases: ["mushroom white sauce pasta","creamy mushroom pasta","मशरूम व्हाइट सॉस पास्ता","મશરૂમ વ્હાઇટ સૉસ પાસ્તા"] },
{ name: 'Broccoli White Sauce Pasta', category: 'Italian', rate: 66, aliases: ["broccoli white sauce pasta","creamy broccoli pasta","ब्रोकली व्हाइट सॉस पास्ता","બ્રોકલી વ્હાઇટ સૉસ પાસ્તા"] },
{ name: 'Corn White Sauce Pasta', category: 'Italian', rate: 62, aliases: ["corn white sauce pasta","sweet corn pasta","कॉर्न व्हाइट सॉस पास्ता","કોર્ન વ્હાઇટ સૉસ પાસ્તા"] },
{ name: 'Spinach Corn Pasta', category: 'Italian', rate: 64, aliases: ["spinach corn pasta","palak corn pasta","स्पिनच कॉर्न पास्ता","સ્પિનચ કોર્ન પાસ્તા"] },
{ name: 'Paneer Tikka Pasta', category: 'Italian', rate: 68, aliases: ["paneer tikka pasta","tandoori paneer pasta","पनीर टिक्का पास्ता","પનીર ટિક્કા પાસ્તા"] },
{ name: 'Tandoori Pasta', category: 'Italian', rate: 64, aliases: ["tandoori pasta","tandoor pasta","तंदूरी पास्ता","તંદૂરી પાસ્તા"] },
{ name: 'Peri Peri Pasta', category: 'Italian', rate: 62, aliases: ["peri peri pasta","peri-peri pasta","पेरी पेरी पास्ता","પેરી પેરી પાસ્તા"] },
{ name: 'Schezwan Pasta', category: 'Italian', rate: 60, aliases: ["schezwan pasta","szechuan pasta","शेज़वान पास्ता","શેજ઼વાન પાસ્તા"] },
{ name: 'Mexican Pasta', category: 'Italian', rate: 64, aliases: ["mexican pasta","mexican style pasta","मेक्सिकन पास्ता","મેક્સિકન પાસ્તા"] },
{ name: 'Masala Pasta', category: 'Italian', rate: 56, aliases: ["masala pasta","indian masala pasta","मसाला पास्ता","મસાલા પાસ્તા"] },
{ name: 'Mixed Vegetable Pasta', category: 'Italian', rate: 60, aliases: ["mixed vegetable pasta","mix veg pasta","vegetable pasta","मिक्स्ड वेजिटेबल पास्ता","મિક્સ્ડ વેજિટેબલ પાસ્તા"] },
{ name: 'Exotic Vegetable Pasta', category: 'Italian', rate: 68, aliases: ["exotic vegetable pasta","exotic veg pasta","एग्ज़ॉटिक वेजिटेबल पास्ता","એગ્જ઼ૉટિક વેજિટેબલ પાસ્તા"] },
{ name: 'Four Cheese Pasta', category: 'Italian', rate: 72, aliases: ["four cheese pasta","4 cheese pasta","फोर चीज़ पास्ता","ફોર ચીઝ પાસ્તા"] },
{ name: 'Truffle Mushroom Pasta', category: 'Italian', rate: 78, aliases: ["truffle mushroom pasta","mushroom truffle pasta","ट्रफल मशरूम पास्ता","ટ્રફલ મશરૂમ પાસ્તા"] },

// Italian — Penne, Spaghetti and Other Pasta

{ name: 'Penne Alfredo', category: 'Italian', rate: 62, aliases: ["penne alfredo","alfredo penne","पेने अल्फ्रेडो","પેને અલ્ફ્રેડો"] },
{ name: 'Penne Arrabbiata', category: 'Italian', rate: 58, aliases: ["penne arrabbiata","arrabbiata penne","पेने अर्राबियाता","પેને અર્રાબિયાતા"] },
{ name: 'Penne Pink Sauce', category: 'Italian', rate: 60, aliases: ["penne pink sauce","pink sauce penne","पेने पिंक सॉस","પેને પિંક સૉસ"] },
{ name: 'Penne Pesto', category: 'Italian', rate: 64, aliases: ["penne pesto","pesto penne","पेने पेस्टो","પેને પેસ્ટો"] },
{ name: 'Spaghetti Aglio Olio', category: 'Italian', rate: 60, aliases: ["spaghetti aglio olio","aglio olio spaghetti","स्पेगेटी आलियो ओलियो","સ્પેગેટી આલિયો ઓલિયો"] },
{ name: 'Spaghetti Arrabbiata', category: 'Italian', rate: 60, aliases: ["spaghetti arrabbiata","arrabbiata spaghetti","स्पेगेटी अर्राबियाता","સ્પેગેટી અર્રાબિયાતા"] },
{ name: 'Spaghetti Pomodoro', category: 'Italian', rate: 60, aliases: ["spaghetti pomodoro","tomato spaghetti","स्पेगेटी पोमोदोरो","સ્પેગેટી પોમોદોરો"] },
{ name: 'Spaghetti Pesto', category: 'Italian', rate: 66, aliases: ["spaghetti pesto","pesto spaghetti","स्पेगेटी पेस्टो","સ્પેગેટી પેસ્ટો"] },
{ name: 'Fusilli White Sauce', category: 'Italian', rate: 60, aliases: ["fusilli white sauce","white sauce fusilli","फ्यूसिली व्हाइट सॉस","ફ્યૂસિલી વ્હાઇટ સૉસ"] },
{ name: 'Fusilli Red Sauce', category: 'Italian', rate: 58, aliases: ["fusilli red sauce","red sauce fusilli","फ्यूसिली रेड सॉस","ફ્યૂસિલી રેડ સૉસ"] },
{ name: 'Fusilli Pink Sauce', category: 'Italian', rate: 62, aliases: ["fusilli pink sauce","pink sauce fusilli","फ्यूसिली पिंक सॉस","ફ્યૂસિલી પિંક સૉસ"] },
{ name: 'Farfalle Alfredo', category: 'Italian', rate: 64, aliases: ["farfalle alfredo","bow tie alfredo pasta","फारफाले अल्फ्रेडो","ફારફાલે અલ્ફ્રેડો"] },
{ name: 'Farfalle Pesto', category: 'Italian', rate: 66, aliases: ["farfalle pesto","bow tie pesto pasta","फारफाले पेस्टो","ફારફાલે પેસ્ટો"] },
{ name: 'Macaroni Red Sauce', category: 'Italian', rate: 54, aliases: ["macaroni red sauce","red sauce macaroni","मैकरोनी रेड सॉस","મૈકરોની રેડ સૉસ"] },
{ name: 'Macaroni White Sauce', category: 'Italian', rate: 56, aliases: ["macaroni white sauce","white sauce macaroni","मैकरोनी व्हाइट सॉस","મૈકરોની વ્હાઇટ સૉસ"] },
{ name: 'Baked Macaroni', category: 'Italian', rate: 64, aliases: ["baked macaroni","cheese baked macaroni","बेक्ड मैकरोनी","બેક્ડ મૈકરોની"] },

// Italian — Pizza

{ name: 'Margherita Pizza', category: 'Italian', rate: 62, aliases: ["margherita pizza","margarita pizza","cheese tomato pizza","मार्गेरिटा पिज़्ज़ा","માર્ગેરિટા પિજ઼્જ઼ા"] },
{ name: 'Cheese Pizza', category: 'Italian', rate: 60, aliases: ["cheese pizza","plain cheese pizza","चीज़ पिज़्ज़ा","ચીઝ પિજ઼્જ઼ા"] },
{ name: 'Double Cheese Margherita Pizza', category: 'Italian', rate: 68, aliases: ["double cheese margherita pizza","double cheese margarita pizza","दौब्ले चीज़ मार्गेरिटा पिज़्ज़ा","દૌબ્લે ચીઝ માર્ગેરિટા પિજ઼્જ઼ા"] },
{ name: 'Farmhouse Pizza', category: 'Italian', rate: 70, aliases: ["farmhouse pizza","farm house pizza","फर्म्हौसे पिज़्ज़ा","ફર્મ્હૌસે પિજ઼્જ઼ા"] },
{ name: 'Veggie Delight Pizza', category: 'Italian', rate: 68, aliases: ["veggie delight pizza","vegetable delight pizza","वेग्जी देलिघ्त पिज़्ज़ा","વેગ્જી દેલિઘ્ત પિજ઼્જ઼ા"] },
{ name: 'Garden Fresh Pizza', category: 'Italian', rate: 68, aliases: ["garden fresh pizza","garden vegetable pizza","गार्डन फ्रेश पिज़्ज़ा","ગાર્ડન ફ્રેશ પિજ઼્જ઼ા"] },
{ name: 'Corn Cheese Pizza', category: 'Italian', rate: 66, aliases: ["corn cheese pizza","cheese corn pizza","कॉर्न चीज़ पिज़्ज़ा","કોર્ન ચીઝ પિજ઼્જ઼ા"] },
{ name: 'Paneer Tikka Pizza', category: 'Italian', rate: 74, aliases: ["paneer tikka pizza","tandoori paneer pizza","पनीर टिक्का पिज़्ज़ा","પનીર ટિક્કા પિજ઼્જ઼ા"] },
{ name: 'Tandoori Paneer Pizza', category: 'Italian', rate: 76, aliases: ["tandoori paneer pizza","paneer tandoori pizza","तंदूरी पनीर पिज़्ज़ा","તંદૂરી પનીર પિજ઼્જ઼ા"] },
{ name: 'Mushroom Pizza', category: 'Italian', rate: 70, aliases: ["mushroom pizza","cheese mushroom pizza","मशरूम पिज़्ज़ा","મશરૂમ પિજ઼્જ઼ા"] },
{ name: 'Capsicum Onion Pizza', category: 'Italian', rate: 66, aliases: ["capsicum onion pizza","onion capsicum pizza","कैप्सिकम अनियन पिज़्ज़ा","કૈપ્સિકમ ડુંગળી પિજ઼્જ઼ા"] },
{ name: 'Onion Tomato Pizza', category: 'Italian', rate: 64, aliases: ["onion tomato pizza","tomato onion pizza","अनियन टोमेटो पिज़्ज़ा","ડુંગળી ટામેટા પિજ઼્જ઼ા"] },
{ name: 'Jalapeno Pizza', category: 'Italian', rate: 68, aliases: ["jalapeno pizza","jalapeño pizza","जलापेनो पिज़्ज़ा","જલાપેનો પિજ઼્જ઼ા"] },
{ name: 'Olive Jalapeno Pizza', category: 'Italian', rate: 72, aliases: ["olive jalapeno pizza","jalapeno olive pizza","ऑलिव जलापेनो पिज़्ज़ा","ઑલિવ જલાપેનો પિજ઼્જ઼ા"] },
{ name: 'Mexican Green Wave Pizza', category: 'Italian', rate: 72, aliases: ["mexican green wave pizza","mexican veg pizza","मेक्सिकन ग्रीन ववे पिज़्ज़ा","મેક્સિકન ગ્રીન વવે પિજ઼્જ઼ા"] },
{ name: 'Italian Garden Pizza', category: 'Italian', rate: 72, aliases: ["italian garden pizza","garden italian pizza","इटालियन गार्डन पिज़्ज़ा","ઇટાલિયન ગાર્ડન પિજ઼્જ઼ા"] },
{ name: 'Spinach Corn Pizza', category: 'Italian', rate: 70, aliases: ["spinach corn pizza","palak corn pizza","स्पिनच कॉर्न पिज़्ज़ा","સ્પિનચ કોર્ન પિજ઼્જ઼ા"] },
{ name: 'Broccoli Mushroom Pizza', category: 'Italian', rate: 76, aliases: ["broccoli mushroom pizza","mushroom broccoli pizza","ब्रोकली मशरूम पिज़्ज़ा","બ્રોકલી મશરૂમ પિજ઼્જ઼ા"] },
{ name: 'Exotic Vegetable Pizza', category: 'Italian', rate: 78, aliases: ["exotic vegetable pizza","exotic veg pizza","एग्ज़ॉटिक वेजिटेबल पिज़्ज़ा","એગ્જ઼ૉટિક વેજિટેબલ પિજ઼્જ઼ા"] },
{ name: 'Four Cheese Pizza', category: 'Italian', rate: 82, aliases: ["four cheese pizza","4 cheese pizza","फोर चीज़ पिज़्ज़ा","ફોર ચીઝ પિજ઼્જ઼ા"] },
{ name: 'Peri Peri Paneer Pizza', category: 'Italian', rate: 78, aliases: ["peri peri paneer pizza","peri-peri paneer pizza","पेरी पेरी पनीर पिज़्ज़ा","પેરી પેરી પનીર પિજ઼્જ઼ા"] },
{ name: 'Schezwan Paneer Pizza', category: 'Italian', rate: 76, aliases: ["schezwan paneer pizza","szechuan paneer pizza","शेज़वान पनीर पिज़्ज़ा","શેજ઼વાન પનીર પિજ઼્જ઼ા"] },
{ name: 'Thin Crust Margherita Pizza', category: 'Italian', rate: 68, aliases: ["thin crust margherita pizza","thin crust margarita pizza","थिन क्रुस्ट मार्गेरिटा पिज़्ज़ा","થિન ક્રુસ્ટ માર્ગેરિટા પિજ઼્જ઼ા"] },
{ name: 'Wood Fired Margherita Pizza', category: 'Italian', rate: 78, aliases: ["wood fired margherita pizza","woodfire margarita pizza","वूद फिरेद मार्गेरिटा पिज़्ज़ा","વૂદ ફિરેદ માર્ગેરિટા પિજ઼્જ઼ા"] },
{ name: 'Mini Veg Pizza', category: 'Italian', rate: 58, aliases: ["mini veg pizza","mini vegetable pizza","मिनी वेज पिज़्ज़ा","મિની વેજ પિજ઼્જ઼ા"] },
{ name: 'Mini Cheese Pizza', category: 'Italian', rate: 60, aliases: ["mini cheese pizza","small cheese pizza","मिनी चीज़ पिज़्ज़ा","મિની ચીઝ પિજ઼્જ઼ા"] },

// Italian — Lasagna and Baked Dishes

{ name: 'Vegetable Lasagna', category: 'Italian', rate: 65, aliases: ["vegetable lasagna","veg lasagna","lasagne","वेजिटेबल लज़ान्या","વેજિટેબલ લજ઼ાન્યા"] },
{ name: 'Spinach Corn Lasagna', category: 'Italian', rate: 68, aliases: ["spinach corn lasagna","palak corn lasagna","स्पिनच कॉर्न लज़ान्या","સ્પિનચ કોર્ન લજ઼ાન્યા"] },
{ name: 'Mushroom Lasagna', category: 'Italian', rate: 70, aliases: ["mushroom lasagna","veg mushroom lasagna","मशरूम लज़ान्या","મશરૂમ લજ઼ાન્યા"] },
{ name: 'Paneer Lasagna', category: 'Italian', rate: 72, aliases: ["paneer lasagna","paneer lasagne","पनीर लज़ान्या","પનીર લજ઼ાન્યા"] },
{ name: 'Cheese Lasagna', category: 'Italian', rate: 72, aliases: ["cheese lasagna","cheesy lasagna","चीज़ लज़ान्या","ચીઝ લજ઼ાન્યા"] },
{ name: 'Baked Vegetable Lasagna', category: 'Italian', rate: 70, aliases: ["baked vegetable lasagna","baked veg lasagna","बेक्ड वेजिटेबल लज़ान्या","બેક્ડ વેજિટેબલ લજ઼ાન્યા"] },
{ name: 'Baked Pasta', category: 'Italian', rate: 66, aliases: ["baked pasta","cheese baked pasta","बेक्ड पास्ता","બેક્ડ પાસ્તા"] },
{ name: 'Baked Penne', category: 'Italian', rate: 66, aliases: ["baked penne","cheesy baked penne","बेक्ड पेने","બેક્ડ પેને"] },
{ name: 'Pasta Au Gratin', category: 'Italian', rate: 68, aliases: ["pasta au gratin","pasta gratin","पास्ता ओ ग्रैटिन","પાસ્તા ઓ ગ્રૈટિન"] },
{ name: 'Vegetable Au Gratin', category: 'Italian', rate: 70, aliases: ["vegetable au gratin","veg au gratin","वेजिटेबल ओ ग्रैटिन","વેજિટેબલ ઓ ગ્રૈટિન"] },
{ name: 'Broccoli Au Gratin', category: 'Italian', rate: 72, aliases: ["broccoli au gratin","broccoli gratin","ब्रोकली ओ ग्रैटिन","બ્રોકલી ઓ ગ્રૈટિન"] },
{ name: 'Corn Spinach Au Gratin', category: 'Italian', rate: 70, aliases: ["corn spinach au gratin","spinach corn gratin","कॉर्न स्पिनच ओ ग्रैटिन","કોર્ન સ્પિનચ ઓ ગ્રૈટિન"] },
{ name: 'Cannelloni Florentine', category: 'Italian', rate: 74, aliases: ["cannelloni florentine","spinach cannelloni","कन्नेल्लोनि फ्लोरेन्तिने","કન્નેલ્લોનિ ફ્લોરેન્તિને"] },
{ name: 'Stuffed Pasta Shells', category: 'Italian', rate: 72, aliases: ["stuffed pasta shells","cheese stuffed pasta shells","स्टफ्ड पास्ता शेल्ल्स","સ્ટફ્ડ પાસ્તા શેલ્લ્સ"] },

// Italian — Garlic Bread and Starters

{ name: 'Garlic Bread', category: 'Italian', rate: 46, aliases: ["garlic bread","classic garlic bread","गार्लिक ब्रेड","લસણ બ્રેડ"] },
{ name: 'Cheese Garlic Bread', category: 'Italian', rate: 54, aliases: ["cheese garlic bread","cheesy garlic bread","चीज़ गार्लिक ब्रेड","ચીઝ લસણ બ્રેડ"] },
{ name: 'Stuffed Garlic Bread', category: 'Italian', rate: 62, aliases: ["stuffed garlic bread","filled garlic bread","स्टफ्ड गार्लिक ब्रेड","સ્ટફ્ડ લસણ બ્રેડ"] },
{ name: 'Corn Cheese Garlic Bread', category: 'Italian', rate: 60, aliases: ["corn cheese garlic bread","cheese corn garlic bread","कॉर्न चीज़ गार्लिक ब्रेड","કોર્ન ચીઝ લસણ બ્રેડ"] },
{ name: 'Jalapeno Cheese Garlic Bread', category: 'Italian', rate: 62, aliases: ["jalapeno cheese garlic bread","jalapeño cheese garlic bread","जलापेनो चीज़ गार्लिक ब्रेड","જલાપેનો ચીઝ લસણ બ્રેડ"] },
{ name: 'Bruschetta', category: 'Italian', rate: 58, aliases: ["bruschetta","classic bruschetta","ब्रुशेटा","બ્રુશેટા"] },
{ name: 'Tomato Basil Bruschetta', category: 'Italian', rate: 60, aliases: ["tomato basil bruschetta","basil tomato bruschetta","टोमेटो बेसिल ब्रुशेटा","ટામેટા બેસિલ બ્રુશેટા"] },
{ name: 'Cheese Corn Bruschetta', category: 'Italian', rate: 62, aliases: ["cheese corn bruschetta","corn cheese bruschetta","चीज़ कॉर्न ब्रुशेटा","ચીઝ કોર્ન બ્રુશેટા"] },
{ name: 'Mushroom Bruschetta', category: 'Italian', rate: 64, aliases: ["mushroom bruschetta","cheese mushroom bruschetta","मशरूम ब्रुशेटा","મશરૂમ બ્રુશેટા"] },
{ name: 'Olive Jalapeno Bruschetta', category: 'Italian', rate: 64, aliases: ["olive jalapeno bruschetta","jalapeno olive bruschetta","ऑलिव जलापेनो ब्रुशेटा","ઑલિવ જલાપેનો બ્રુશેટા"] },
{ name: 'Crostini', category: 'Italian', rate: 56, aliases: ["crostini","vegetable crostini","क्रोस्टिनी","ક્રોસ્ટિની"] },
{ name: 'Tomato Crostini', category: 'Italian', rate: 58, aliases: ["tomato crostini","tomato basil crostini","टोमेटो क्रोस्टिनी","ટામેટા ક્રોસ્ટિની"] },
{ name: 'Mushroom Crostini', category: 'Italian', rate: 62, aliases: ["mushroom crostini","garlic mushroom crostini","मशरूम क्रोस्टिनी","મશરૂમ ક્રોસ્ટિની"] },
{ name: 'Cheese Crostini', category: 'Italian', rate: 60, aliases: ["cheese crostini","cheesy crostini","चीज़ क्रोस्टिनी","ચીઝ ક્રોસ્ટિની"] },
{ name: 'Mozzarella Sticks', category: 'Italian', rate: 64, aliases: ["mozzarella sticks","fried mozzarella sticks","मोज़रेला स्टिक्स","મોજ઼રેલા સ્ટિક્સ"] },
{ name: 'Cheese Jalapeno Poppers', category: 'Italian', rate: 62, aliases: ["cheese jalapeno poppers","jalapeno cheese poppers","चीज़ जलापेनो पोप्पेर्स","ચીઝ જલાપેનો પોપ્પેર્સ"] },
{ name: 'Arancini Balls', category: 'Italian', rate: 68, aliases: ["arancini balls","risotto balls","अरान्चीनी बॉल्स","અરાન્ચીની બૉલ્સ"] },
{ name: 'Cheese Arancini', category: 'Italian', rate: 70, aliases: ["cheese arancini","cheesy risotto balls","चीज़ अरान्चीनी","ચીઝ અરાન્ચીની"] },

// Italian — Risotto

{ name: 'Vegetable Risotto', category: 'Italian', rate: 68, aliases: ["vegetable risotto","veg risotto","वेजिटेबल रिसोट्टो","વેજિટેબલ રિસોટ્ટો"] },
{ name: 'Mushroom Risotto', category: 'Italian', rate: 72, aliases: ["mushroom risotto","creamy mushroom risotto","मशरूम रिसोट्टो","મશરૂમ રિસોટ્ટો"] },
{ name: 'Spinach Corn Risotto', category: 'Italian', rate: 70, aliases: ["spinach corn risotto","palak corn risotto","स्पिनच कॉर्न रिसोट्टो","સ્પિનચ કોર્ન રિસોટ્ટો"] },
{ name: 'Tomato Basil Risotto', category: 'Italian', rate: 68, aliases: ["tomato basil risotto","basil tomato risotto","टोमेटो बेसिल रिसोट्टो","ટામેટા બેસિલ રિસોટ્ટો"] },
{ name: 'Pesto Risotto', category: 'Italian', rate: 72, aliases: ["pesto risotto","basil pesto risotto","पेस्टो रिसोट्टो","પેસ્ટો રિસોટ્ટો"] },
{ name: 'Broccoli Risotto', category: 'Italian', rate: 72, aliases: ["broccoli risotto","creamy broccoli risotto","ब्रोकली रिसोट्टो","બ્રોકલી રિસોટ્ટો"] },
{ name: 'Four Cheese Risotto', category: 'Italian', rate: 78, aliases: ["four cheese risotto","4 cheese risotto","फोर चीज़ रिसोट्टो","ફોર ચીઝ રિસોટ્ટો"] },
{ name: 'Truffle Mushroom Risotto', category: 'Italian', rate: 84, aliases: ["truffle mushroom risotto","mushroom truffle risotto","ट्रफल मशरूम रिसोट्टो","ટ્રફલ મશરૂમ રિસોટ્ટો"] },

// Italian — Calzone, Panini and Sandwiches

{ name: 'Vegetable Calzone', category: 'Italian', rate: 68, aliases: ["vegetable calzone","veg calzone","वेजिटेबल कैलज़ोन","વેજિટેબલ કૈલજ઼ોન"] },
{ name: 'Cheese Corn Calzone', category: 'Italian', rate: 70, aliases: ["cheese corn calzone","corn cheese calzone","चीज़ कॉर्न कैलज़ोन","ચીઝ કોર્ન કૈલજ઼ોન"] },
{ name: 'Paneer Tikka Calzone', category: 'Italian', rate: 74, aliases: ["paneer tikka calzone","tandoori paneer calzone","पनीर टिक्का कैलज़ोन","પનીર ટિક્કા કૈલજ઼ોન"] },
{ name: 'Mushroom Cheese Calzone', category: 'Italian', rate: 74, aliases: ["mushroom cheese calzone","cheese mushroom calzone","मशरूम चीज़ कैलज़ोन","મશરૂમ ચીઝ કૈલજ઼ોન"] },
{ name: 'Vegetable Panini', category: 'Italian', rate: 60, aliases: ["vegetable panini","veg panini","वेजिटेबल पानीनी","વેજિટેબલ પાનીની"] },
{ name: 'Pesto Vegetable Panini', category: 'Italian', rate: 64, aliases: ["pesto vegetable panini","pesto veg panini","पेस्टो वेजिटेबल पानीनी","પેસ્ટો વેજિટેબલ પાનીની"] },
{ name: 'Paneer Panini', category: 'Italian', rate: 66, aliases: ["paneer panini","paneer cheese panini","पनीर पानीनी","પનીર પાનીની"] },
{ name: 'Mushroom Panini', category: 'Italian', rate: 66, aliases: ["mushroom panini","mushroom cheese panini","मशरूम पानीनी","મશરૂમ પાનીની"] },
{ name: 'Grilled Italian Sandwich', category: 'Italian', rate: 58, aliases: ["grilled italian sandwich","italian grilled sandwich","ग्रिल्ड इटालियन सैंडविच","ગ્રિલ્ડ ઇટાલિયન સૈંડવિચ"] },
{ name: 'Pesto Cheese Sandwich', category: 'Italian', rate: 62, aliases: ["pesto cheese sandwich","cheese pesto sandwich","पेस्टो चीज़ सैंडविच","પેસ્ટો ચીઝ સૈંડવિચ"] },

// Italian — Salad and Sides

{ name: 'Italian Salad', category: 'Italian', rate: 42, aliases: ["italian salad","classic italian salad","इटालियन सलाद","ઇટાલિયન સલાડ"] },
{ name: 'Pasta Salad', category: 'Italian', rate: 48, aliases: ["pasta salad","cold pasta salad","पास्ता सलाद","પાસ્તા સલાડ"] },
{ name: 'Pesto Pasta Salad', category: 'Italian', rate: 54, aliases: ["pesto pasta salad","basil pesto pasta salad","पेस्टो पास्ता सलाद","પેસ્ટો પાસ્તા સલાડ"] },
{ name: 'Caprese Salad', category: 'Italian', rate: 62, aliases: ["caprese salad","tomato mozzarella salad","कप्रेसे सलाद","કપ્રેસે સલાડ"] },
{ name: 'Greek Pasta Salad', category: 'Italian', rate: 56, aliases: ["greek pasta salad","mediterranean pasta salad","ग्रीक पास्ता सलाद","ગ્રીક પાસ્તા સલાડ"] },
{ name: 'Roasted Vegetable Salad', category: 'Italian', rate: 54, aliases: ["roasted vegetable salad","roast veg salad","रोस्टेड वेजिटेबल सलाद","રોસ્ટેડ વેજિટેબલ સલાડ"] },
{ name: 'Herbed Vegetables', category: 'Italian', rate: 48, aliases: ["herbed vegetables","italian herb vegetables","हेर्बेद वेजिटेबल्स","હેર્બેદ વેજિટેબલ્સ"] },
{ name: 'Sauteed Vegetables', category: 'Italian', rate: 50, aliases: ["sauteed vegetables","sautéed vegetables","सौतीद वेजिटेबल्स","સૌતીદ વેજિટેબલ્સ"] },
{ name: 'Grilled Vegetables', category: 'Italian', rate: 54, aliases: ["grilled vegetables","italian grilled vegetables","ग्रिल्ड वेजिटेबल्स","ગ્રિલ્ડ વેજિટેબલ્સ"] },
{ name: 'Mashed Potato', category: 'Italian', rate: 44, aliases: ["mashed potato","creamy mashed potato","मशेद पोटैटो","મશેદ બટાકા"] },
{ name: 'Herb Roasted Potato', category: 'Italian', rate: 48, aliases: ["herb roasted potato","italian roasted potato","हेर्ब रोस्टेड पोटैटो","હેર્બ રોસ્ટેડ બટાકા"] },
  
 // South Indian — Dosa

{ name: 'Plain Dosa', category: 'South Indian', rate: 36, aliases: ["plain dosa","sada dosa","plain dosai","प्लेन डोसा","પ્લેન ઢોસા"] },
{ name: 'Masala Dosa', category: 'South Indian', rate: 42, aliases: ["masala dosa","masala dosai","मसाला डोसा","મસાલા ઢોસા"] },
{ name: 'Mysore Masala Dosa', category: 'South Indian', rate: 48, aliases: ["mysore masala dosa","mysuru masala dosa","मैसूर मसाला डोसा","મૈસૂર મસાલા ઢોસા"] },
{ name: 'Mysore Plain Dosa', category: 'South Indian', rate: 44, aliases: ["mysore plain dosa","mysore sada dosa","मैसूर प्लेन डोसा","મૈસૂર પ્લેન ઢોસા"] },
{ name: 'Butter Dosa', category: 'South Indian', rate: 42, aliases: ["butter dosa","butter plain dosa","बटर डोसा","બટર ઢોસા"] },
{ name: 'Butter Masala Dosa', category: 'South Indian', rate: 48, aliases: ["butter masala dosa","बटर मसाला डोसा","બટર મસાલા ઢોસા"] },
{ name: 'Cheese Dosa', category: 'South Indian', rate: 52, aliases: ["cheese dosa","cheesy dosa","चीज़ डोसा","ચીઝ ઢોસા"] },
{ name: 'Cheese Masala Dosa', category: 'South Indian', rate: 58, aliases: ["cheese masala dosa","cheesy masala dosa","चीज़ मसाला डोसा","ચીઝ મસાલા ઢોસા"] },
{ name: 'Paneer Dosa', category: 'South Indian', rate: 56, aliases: ["paneer dosa","paneer stuffed dosa","पनीर डोसा","પનીર ઢોસા"] },
{ name: 'Paneer Masala Dosa', category: 'South Indian', rate: 60, aliases: ["paneer masala dosa","पनीर मसाला डोसा","પનીર મસાલા ઢોસા"] },
{ name: 'Paneer Cheese Dosa', category: 'South Indian', rate: 64, aliases: ["paneer cheese dosa","cheese paneer dosa","पनीर चीज़ डोसा","પનીર ચીઝ ઢોસા"] },
{ name: 'Schezwan Dosa', category: 'South Indian', rate: 52, aliases: ["schezwan dosa","szechuan dosa","शेज़वान डोसा","શેજ઼વાન ઢોસા"] },
{ name: 'Schezwan Masala Dosa', category: 'South Indian', rate: 56, aliases: ["schezwan masala dosa","szechuan masala dosa","शेज़वान मसाला डोसा","શેજ઼વાન મસાલા ઢોસા"] },
{ name: 'Schezwan Cheese Dosa', category: 'South Indian', rate: 62, aliases: ["schezwan cheese dosa","cheese schezwan dosa","शेज़वान चीज़ डोसा","શેજ઼વાન ચીઝ ઢોસા"] },
{ name: 'Spring Dosa', category: 'South Indian', rate: 56, aliases: ["spring dosa","vegetable spring dosa","स्प्रिंग डोसा","સ્પ્રિંગ ઢોસા"] },
{ name: 'Chinese Dosa', category: 'South Indian', rate: 58, aliases: ["chinese dosa","chinese style dosa","चाइनीज़ डोसा","ચાઇનીજ઼ ઢોસા"] },
{ name: 'Noodle Dosa', category: 'South Indian', rate: 58, aliases: ["noodle dosa","noodles dosa","नूडल डोसा","નૂડલ ઢોસા"] },
{ name: 'Manchurian Dosa', category: 'South Indian', rate: 60, aliases: ["manchurian dosa","veg manchurian dosa","मंचूरियन डोसा","મંચૂરિયન ઢોસા"] },
{ name: 'Pizza Dosa', category: 'South Indian', rate: 64, aliases: ["pizza dosa","dosa pizza","पिज़्ज़ा डोसा","પિજ઼્જ઼ા ઢોસા"] },
{ name: 'Corn Cheese Dosa', category: 'South Indian', rate: 60, aliases: ["corn cheese dosa","cheese corn dosa","कॉर्न चीज़ डोसा","કોર્ન ચીઝ ઢોસા"] },
{ name: 'Palak Dosa', category: 'South Indian', rate: 48, aliases: ["palak dosa","spinach dosa","पालक डोसा","પાલક ઢોસા"] },
{ name: 'Beetroot Dosa', category: 'South Indian', rate: 48, aliases: ["beetroot dosa","beet dosa","बीटरूट डोसा","બીટરૂટ ઢોસા"] },
{ name: 'Tomato Dosa', category: 'South Indian', rate: 46, aliases: ["tomato dosa","thakkali dosa","टोमेटो डोसा","ટામેટા ઢોસા"] },
{ name: 'Onion Dosa', category: 'South Indian', rate: 44, aliases: ["onion dosa","pyaz dosa","अनियन डोसा","ડુંગળી ઢોસા"] },
{ name: 'Onion Masala Dosa', category: 'South Indian', rate: 48, aliases: ["onion masala dosa","pyaz masala dosa","अनियन मसाला डोसा","ડુંગળી મસાલા ઢોસા"] },
{ name: 'Garlic Dosa', category: 'South Indian', rate: 46, aliases: ["garlic dosa","lasoon dosa","lahsuni dosa","गार्लिक डोसा","લસણ ઢોસા"] },
{ name: 'Podi Dosa', category: 'South Indian', rate: 46, aliases: ["podi dosa","gunpowder dosa","milagai podi dosa","पोडी डोसा","પોડી ઢોસા"] },
{ name: 'Ghee Podi Dosa', category: 'South Indian', rate: 52, aliases: ["ghee podi dosa","ghee gunpowder dosa","घी पोडी डोसा","ઘી પોડી ઢોસા"] },
{ name: 'Ghee Roast Dosa', category: 'South Indian', rate: 52, aliases: ["ghee roast dosa","ghee dosa","घी रोस्ट डोसा","ઘી રોસ્ટ ઢોસા"] },
{ name: 'Paper Dosa', category: 'South Indian', rate: 48, aliases: ["paper dosa","paper plain dosa","पेपर डोसा","પેપર ઢોસા"] },
{ name: 'Paper Masala Dosa', category: 'South Indian', rate: 54, aliases: ["paper masala dosa","पेपर मसाला डोसा","પેપર મસાલા ઢોસા"] },
{ name: 'Family Paper Dosa', category: 'South Indian', rate: 72, aliases: ["family paper dosa","family dosa","फमिल्य पेपर डोसा","ફમિલ્ય પેપર ઢોસા"] },
{ name: 'Topi Dosa', category: 'South Indian', rate: 48, aliases: ["topi dosa","cap dosa","तोपि डोसा","તોપિ ઢોસા"] },
{ name: 'Cone Dosa', category: 'South Indian', rate: 48, aliases: ["cone dosa","dosa cone","कोने डोसा","કોને ઢોસા"] },
{ name: 'Set Dosa', category: 'South Indian', rate: 44, aliases: ["set dosa","set dosai","सेत डोसा","સેત ઢોસા"] },
{ name: 'Benne Dosa', category: 'South Indian', rate: 48, aliases: ["benne dosa","butter benne dosa","बेन्ने डोसा","બેન્ને ઢોસા"] },
{ name: 'Davangere Benne Dosa', category: 'South Indian', rate: 52, aliases: ["davangere benne dosa","davangere butter dosa","दवङेरे बेन्ने डोसा","દવઙેરે બેન્ને ઢોસા"] },
{ name: 'Neer Dosa', category: 'South Indian', rate: 44, aliases: ["neer dosa","neer dosai","नीर डोसा","નીર ઢોસા"] },
{ name: 'Rava Dosa', category: 'South Indian', rate: 46, aliases: ["rava dosa","sooji dosa","रवा डोसा","રવા ઢોસા"] },
{ name: 'Rava Masala Dosa', category: 'South Indian', rate: 52, aliases: ["rava masala dosa","sooji masala dosa","रवा मसाला डोसा","રવા મસાલા ઢોસા"] },
{ name: 'Onion Rava Dosa', category: 'South Indian', rate: 50, aliases: ["onion rava dosa","pyaz rava dosa","अनियन रवा डोसा","ડુંગળી રવા ઢોસા"] },
{ name: 'Onion Rava Masala Dosa', category: 'South Indian', rate: 56, aliases: ["onion rava masala dosa","अनियन रवा मसाला डोसा","ડુંગળી રવા મસાલા ઢોસા"] },
{ name: 'Moong Dal Dosa', category: 'South Indian', rate: 46, aliases: ["moong dal dosa","moong daal dosa","मूंग दाल डोसा","મૂંગ દાળ ઢોસા"] },
{ name: 'Pesarattu', category: 'South Indian', rate: 48, aliases: ["pesarattu","green moong dosa","पेसरट्टू","પેસરટ્ટૂ"] },
{ name: 'Pesarattu Upma', category: 'South Indian', rate: 54, aliases: ["pesarattu upma","upma pesarattu","पेसरट्टू उपमा","પેસરટ્ટૂ ઉપમા"] },
{ name: 'Adai Dosa', category: 'South Indian', rate: 50, aliases: ["adai dosa","adai dosai","mixed dal dosa","अडई डोसा","અડઈ ઢોસા"] },
{ name: 'Ragi Dosa', category: 'South Indian', rate: 48, aliases: ["ragi dosa","nachni dosa","रागी डोसा","રાગી ઢોસા"] },
{ name: 'Oats Dosa', category: 'South Indian', rate: 48, aliases: ["oats dosa","oat dosa","ओट्स डोसा","ઓટ્સ ઢોસા"] },
{ name: 'Quinoa Dosa', category: 'South Indian', rate: 56, aliases: ["quinoa dosa","क्विनोआ डोसा","ક્વિનોઆ ઢોસા"] },
{ name: 'Jowar Dosa', category: 'South Indian', rate: 48, aliases: ["jowar dosa","sorghum dosa","जोवर डोसा","જોવર ઢોસા"] },
{ name: 'Millet Dosa', category: 'South Indian', rate: 50, aliases: ["millet dosa","multi millet dosa","मिलेट डोसा","મિલેટ ઢોસા"] },

// South Indian — Idli

{ name: 'Plain Idli', category: 'South Indian', rate: 34, aliases: ["plain idli","steamed idli","प्लेन इडली","પ્લેન ઇડલી"] },
{ name: 'Idli Sambhar', category: 'South Indian', rate: 38, aliases: ["idli sambhar","idli sambar","idli with sambhar","इडली सांभर","ઇડલી સાંભાર"] },
{ name: 'Mini Idli Sambhar', category: 'South Indian', rate: 40, aliases: ["mini idli sambhar","mini idli sambar","मिनी इडली सांभर","મિની ઇડલી સાંભાર"] },
{ name: 'Button Idli Sambhar', category: 'South Indian', rate: 40, aliases: ["button idli sambhar","button idli sambar","बुत्तोन इडली सांभर","બુત્તોન ઇડલી સાંભાર"] },
{ name: 'Cocktail Idli', category: 'South Indian', rate: 42, aliases: ["cocktail idli","mini cocktail idli","कॉकटेल इडली","કૉકટેલ ઇડલી"] },
{ name: 'Podi Idli', category: 'South Indian', rate: 42, aliases: ["podi idli","gunpowder idli","milagai podi idli","पोडी इडली","પોડી ઇડલી"] },
{ name: 'Ghee Podi Idli', category: 'South Indian', rate: 46, aliases: ["ghee podi idli","ghee gunpowder idli","घी पोडी इडली","ઘી પોડી ઇડલી"] },
{ name: 'Fried Idli', category: 'South Indian', rate: 42, aliases: ["fried idli","crispy fried idli","फ्राइड इडली","ફ્રાઇડ ઇડલી"] },
{ name: 'Masala Fried Idli', category: 'South Indian', rate: 46, aliases: ["masala fried idli","spicy fried idli","मसाला फ्राइड इडली","મસાલા ફ્રાઇડ ઇડલી"] },
{ name: 'Chilli Idli', category: 'South Indian', rate: 48, aliases: ["chilli idli","chili idli","चिली इडली","ચિલી ઇડલી"] },
{ name: 'Schezwan Idli', category: 'South Indian', rate: 48, aliases: ["schezwan idli","szechuan idli","शेज़वान इडली","શેજ઼વાન ઇડલી"] },
{ name: 'Manchurian Idli', category: 'South Indian', rate: 50, aliases: ["manchurian idli","idli manchurian","मंचूरियन इडली","મંચૂરિયન ઇડલી"] },
{ name: 'Idli Upma', category: 'South Indian', rate: 42, aliases: ["idli upma","idli uppuma","इडली उपमा","ઇડલી ઉપમા"] },
{ name: 'Stuffed Idli', category: 'South Indian', rate: 46, aliases: ["stuffed idli","bharwa idli","स्टफ्ड इडली","સ્ટફ્ડ ઇડલી"] },
{ name: 'Vegetable Idli', category: 'South Indian', rate: 42, aliases: ["vegetable idli","veg idli","वेजिटेबल इडली","વેજિટેબલ ઇડલી"] },
{ name: 'Rava Idli', category: 'South Indian', rate: 40, aliases: ["rava idli","sooji idli","रवा इडली","રવા ઇડલી"] },
{ name: 'Kanchipuram Idli', category: 'South Indian', rate: 44, aliases: ["kanchipuram idli","kanchipuram kovil idli","कन्चिपुरम इडली","કન્ચિપુરમ ઇડલી"] },
{ name: 'Thatte Idli', category: 'South Indian', rate: 44, aliases: ["thatte idli","plate idli","थत्ते इडली","થત્તે ઇડલી"] },
{ name: 'Mallige Idli', category: 'South Indian', rate: 42, aliases: ["mallige idli","jasmine idli","मल्लिजे इडली","મલ્લિજે ઇડલી"] },
{ name: 'Ragi Idli', category: 'South Indian', rate: 42, aliases: ["ragi idli","nachni idli","रागी इडली","રાગી ઇડલી"] },
{ name: 'Oats Idli', category: 'South Indian', rate: 42, aliases: ["oats idli","oat idli","ओट्स इडली","ઓટ્સ ઇડલી"] },
{ name: 'Moong Dal Idli', category: 'South Indian', rate: 44, aliases: ["moong dal idli","moong daal idli","मूंग दाल इडली","મૂંગ દાળ ઇડલી"] },
{ name: 'Millet Idli', category: 'South Indian', rate: 44, aliases: ["millet idli","multi millet idli","मिलेट इडली","મિલેટ ઇડલી"] },
{ name: 'Kotte Kadubu', category: 'South Indian', rate: 44, aliases: ["kotte kadubu","kotte idli","leaf idli","कोत्ते कदुबु","કોત્તે કદુબુ"] },

// South Indian — Vada and Bhaji

{ name: 'Medu Vada', category: 'South Indian', rate: 40, aliases: ["medu vada","medu wada","uddina vada","मेदु वड़ा","મેદુ વડા"] },
{ name: 'Medu Vada Sambhar', category: 'South Indian', rate: 44, aliases: ["medu vada sambhar","medu vada sambar","vada sambhar","मेदु वड़ा सांभर","મેદુ વડા સાંભાર"] },
{ name: 'Mini Medu Vada', category: 'South Indian', rate: 40, aliases: ["mini medu vada","mini medu wada","मिनी मेदु वड़ा","મિની મેદુ વડા"] },
{ name: 'Sambhar Vada', category: 'South Indian', rate: 44, aliases: ["sambhar vada","sambar vada","सांभर वड़ा","સાંભાર વડા"] },
{ name: 'Rasam Vada', category: 'South Indian', rate: 44, aliases: ["rasam vada","vada rasam","रसम वड़ा","રસમ વડા"] },
{ name: 'Curd Vada', category: 'South Indian', rate: 46, aliases: ["curd vada","thayir vada","dahi vada south indian","कर्ड वड़ा","દહીં વડા"] },
{ name: 'Masala Vada', category: 'South Indian', rate: 40, aliases: ["masala vada","paruppu vadai","मसाला वड़ा","મસાલા વડા"] },
{ name: 'Dal Vada South Indian', category: 'South Indian', rate: 40, aliases: ["dal vada south indian","south indian dal vada","chana dal vada south indian","दाल वड़ा साउथ इंडियन","દાળ વડા સાઉથ ઇંડિયન"] },
{ name: 'Mysore Bonda', category: 'South Indian', rate: 42, aliases: ["mysore bonda","mysuru bonda","मैसूर बोंडा","મૈસૂર બોંડા"] },
{ name: 'Aloo Bonda', category: 'South Indian', rate: 40, aliases: ["aloo bonda","potato bonda","आलू बोंडा","આલૂ બોંડા"] },
{ name: 'Punugulu', category: 'South Indian', rate: 40, aliases: ["punugulu","punukulu","पुनुगुलु","પુનુગુલુ"] },
{ name: 'Mangalore Bajji', category: 'South Indian', rate: 42, aliases: ["mangalore bajji","mangalore bonda","goli baje","मङलोरे बज्जी","મઙલોરે બજ્જી"] },
{ name: 'Banana Bajji', category: 'South Indian', rate: 42, aliases: ["banana bajji","raw banana bajji","vazhakkai bajji","बनाना बज्जी","બનાના બજ્જી"] },
{ name: 'Onion Bajji', category: 'South Indian', rate: 40, aliases: ["onion bajji","vengaya bajji","अनियन बज्जी","ડુંગળી બજ્જી"] },
{ name: 'Chilli Bajji', category: 'South Indian', rate: 40, aliases: ["chilli bajji","mirchi bajji","milagai bajji","चिली बज्जी","ચિલી બજ્જી"] },
{ name: 'Bread Bajji', category: 'South Indian', rate: 42, aliases: ["bread bajji","bread pakoda south indian","ब्रेड बज्जी","બ્રેડ બજ્જી"] },

// South Indian — Uttapam

{ name: 'Plain Uttapam', category: 'South Indian', rate: 40, aliases: ["plain uttapam","sada uttapam","प्लेन उत्तपम","પ્લેન ઉત્તપમ"] },
{ name: 'Onion Uttapam', category: 'South Indian', rate: 44, aliases: ["onion uttapam","pyaz uttapam","अनियन उत्तपम","ડુંગળી ઉત્તપમ"] },
{ name: 'Tomato Uttapam', category: 'South Indian', rate: 44, aliases: ["tomato uttapam","thakkali uttapam","टोमेटो उत्तपम","ટામેટા ઉત્તપમ"] },
{ name: 'Onion Tomato Uttapam', category: 'South Indian', rate: 46, aliases: ["onion tomato uttapam","tomato onion uttapam","अनियन टोमेटो उत्तपम","ડુંગળી ટામેટા ઉત્તપમ"] },
{ name: 'Vegetable Uttapam', category: 'South Indian', rate: 48, aliases: ["vegetable uttapam","veg uttapam","वेजिटेबल उत्तपम","વેજિટેબલ ઉત્તપમ"] },
{ name: 'Masala Uttapam', category: 'South Indian', rate: 48, aliases: ["masala uttapam","मसाला उत्तपम","મસાલા ઉત્તપમ"] },
{ name: 'Cheese Uttapam', category: 'South Indian', rate: 54, aliases: ["cheese uttapam","cheesy uttapam","चीज़ उत्तपम","ચીઝ ઉત્તપમ"] },
{ name: 'Paneer Uttapam', category: 'South Indian', rate: 56, aliases: ["paneer uttapam","पनीर उत्तपम","પનીર ઉત્તપમ"] },
{ name: 'Paneer Cheese Uttapam', category: 'South Indian', rate: 62, aliases: ["paneer cheese uttapam","cheese paneer uttapam","पनीर चीज़ उत्तपम","પનીર ચીઝ ઉત્તપમ"] },
{ name: 'Corn Cheese Uttapam', category: 'South Indian', rate: 58, aliases: ["corn cheese uttapam","cheese corn uttapam","कॉर्न चीज़ उत्तपम","કોર્ન ચીઝ ઉત્તપમ"] },
{ name: 'Schezwan Uttapam', category: 'South Indian', rate: 52, aliases: ["schezwan uttapam","szechuan uttapam","शेज़वान उत्तपम","શેજ઼વાન ઉત્તપમ"] },
{ name: 'Podi Uttapam', category: 'South Indian', rate: 46, aliases: ["podi uttapam","gunpowder uttapam","पोडी उत्तपम","પોડી ઉત્તપમ"] },
{ name: 'Mini Uttapam', category: 'South Indian', rate: 44, aliases: ["mini uttapam","small uttapam","मिनी उत्तपम","મિની ઉત્તપમ"] },
{ name: 'Mini Vegetable Uttapam', category: 'South Indian', rate: 48, aliases: ["mini vegetable uttapam","mini veg uttapam","मिनी वेजिटेबल उत्तपम","મિની વેજિટેબલ ઉત્તપમ"] },
{ name: 'Rava Uttapam', category: 'South Indian', rate: 46, aliases: ["rava uttapam","sooji uttapam","रवा उत्तपम","રવા ઉત્તપમ"] },
{ name: 'Oats Uttapam', category: 'South Indian', rate: 48, aliases: ["oats uttapam","oat uttapam","ओट्स उत्तपम","ઓટ્સ ઉત્તપમ"] },

// South Indian — Upma, Pongal and Breakfast

{ name: 'Rava Upma', category: 'South Indian', rate: 38, aliases: ["rava upma","sooji upma","uppuma","रवा उपमा","રવા ઉપમા"] },
{ name: 'Vegetable Upma', category: 'South Indian', rate: 42, aliases: ["vegetable upma","veg upma","वेजिटेबल उपमा","વેજિટેબલ ઉપમા"] },
{ name: 'Tomato Upma', category: 'South Indian', rate: 42, aliases: ["tomato upma","thakkali upma","टोमेटो उपमा","ટામેટા ઉપમા"] },
{ name: 'Lemon Upma', category: 'South Indian', rate: 42, aliases: ["lemon upma","lime upma","लेमन उपमा","લેમન ઉપમા"] },
{ name: 'Semiya Upma', category: 'South Indian', rate: 42, aliases: ["semiya upma","vermicelli upma","sevai upma","सेमिय उपमा","સેમિય ઉપમા"] },
{ name: 'Aval Upma', category: 'South Indian', rate: 40, aliases: ["aval upma","poha upma","beaten rice upma","अवल उपमा","અવલ ઉપમા"] },
{ name: 'Bread Upma', category: 'South Indian', rate: 42, aliases: ["bread upma","masala bread upma","ब्रेड उपमा","બ્રેડ ઉપમા"] },
{ name: 'Ven Pongal', category: 'South Indian', rate: 44, aliases: ["ven pongal","khara pongal","savory pongal","वेन पोंगल","વેન પોંગલ"] },
{ name: 'Sweet Pongal', category: 'South Indian', rate: 46, aliases: ["sweet pongal","sakkarai pongal","chakkara pongal","स्वीट पोंगल","સ્વીટ પોંગલ"] },
{ name: 'Rava Pongal', category: 'South Indian', rate: 44, aliases: ["rava pongal","sooji pongal","रवा पोंगल","રવા પોંગલ"] },
{ name: 'Millet Pongal', category: 'South Indian', rate: 48, aliases: ["millet pongal","multi millet pongal","मिलेट पोंगल","મિલેટ પોંગલ"] },
{ name: 'Khara Bath', category: 'South Indian', rate: 42, aliases: ["khara bath","kharabath","खर बाथ","ખર બાથ"] },
{ name: 'Kesari Bath', category: 'South Indian', rate: 44, aliases: ["kesari bath","kesari bhath","rava kesari","केसरि बाथ","કેસરિ બાથ"] },
{ name: 'Chow Chow Bath', category: 'South Indian', rate: 52, aliases: ["chow chow bath","chow chow bhath","चाउ चाउ बाथ","ચાઉ ચાઉ બાથ"] },
{ name: 'Akki Roti', category: 'South Indian', rate: 48, aliases: ["akki roti","rice flour roti","अक्कि रोटी","અક્કિ રોટી"] },
{ name: 'Ragi Roti', category: 'South Indian', rate: 48, aliases: ["ragi roti","nachni roti","रागी रोटी","રાગી રોટી"] },
{ name: 'Adai Avial', category: 'South Indian', rate: 56, aliases: ["adai avial","adai with avial","अडई अवियल","અડઈ અવિયલ"] },

// South Indian — Rice

{ name: 'Lemon Rice', category: 'South Indian', rate: 38, aliases: ["lemon rice","nimbu rice","chitranna","लेमन राइस","લેમન રાઇસ"] },
{ name: 'Tamarind Rice', category: 'South Indian', rate: 40, aliases: ["tamarind rice","puliyogare","puliyodarai","इमली राइस","આમલી રાઇસ"] },
{ name: 'Curd Rice', category: 'South Indian', rate: 40, aliases: ["curd rice","yogurt rice","thayir sadam","कर्ड राइस","દહીં રાઇસ"] },
{ name: 'Coconut Rice', category: 'South Indian', rate: 42, aliases: ["coconut rice","thengai sadam","कोकोनट राइस","કોકોનટ રાઇસ"] },
{ name: 'Tomato Rice', category: 'South Indian', rate: 42, aliases: ["tomato rice","thakkali sadam","टोमेटो राइस","ટામેટા રાઇસ"] },
{ name: 'Sambhar Rice', category: 'South Indian', rate: 44, aliases: ["sambhar rice","sambar rice","सांभर राइस","સાંભાર રાઇસ"] },
{ name: 'Rasam Rice', category: 'South Indian', rate: 42, aliases: ["rasam rice","rasam sadam","रसम राइस","રસમ રાઇસ"] },
{ name: 'Bisibele Bath', category: 'South Indian', rate: 46, aliases: ["bisibele bath","bisi bele bath","bisi bele bhath","बिसिबेले बाथ","બિસિબેલે બાથ"] },
{ name: 'Vegetable Bath', category: 'South Indian', rate: 44, aliases: ["vegetable bath","vegetable bhath","veg bath","वेजिटेबल बाथ","વેજિટેબલ બાથ"] },
{ name: 'Vangi Bath', category: 'South Indian', rate: 44, aliases: ["vangi bath","brinjal rice","eggplant rice","वङि बाथ","વઙિ બાથ"] },
{ name: 'Mango Rice', category: 'South Indian', rate: 42, aliases: ["mango rice","raw mango rice","mavinakayi chitranna","मैंगो राइस","મેંગો રાઇસ"] },
{ name: 'Mint Rice', category: 'South Indian', rate: 42, aliases: ["mint rice","pudina rice","मिंट राइस","મિંટ રાઇસ"] },
{ name: 'Coriander Rice', category: 'South Indian', rate: 42, aliases: ["coriander rice","dhaniya rice","कोरिएंडर राइस","કોથમીર રાઇસ"] },
{ name: 'Peanut Rice', category: 'South Indian', rate: 42, aliases: ["peanut rice","groundnut rice","पीनट राइस","મગફળી રાઇસ"] },
{ name: 'Sesame Rice', category: 'South Indian', rate: 42, aliases: ["sesame rice","til rice","ellu sadam","सेसमे राइस","સેસમે રાઇસ"] },
{ name: 'South Indian Vegetable Pulao', category: 'South Indian', rate: 46, aliases: ["south indian vegetable pulao","south indian veg pulao","साउथ इंडियन वेजिटेबल पुलाव","સાઉથ ઇંડિયન વેજિટેબલ પુલાવ"] },
{ name: 'Coconut Milk Pulao', category: 'South Indian', rate: 50, aliases: ["coconut milk pulao","coconut pulao","कोकोनट मिल्क पुलाव","કોકોનટ મિલ્ક પુલાવ"] },
{ name: 'Chettinad Vegetable Rice', category: 'South Indian', rate: 50, aliases: ["chettinad vegetable rice","chettinad veg rice","चेट्टिनाड वेजिटेबल राइस","ચેટ્ટિનાડ વેજિટેબલ રાઇસ"] },
{ name: 'Karnataka Puliyogare', category: 'South Indian', rate: 42, aliases: ["karnataka puliyogare","karnataka tamarind rice","कर्नतक पुलियोगरे","કર્નતક પુલિયોગરે"] },
{ name: 'Andhra Pulihora', category: 'South Indian', rate: 42, aliases: ["andhra pulihora","andhra tamarind rice","अन्ध्र पुलिहोर","અન્ધ્ર પુલિહોર"] },

// South Indian — Appam, Idiyappam and Kerala

{ name: 'Appam', category: 'South Indian', rate: 44, aliases: ["appam","palappam","अप्पम","અપ્પમ"] },
{ name: 'Appam with Vegetable Stew', category: 'South Indian', rate: 58, aliases: ["appam with vegetable stew","appam veg stew","अप्पम विथ वेजिटेबल स्ट्यू","અપ્પમ વિથ વેજિટેબલ સ્ટ્યૂ"] },
{ name: 'Appam with Kadala Curry', category: 'South Indian', rate: 56, aliases: ["appam with kadala curry","appam chana curry","अप्पम विथ कडला करी","અપ્પમ વિથ કડલા કરી"] },
{ name: 'Idiyappam', category: 'South Indian', rate: 44, aliases: ["idiyappam","string hoppers","nool puttu","इडियप्पम","ઇડિયપ્પમ"] },
{ name: 'Idiyappam with Vegetable Stew', category: 'South Indian', rate: 58, aliases: ["idiyappam with vegetable stew","idiyappam veg stew","इडियप्पम विथ वेजिटेबल स्ट्यू","ઇડિયપ્પમ વિથ વેજિટેબલ સ્ટ્યૂ"] },
{ name: 'Idiyappam with Coconut Milk', category: 'South Indian', rate: 52, aliases: ["idiyappam with coconut milk","string hoppers coconut milk","इडियप्पम विथ कोकोनट मिल्क","ઇડિયપ્પમ વિથ કોકોનટ મિલ્ક"] },
{ name: 'Puttu with Kadala Curry', category: 'South Indian', rate: 54, aliases: ["puttu with kadala curry","puttu kadala","पुत्तु विथ कडला करी","પુત્તુ વિથ કડલા કરી"] },
{ name: 'Kerala Parotta with Vegetable Kurma', category: 'South Indian', rate: 58, aliases: ["kerala parotta with vegetable kurma","malabar parotta veg kurma","केरल परोट्टा विथ वेजिटेबल कुर्मा","કેરલ પરોટ્ટા વિથ વેજિટેબલ કુર્મા"] },
{ name: 'Malabar Parotta', category: 'South Indian', rate: 42, aliases: ["malabar parotta","kerala parotta","मलबर परोट्टा","મલબર પરોટ્ટા"] },
{ name: 'Vegetable Stew', category: 'South Indian', rate: 48, aliases: ["vegetable stew","kerala vegetable stew","veg stew kerala","वेजिटेबल स्ट्यू","વેજિટેબલ સ્ટ્યૂ"] },
{ name: 'Kadala Curry', category: 'South Indian', rate: 44, aliases: ["kadala curry","kerala black chana curry","कडला करी","કડલા કરી"] },
{ name: 'Avial', category: 'South Indian', rate: 46, aliases: ["avial","aviyal","kerala mixed vegetable avial","अवियल","અવિયલ"] },
{ name: 'Olan', category: 'South Indian', rate: 44, aliases: ["olan","kerala olan","ओलन","ઓલન"] },
{ name: 'Kootu Curry', category: 'South Indian', rate: 46, aliases: ["kootu curry","kerala kootu curry","कूतु करी","કૂતુ કરી"] },
{ name: 'Thoran', category: 'South Indian', rate: 42, aliases: ["thoran","vegetable thoran","kerala thoran","थोरन","થોરન"] },

// South Indian — Snacks and Regional Items

{ name: 'Kuzhi Paniyaram', category: 'South Indian', rate: 44, aliases: ["kuzhi paniyaram","appe","paddu","gunta ponganalu","कुज़्हि पनियारम","કુજ઼્હિ પનિયારમ"] },
{ name: 'Masala Paniyaram', category: 'South Indian', rate: 46, aliases: ["masala paniyaram","masala appe","मसाला पनियारम","મસાલા પનિયારમ"] },
{ name: 'Cheese Paniyaram', category: 'South Indian', rate: 52, aliases: ["cheese paniyaram","cheese appe","चीज़ पनियारम","ચીઝ પનિયારમ"] },
{ name: 'Vegetable Paniyaram', category: 'South Indian', rate: 48, aliases: ["vegetable paniyaram","veg appe","वेजिटेबल पनियारम","વેજિટેબલ પનિયારમ"] },
{ name: 'Kothu Parotta', category: 'South Indian', rate: 54, aliases: ["kothu parotta","veg kothu parotta","vegetable kothu parotta","कोथु परोट्टा","કોથુ પરોટ્ટા"] },
{ name: 'Chilli Parotta', category: 'South Indian', rate: 52, aliases: ["chilli parotta","chili parotta","चिली परोट्टा","ચિલી પરોટ્ટા"] },
{ name: 'Mini Ghee Idli', category: 'South Indian', rate: 46, aliases: ["mini ghee idli","ghee button idli","मिनी घी इडली","મિની ઘી ઇડલી"] },
{ name: 'Rasam Shots', category: 'South Indian', rate: 28, aliases: ["rasam shots","rasam shot","रसम शोत्स","રસમ શોત્સ"] },
{ name: 'Mini Dosa Rolls', category: 'South Indian', rate: 50, aliases: ["mini dosa rolls","dosa roll bites","मिनी डोसा रोल्ल्स","મિની ઢોસા રોલ્લ્સ"] },
{ name: 'Idli Chaat', category: 'South Indian', rate: 48, aliases: ["idli chaat","south indian idli chaat","इडली चाट","ઇડલી ચાટ"] },
{ name: 'Dosa Chaat', category: 'South Indian', rate: 52, aliases: ["dosa chaat","south indian dosa chaat","डोसा चाट","ઢોસા ચાટ"] },
{ name: 'South Indian Platter', category: 'South Indian', rate: 78, aliases: ["south indian platter","south indian combo platter","साउथ इंडियन प्लैटर","સાઉથ ઇંડિયન પ્લૈટર"] },
{ name: 'Mini South Indian Platter', category: 'South Indian', rate: 68, aliases: ["mini south indian platter","mini south indian combo","मिनी साउथ इंडियन प्लैटर","મિની સાઉથ ઇંડિયન પ્લૈટર"] },

// South Indian — Accompaniments and Curries

{ name: 'Sambhar', category: 'South Indian', rate: 22, aliases: ["sambhar","south indian sambhar","south indian sambar","सांभर","સાંભાર"] },
{ name: 'Vegetable Sambhar', category: 'South Indian', rate: 24, aliases: ["vegetable sambhar","vegetable sambar","वेजिटेबल सांभर","વેજિટેબલ સાંભાર"] },
{ name: 'Tiffin Sambhar', category: 'South Indian', rate: 24, aliases: ["tiffin sambhar","tiffin sambar","तिफ्फिन सांभर","તિફ્ફિન સાંભાર"] },
{ name: 'Rasam', category: 'South Indian', rate: 22, aliases: ["rasam","south indian rasam","tomato rasam","रसम","રસમ"] },
{ name: 'Pepper Rasam', category: 'South Indian', rate: 24, aliases: ["pepper rasam","milagu rasam","पेपर रसम","પેપર રસમ"] },
{ name: 'Lemon Rasam', category: 'South Indian', rate: 24, aliases: ["lemon rasam","elumichai rasam","लेमन रसम","લેમન રસમ"] },
{ name: 'Mysore Rasam', category: 'South Indian', rate: 26, aliases: ["mysore rasam","mysuru rasam","मैसूर रसम","મૈસૂર રસમ"] },
{ name: 'Vegetable Kurma', category: 'South Indian', rate: 44, aliases: ["vegetable kurma","south indian vegetable kurma","south indian veg korma","वेजिटेबल कुर्मा","વેજિટેબલ કુર્મા"] },
{ name: 'Potato Masala', category: 'South Indian', rate: 34, aliases: ["potato masala","dosa potato masala","south indian aloo masala","पोटैटो मसाला","બટાકા મસાલા"] },
{ name: 'Coconut Chutney', category: 'South Indian', rate: 8, aliases: ["coconut chutney","nariyal chutney","thengai chutney","कोकोनट चटनी","કોકોનટ ચટણી"] },
{ name: 'Tomato Chutney', category: 'South Indian', rate: 8, aliases: ["tomato chutney","south indian tomato chutney","thakkali chutney","टोमेटो चटनी","ટામેટા ચટણી"] },
{ name: 'Peanut Chutney', category: 'South Indian', rate: 8, aliases: ["peanut chutney","groundnut chutney","पीनट चटनी","મગફળી ચટણી"] },
{ name: 'Mint Coconut Chutney', category: 'South Indian', rate: 9, aliases: ["mint coconut chutney","pudina coconut chutney","मिंट कोकोनट चटनी","મિંટ કોકોનટ ચટણી"] },
 
 

 // Sabji — Mixed Vegetable

{ name: 'Mix Veg', category: 'Sabji', rate: 48, aliases: ["mix veg","mixed vegetable sabji","mixed vegetables","मिक्स वेज","મિક્સ વેજ"] },
{ name: 'Mix Veg Curry', category: 'Sabji', rate: 50, aliases: ["mix veg curry","mixed vegetable curry","मिक्स वेज करी","મિક્સ વેજ કરી"] },
{ name: 'Mix Veg Dry', category: 'Sabji', rate: 48, aliases: ["mix veg dry","dry mixed vegetable","मिक्स वेज ड्राई","મિક્સ વેજ ડ્રાઈ"] },
{ name: 'Veg Kolhapuri', category: 'Sabji', rate: 56, aliases: ["veg kolhapuri","vegetable kolhapuri","वेज कोल्हापुरी","વેજ કોલ્હાપુરી"] },
{ name: 'Veg Jalfrezi', category: 'Sabji', rate: 54, aliases: ["veg jalfrezi","vegetable jalfrezi","वेज जलफ्रेज़ी","વેજ જલફ્રેજ઼ી"] },
{ name: 'Veg Kadai', category: 'Sabji', rate: 56, aliases: ["veg kadai","kadai vegetable","kadhai veg","वेज कड़ाही","વેજ કડ઼ાહી"] },
{ name: 'Veg Handi', category: 'Sabji', rate: 56, aliases: ["veg handi","vegetable handi","वेज हांडी","વેજ હાંડી"] },
{ name: 'Veg Makhanwala', category: 'Sabji', rate: 58, aliases: ["veg makhanwala","vegetable makhanwala","वेज मक्खनवाला","વેજ મક્ખનવાલા"] },
{ name: 'Veg Jaipuri', category: 'Sabji', rate: 58, aliases: ["veg jaipuri","vegetable jaipuri","वेज जैपुरि","વેજ જૈપુરિ"] },
{ name: 'Veg Hyderabadi', category: 'Sabji', rate: 58, aliases: ["veg hyderabadi","vegetable hyderabadi","वेज हैदराबादी","વેજ હૈદરાબાદી"] },
{ name: 'Veg Mughlai', category: 'Sabji', rate: 62, aliases: ["veg mughlai","vegetable mughlai","वेज मुग़लई","વેજ મુગ઼લઈ"] },
{ name: 'Veg Diwani Handi', category: 'Sabji', rate: 60, aliases: ["veg diwani handi","diwani vegetable handi","वेज दिवनि हांडी","વેજ દિવનિ હાંડી"] },
{ name: 'Subz Miloni', category: 'Sabji', rate: 58, aliases: ["subz miloni","sabz miloni","सब्ज़ मिलोनि","સબ્જ઼ મિલોનિ"] },
{ name: 'Subz Bahar', category: 'Sabji', rate: 58, aliases: ["subz bahar","sabz bahar","सब्ज़ बहर","સબ્જ઼ બહર"] },
{ name: 'Subz Panchratna', category: 'Sabji', rate: 60, aliases: ["subz panchratna","vegetable panchratna","सब्ज़ पन्च्रत्न","સબ્જ઼ પન્ચ્રત્ન"] },
{ name: 'Navratan Korma', category: 'Sabji', rate: 64, aliases: ["navratan korma","navratna kurma","navratan kurma","नवरत्न कोरमा","નવરત્ન કોરમા"] },
{ name: 'Vegetable Korma', category: 'Sabji', rate: 56, aliases: ["vegetable korma","veg korma","vegetable kurma","वेजिटेबल कोरमा","વેજિટેબલ કોરમા"] },
{ name: 'Vegetable Stew', category: 'Sabji', rate: 52, aliases: ["vegetable stew","veg stew","वेजिटेबल स्ट्यू","વેજિટેબલ સ્ટ્યૂ"] },
{ name: 'Vegetable Do Pyaza', category: 'Sabji', rate: 54, aliases: ["vegetable do pyaza","veg dopiaza","वेजिटेबल दो प्याज़ा","વેજિટેબલ દો પ્યાજ઼ા"] },
{ name: 'Vegetable Lahori', category: 'Sabji', rate: 58, aliases: ["vegetable lahori","veg lahori","वेजिटेबल लहोरि","વેજિટેબલ લહોરિ"] },

// Sabji — Potato

{ name: 'Aloo Gobi', category: 'Sabji', rate: 50, aliases: ["aloo gobi","alu gobi","potato cauliflower sabji","आलू गोभी","આલૂ ગોબી"] },
{ name: 'Aloo Matar', category: 'Sabji', rate: 46, aliases: ["aloo matar","alu matar","potato peas curry","आलू मटर","આલૂ મટર"] },
{ name: 'Aloo Tamatar', category: 'Sabji', rate: 44, aliases: ["aloo tamatar","alu tomato sabji","potato tomato curry","आलू टमाटर","આલૂ ટમેટા"] },
{ name: 'Aloo Palak', category: 'Sabji', rate: 48, aliases: ["aloo palak","potato spinach curry","आलू पालक","આલૂ પાલક"] },
{ name: 'Aloo Methi', category: 'Sabji', rate: 48, aliases: ["aloo methi","potato fenugreek sabji","आलू मेथी","આલૂ મેથી"] },
{ name: 'Aloo Jeera', category: 'Sabji', rate: 44, aliases: ["aloo jeera","jeera aloo","cumin potato","आलू जीरा","આલૂ જીરુ"] },
{ name: 'Aloo Fry', category: 'Sabji', rate: 42, aliases: ["aloo fry","potato fry sabji","आलू फ्राई","આલૂ ફ્રાઈ"] },
{ name: 'Aloo Masala', category: 'Sabji', rate: 44, aliases: ["aloo masala","aloo masala sabji","potato masala curry","आलू मसाला","આલૂ મસાલા"] },
{ name: 'Dum Aloo', category: 'Sabji', rate: 52, aliases: ["dum aloo","dum alu","दम आलू","દમ આલૂ"] },
{ name: 'Kashmiri Dum Aloo', category: 'Sabji', rate: 58, aliases: ["kashmiri dum aloo","kashmiri dum alu","कश्मीरी दम आलू","કશ્મીરી દમ આલૂ"] },
{ name: 'Punjabi Dum Aloo', category: 'Sabji', rate: 56, aliases: ["punjabi dum aloo","punjabi dum alu","पंजाबी दम आलू","પંજાબી દમ આલૂ"] },
{ name: 'Banarasi Dum Aloo', category: 'Sabji', rate: 56, aliases: ["banarasi dum aloo","banaras dum aloo","बनरसि दम आलू","બનરસિ દમ આલૂ"] },
{ name: 'Aloo Do Pyaza', category: 'Sabji', rate: 48, aliases: ["aloo do pyaza","potato dopiaza","आलू दो प्याज़ा","આલૂ દો પ્યાજ઼ા"] },
{ name: 'Aloo Capsicum', category: 'Sabji', rate: 48, aliases: ["aloo capsicum","potato capsicum sabji","आलू कैप्सिकम","આલૂ કૈપ્સિકમ"] },
{ name: 'Aloo Beans', category: 'Sabji', rate: 46, aliases: ["aloo beans","potato french beans sabji","आलू बीन्स","આલૂ બીન્સ"] },
{ name: 'Aloo Baingan', category: 'Sabji', rate: 46, aliases: ["aloo baingan","potato brinjal sabji","आलू बैंगन","આલૂ રીંગણ"] },
{ name: 'Aloo Parwal', category: 'Sabji', rate: 48, aliases: ["aloo parwal","potato pointed gourd sabji","आलू परवल","આલૂ પરવલ"] },
{ name: 'Aloo Shimla Mirch', category: 'Sabji', rate: 48, aliases: ["aloo shimla mirch","potato bell pepper sabji","आलू शिम्ल मिर्च","આલૂ શિમ્લ મરચું"] },
{ name: 'Baby Potato Masala', category: 'Sabji', rate: 52, aliases: ["baby potato masala","baby aloo masala","बेबी पोटैटो मसाला","બેબી બટાકા મસાલા"] },
{ name: 'Achari Aloo', category: 'Sabji', rate: 50, aliases: ["achari aloo","pickle masala potato","अचारी आलू","અચારી આલૂ"] },

// Sabji — Cauliflower, Cabbage and Broccoli

{ name: 'Gobi Matar', category: 'Sabji', rate: 48, aliases: ["gobi matar","cauliflower peas sabji","गोभी मटर","ગોબી મટર"] },
{ name: 'Gobi Masala', category: 'Sabji', rate: 50, aliases: ["gobi masala","cauliflower masala curry","गोभी मसाला","ગોબી મસાલા"] },
{ name: 'Gobi Do Pyaza', category: 'Sabji', rate: 52, aliases: ["gobi do pyaza","cauliflower dopiaza","गोभी दो प्याज़ा","ગોબી દો પ્યાજ઼ા"] },
{ name: 'Adraki Gobi', category: 'Sabji', rate: 52, aliases: ["adraki gobi","ginger cauliflower sabji","अद्रकि गोभी","અદ્રકિ ગોબી"] },
{ name: 'Gobi Kaju Masala', category: 'Sabji', rate: 58, aliases: ["gobi kaju masala","cauliflower cashew curry","गोभी काजू मसाला","ગોબી કાજુ મસાલા"] },
{ name: 'Cabbage Peas Sabji', category: 'Sabji', rate: 44, aliases: ["cabbage peas sabji","patta gobhi matar","कैबेज पीज़ सब्जी","કૈબેજ પીજ઼ સબ્જી"] },
{ name: 'Cabbage Potato Sabji', category: 'Sabji', rate: 44, aliases: ["cabbage potato sabji","patta gobhi aloo","कैबेज पोटैटो सब्जी","કૈબેજ બટાકા સબ્જી"] },
{ name: 'Cabbage Capsicum Sabji', category: 'Sabji', rate: 46, aliases: ["cabbage capsicum sabji","patta gobhi shimla mirch","कैबेज कैप्सिकम सब्जी","કૈબેજ કૈપ્સિકમ સબ્જી"] },
{ name: 'Broccoli Masala', category: 'Sabji', rate: 62, aliases: ["broccoli masala","broccoli curry","ब्रोकली मसाला","બ્રોકલી મસાલા"] },
{ name: 'Broccoli Mushroom Masala', category: 'Sabji', rate: 68, aliases: ["broccoli mushroom masala","mushroom broccoli curry","ब्रोकली मशरूम मसाला","બ્રોકલી મશરૂમ મસાલા"] },
{ name: 'Broccoli Corn Sabji', category: 'Sabji', rate: 64, aliases: ["broccoli corn sabji","corn broccoli curry","ब्रोकली कॉर्न सब्जी","બ્રોકલી કોર્ન સબ્જી"] },
{ name: 'Broccoli Kaju Masala', category: 'Sabji', rate: 72, aliases: ["broccoli kaju masala","broccoli cashew curry","ब्रोकली काजू मसाला","બ્રોકલી કાજુ મસાલા"] },

// Sabji — Mushroom

{ name: 'Mushroom Masala', category: 'Sabji', rate: 62, aliases: ["mushroom masala","mushroom curry","मशरूम मसाला","મશરૂમ મસાલા"] },
{ name: 'Mushroom Matar', category: 'Sabji', rate: 62, aliases: ["mushroom matar","mushroom peas curry","मशरूम मटर","મશરૂમ મટર"] },
{ name: 'Mushroom Do Pyaza', category: 'Sabji', rate: 64, aliases: ["mushroom do pyaza","mushroom dopiaza","मशरूम दो प्याज़ा","મશરૂમ દો પ્યાજ઼ા"] },
{ name: 'Kadai Mushroom', category: 'Sabji', rate: 66, aliases: ["kadai mushroom","kadhai mushroom","कड़ाही मशरूम","કડ઼ાહી મશરૂમ"] },
{ name: 'Mushroom Handi', category: 'Sabji', rate: 66, aliases: ["mushroom handi","handi mushroom","मशरूम हांडी","મશરૂમ હાંડી"] },
{ name: 'Mushroom Makhanwala', category: 'Sabji', rate: 68, aliases: ["mushroom makhanwala","butter mushroom curry","मशरूम मक्खनवाला","મશરૂમ મક્ખનવાલા"] },
{ name: 'Mushroom Kali Mirch', category: 'Sabji', rate: 68, aliases: ["mushroom kali mirch","black pepper mushroom curry","मशरूम काली मिर्च","મશરૂમ કાલી મરચું"] },
{ name: 'Mushroom Palak', category: 'Sabji', rate: 64, aliases: ["mushroom palak","spinach mushroom curry","मशरूम पालक","મશરૂમ પાલક"] },
{ name: 'Mushroom Corn Masala', category: 'Sabji', rate: 64, aliases: ["mushroom corn masala","corn mushroom curry","मशरूम कॉर्न मसाला","મશરૂમ કોર્ન મસાલા"] },
{ name: 'Mushroom Kaju Masala', category: 'Sabji', rate: 72, aliases: ["mushroom kaju masala","mushroom cashew curry","मशरूम काजू मसाला","મશરૂમ કાજુ મસાલા"] },
{ name: 'Mushroom Malai Curry', category: 'Sabji', rate: 70, aliases: ["mushroom malai curry","creamy mushroom curry","मशरूम मलाई करी","મશરૂમ મલાઈ કરી"] },
{ name: 'Mushroom Chettinad', category: 'Sabji', rate: 66, aliases: ["mushroom chettinad","chettinad mushroom curry","मशरूम चेट्टिनाड","મશરૂમ ચેટ્ટિનાડ"] },

// Sabji — Kofta

{ name: 'Malai Kofta', category: 'Sabji', rate: 58, aliases: ["malai kofta","malai kofta curry","मलाई कोफ्ता","મલાઈ કોફ્તા"] },
{ name: 'Veg Kofta Curry', category: 'Sabji', rate: 54, aliases: ["veg kofta curry","vegetable kofta curry","वेज कोफ्ता करी","વેજ કોફ્તા કરી"] },
{ name: 'Paneer Kofta Curry', category: 'Sabji', rate: 68, aliases: ["paneer kofta curry","paneer kofta masala","पनीर कोफ्ता करी","પનીર કોફ્તા કરી"] },
{ name: 'Palak Kofta Curry', category: 'Sabji', rate: 60, aliases: ["palak kofta curry","spinach kofta curry","पालक कोफ्ता करी","પાલક કોફ્તા કરી"] },
{ name: 'Lauki Kofta Curry', category: 'Sabji', rate: 52, aliases: ["lauki kofta curry","bottle gourd kofta","लौकी कोफ्ता करी","લૌકી કોફ્તા કરી"] },
{ name: 'Cabbage Kofta Curry', category: 'Sabji', rate: 52, aliases: ["cabbage kofta curry","patta gobhi kofta","कैबेज कोफ्ता करी","કૈબેજ કોફ્તા કરી"] },
{ name: 'Corn Kofta Curry', category: 'Sabji', rate: 58, aliases: ["corn kofta curry","sweet corn kofta","कॉर्न कोफ्ता करी","કોર્ન કોફ્તા કરી"] },
{ name: 'Cheese Kofta Curry', category: 'Sabji', rate: 68, aliases: ["cheese kofta curry","cheesy kofta curry","चीज़ कोफ्ता करी","ચીઝ કોફ્તા કરી"] },
{ name: 'Nargisi Veg Kofta', category: 'Sabji', rate: 64, aliases: ["nargisi veg kofta","vegetable nargisi kofta","नर्जिसि वेज कोफ्ता","નર્જિસિ વેજ કોફ્તા"] },
{ name: 'Shahi Kofta Curry', category: 'Sabji', rate: 64, aliases: ["shahi kofta curry","royal kofta curry","शाही कोफ्ता करी","શાહી કોફ્તા કરી"] },
{ name: 'Dry Fruit Kofta Curry', category: 'Sabji', rate: 72, aliases: ["dry fruit kofta curry","dryfruit kofta","ड्राई फ्रूट कोफ्ता करी","ડ્રાઈ ફ્રૂટ કોફ્તા કરી"] },
{ name: 'Kaju Kofta Curry', category: 'Sabji', rate: 72, aliases: ["kaju kofta curry","cashew kofta curry","काजू कोफ्ता करी","કાજુ કોફ્તા કરી"] },

// Sabji — Green Peas, Corn and Capsicum

{ name: 'Matar Masala', category: 'Sabji', rate: 48, aliases: ["matar masala","green peas masala","मटर मसाला","મટર મસાલા"] },
{ name: 'Matar Mushroom', category: 'Sabji', rate: 62, aliases: ["matar mushroom","peas mushroom curry","मटर मशरूम","મટર મશરૂમ"] },
{ name: 'Matar Methi Malai', category: 'Sabji', rate: 60, aliases: ["matar methi malai","malai methi matar","मटर मेथी मलाई","મટર મેથી મલાઈ"] },
{ name: 'Methi Matar', category: 'Sabji', rate: 50, aliases: ["methi matar","fenugreek peas sabji","मेथी मटर","મેથી મટર"] },
{ name: 'Corn Masala', category: 'Sabji', rate: 52, aliases: ["corn masala","sweet corn masala curry","कॉर्न मसाला","કોર્ન મસાલા"] },
{ name: 'Corn Palak', category: 'Sabji', rate: 54, aliases: ["corn palak","spinach corn curry","कॉर्न पालक","કોર્ન પાલક"] },
{ name: 'Corn Capsicum', category: 'Sabji', rate: 52, aliases: ["corn capsicum","sweet corn capsicum sabji","कॉर्न कैप्सिकम","કોર્ન કૈપ્સિકમ"] },
{ name: 'Corn Methi Malai', category: 'Sabji', rate: 58, aliases: ["corn methi malai","malai methi corn","कॉर्न मेथी मलाई","કોર્ન મેથી મલાઈ"] },
{ name: 'Baby Corn Masala', category: 'Sabji', rate: 56, aliases: ["baby corn masala","babycorn curry","बेबी कॉर्न मसाला","બેબી કોર્ન મસાલા"] },
{ name: 'Baby Corn Mushroom Masala', category: 'Sabji', rate: 64, aliases: ["baby corn mushroom masala","babycorn mushroom curry","बेबी कॉर्न मशरूम मसाला","બેબી કોર્ન મશરૂમ મસાલા"] },
{ name: 'Capsicum Masala', category: 'Sabji', rate: 50, aliases: ["capsicum masala","shimla mirch masala","कैप्सिकम मसाला","કૈપ્સિકમ મસાલા"] },
{ name: 'Bharwa Capsicum', category: 'Sabji', rate: 56, aliases: ["bharwa capsicum","stuffed capsicum","stuffed bell pepper","भरवां कैप्सिकम","ભરવા કૈપ્સિકમ"] },
{ name: 'Capsicum Do Pyaza', category: 'Sabji', rate: 52, aliases: ["capsicum do pyaza","bell pepper dopiaza","कैप्सिकम दो प्याज़ा","કૈપ્સિકમ દો પ્યાજ઼ા"] },
{ name: 'Capsicum Corn Masala', category: 'Sabji', rate: 54, aliases: ["capsicum corn masala","bell pepper corn curry","कैप्सिकम कॉर्न मसाला","કૈપ્સિકમ કોર્ન મસાલા"] },

// Sabji — Brinjal

{ name: 'Baingan Bharta', category: 'Sabji', rate: 50, aliases: ["baingan bharta","brinjal bharta","eggplant bharta","बैंगन भरता","રીંગણ ભરતા"] },
{ name: 'Baingan Masala', category: 'Sabji', rate: 48, aliases: ["baingan masala","brinjal masala curry","बैंगन मसाला","રીંગણ મસાલા"] },
{ name: 'Bharwa Baingan', category: 'Sabji', rate: 52, aliases: ["bharwa baingan","stuffed brinjal","stuffed eggplant","भरवां बैंगन","ભરવા રીંગણ"] },
{ name: 'Baingan Aloo', category: 'Sabji', rate: 46, aliases: ["baingan aloo","brinjal potato sabji","बैंगन आलू","રીંગણ આલૂ"] },
{ name: 'Baingan Matar', category: 'Sabji', rate: 48, aliases: ["baingan matar","brinjal peas curry","बैंगन मटर","રીંગણ મટર"] },
{ name: 'Bagara Baingan', category: 'Sabji', rate: 56, aliases: ["bagara baingan","baghare baingan","बगर बैंगन","બગર રીંગણ"] },
{ name: 'Hyderabadi Baingan', category: 'Sabji', rate: 56, aliases: ["hyderabadi baingan","hyderabad brinjal curry","हैदराबादी बैंगन","હૈદરાબાદી રીંગણ"] },
{ name: 'Achari Baingan', category: 'Sabji', rate: 52, aliases: ["achari baingan","pickle masala brinjal","अचारी बैंगन","અચારી રીંગણ"] },

// Sabji — Okra and Beans

{ name: 'Bhindi Masala', category: 'Sabji', rate: 48, aliases: ["bhindi masala","okra masala","भिंडी मसाला","ભીંડા મસાલા"] },
{ name: 'Bhindi Fry', category: 'Sabji', rate: 46, aliases: ["bhindi fry","fried okra","भिंडी फ्राई","ભીંડા ફ્રાઈ"] },
{ name: 'Bhindi Do Pyaza', category: 'Sabji', rate: 50, aliases: ["bhindi do pyaza","okra dopiaza","भिंडी दो प्याज़ा","ભીંડા દો પ્યાજ઼ા"] },
{ name: 'Bharwa Bhindi', category: 'Sabji', rate: 52, aliases: ["bharwa bhindi","stuffed okra","भरवां भिंडी","ભરવા ભીંડા"] },
{ name: 'Kurkuri Bhindi', category: 'Sabji', rate: 54, aliases: ["kurkuri bhindi","crispy okra","कुर्कुरि भिंडी","કુર્કુરિ ભીંડા"] },
{ name: 'Bhindi Aloo', category: 'Sabji', rate: 46, aliases: ["bhindi aloo","okra potato sabji","भिंडी आलू","ભીંડા આલૂ"] },
{ name: 'French Beans Aloo', category: 'Sabji', rate: 46, aliases: ["french beans aloo","beans potato sabji","फ्रेंच बीन्स आलू","ફ્રેંચ બીન્સ આલૂ"] },
{ name: 'French Beans Masala', category: 'Sabji', rate: 48, aliases: ["french beans masala","beans masala sabji","फ्रेंच बीन्स मसाला","ફ્રેંચ બીન્સ મસાલા"] },
{ name: 'Beans Carrot Sabji', category: 'Sabji', rate: 46, aliases: ["beans carrot sabji","carrot beans sabji","बीन्स कैरट सब्जी","બીન્સ કૈરટ સબ્જી"] },
{ name: 'Beans Coconut Sabji', category: 'Sabji', rate: 48, aliases: ["beans coconut sabji","beans nariyal sabji","बीन्स कोकोनट सब्जी","બીન્સ કોકોનટ સબ્જી"] },
{ name: 'Cluster Beans Sabji', category: 'Sabji', rate: 46, aliases: ["cluster beans sabji","gawar sabji","guvar sabji","क्लुस्टेर बीन्स सब्जी","ક્લુસ્ટેર બીન્સ સબ્જી"] },
{ name: 'Gawar Aloo', category: 'Sabji', rate: 46, aliases: ["gawar aloo","guvar aloo","cluster beans potato","गवर आलू","ગવર આલૂ"] },

// Sabji — Spinach and Leafy Vegetables

{ name: 'Palak Corn', category: 'Sabji', rate: 54, aliases: ["palak corn","spinach corn curry","पालक कॉर्न","પાલક કોર્ન"] },
{ name: 'Palak Mushroom', category: 'Sabji', rate: 64, aliases: ["palak mushroom","spinach mushroom curry","पालक मशरूम","પાલક મશરૂમ"] },
{ name: 'Palak Kofta', category: 'Sabji', rate: 60, aliases: ["palak kofta","spinach kofta curry","पालक कोफ्ता","પાલક કોફ્તા"] },
{ name: 'Palak Aloo', category: 'Sabji', rate: 48, aliases: ["palak aloo","spinach potato curry","पालक आलू","પાલક આલૂ"] },
{ name: 'Palak Chana', category: 'Sabji', rate: 50, aliases: ["palak chana","spinach chickpea curry","पालक चना","પાલક ચણા"] },
{ name: 'Sarson Ka Saag', category: 'Sabji', rate: 54, aliases: ["sarson ka saag","mustard greens curry","सरसों का साग","સરસવ કા સાગ"] },
{ name: 'Methi Aloo', category: 'Sabji', rate: 48, aliases: ["methi aloo","fenugreek potato sabji","मेथी आलू","મેથી આલૂ"] },
{ name: 'Methi Matar', category: 'Sabji', rate: 50, aliases: ["methi matar","methi matar sabji","fenugreek peas curry","मेथी मटर","મેથી મટર"] },
{ name: 'Methi Chaman', category: 'Sabji', rate: 62, aliases: ["methi chaman","fenugreek paneer curry","मेथी चमन","મેથી ચમન"] },
{ name: 'Bathua Aloo', category: 'Sabji', rate: 48, aliases: ["bathua aloo","bathua potato sabji","बथुअ आलू","બથુઅ આલૂ"] },
{ name: 'Chaulai Sabji', category: 'Sabji', rate: 46, aliases: ["chaulai sabji","amaranth leaves sabji","चौलै सब्जी","ચૌલૈ સબ્જી"] },

// Sabji — Bottle Gourd, Ridge Gourd and Pumpkin

{ name: 'Lauki Chana Dal', category: 'Sabji', rate: 46, aliases: ["lauki chana dal","bottle gourd chana dal","लौकी चना दाल","લૌકી ચણા દાળ"] },
{ name: 'Lauki Masala', category: 'Sabji', rate: 44, aliases: ["lauki masala","bottle gourd curry","लौकी मसाला","લૌકી મસાલા"] },
{ name: 'Lauki Matar', category: 'Sabji', rate: 46, aliases: ["lauki matar","bottle gourd peas curry","लौकी मटर","લૌકી મટર"] },
{ name: 'Lauki Kofta', category: 'Sabji', rate: 52, aliases: ["lauki kofta","bottle gourd kofta curry","लौकी कोफ्ता","લૌકી કોફ્તા"] },
{ name: 'Turai Masala', category: 'Sabji', rate: 44, aliases: ["turai masala","ridge gourd curry","तुरई मसाला","તુરીયા મસાલા"] },
{ name: 'Turai Chana Dal', category: 'Sabji', rate: 46, aliases: ["turai chana dal","ridge gourd chana dal","तुरई चना दाल","તુરીયા ચણા દાળ"] },
{ name: 'Tinda Masala', category: 'Sabji', rate: 44, aliases: ["tinda masala","apple gourd curry","टिंडा मसाला","ટીંડોળા મસાલા"] },
{ name: 'Bharwa Tinda', category: 'Sabji', rate: 48, aliases: ["bharwa tinda","stuffed apple gourd","भरवां टिंडा","ભરવા ટીંડોળા"] },
{ name: 'Kaddu Ki Sabji', category: 'Sabji', rate: 42, aliases: ["kaddu ki sabji","pumpkin sabji","कद्दू की सब्जी","કોળું કી સબ્જી"] },
{ name: 'Khatta Meetha Kaddu', category: 'Sabji', rate: 46, aliases: ["khatta meetha kaddu","sweet sour pumpkin","खट्टा मीथ कद्दू","ખટ્ટા મીથ કોળું"] },
{ name: 'Pumpkin Masala', category: 'Sabji', rate: 46, aliases: ["pumpkin masala","kaddu masala","पम्पकिन मसाला","પમ્પકિન મસાલા"] },
{ name: 'Parwal Masala', category: 'Sabji', rate: 48, aliases: ["parwal masala","pointed gourd curry","परवल मसाला","પરવલ મસાલા"] },
{ name: 'Bharwa Parwal', category: 'Sabji', rate: 52, aliases: ["bharwa parwal","stuffed pointed gourd","भरवां परवल","ભરવા પરવલ"] },

// Sabji — Raw Banana and Jackfruit

{ name: 'Raw Banana Masala', category: 'Sabji', rate: 48, aliases: ["raw banana masala","kachha kela masala","रॉ बनाना मसाला","રૉ બનાના મસાલા"] },
{ name: 'Raw Banana Fry', category: 'Sabji', rate: 46, aliases: ["raw banana fry","kachha kela fry","रॉ बनाना फ्राई","રૉ બનાના ફ્રાઈ"] },
{ name: 'Banana Kofta Curry', category: 'Sabji', rate: 54, aliases: ["banana kofta curry","raw banana kofta","बनाना कोफ्ता करी","બનાના કોફ્તા કરી"] },
{ name: 'Kathal Masala', category: 'Sabji', rate: 56, aliases: ["kathal masala","jackfruit masala curry","कटहल मसाला","કટહલ મસાલા"] },
{ name: 'Kathal Do Pyaza', category: 'Sabji', rate: 58, aliases: ["kathal do pyaza","jackfruit dopiaza","कटहल दो प्याज़ा","કટહલ દો પ્યાજ઼ા"] },
{ name: 'Kathal Korma', category: 'Sabji', rate: 60, aliases: ["kathal korma","jackfruit korma","कटहल कोरमा","કટહલ કોરમા"] },
{ name: 'Kathal Rogan Josh', category: 'Sabji', rate: 62, aliases: ["kathal rogan josh","jackfruit rogan josh","कटहल रोगन जोश","કટહલ રોગન જોશ"] },

// Sabji — Premium and Cashew Gravies

{ name: 'Kaju Curry', category: 'Sabji', rate: 76, aliases: ["kaju curry","cashew curry","काजू करी","કાજુ કરી"] },
{ name: 'Kaju Masala', category: 'Sabji', rate: 78, aliases: ["kaju masala","cashew masala curry","काजू मसाला","કાજુ મસાલા"] },
{ name: 'Kaju Matar', category: 'Sabji', rate: 74, aliases: ["kaju matar","cashew peas curry","काजू मटर","કાજુ મટર"] },
{ name: 'Kaju Mushroom', category: 'Sabji', rate: 78, aliases: ["kaju mushroom","cashew mushroom curry","काजू मशरूम","કાજુ મશરૂમ"] },
{ name: 'Kaju Corn Masala', category: 'Sabji', rate: 76, aliases: ["kaju corn masala","cashew corn curry","काजू कॉर्न मसाला","કાજુ કોર્ન મસાલા"] },
{ name: 'Kaju Korma', category: 'Sabji', rate: 80, aliases: ["kaju korma","cashew korma","काजू कोरमा","કાજુ કોરમા"] },
{ name: 'Dry Fruit Curry', category: 'Sabji', rate: 82, aliases: ["dry fruit curry","dryfruit curry","ड्राई फ्रूट करी","ડ્રાઈ ફ્રૂટ કરી"] },
{ name: 'Shahi Vegetable Curry', category: 'Sabji', rate: 68, aliases: ["shahi vegetable curry","shahi veg curry","शाही वेजिटेबल करी","શાહી વેજિટેબલ કરી"] },
{ name: 'Badami Vegetable Curry', category: 'Sabji', rate: 72, aliases: ["badami vegetable curry","almond vegetable curry","बदमि वेजिटेबल करी","બદમિ વેજિટેબલ કરી"] },
{ name: 'Malai Vegetable Curry', category: 'Sabji', rate: 64, aliases: ["malai vegetable curry","creamy vegetable curry","मलाई वेजिटेबल करी","મલાઈ વેજિટેબલ કરી"] },
{ name: 'Vegetable Khurchan', category: 'Sabji', rate: 62, aliases: ["vegetable khurchan","veg khurchan","वेजिटेबल खुर्चन","વેજિટેબલ ખુર્ચન"] },
{ name: 'Vegetable Lababdar', category: 'Sabji', rate: 64, aliases: ["vegetable lababdar","veg lababdar","वेजिटेबल लाबाबदार","વેજિટેબલ લાબાબદાર"] },
{ name: 'Vegetable Tawa Masala', category: 'Sabji', rate: 58, aliases: ["vegetable tawa masala","tawa veg","वेजिटेबल तवा मसाला","વેજિટેબલ તવા મસાલા"] },
{ name: 'Tawa Sabji', category: 'Sabji', rate: 60, aliases: ["tawa sabji","assorted tawa vegetables","तवा सब्जी","તવા સબ્જી"] },

  
];

const DISH_COST_ITEMS_PART_3: readonly DishCostItem[] = [
  // Chaat
  { name: 'Pani Puri', category: 'Chaat', rate: 32, aliases: ["pani puri","golgappa","puchka","पानी पूरी","પાણી પૂરી"] },
  { name: 'Sev Puri', category: 'Chaat', rate: 38, aliases: ["sev puri","सेव पूरी","સેવ પૂરી"] },
  { name: 'Dahi Puri', category: 'Chaat', rate: 42, aliases: ["dahi puri","दही पूरी","દહીં પૂરી"] },
  { name: 'Bhel Puri', category: 'Chaat', rate: 36, aliases: ["bhel puri","bhel","भेल पूरी","ભેલ પૂરી"] },
  { name: 'Papdi Chaat', category: 'Chaat', rate: 42, aliases: ["papdi chaat","पापड़ी चाट","પાપડી ચાટ"] },
  { name: 'Aloo Tikki Chaat', category: 'Chaat', rate: 44, aliases: ["aloo tikki chaat","आलू टिक्की चाट","આલૂ ટીક્કી ચાટ"] },
  { name: 'Dahi Bhalla', category: 'Chaat', rate: 46, aliases: ["dahi bhalla","dahi vada chaat","दही भल्ला","દહીં ભલ્લા"] },
  { name: 'Ragda Pattice', category: 'Chaat', rate: 48, aliases: ["ragda pattice","रगड़ा पैटिस","રગડો પૈટિસ"] },

  // Punjabi
  { name: 'Chole Bhature', category: 'Punjabi', rate: 72, aliases: ["chole bhature","छोले भटूरे","છોલે ભટૂરે"] },
  { name: 'Amritsari Kulcha', category: 'Punjabi', rate: 68, aliases: ["amritsari kulcha","अमृतसरी कुलचा","અમૃતસરી કુલચા"] },
  { name: 'Rajma Masala', category: 'Punjabi', rate: 58, aliases: ["rajma masala","राजमा मसाला","રાજમા મસાલા"] },
  { name: 'Sarson Ka Saag', category: 'Punjabi', rate: 68, aliases: ["sarson ka saag","सरसों का साग","સરસવ કા સાગ"] },
  { name: 'Punjabi Chole', category: 'Punjabi', rate: 62, aliases: ["punjabi chole","पंजाबी छोले","પંજાબી છોલે"] },
  { name: 'Matar Mushroom Masala', category: 'Punjabi', rate: 72, aliases: ["matar mushroom masala","मटर मशरूम मसाला","મટર મશરૂમ મસાલા"] },
  { name: 'Veg Kolhapuri', category: 'Punjabi', rate: 68, aliases: ["veg kolhapuri","वेज कोल्हापुरी","વેજ કોલ્હાપુરી"] },
  { name: 'Malai Kofta', category: 'Punjabi', rate: 78, aliases: ["malai kofta","मलाई कोफ्ता","મલાઈ કોફ્તા"] },

  // Paneer
  { name: 'Paneer Butter Masala', category: 'Paneer', rate: 82, aliases: ["paneer butter masala","pbm","पनीर बटर मसाला","પનીર બટર મસાલા"] },
  { name: 'Kadai Paneer', category: 'Paneer', rate: 80, aliases: ["kadai paneer","कड़ाही पनीर","કડ઼ાહી પનીર"] },
  { name: 'Shahi Paneer', category: 'Paneer', rate: 84, aliases: ["shahi paneer","शाही पनीर","શાહી પનીર"] },
  { name: 'Palak Paneer', category: 'Paneer', rate: 76, aliases: ["palak paneer","पालक पनीर","પાલક પનીર"] },
  { name: 'Paneer Tikka Masala', category: 'Paneer', rate: 86, aliases: ["paneer tikka masala","पनीर टिक्का मसाला","પનીર ટિક્કા મસાલા"] },
  { name: 'Paneer Lababdar', category: 'Paneer', rate: 86, aliases: ["paneer lababdar","पनीर लाबाबदार","પનીર લાબાબદાર"] },
  { name: 'Matar Paneer', category: 'Paneer', rate: 76, aliases: ["matar paneer","मटर पनीर","મટર પનીર"] },
  { name: 'Paneer Bhurji', category: 'Paneer', rate: 78, aliases: ["paneer bhurji","पनीर भुर्जी","પનીર ભુર્જી"] },

  // Kathiyawadi
  { name: 'Sev Tameta', category: 'Kathiyawadi', rate: 48, aliases: ["sev tameta","सेव तमेत","સેવ તમેત"] },
  { name: 'Lasaniya Bataka', category: 'Kathiyawadi', rate: 46, aliases: ["lasaniya bataka","लसनिय बटाका","લસનિય બટાકા"] },
  { name: 'Ringan No Olo', category: 'Kathiyawadi', rate: 48, aliases: ["ringan no olo","baingan bharta kathiyawadi","रिंगण नो ओलो","રીંગણ નો ઓલો"] },
  { name: 'Bajra Rotla', category: 'Kathiyawadi', rate: 22, aliases: ["bajra rotla","बाजरा रोटला","બાજરી રોટલા"] },
  { name: 'Kathiyawadi Khichdi', category: 'Kathiyawadi', rate: 44, aliases: ["kathiyawadi khichdi","काठियावाड़ी खिचड़ी","કાઠિયાવાડી ખીચડી"] },
  { name: 'Vagharelo Rotlo', category: 'Kathiyawadi', rate: 42, aliases: ["vagharelo rotlo","वघारेलो रोटलो","વઘારેલો રોટલો"] },

  // Rajasthani
  { name: 'Dal Baati Churma', category: 'Rajasthani', rate: 78, aliases: ["dal baati churma","दाल बाटी चूरमा","દાળ બાટી ચુરમા"] },
  { name: 'Gatte Ki Sabji', category: 'Rajasthani', rate: 58, aliases: ["gatte ki sabji","गट्टे की सब्जी","ગટ્ટા કી સબ્જી"] },
  { name: 'Ker Sangri', category: 'Rajasthani', rate: 64, aliases: ["ker sangri","केर सांगरी","કેર સાંગરી"] },
  { name: 'Papad Ki Sabji', category: 'Rajasthani', rate: 52, aliases: ["papad ki sabji","पापड़ की सब्जी","પાપડ કી સબ્જી"] },
  { name: 'Rajasthani Kadhi', category: 'Rajasthani', rate: 42, aliases: ["rajasthani kadhi","राजस्थानी कढ़ी","રાજસ્થાની કઢી"] },
  { name: 'Panchmel Dal', category: 'Rajasthani', rate: 48, aliases: ["panchmel dal","पंचमेल दाल","પંચમેલ દાળ"] },

  // Gujarati
  { name: 'Gujarati Dal', category: 'Gujarati', rate: 32, aliases: ["gujarati dal","गुजराती दाल","ગુજરાતી દાળ"] },
  { name: 'Undhiyu', category: 'Gujarati', rate: 62, aliases: ["undhiyu","उंधियू","ઊંધિયું"] },
  { name: 'Bharela Ringan Bataka', category: 'Gujarati', rate: 48, aliases: ["bharela ringan bataka","भरेल रिंगण बटाका","ભરેલ રીંગણ બટાકા"] },
  { name: 'Gujarati Kadhi', category: 'Gujarati', rate: 30, aliases: ["gujarati kadhi","गुजराती कढ़ी","ગુજરાતી કઢી"] },
  { name: 'Dal Dhokli', category: 'Gujarati', rate: 48, aliases: ["dal dhokli","दाल ढोकली","દાળ ઢોકળી"] },
  { name: 'Handvo', category: 'Gujarati', rate: 42, aliases: ["handvo","हांडवो","હાંડવો"] },

  // Dal / Kadhi
  { name: 'Dal Tadka', category: 'Dal / Kadhi', rate: 30, aliases: ["dal tadka","दाल तड़का","દાળ તડકો"] },
  { name: 'Dal Fry', category: 'Dal / Kadhi', rate: 28, aliases: ["dal fry","दाल फ्राई","દાળ ફ્રાઈ"] },
  { name: 'Dal Makhani', category: 'Dal / Kadhi', rate: 42, aliases: ["dal makhani","दाल मखनी","દાળ મખની"] },
  { name: 'Kadhi Pakora', category: 'Dal / Kadhi', rate: 34, aliases: ["kadhi pakora","कढ़ी पकौड़ा","કઢી પકોડા"] },
  { name: 'Moong Dal', category: 'Dal / Kadhi', rate: 26, aliases: ["moong dal","मूंग दाल","મૂંગ દાળ"] },
  { name: 'Mix Dal', category: 'Dal / Kadhi', rate: 32, aliases: ["mix dal","मिक्स दाल","મિક્સ દાળ"] },

  // Rice
  { name: 'Steamed Rice', category: 'Rice', rate: 22, aliases: ["steamed rice","स्टीम्ड राइस","સ્ટીમ્ડ રાઇસ"] },
  { name: 'Jeera Rice', category: 'Rice', rate: 26, aliases: ["jeera rice","जीरा राइस","જીરુ રાઇસ"] },
  { name: 'Veg Pulao', category: 'Rice', rate: 38, aliases: ["veg pulao","वेज पुलाव","વેજ પુલાવ"] },
  { name: 'Veg Biryani', category: 'Rice', rate: 52, aliases: ["veg biryani","वेज बिरयानी","વેજ બિરયાની"] },
  { name: 'Peas Pulao', category: 'Rice', rate: 34, aliases: ["peas pulao","पीज़ पुलाव","પીજ઼ પુલાવ"] },
  { name: 'Kashmiri Pulao', category: 'Rice', rate: 48, aliases: ["kashmiri pulao","कश्मीरी पुलाव","કશ્મીરી પુલાવ"] },

  // Bread
  { name: 'Tandoori Roti', category: 'Bread', rate: 14, aliases: ["tandoori roti","तंदूरी रोटी","તંદૂરી રોટી"] },
  { name: 'Butter Roti', category: 'Bread', rate: 18, aliases: ["butter roti","बटर रोटी","બટર રોટી"] },
  { name: 'Plain Naan', category: 'Bread', rate: 22, aliases: ["plain naan","प्लेन नान","પ્લેન નાન"] },
  { name: 'Butter Naan', category: 'Bread', rate: 26, aliases: ["butter naan","बटर नान","બટર નાન"] },
  { name: 'Lachha Paratha', category: 'Bread', rate: 28, aliases: ["lachha paratha","लच्छा पराठा","લચ્છા પરાઠા"] },
  { name: 'Missi Roti', category: 'Bread', rate: 22, aliases: ["missi roti","मिस्सी रोटी","મિસ્સી રોટી"] },

  // Sweet
  { name: 'Gulab Jamun', category: 'Sweet', rate: 28, aliases: ["gulab jamun","गुलाब जामुन","ગુલાબ જામુન"] },
  { name: 'Rasmalai', category: 'Sweet', rate: 44, aliases: ["rasmalai","रसमलाई","રસમલાઈ"] },
  { name: 'Jalebi', category: 'Sweet', rate: 32, aliases: ["jalebi","जलेबी","જલેબી"] },
  { name: 'Moong Dal Halwa', category: 'Sweet', rate: 52, aliases: ["moong dal halwa","मूंग दाल हलवा","મૂંગ દાળ હલવો"] },
  { name: 'Gajar Halwa', category: 'Sweet', rate: 48, aliases: ["gajar halwa","गाजर हलवा","ગાજર હલવો"] },
  { name: 'Shrikhand', category: 'Sweet', rate: 42, aliases: ["shrikhand","श्रीखंड","શ્રીખંડ"] },
  { name: 'Basundi', category: 'Sweet', rate: 46, aliases: ["basundi","बासुंदी","બાસુંદી"] },
  { name: 'Kaju Katli', category: 'Sweet', rate: 58, aliases: ["kaju katli","काजू कतली","કાજુ કતરી"] },

  // Ice Cream
  { name: 'Vanilla Ice Cream', category: 'Ice Cream', rate: 26, aliases: ["vanilla ice cream","वनीला आइस क्रीम","વનીલા આઇસ ક્રીમ"] },
  { name: 'Chocolate Ice Cream', category: 'Ice Cream', rate: 30, aliases: ["chocolate ice cream","चॉकलेट आइस क्रीम","ચૉકલેટ આઇસ ક્રીમ"] },
  { name: 'Butterscotch Ice Cream', category: 'Ice Cream', rate: 32, aliases: ["butterscotch ice cream","बुत्तेर्स्कोत्च आइस क्रीम","બુત્તેર્સ્કોત્ચ આઇસ ક્રીમ"] },
  { name: 'Kesar Pista Ice Cream', category: 'Ice Cream', rate: 36, aliases: ["kesar pista ice cream","केसर पिस्ता आइस क्रीम","કેસર પિસ્તા આઇસ ક્રીમ"] },
  { name: 'Rajbhog Ice Cream', category: 'Ice Cream', rate: 38, aliases: ["rajbhog ice cream","राजभोग आइस क्रीम","રાજભોગ આઇસ ક્રીમ"] },
  { name: 'Kulfi', category: 'Ice Cream', rate: 34, aliases: ["kulfi","कुल्फी","કુલ્ફી"] },

  // Salad
  { name: 'Green Salad', category: 'Salad', rate: 10, aliases: ["green salad","ग्रीन सलाद","ગ્રીન સલાડ"] },
  { name: 'Kachumber Salad', category: 'Salad', rate: 12, aliases: ["kachumber salad","कचूम्बर सलाद","કચૂમ્બર સલાડ"] },
  { name: 'Russian Salad', category: 'Salad', rate: 28, aliases: ["russian salad","रशियन सलाद","રશિયન સલાડ"] },
  { name: 'Sprout Salad', category: 'Salad', rate: 22, aliases: ["sprout salad","स्प्रौत सलाद","સ્પ્રૌત સલાડ"] },
  { name: 'Fruit Salad', category: 'Salad', rate: 32, aliases: ["fruit salad","फ्रूट सलाद","ફ્રૂટ સલાડ"] },

  // Papad
  { name: 'Roasted Papad', category: 'Papad', rate: 4, aliases: ["roasted papad","रोस्टेड पापड़","રોસ્ટેડ પાપડ"] },
  { name: 'Fried Papad', category: 'Papad', rate: 6, aliases: ["fried papad","फ्राइड पापड़","ફ્રાઇડ પાપડ"] },
  { name: 'Masala Papad', category: 'Papad', rate: 12, aliases: ["masala papad","मसाला पापड़","મસાલા પાપડ"] },
  { name: 'Khichiya Papad', category: 'Papad', rate: 8, aliases: ["khichiya papad","खिचिय पापड़","ખિચિય પાપડ"] },

  // Farsan
  { name: 'Khaman Dhokla', category: 'Farsan', rate: 24, aliases: ["khaman dhokla","खमण ढोकला","ખમણ ઢોકળા"] },
  { name: 'Khandvi Farsan', category: 'Farsan', rate: 28, aliases: ["khandvi farsan","खंडवी फरसाण","ખાંડવી ફરસાણ"] },
  { name: 'Patra', category: 'Farsan', rate: 28, aliases: ["patra","पात्रा","પાત્રા"] },
  { name: 'Samosa', category: 'Farsan', rate: 20, aliases: ["samosa","समोसा","સમોસા"] },
  { name: 'Lilva Kachori Farsan', category: 'Farsan', rate: 30, aliases: ["lilva kachori farsan","लीलवा कचौरी फरसाण","લીલવા કચોરી ફરસાણ"] },
  { name: 'Fafda', category: 'Farsan', rate: 24, aliases: ["fafda","फफ्द","ફફ્દ"] },

  // Beverage
  { name: 'Masala Chaas', category: 'Beverage', rate: 14, aliases: ["masala chaas","buttermilk","मसाला छाछ","મસાલા છાશ"] },
  { name: 'Sweet Lassi', category: 'Beverage', rate: 26, aliases: ["sweet lassi","स्वीट लस्सी","સ્વીટ લસ્સી"] },
  { name: 'Masala Tea', category: 'Beverage', rate: 12, aliases: ["masala tea","मसाला चाय","મસાલા ચા"] },
  { name: 'Coffee', category: 'Beverage', rate: 18, aliases: ["coffee","कॉफी","કોફી"] },
  { name: 'Mineral Water', category: 'Beverage', rate: 10, aliases: ["mineral water","मिनेरल वॉटर","મિનેરલ વોટર"] },

  // Live Counter
  { name: 'Live Dosa Counter', category: 'Live Counter', rate: 72, aliases: ["live dosa counter","लाइव डोसा काउंटर","લાઇવ ઢોસા કાઉંટર"] },
  { name: 'Live Pasta Counter', category: 'Live Counter', rate: 82, aliases: ["live pasta counter","लाइव पास्ता काउंटर","લાઇવ પાસ્તા કાઉંટર"] },
  { name: 'Live Chaat Counter', category: 'Live Counter', rate: 68, aliases: ["live chaat counter","लाइव चाट काउंटर","લાઇવ ચાટ કાઉંટર"] },
  { name: 'Live Tawa Sabji Counter', category: 'Live Counter', rate: 86, aliases: ["live tawa sabji counter","लाइव तवा सब्जी काउंटर","લાઇવ તવા સબ્જી કાઉંટર"] },
  { name: 'Live Jalebi Counter', category: 'Live Counter', rate: 64, aliases: ["live jalebi counter","लाइव जलेबी काउंटर","લાઇવ જલેબી કાઉંટર"] },
  { name: 'Live Pizza Counter', category: 'Live Counter', rate: 92, aliases: ["live pizza counter","लाइव पिज़्ज़ा काउंटर","લાઇવ પિજ઼્જ઼ા કાઉંટર"] },

  // Breakfast
  { name: 'Poha', category: 'Breakfast', rate: 34, aliases: ["poha","पोहा","પોહા"] },
  { name: 'Upma Breakfast', category: 'Breakfast', rate: 36, aliases: ["upma breakfast","उपमा ब्रेकफास्ट","ઉપમા બ્રેકફાસ્ટ"] },
  { name: 'Thepla Breakfast', category: 'Breakfast', rate: 38, aliases: ["thepla breakfast","थेप्ल ब्रेकफास्ट","થેપ્લ બ્રેકફાસ્ટ"] },
  { name: 'Puri Bhaji', category: 'Breakfast', rate: 48, aliases: ["puri bhaji","पूरी भाजी","પૂરી ભાજી"] },
  { name: 'Aloo Paratha', category: 'Breakfast', rate: 52, aliases: ["aloo paratha","आलू पराठा","આલૂ પરાઠા"] },
  { name: 'Bread Pakora', category: 'Breakfast', rate: 40, aliases: ["bread pakora","ब्रेड पकौड़ा","બ્રેડ પકોડા"] },

  // Jain
  { name: 'Jain Paneer Masala', category: 'Jain', rate: 78, aliases: ["jain paneer masala","जैन पनीर मसाला","જૈન પનીર મસાલા"] },
  { name: 'Jain Veg Handi', category: 'Jain', rate: 64, aliases: ["jain veg handi","जैन वेज हांडी","જૈન વેજ હાંડી"] },
  { name: 'Jain Dal Tadka', category: 'Jain', rate: 32, aliases: ["jain dal tadka","जैन दाल तड़का","જૈન દાળ તડકો"] },
  { name: 'Jain Pulao', category: 'Jain', rate: 42, aliases: ["jain pulao","जैन पुलाव","જૈન પુલાવ"] },
  { name: 'Jain Pav Bhaji', category: 'Jain', rate: 58, aliases: ["jain pav bhaji","जैन पव भाजी","જૈન પવ ભાજી"] },
  { name: 'Jain Chole', category: 'Jain', rate: 56, aliases: ["jain chole","जैन छोले","જૈન છોલે"] },

  // Kids
  { name: 'Mini Burger', category: 'Kids', rate: 46, aliases: ["mini burger","मिनी बुर्जेर","મિની બુર્જેર"] },
  { name: 'French Fries', category: 'Kids', rate: 38, aliases: ["french fries","फ्रेंच फ्राइज","ફ્રેંચ ફ્રાઇજ"] },
  { name: 'Cheese Sandwich', category: 'Kids', rate: 44, aliases: ["cheese sandwich","चीज़ सैंडविच","ચીઝ સૈંડવિચ"] },
  { name: 'Mini Samosa', category: 'Kids', rate: 28, aliases: ["mini samosa","मिनी समोसा","મિની સમોસા"] },
  { name: 'Smileys', category: 'Kids', rate: 36, aliases: ["smileys","स्मिलेय्स","સ્મિલેય્સ"] },
  { name: 'Chocolate Milkshake', category: 'Kids', rate: 42, aliases: ["chocolate milkshake","चॉकलेट मिल्कशेक","ચૉકલેટ મિલ્કશેક"] },

  // Condiments
  { name: 'Mint Chutney', category: 'Condiments', rate: 6, aliases: ["mint chutney","मिंट चटनी","મિંટ ચટણી"] },
  { name: 'Tamarind Chutney', category: 'Condiments', rate: 6, aliases: ["tamarind chutney","इमली चटनी","આમલી ચટણી"] },
  { name: 'Mango Pickle', category: 'Condiments', rate: 5, aliases: ["mango pickle","मैंगो अचार","મેંગો અથાણું"] },
  { name: 'Lemon Pickle', category: 'Condiments', rate: 5, aliases: ["lemon pickle","लेमन अचार","લેમન અથાણું"] },
  { name: 'Boondi Raita', category: 'Condiments', rate: 18, aliases: ["boondi raita","बून्दि रैत","બૂન્દિ રૈત"] },
  { name: 'Plain Curd', category: 'Condiments', rate: 14, aliases: ["plain curd","प्लेन कर्ड","પ્લેન દહીં"] },
];

function buildDefaultDishCatalog(...parts: ReadonlyArray<readonly DishCostItem[]>) {
  const uniqueItems = new Map<string, DishCostItem>();
  parts.flat().forEach((item) => {
    const key = normalizeCatalogKey(item.name);
    if (!uniqueItems.has(key)) uniqueItems.set(key, item);
  });
  return Array.from(uniqueItems.values());
}

export const DISH_COST_ITEMS: DishCostItem[] = buildDefaultDishCatalog(
  DISH_COST_ITEMS_PART_1,
  DISH_COST_ITEMS_PART_2,
  DISH_COST_ITEMS_PART_3,
);

function sanitizeDishItem(item: Partial<DishCostItem> | null | undefined): DishCostItem | null {
  if (!item?.name || !item?.category) return null;
  if (!CATEGORIES.includes(item.category)) return null;

  const cleanAliases = Array.isArray(item.aliases)
    ? item.aliases.map((alias) => alias.trim()).filter(Boolean)
    : [];

  return {
    name: item.name.trim(),
    category: item.category,
    rate: Math.max(Number(item.rate) || 0, 0),
    servingQuantity: Math.max(Number(item.servingQuantity) || 1, 0.01),
    servingUnit: String(item.servingUnit || 'serving').trim() || 'serving',
    aliases: cleanAliases,
  };
}

export function getDishCostItems(): DishCostItem[] {
  if (typeof window === 'undefined') return DISH_COST_ITEMS;

  try {
    const raw = window.localStorage.getItem(DISH_MASTER_STORAGE_KEY);
    if (!raw) return DISH_COST_ITEMS;
    const parsed = JSON.parse(raw) as Array<Partial<DishCostItem>>;
    const cleaned = parsed.map((item) => sanitizeDishItem(item)).filter((item): item is DishCostItem => item !== null);
    return cleaned.length ? cleaned : DISH_COST_ITEMS;
  } catch {
    return DISH_COST_ITEMS;
  }
}

export function saveDishCostItems(items: DishCostItem[]) {
  if (typeof window === 'undefined') return;
  const cleaned = items.map((item) => sanitizeDishItem(item)).filter((item): item is DishCostItem => item !== null);
  window.localStorage.setItem(DISH_MASTER_STORAGE_KEY, JSON.stringify(cleaned));
}

export function mergeDishCatalog(items: Array<Partial<DishCostItem> | null | undefined>) {
  const merged = new Map<string, DishCostItem>();

  DISH_COST_ITEMS.forEach((item) => {
    merged.set(normalizeCatalogKey(item.name), item);
  });

  items.forEach((item) => {
    const clean = sanitizeDishItem(item);
    if (!clean) return;
    const key = normalizeCatalogKey(clean.name);
    const defaultItem = merged.get(key);
    const aliases = Array.from(new Set([...(defaultItem?.aliases ?? []), ...(clean.aliases ?? [])]));
    merged.set(key, { ...clean, aliases });
  });

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function resetDishCostItems() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DISH_MASTER_STORAGE_KEY);
}

export async function syncDishCostItemsFromServer() {
  if (typeof window === 'undefined') return DISH_COST_ITEMS;

  try {
    const response = await fetch('/api/dishes', { cache: 'no-store' });
    if (!response.ok) return getDishCostItems();
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const cleaned = (items as Array<Partial<DishCostItem>>)
      .map((item) => sanitizeDishItem(item))
      .filter((item): item is DishCostItem => item !== null);
    if (cleaned.length) {
      saveDishCostItems(cleaned);
      return cleaned;
    }
    return DISH_COST_ITEMS;
  } catch {
    return getDishCostItems();
  }
}

const categoryAliases: Record<Category, string[]> = {
  'Welcome Drink': ['welcome drink', 'juice', 'sharbat', 'jaljeera', 'thandai', 'kokum', 'aam panna'],
  Mocktail: ['mocktail', 'mojito', 'blue lagoon', 'pina', 'punch'],
  Soup: ['soup', 'shorba', 'manchow'],
  Starter: ['starter', 'tikka', 'kebab', 'spring roll', 'manchurian', 'paneer chilli', 'baby corn'],
  Chaat: ['chaat', 'pani puri', 'sev puri', 'bhel', 'dahi puri', 'ragda'],
  Chinese: ['chinese', 'noodle', 'noodles', 'fried rice', 'schezwan', 'hakka', 'chilli garlic'],
  Italian: ['italian', 'pasta', 'pizza', 'lasagna', 'risotto'],
  'South Indian': ['south indian', 'dosa', 'idli', 'uttapam', 'sambar', 'upma', 'medu vada'],
  Punjabi: ['punjabi', 'dal makhani', 'chole', 'rajma', 'butter masala'],
  Paneer: ['paneer', 'pbm', 'palak paneer', 'kadai paneer'],
  Sabji: ['sabji', 'sabzi', 'bhaji', 'veg', 'aloo', 'gobi', 'matar', 'kofta'],
  Kathiyawadi: ['kathiyawadi', 'sev tameta', 'lasaniya bataka'],
  Rajasthani: ['rajasthani', 'ker sangri', 'gatte'],
  Gujarati: ['gujarati', 'undhiyu'],
  'Dal / Kadhi': ['dal', 'kadhi', 'kadhi khichdi'],
  Rice: ['rice', 'biryani', 'pulao', 'khichdi'],
  Bread: ['roti', 'naan', 'puri', 'paratha', 'kulcha', 'bread'],
  Sweet: ['sweet', 'jalebi', 'gulab', 'rasgulla', 'halwa', 'kheer', 'mohanthal', 'ladoo', 'laddu', 'barfi', 'katli'],
  'Ice Cream': ['ice cream', 'icecream', 'kulfi'],
  Salad: ['salad', 'kachumber', 'cucumber', 'onion salad'],
  Papad: ['papad'],
  Farsan: ['farsan', 'dhokla', 'khaman', 'khandvi', 'samosa', 'kachori'],
  Beverage: ['tea', 'coffee', 'milk', 'chaas', 'lassi'],
  'Live Counter': ['live counter', 'live'],
  Breakfast: ['breakfast', 'poha', 'toast', 'sandwich', 'bakery'],
  Jain: ['jain'],
  Kids: ['kids', 'fries', 'burger', 'pasta kids'],
  Condiments: ['condiments', 'chutney', 'pickle', 'salad dressing'],
};

function normalizeDishName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeDishName(value: string) {
  return normalizeDishName(value).split(' ').filter(Boolean);
}

function isExactAliasMatch(input: string, candidate: string) {
  const normalizedInput = normalizeDishName(input);
  const normalizedCandidate = normalizeDishName(candidate);
  return Boolean(normalizedInput && normalizedCandidate && normalizedInput === normalizedCandidate);
}

function isAliasContained(input: string, candidate: string) {
  const normalizedInput = normalizeDishName(input);
  const normalizedCandidate = normalizeDishName(candidate);
  return Boolean(normalizedInput && normalizedCandidate && normalizedInput.includes(normalizedCandidate));
}

export function findDishByName(name: string): DishCostItem | null {
  const dishItems = getDishCostItems();
  const exactMatch = dishItems.find((dish) =>
    isExactAliasMatch(name, dish.name) || (dish.aliases ?? []).some((alias) => isExactAliasMatch(name, alias)),
  );
  if (exactMatch) return exactMatch;

  const tokenizedInput = tokenizeDishName(name);
  return dishItems.find((dish) => {
    const candidates = [dish.name, ...(dish.aliases ?? [])];
    return candidates.some((candidate) => {
      if (!isAliasContained(name, candidate)) return false;
      const candidateTokens = tokenizeDishName(candidate);
      return candidateTokens.every((token) => tokenizedInput.includes(token));
    });
  }) ?? null;
}

/**
 * Finds every catalog dish mentioned in a larger piece of text.
 *
 * This is intentionally separate from findDishByName, which returns the
 * single best match for inputs such as a search field. Pasted menus can put
 * several dishes on one line, so the menu parser needs all non-overlapping
 * matches in their original order.
 */
export function findDishesInText(value: string): DishCostItem[] {
  const normalizedValue = normalizeDishName(value);
  if (!normalizedValue) return [];

  const searchableValue = ` ${normalizedValue} `;
  const matches: Array<{
    dish: DishCostItem;
    start: number;
    end: number;
    length: number;
  }> = [];

  getDishCostItems().forEach((dish) => {
    const candidates = Array.from(
      new Set(
        [dish.name, ...(dish.aliases ?? [])]
          .map(normalizeDishName)
          .filter(Boolean),
      ),
    );

    candidates.forEach((candidate) => {
      const needle = ` ${candidate} `;
      let searchFrom = 0;

      while (searchFrom < searchableValue.length) {
        const start = searchableValue.indexOf(needle, searchFrom);
        if (start < 0) break;

        matches.push({
          dish,
          start,
          end: start + needle.length,
          length: needle.length,
        });

        searchFrom = start + 1;
      }
    });
  });

  /*
   * Prefer the longest name when catalog aliases overlap, then keep only
   * non-overlapping spans. For example, "Paneer Butter Masala" should not
   * also be treated as a shorter paneer dish.
   */
  const selected: typeof matches = [];

  matches
    .sort(
      (left, right) =>
        left.start - right.start ||
        right.length - left.length ||
        left.dish.name.localeCompare(right.dish.name),
    )
    .forEach((match) => {
      const overlaps = selected.some(
        (selectedMatch) =>
          match.start < selectedMatch.end &&
          match.end > selectedMatch.start,
      );

      if (!overlaps) selected.push(match);
    });

  const seenDishes = new Set<string>();

  return selected
    .sort((left, right) => left.start - right.start)
    .filter((match) => {
      const key = `${normalizeDishName(match.dish.name)}-${match.dish.category}`;
      if (seenDishes.has(key)) return false;
      seenDishes.add(key);
      return true;
    })
    .map((match) => match.dish);
}

export function detectDish(name: string): DishCostItem | null {
  return findDishByName(name);
}

export function suggestDishesByName(name: string, limit = 5): DishCostItem[] {
  const normalizedInput = normalizeDishName(name);
  if (!normalizedInput) return [];

  const inputTokens = tokenizeDishName(name);

  return getDishCostItems()
    .map((dish) => {
      const candidates = [dish.name, ...(dish.aliases ?? [])];
      const score = Math.max(
        ...candidates.map((candidate) => {
          const normalizedCandidate = normalizeDishName(candidate);
          const candidateTokens = tokenizeDishName(candidate);
          let value = 0;

          if (normalizedCandidate.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedCandidate)) value += 6;
          if (normalizedCandidate.includes(normalizedInput) || normalizedInput.includes(normalizedCandidate)) value += 4;

          const sharedTokens = candidateTokens.filter((token) => inputTokens.includes(token)).length;
          value += sharedTokens * 2;

          return value;
        }),
      );

      return { dish, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.dish.name.localeCompare(b.dish.name))
    .slice(0, limit)
    .map((entry) => entry.dish);
}

export function detectCategory(name: string): Category {
  const dish = detectDish(name);
  if (dish) return dish.category;

  const normalized = normalizeDishName(name);
  const matchedCategory = CATEGORIES.find((category) =>
    categoryAliases[category].some((alias) => normalized.includes(normalizeDishName(alias))),
  );

  return matchedCategory ?? 'Sabji';
}

export function detectCost(name: string, category?: string) {
  const dish = detectDish(name);
  if (dish) return dish.rate;

  const detectedCategory = (category && CATEGORIES.includes(category as Category) ? category : detectCategory(name)) as Category;
  return CATEGORY_BASE_COST[detectedCategory] ?? 45;
}
