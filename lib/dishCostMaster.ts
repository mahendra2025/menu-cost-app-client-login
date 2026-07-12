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
{ name: 'Orange Juice', category: 'Welcome Drink', rate: 18, aliases: ['orange juice', 'fresh orange juice', 'santra juice'] },
{ name: 'Apple Juice', category: 'Welcome Drink', rate: 22, aliases: ['apple juice', 'fresh apple juice', 'seb juice'] },
{ name: 'Pineapple Juice', category: 'Welcome Drink', rate: 20, aliases: ['pineapple juice', 'ananas juice'] },
{ name: 'Watermelon Juice', category: 'Welcome Drink', rate: 18, aliases: ['watermelon juice', 'tarbooj juice'] },
{ name: 'Muskmelon Juice', category: 'Welcome Drink', rate: 20, aliases: ['muskmelon juice', 'kharbuja juice'] },
{ name: 'Mango Juice', category: 'Welcome Drink', rate: 22, aliases: ['mango juice', 'aam juice'] },
{ name: 'Grape Juice', category: 'Welcome Drink', rate: 22, aliases: ['grape juice', 'angoor juice'] },
{ name: 'Pomegranate Juice', category: 'Welcome Drink', rate: 28, aliases: ['pomegranate juice', 'anar juice'] },
{ name: 'Guava Juice', category: 'Welcome Drink', rate: 20, aliases: ['guava juice', 'amrud juice'] },
{ name: 'Lychee Juice', category: 'Welcome Drink', rate: 24, aliases: ['lychee juice', 'litchi juice'] },
{ name: 'Kiwi Juice', category: 'Welcome Drink', rate: 28, aliases: ['kiwi juice'] },
{ name: 'Mixed Fruit Juice', category: 'Welcome Drink', rate: 24, aliases: ['mixed fruit juice', 'mix fruit juice', 'fruit juice'] },
{ name: 'Strawberry Juice', category: 'Welcome Drink', rate: 25, aliases: ['strawberry juice'] },
{ name: 'Peach Juice', category: 'Welcome Drink', rate: 24, aliases: ['peach juice'] },

{ name: 'Jaljeera', category: 'Welcome Drink', rate: 18, aliases: ['jaljeera', 'jal jeera'] },
{ name: 'Mint Jaljeera', category: 'Welcome Drink', rate: 20, aliases: ['mint jaljeera', 'pudina jaljeera'] },
{ name: 'Kokum Sharbat', category: 'Welcome Drink', rate: 20, aliases: ['kokum sharbat', 'kokum drink'] },
{ name: 'Aam Panna', category: 'Welcome Drink', rate: 20, aliases: ['aam panna', 'mango panna'] },
{ name: 'Nimbu Pani', category: 'Welcome Drink', rate: 16, aliases: ['nimbu pani', 'lemon water', 'lemon drink'] },
{ name: 'Masala Nimbu Pani', category: 'Welcome Drink', rate: 18, aliases: ['masala nimbu pani', 'masala lemon water'] },
{ name: 'Shikanji', category: 'Welcome Drink', rate: 18, aliases: ['shikanji', 'shikanjvi'] },
{ name: 'Mint Lemonade', category: 'Welcome Drink', rate: 22, aliases: ['mint lemonade', 'pudina lemonade'] },
{ name: 'Fresh Lime Water', category: 'Welcome Drink', rate: 18, aliases: ['fresh lime water', 'lime water'] },
{ name: 'Fresh Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ['fresh lime soda', 'lime soda'] },
{ name: 'Sweet Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ['sweet lime soda'] },
{ name: 'Salted Lime Soda', category: 'Welcome Drink', rate: 22, aliases: ['salted lime soda', 'salt lime soda'] },

{ name: 'Rose Sharbat', category: 'Welcome Drink', rate: 18, aliases: ['rose sharbat', 'gulab sharbat'] },
{ name: 'Khus Sharbat', category: 'Welcome Drink', rate: 18, aliases: ['khus sharbat', 'khas sharbat'] },
{ name: 'Badam Sharbat', category: 'Welcome Drink', rate: 26, aliases: ['badam sharbat', 'almond sharbat'] },
{ name: 'Kesar Sharbat', category: 'Welcome Drink', rate: 24, aliases: ['kesar sharbat', 'saffron sharbat'] },
{ name: 'Orange Sharbat', category: 'Welcome Drink', rate: 18, aliases: ['orange sharbat'] },
{ name: 'Pineapple Sharbat', category: 'Welcome Drink', rate: 18, aliases: ['pineapple sharbat'] },
{ name: 'Raw Mango Sharbat', category: 'Welcome Drink', rate: 20, aliases: ['raw mango sharbat', 'kacchi keri sharbat'] },
{ name: 'Bel Sharbat', category: 'Welcome Drink', rate: 22, aliases: ['bel sharbat', 'bael sharbat'] },

{ name: 'Sweet Lassi', category: 'Welcome Drink', rate: 24, aliases: ['sweet lassi', 'lassi sweet'] },
{ name: 'Salted Lassi', category: 'Welcome Drink', rate: 22, aliases: ['salted lassi', 'namkeen lassi'] },
{ name: 'Mango Lassi', category: 'Welcome Drink', rate: 28, aliases: ['mango lassi', 'aam lassi'] },
{ name: 'Rose Lassi', category: 'Welcome Drink', rate: 26, aliases: ['rose lassi', 'gulab lassi'] },
{ name: 'Kesar Lassi', category: 'Welcome Drink', rate: 28, aliases: ['kesar lassi', 'saffron lassi'] },
{ name: 'Dry Fruit Lassi', category: 'Welcome Drink', rate: 32, aliases: ['dry fruit lassi', 'dryfruit lassi'] },
{ name: 'Chaas', category: 'Welcome Drink', rate: 16, aliases: ['chaas', 'buttermilk', 'chhach'] },
{ name: 'Masala Chaas', category: 'Welcome Drink', rate: 18, aliases: ['masala chaas', 'masala buttermilk'] },
{ name: 'Pudina Chaas', category: 'Welcome Drink', rate: 18, aliases: ['pudina chaas', 'mint buttermilk'] },

{ name: 'Cold Coffee', category: 'Welcome Drink', rate: 28, aliases: ['cold coffee', 'iced coffee'] },
{ name: 'Chocolate Milkshake', category: 'Welcome Drink', rate: 32, aliases: ['chocolate milkshake', 'chocolate shake'] },
{ name: 'Vanilla Milkshake', category: 'Welcome Drink', rate: 30, aliases: ['vanilla milkshake', 'vanilla shake'] },
{ name: 'Strawberry Milkshake', category: 'Welcome Drink', rate: 32, aliases: ['strawberry milkshake', 'strawberry shake'] },
{ name: 'Mango Milkshake', category: 'Welcome Drink', rate: 32, aliases: ['mango milkshake', 'mango shake'] },
{ name: 'Chikoo Milkshake', category: 'Welcome Drink', rate: 32, aliases: ['chikoo milkshake', 'chikoo shake', 'sapota shake'] },
{ name: 'Banana Milkshake', category: 'Welcome Drink', rate: 28, aliases: ['banana milkshake', 'banana shake'] },
{ name: 'Kesar Badam Milk', category: 'Welcome Drink', rate: 30, aliases: ['kesar badam milk', 'saffron almond milk'] },
{ name: 'Thandai', category: 'Welcome Drink', rate: 30, aliases: ['thandai', 'badam thandai'] },

{ name: 'Tender Coconut Water', category: 'Welcome Drink', rate: 35, aliases: ['tender coconut water', 'coconut water', 'nariyal pani'] },
{ name: 'Sugarcane Juice', category: 'Welcome Drink', rate: 24, aliases: ['sugarcane juice', 'ganne ka juice'] },
{ name: 'Sattu Sharbat', category: 'Welcome Drink', rate: 20, aliases: ['sattu sharbat', 'sattu drink'] },
{ name: 'Sol Kadhi', category: 'Welcome Drink', rate: 22, aliases: ['sol kadhi', 'solkadhi'] },
{ name: 'Kokum Soda', category: 'Welcome Drink', rate: 24, aliases: ['kokum soda'] },
{ name: 'Jeera Soda', category: 'Welcome Drink', rate: 20, aliases: ['jeera soda', 'cumin soda'] },
{ name: 'Masala Soda', category: 'Welcome Drink', rate: 20, aliases: ['masala soda'] },


// Mocktail

{ name: 'Virgin Mojito', category: 'Mocktail', rate: 35, aliases: ['virgin mojito', 'mint mojito', 'classic virgin mojito'] },
{ name: 'Blue Lagoon', category: 'Mocktail', rate: 38, aliases: ['blue lagoon', 'blue lagoon mocktail'] },
{ name: 'Fruit Punch', category: 'Mocktail', rate: 36, aliases: ['fruit punch', 'mixed fruit punch'] },
{ name: 'Green Apple Mojito', category: 'Mocktail', rate: 38, aliases: ['green apple mojito', 'apple mojito'] },
{ name: 'Watermelon Mojito', category: 'Mocktail', rate: 38, aliases: ['watermelon mojito', 'tarbooj mojito'] },
{ name: 'Strawberry Mojito', category: 'Mocktail', rate: 40, aliases: ['strawberry mojito'] },
{ name: 'Kiwi Mojito', category: 'Mocktail', rate: 42, aliases: ['kiwi mojito'] },
{ name: 'Orange Mojito', category: 'Mocktail', rate: 38, aliases: ['orange mojito'] },
{ name: 'Pineapple Mojito', category: 'Mocktail', rate: 40, aliases: ['pineapple mojito'] },
{ name: 'Mango Mojito', category: 'Mocktail', rate: 40, aliases: ['mango mojito', 'aam mojito'] },
{ name: 'Peach Mojito', category: 'Mocktail', rate: 42, aliases: ['peach mojito'] },
{ name: 'Lychee Mojito', category: 'Mocktail', rate: 42, aliases: ['lychee mojito', 'litchi mojito'] },
{ name: 'Pomegranate Mojito', category: 'Mocktail', rate: 44, aliases: ['pomegranate mojito', 'anar mojito'] },
{ name: 'Passion Fruit Mojito', category: 'Mocktail', rate: 45, aliases: ['passion fruit mojito', 'passionfruit mojito'] },

{ name: 'Virgin Pina Colada', category: 'Mocktail', rate: 42, aliases: ['virgin pina colada', 'pina colada', 'pineapple coconut mocktail'] },
{ name: 'Virgin Mary', category: 'Mocktail', rate: 40, aliases: ['virgin mary', 'tomato mocktail'] },
{ name: 'Virgin Sangria', category: 'Mocktail', rate: 45, aliases: ['virgin sangria', 'non alcoholic sangria', 'fruit sangria'] },
{ name: 'Virgin Margarita', category: 'Mocktail', rate: 42, aliases: ['virgin margarita', 'lime margarita mocktail'] },
{ name: 'Virgin Cosmopolitan', category: 'Mocktail', rate: 45, aliases: ['virgin cosmopolitan', 'virgin cosmo'] },
{ name: 'Virgin Sunrise', category: 'Mocktail', rate: 40, aliases: ['virgin sunrise', 'orange sunrise mocktail'] },
{ name: 'Virgin Daiquiri', category: 'Mocktail', rate: 42, aliases: ['virgin daiquiri', 'lime daiquiri mocktail'] },

{ name: 'Mango Tango', category: 'Mocktail', rate: 42, aliases: ['mango tango', 'mango tango mocktail'] },
{ name: 'Orange Blossom', category: 'Mocktail', rate: 40, aliases: ['orange blossom', 'orange blossom mocktail'] },
{ name: 'Pineapple Punch', category: 'Mocktail', rate: 40, aliases: ['pineapple punch'] },
{ name: 'Mango Punch', category: 'Mocktail', rate: 40, aliases: ['mango punch'] },
{ name: 'Berry Blast', category: 'Mocktail', rate: 45, aliases: ['berry blast', 'mixed berry mocktail'] },
{ name: 'Tropical Punch', category: 'Mocktail', rate: 42, aliases: ['tropical punch', 'tropical fruit punch'] },
{ name: 'Citrus Punch', category: 'Mocktail', rate: 38, aliases: ['citrus punch', 'citrus mocktail'] },
{ name: 'Summer Punch', category: 'Mocktail', rate: 40, aliases: ['summer punch', 'summer fruit punch'] },
{ name: 'Royal Fruit Punch', category: 'Mocktail', rate: 48, aliases: ['royal fruit punch', 'premium fruit punch'] },

{ name: 'Green Apple Cooler', category: 'Mocktail', rate: 38, aliases: ['green apple cooler', 'apple cooler'] },
{ name: 'Watermelon Cooler', category: 'Mocktail', rate: 38, aliases: ['watermelon cooler', 'tarbooj cooler'] },
{ name: 'Mint Cooler', category: 'Mocktail', rate: 35, aliases: ['mint cooler', 'pudina cooler'] },
{ name: 'Cucumber Cooler', category: 'Mocktail', rate: 36, aliases: ['cucumber cooler', 'kheera cooler'] },
{ name: 'Lemon Mint Cooler', category: 'Mocktail', rate: 36, aliases: ['lemon mint cooler', 'lime mint cooler'] },
{ name: 'Orange Cooler', category: 'Mocktail', rate: 38, aliases: ['orange cooler'] },
{ name: 'Pineapple Cooler', category: 'Mocktail', rate: 40, aliases: ['pineapple cooler'] },
{ name: 'Mango Cooler', category: 'Mocktail', rate: 40, aliases: ['mango cooler'] },
{ name: 'Kiwi Cooler', category: 'Mocktail', rate: 42, aliases: ['kiwi cooler'] },
{ name: 'Strawberry Cooler', category: 'Mocktail', rate: 42, aliases: ['strawberry cooler'] },
{ name: 'Lychee Cooler', category: 'Mocktail', rate: 42, aliases: ['lychee cooler', 'litchi cooler'] },
{ name: 'Peach Cooler', category: 'Mocktail', rate: 42, aliases: ['peach cooler'] },
{ name: 'Passion Fruit Cooler', category: 'Mocktail', rate: 45, aliases: ['passion fruit cooler', 'passionfruit cooler'] },

{ name: 'Rose Lemonade', category: 'Mocktail', rate: 36, aliases: ['rose lemonade', 'gulab lemonade'] },
{ name: 'Mint Lemonade', category: 'Mocktail', rate: 35, aliases: ['mint lemonade', 'pudina lemonade'] },
{ name: 'Strawberry Lemonade', category: 'Mocktail', rate: 40, aliases: ['strawberry lemonade'] },
{ name: 'Watermelon Lemonade', category: 'Mocktail', rate: 38, aliases: ['watermelon lemonade'] },
{ name: 'Blueberry Lemonade', category: 'Mocktail', rate: 44, aliases: ['blueberry lemonade'] },
{ name: 'Peach Lemonade', category: 'Mocktail', rate: 42, aliases: ['peach lemonade'] },
{ name: 'Lychee Lemonade', category: 'Mocktail', rate: 42, aliases: ['lychee lemonade', 'litchi lemonade'] },
{ name: 'Pink Lemonade', category: 'Mocktail', rate: 38, aliases: ['pink lemonade'] },
{ name: 'Masala Lemonade', category: 'Mocktail', rate: 35, aliases: ['masala lemonade', 'spiced lemonade'] },

{ name: 'Blue Curacao Fizz', category: 'Mocktail', rate: 42, aliases: ['blue curacao fizz', 'blue fizz'] },
{ name: 'Green Apple Fizz', category: 'Mocktail', rate: 40, aliases: ['green apple fizz', 'apple fizz'] },
{ name: 'Orange Fizz', category: 'Mocktail', rate: 38, aliases: ['orange fizz'] },
{ name: 'Lemon Fizz', category: 'Mocktail', rate: 35, aliases: ['lemon fizz', 'lime fizz'] },
{ name: 'Strawberry Fizz', category: 'Mocktail', rate: 42, aliases: ['strawberry fizz'] },
{ name: 'Kiwi Fizz', category: 'Mocktail', rate: 42, aliases: ['kiwi fizz'] },
{ name: 'Rose Fizz', category: 'Mocktail', rate: 38, aliases: ['rose fizz', 'gulab fizz'] },
{ name: 'Ginger Fizz', category: 'Mocktail', rate: 38, aliases: ['ginger fizz', 'adrak fizz'] },

{ name: 'Kala Khatta Mocktail', category: 'Mocktail', rate: 35, aliases: ['kala khatta mocktail', 'kala khatta'] },
{ name: 'Kokum Fizz', category: 'Mocktail', rate: 38, aliases: ['kokum fizz', 'kokum mocktail'] },
{ name: 'Jaljeera Fizz', category: 'Mocktail', rate: 35, aliases: ['jaljeera fizz', 'jal jeera fizz'] },
{ name: 'Aam Panna Fizz', category: 'Mocktail', rate: 38, aliases: ['aam panna fizz', 'mango panna fizz'] },
{ name: 'Masala Cola', category: 'Mocktail', rate: 32, aliases: ['masala cola', 'masala coke'] },
{ name: 'Jeera Cola', category: 'Mocktail', rate: 32, aliases: ['jeera cola', 'jeera coke'] },
{ name: 'Nimbu Masala Soda', category: 'Mocktail', rate: 32, aliases: ['nimbu masala soda', 'lemon masala soda'] },
{ name: 'Khus Lime Soda', category: 'Mocktail', rate: 35, aliases: ['khus lime soda', 'khus soda'] },
{ name: 'Rose Lime Soda', category: 'Mocktail', rate: 35, aliases: ['rose lime soda', 'gulab lime soda'] },

{ name: 'Black Currant Mocktail', category: 'Mocktail', rate: 42, aliases: ['black currant mocktail', 'blackcurrant mocktail'] },
{ name: 'Cranberry Mocktail', category: 'Mocktail', rate: 45, aliases: ['cranberry mocktail', 'cranberry cooler'] },
{ name: 'Blueberry Mocktail', category: 'Mocktail', rate: 45, aliases: ['blueberry mocktail'] },
{ name: 'Raspberry Mocktail', category: 'Mocktail', rate: 46, aliases: ['raspberry mocktail'] },
{ name: 'Mixed Berry Mocktail', category: 'Mocktail', rate: 48, aliases: ['mixed berry mocktail', 'berry mix mocktail'] },

{ name: 'Guava Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ['guava chilli mocktail', 'chilli guava', 'spicy guava'] },
{ name: 'Pineapple Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ['pineapple chilli mocktail', 'spicy pineapple'] },
{ name: 'Mango Chilli Mocktail', category: 'Mocktail', rate: 42, aliases: ['mango chilli mocktail', 'spicy mango'] },
{ name: 'Watermelon Basil Mocktail', category: 'Mocktail', rate: 42, aliases: ['watermelon basil mocktail', 'watermelon basil cooler'] },
{ name: 'Cucumber Basil Cooler', category: 'Mocktail', rate: 40, aliases: ['cucumber basil cooler', 'cucumber basil mocktail'] },
{ name: 'Orange Basil Cooler', category: 'Mocktail', rate: 42, aliases: ['orange basil cooler', 'orange basil mocktail'] },

{ name: 'Cinderella Mocktail', category: 'Mocktail', rate: 45, aliases: ['cinderella mocktail', 'cinderella drink'] },
{ name: 'Shirley Temple', category: 'Mocktail', rate: 42, aliases: ['shirley temple', 'shirley temple mocktail'] },
{ name: 'Purple Rain Mocktail', category: 'Mocktail', rate: 45, aliases: ['purple rain mocktail', 'purple rain'] },
{ name: 'Ocean Blue Mocktail', category: 'Mocktail', rate: 45, aliases: ['ocean blue mocktail', 'ocean blue'] },
{ name: 'Sunset Mocktail', category: 'Mocktail', rate: 42, aliases: ['sunset mocktail', 'tropical sunset'] },
{ name: 'Rainbow Mocktail', category: 'Mocktail', rate: 48, aliases: ['rainbow mocktail', 'rainbow drink'] },
{ name: 'Electric Lemonade', category: 'Mocktail', rate: 45, aliases: ['electric lemonade', 'blue electric lemonade'] },
{ name: 'Red Velvet Mocktail', category: 'Mocktail', rate: 48, aliases: ['red velvet mocktail'] },

{ name: 'Tender Coconut Cooler', category: 'Mocktail', rate: 48, aliases: ['tender coconut cooler', 'coconut cooler', 'nariyal cooler'] },
{ name: 'Coconut Pineapple Cooler', category: 'Mocktail', rate: 48, aliases: ['coconut pineapple cooler', 'pineapple coconut cooler'] },
{ name: 'Coconut Mint Cooler', category: 'Mocktail', rate: 46, aliases: ['coconut mint cooler', 'mint coconut cooler'] },


// Soup

{ name: 'Tomato Soup', category: 'Soup', rate: 22, aliases: ['tomato soup', 'classic tomato soup'] },
{ name: 'Cream of Tomato Soup', category: 'Soup', rate: 26, aliases: ['cream of tomato soup', 'creamy tomato soup'] },
{ name: 'Tomato Basil Soup', category: 'Soup', rate: 28, aliases: ['tomato basil soup', 'basil tomato soup'] },
{ name: 'Roasted Tomato Soup', category: 'Soup', rate: 28, aliases: ['roasted tomato soup', 'roast tomato soup'] },
{ name: 'Tomato Dhaniya Shorba', category: 'Soup', rate: 27, aliases: ['tomato dhaniya shorba', 'tamatar dhaniya shorba'] },

{ name: 'Manchow Soup', category: 'Soup', rate: 24, aliases: ['manchow soup', 'veg manchow soup', 'vegetable manchow soup'] },
{ name: 'Hot and Sour Soup', category: 'Soup', rate: 25, aliases: ['hot and sour soup', 'hot & sour soup', 'veg hot and sour soup'] },
{ name: 'Sweet Corn Soup', category: 'Soup', rate: 24, aliases: ['sweet corn soup', 'veg sweet corn soup'] },
{ name: 'Vegetable Clear Soup', category: 'Soup', rate: 22, aliases: ['vegetable clear soup', 'veg clear soup'] },
{ name: 'Chinese Clear Soup', category: 'Soup', rate: 23, aliases: ['chinese clear soup', 'chinese vegetable clear soup'] },
{ name: 'Lemon Coriander Soup', category: 'Soup', rate: 25, aliases: ['lemon coriander soup', 'lemon dhaniya soup'] },
{ name: 'Veg Noodle Soup', category: 'Soup', rate: 26, aliases: ['veg noodle soup', 'vegetable noodle soup'] },
{ name: 'Schezwan Soup', category: 'Soup', rate: 27, aliases: ['schezwan soup', 'szechuan soup', 'veg schezwan soup'] },
{ name: 'Wonton Soup', category: 'Soup', rate: 30, aliases: ['wonton soup', 'veg wonton soup'] },
{ name: 'Talumein Soup', category: 'Soup', rate: 28, aliases: ['talumein soup', 'talumeen soup', 'veg talumein soup'] },
{ name: 'Dragon Soup', category: 'Soup', rate: 28, aliases: ['dragon soup', 'veg dragon soup'] },
{ name: 'Burnt Garlic Soup', category: 'Soup', rate: 28, aliases: ['burnt garlic soup', 'veg burnt garlic soup'] },
{ name: 'Chilli Garlic Soup', category: 'Soup', rate: 27, aliases: ['chilli garlic soup', 'chili garlic soup'] },
{ name: 'Ginger Garlic Soup', category: 'Soup', rate: 27, aliases: ['ginger garlic soup', 'adrak garlic soup'] },
{ name: 'Mushroom Manchow Soup', category: 'Soup', rate: 30, aliases: ['mushroom manchow soup'] },
{ name: 'Paneer Manchow Soup', category: 'Soup', rate: 31, aliases: ['paneer manchow soup'] },
{ name: 'Baby Corn Manchow Soup', category: 'Soup', rate: 29, aliases: ['baby corn manchow soup'] },
{ name: 'Spinach Manchow Soup', category: 'Soup', rate: 28, aliases: ['spinach manchow soup', 'palak manchow soup'] },

{ name: 'Cream of Mushroom Soup', category: 'Soup', rate: 30, aliases: ['cream of mushroom soup', 'creamy mushroom soup'] },
{ name: 'Mushroom Soup', category: 'Soup', rate: 27, aliases: ['mushroom soup', 'veg mushroom soup'] },
{ name: 'Cream of Vegetable Soup', category: 'Soup', rate: 28, aliases: ['cream of vegetable soup', 'creamy vegetable soup'] },
{ name: 'Cream of Spinach Soup', category: 'Soup', rate: 28, aliases: ['cream of spinach soup', 'creamy spinach soup', 'cream of palak soup'] },
{ name: 'Cream of Broccoli Soup', category: 'Soup', rate: 32, aliases: ['cream of broccoli soup', 'creamy broccoli soup'] },
{ name: 'Cream of Corn Soup', category: 'Soup', rate: 28, aliases: ['cream of corn soup', 'creamy corn soup'] },
{ name: 'Cream of Peas Soup', category: 'Soup', rate: 27, aliases: ['cream of peas soup', 'green peas soup'] },
{ name: 'Cream of Carrot Soup', category: 'Soup', rate: 27, aliases: ['cream of carrot soup', 'creamy carrot soup'] },
{ name: 'Cream of Pumpkin Soup', category: 'Soup', rate: 28, aliases: ['cream of pumpkin soup', 'creamy pumpkin soup'] },
{ name: 'Cream of Asparagus Soup', category: 'Soup', rate: 35, aliases: ['cream of asparagus soup', 'asparagus soup'] },
{ name: 'Cream of Celery Soup', category: 'Soup', rate: 32, aliases: ['cream of celery soup', 'celery soup'] },
{ name: 'Cream of Cauliflower Soup', category: 'Soup', rate: 29, aliases: ['cream of cauliflower soup', 'creamy cauliflower soup'] },

{ name: 'Broccoli Almond Soup', category: 'Soup', rate: 36, aliases: ['broccoli almond soup', 'broccoli badam soup'] },
{ name: 'Broccoli Cheese Soup', category: 'Soup', rate: 38, aliases: ['broccoli cheese soup', 'cheesy broccoli soup'] },
{ name: 'Spinach Almond Soup', category: 'Soup', rate: 34, aliases: ['spinach almond soup', 'palak badam soup'] },
{ name: 'Carrot Almond Soup', category: 'Soup', rate: 32, aliases: ['carrot almond soup', 'carrot badam soup'] },
{ name: 'Pumpkin Almond Soup', category: 'Soup', rate: 34, aliases: ['pumpkin almond soup', 'pumpkin badam soup'] },
{ name: 'Mushroom Almond Soup', category: 'Soup', rate: 36, aliases: ['mushroom almond soup', 'mushroom badam soup'] },
{ name: 'Almond Soup', category: 'Soup', rate: 38, aliases: ['almond soup', 'badam soup'] },

{ name: 'Minestrone Soup', category: 'Soup', rate: 30, aliases: ['minestrone soup', 'vegetable minestrone soup'] },
{ name: 'Italian Vegetable Soup', category: 'Soup', rate: 29, aliases: ['italian vegetable soup', 'italian veg soup'] },
{ name: 'Pasta Vegetable Soup', category: 'Soup', rate: 30, aliases: ['pasta vegetable soup', 'vegetable pasta soup'] },
{ name: 'Mediterranean Vegetable Soup', category: 'Soup', rate: 32, aliases: ['mediterranean vegetable soup', 'mediterranean veg soup'] },
{ name: 'Mexican Bean Soup', category: 'Soup', rate: 32, aliases: ['mexican bean soup', 'mexican beans soup'] },
{ name: 'Mexican Tortilla Soup', category: 'Soup', rate: 34, aliases: ['mexican tortilla soup', 'veg tortilla soup'] },
{ name: 'Mexican Corn Soup', category: 'Soup', rate: 31, aliases: ['mexican corn soup'] },
{ name: 'Tuscan Vegetable Soup', category: 'Soup', rate: 34, aliases: ['tuscan vegetable soup', 'tuscan veg soup'] },
{ name: 'French Onion Soup', category: 'Soup', rate: 32, aliases: ['french onion soup'] },
{ name: 'Potato Leek Soup', category: 'Soup', rate: 32, aliases: ['potato leek soup', 'leek potato soup'] },

{ name: 'Thai Coconut Soup', category: 'Soup', rate: 36, aliases: ['thai coconut soup', 'coconut thai soup'] },
{ name: 'Thai Vegetable Soup', category: 'Soup', rate: 34, aliases: ['thai vegetable soup', 'thai veg soup'] },
{ name: 'Tom Yum Soup', category: 'Soup', rate: 35, aliases: ['tom yum soup', 'veg tom yum soup'] },
{ name: 'Tom Kha Soup', category: 'Soup', rate: 38, aliases: ['tom kha soup', 'veg tom kha soup'] },
{ name: 'Thai Lemongrass Soup', category: 'Soup', rate: 35, aliases: ['thai lemongrass soup', 'lemongrass soup'] },
{ name: 'Thai Ginger Soup', category: 'Soup', rate: 35, aliases: ['thai ginger soup'] },

{ name: 'Mulligatawny Soup', category: 'Soup', rate: 30, aliases: ['mulligatawny soup', 'mulligatawny shorba'] },
{ name: 'Dal Shorba', category: 'Soup', rate: 24, aliases: ['dal shorba', 'daal shorba'] },
{ name: 'Moong Dal Shorba', category: 'Soup', rate: 25, aliases: ['moong dal shorba', 'moong daal shorba'] },
{ name: 'Masoor Dal Shorba', category: 'Soup', rate: 25, aliases: ['masoor dal shorba', 'masoor daal shorba'] },
{ name: 'Palak Shorba', category: 'Soup', rate: 26, aliases: ['palak shorba', 'spinach shorba'] },
{ name: 'Tamatar Shorba', category: 'Soup', rate: 24, aliases: ['tamatar shorba', 'tomato shorba'] },
{ name: 'Makki Shorba', category: 'Soup', rate: 26, aliases: ['makki shorba', 'corn shorba'] },
{ name: 'Subz Shorba', category: 'Soup', rate: 26, aliases: ['subz shorba', 'sabz shorba', 'vegetable shorba'] },
{ name: 'Badam Shorba', category: 'Soup', rate: 36, aliases: ['badam shorba', 'almond shorba'] },
{ name: 'Mushroom Shorba', category: 'Soup', rate: 30, aliases: ['mushroom shorba'] },
{ name: 'Broccoli Shorba', category: 'Soup', rate: 32, aliases: ['broccoli shorba'] },
{ name: 'Corn Palak Shorba', category: 'Soup', rate: 29, aliases: ['corn palak shorba', 'spinach corn shorba'] },
{ name: 'Lauki Shorba', category: 'Soup', rate: 24, aliases: ['lauki shorba', 'bottle gourd soup'] },

{ name: 'Carrot Ginger Soup', category: 'Soup', rate: 28, aliases: ['carrot ginger soup', 'carrot adrak soup'] },
{ name: 'Pumpkin Ginger Soup', category: 'Soup', rate: 29, aliases: ['pumpkin ginger soup'] },
{ name: 'Beetroot Soup', category: 'Soup', rate: 27, aliases: ['beetroot soup', 'beet soup'] },
{ name: 'Carrot Beetroot Soup', category: 'Soup', rate: 28, aliases: ['carrot beetroot soup', 'carrot beet soup'] },
{ name: 'Spinach Corn Soup', category: 'Soup', rate: 28, aliases: ['spinach corn soup', 'palak corn soup'] },
{ name: 'Broccoli Corn Soup', category: 'Soup', rate: 30, aliases: ['broccoli corn soup'] },
{ name: 'Mushroom Corn Soup', category: 'Soup', rate: 30, aliases: ['mushroom corn soup'] },
{ name: 'Mixed Vegetable Soup', category: 'Soup', rate: 25, aliases: ['mixed vegetable soup', 'mix vegetable soup', 'mixed veg soup'] },
{ name: 'Garden Fresh Vegetable Soup', category: 'Soup', rate: 26, aliases: ['garden fresh vegetable soup', 'garden vegetable soup'] },
{ name: 'Cabbage Soup', category: 'Soup', rate: 24, aliases: ['cabbage soup', 'patta gobhi soup'] },
{ name: 'Bottle Gourd Soup', category: 'Soup', rate: 24, aliases: ['bottle gourd soup', 'lauki soup'] },
{ name: 'Zucchini Soup', category: 'Soup', rate: 30, aliases: ['zucchini soup'] },
{ name: 'Green Peas Mint Soup', category: 'Soup', rate: 28, aliases: ['green peas mint soup', 'peas mint soup'] },
{ name: 'Corn Capsicum Soup', category: 'Soup', rate: 28, aliases: ['corn capsicum soup'] },

{ name: 'Cheese Corn Soup', category: 'Soup', rate: 32, aliases: ['cheese corn soup', 'cheesy corn soup'] },
{ name: 'Paneer Corn Soup', category: 'Soup', rate: 31, aliases: ['paneer corn soup'] },
{ name: 'Paneer Clear Soup', category: 'Soup', rate: 30, aliases: ['paneer clear soup'] },
{ name: 'Tofu Vegetable Soup', category: 'Soup', rate: 32, aliases: ['tofu vegetable soup', 'tofu veg soup'] },
{ name: 'Tofu Clear Soup', category: 'Soup', rate: 31, aliases: ['tofu clear soup'] },

{ name: 'Quinoa Vegetable Soup', category: 'Soup', rate: 36, aliases: ['quinoa vegetable soup', 'quinoa veg soup'] },
{ name: 'Oats Vegetable Soup', category: 'Soup', rate: 30, aliases: ['oats vegetable soup', 'oats veg soup'] },
{ name: 'Barley Vegetable Soup', category: 'Soup', rate: 31, aliases: ['barley vegetable soup', 'jau vegetable soup'] },
{ name: 'Lentil Vegetable Soup', category: 'Soup', rate: 30, aliases: ['lentil vegetable soup', 'lentil veg soup'] },
{ name: 'Healthy Green Soup', category: 'Soup', rate: 32, aliases: ['healthy green soup', 'green detox soup'] },
{ name: 'Detox Vegetable Soup', category: 'Soup', rate: 32, aliases: ['detox vegetable soup', 'vegetable detox soup'] },
{ name: 'Seven Vegetable Soup', category: 'Soup', rate: 30, aliases: ['seven vegetable soup', '7 vegetable soup'] },

{ name: 'Sweet Corn Almond Soup', category: 'Soup', rate: 36, aliases: ['sweet corn almond soup', 'corn badam soup'] },
{ name: 'Broccoli Walnut Soup', category: 'Soup', rate: 38, aliases: ['broccoli walnut soup', 'broccoli akhrot soup'] },
{ name: 'Mushroom Truffle Soup', category: 'Soup', rate: 45, aliases: ['mushroom truffle soup', 'truffle mushroom soup'] },
{ name: 'Roasted Bell Pepper Soup', category: 'Soup', rate: 34, aliases: ['roasted bell pepper soup', 'roasted capsicum soup'] },
{ name: 'Roasted Pumpkin Soup', category: 'Soup', rate: 32, aliases: ['roasted pumpkin soup', 'roast pumpkin soup'] },
{ name: 'Roasted Garlic Soup', category: 'Soup', rate: 32, aliases: ['roasted garlic soup', 'roast garlic soup'] },
{ name: 'Roasted Vegetable Soup', category: 'Soup', rate: 32, aliases: ['roasted vegetable soup', 'roast vegetable soup'] },
// Starter — Paneer

{ name: 'Paneer Tikka', category: 'Starter', rate: 58, aliases: ['paneer tikka', 'classic paneer tikka'] },
{ name: 'Malai Paneer Tikka', category: 'Starter', rate: 62, aliases: ['malai paneer tikka', 'paneer malai tikka'] },
{ name: 'Achari Paneer Tikka', category: 'Starter', rate: 62, aliases: ['achari paneer tikka', 'achar paneer tikka'] },
{ name: 'Hariyali Paneer Tikka', category: 'Starter', rate: 62, aliases: ['hariyali paneer tikka', 'green paneer tikka'] },
{ name: 'Lasooni Paneer Tikka', category: 'Starter', rate: 64, aliases: ['lasooni paneer tikka', 'lahsuni paneer tikka', 'garlic paneer tikka'] },
{ name: 'Afghani Paneer Tikka', category: 'Starter', rate: 66, aliases: ['afghani paneer tikka', 'paneer afghani tikka'] },
{ name: 'Pahadi Paneer Tikka', category: 'Starter', rate: 64, aliases: ['pahadi paneer tikka', 'pahaadi paneer tikka'] },
{ name: 'Tandoori Paneer Tikka', category: 'Starter', rate: 62, aliases: ['tandoori paneer tikka', 'tandoor paneer tikka'] },
{ name: 'Kali Mirch Paneer Tikka', category: 'Starter', rate: 64, aliases: ['kali mirch paneer tikka', 'pepper paneer tikka'] },
{ name: 'Peri Peri Paneer Tikka', category: 'Starter', rate: 66, aliases: ['peri peri paneer tikka', 'peri-peri paneer tikka'] },
{ name: 'Cheese Paneer Tikka', category: 'Starter', rate: 70, aliases: ['cheese paneer tikka', 'cheesy paneer tikka'] },
{ name: 'Stuffed Paneer Tikka', category: 'Starter', rate: 72, aliases: ['stuffed paneer tikka', 'bharwa paneer tikka'] },
{ name: 'Paneer Shashlik', category: 'Starter', rate: 64, aliases: ['paneer shashlik', 'paneer shaslik'] },
{ name: 'Paneer Seekh Kebab', category: 'Starter', rate: 65, aliases: ['paneer seekh kebab', 'paneer seekh kabab'] },
{ name: 'Paneer Malai Seekh', category: 'Starter', rate: 68, aliases: ['paneer malai seekh', 'malai paneer seekh'] },
{ name: 'Paneer Angara', category: 'Starter', rate: 66, aliases: ['paneer angara', 'angara paneer starter'] },
{ name: 'Paneer Hariyali', category: 'Starter', rate: 64, aliases: ['paneer hariyali starter', 'hariyali paneer starter'] },
{ name: 'Paneer 65', category: 'Starter', rate: 62, aliases: ['paneer 65', 'paneer sixty five'] },
{ name: 'Paneer Pakoda', category: 'Starter', rate: 55, aliases: ['paneer pakoda', 'paneer pakora'] },
{ name: 'Paneer Fingers', category: 'Starter', rate: 60, aliases: ['paneer fingers', 'crispy paneer fingers'] },
{ name: 'Paneer Cheese Balls', category: 'Starter', rate: 65, aliases: ['paneer cheese balls', 'cheese paneer balls'] },
{ name: 'Paneer Corn Balls', category: 'Starter', rate: 62, aliases: ['paneer corn balls', 'corn paneer balls'] },
{ name: 'Paneer Kurkure', category: 'Starter', rate: 64, aliases: ['paneer kurkure', 'crispy paneer kurkure'] },

// Starter — Kebab and Tandoori

{ name: 'Hara Bhara Kebab', category: 'Starter', rate: 55, aliases: ['hara bhara kebab', 'hara bhara kabab'] },
{ name: 'Veg Seekh Kebab', category: 'Starter', rate: 54, aliases: ['veg seekh kebab', 'vegetable seekh kabab'] },
{ name: 'Subz Seekh Kebab', category: 'Starter', rate: 56, aliases: ['subz seekh kebab', 'sabz seekh kabab'] },
{ name: 'Dahi Ke Kebab', category: 'Starter', rate: 60, aliases: ['dahi ke kebab', 'dahi kebab', 'dahi kabab'] },
{ name: 'Dahi Sholay', category: 'Starter', rate: 62, aliases: ['dahi sholay', 'dahi ke sholay'] },
{ name: 'Corn Seekh Kebab', category: 'Starter', rate: 58, aliases: ['corn seekh kebab', 'sweet corn seekh kabab'] },
{ name: 'Mushroom Seekh Kebab', category: 'Starter', rate: 62, aliases: ['mushroom seekh kebab', 'mushroom seekh kabab'] },
{ name: 'Beetroot Kebab', category: 'Starter', rate: 56, aliases: ['beetroot kebab', 'beetroot kabab', 'beet kebab'] },
{ name: 'Rajma Kebab', category: 'Starter', rate: 54, aliases: ['rajma kebab', 'rajma kabab'] },
{ name: 'Chana Dal Kebab', category: 'Starter', rate: 52, aliases: ['chana dal kebab', 'chana daal kabab'] },
{ name: 'Moong Dal Kebab', category: 'Starter', rate: 54, aliases: ['moong dal kebab', 'moong daal kabab'] },
{ name: 'Soya Seekh Kebab', category: 'Starter', rate: 55, aliases: ['soya seekh kebab', 'soy seekh kabab'] },
{ name: 'Soya Chaap Tikka', category: 'Starter', rate: 58, aliases: ['soya chaap tikka', 'soy chaap tikka'] },
{ name: 'Malai Soya Chaap', category: 'Starter', rate: 62, aliases: ['malai soya chaap', 'soya malai chaap'] },
{ name: 'Achari Soya Chaap', category: 'Starter', rate: 60, aliases: ['achari soya chaap', 'achar soya chaap'] },
{ name: 'Afghani Soya Chaap', category: 'Starter', rate: 64, aliases: ['afghani soya chaap', 'soya afghani chaap'] },
{ name: 'Tandoori Soya Chaap', category: 'Starter', rate: 60, aliases: ['tandoori soya chaap', 'tandoor soya chaap'] },
{ name: 'Tandoori Mushroom', category: 'Starter', rate: 62, aliases: ['tandoori mushroom', 'tandoor mushroom'] },
{ name: 'Stuffed Tandoori Mushroom', category: 'Starter', rate: 68, aliases: ['stuffed tandoori mushroom', 'bharwa tandoori mushroom'] },
{ name: 'Tandoori Aloo', category: 'Starter', rate: 52, aliases: ['tandoori aloo', 'tandoor potato'] },
{ name: 'Bharwa Tandoori Aloo', category: 'Starter', rate: 58, aliases: ['bharwa tandoori aloo', 'stuffed tandoori aloo'] },
{ name: 'Tandoori Broccoli', category: 'Starter', rate: 68, aliases: ['tandoori broccoli', 'tandoor broccoli'] },
{ name: 'Malai Broccoli', category: 'Starter', rate: 72, aliases: ['malai broccoli', 'broccoli malai tikka'] },
{ name: 'Tandoori Gobhi', category: 'Starter', rate: 55, aliases: ['tandoori gobhi', 'tandoori cauliflower'] },
{ name: 'Veg Galouti Kebab', category: 'Starter', rate: 62, aliases: ['veg galouti kebab', 'vegetable galouti kabab'] },
{ name: 'Kathal Galouti Kebab', category: 'Starter', rate: 65, aliases: ['kathal galouti kebab', 'jackfruit galouti kebab'] },

// Starter — Chinese and Indo-Chinese

{ name: 'Spring Roll', category: 'Starter', rate: 52, aliases: ['spring roll', 'veg spring roll', 'vegetable spring roll'] },
{ name: 'Cheese Spring Roll', category: 'Starter', rate: 58, aliases: ['cheese spring roll', 'cheesy spring roll'] },
{ name: 'Paneer Spring Roll', category: 'Starter', rate: 60, aliases: ['paneer spring roll'] },
{ name: 'Schezwan Spring Roll', category: 'Starter', rate: 56, aliases: ['schezwan spring roll', 'szechuan spring roll'] },
{ name: 'Paneer Chilli', category: 'Starter', rate: 60, aliases: ['paneer chilli', 'paneer chili', 'chilli paneer'] },
{ name: 'Dry Paneer Manchurian', category: 'Starter', rate: 62, aliases: ['dry paneer manchurian', 'paneer manchurian dry'] },
{ name: 'Crispy Paneer', category: 'Starter', rate: 62, aliases: ['crispy paneer', 'crispy fried paneer'] },
{ name: 'Honey Chilli Paneer', category: 'Starter', rate: 65, aliases: ['honey chilli paneer', 'honey chili paneer'] },
{ name: 'Schezwan Paneer', category: 'Starter', rate: 64, aliases: ['schezwan paneer dry', 'szechuan paneer dry'] },
{ name: 'Dragon Paneer', category: 'Starter', rate: 66, aliases: ['dragon paneer', 'paneer dragon'] },
{ name: 'Kung Pao Paneer', category: 'Starter', rate: 68, aliases: ['kung pao paneer', 'kungpao paneer'] },
{ name: 'Paneer Salt and Pepper', category: 'Starter', rate: 64, aliases: ['paneer salt and pepper', 'salt pepper paneer'] },
{ name: 'Veg Manchurian Dry', category: 'Starter', rate: 52, aliases: ['veg manchurian dry', 'dry veg manchurian'] },
{ name: 'Veg Crispy', category: 'Starter', rate: 54, aliases: ['veg crispy', 'crispy vegetables'] },
{ name: 'Veg 65', category: 'Starter', rate: 52, aliases: ['veg 65', 'vegetable 65'] },
{ name: 'Crispy Corn', category: 'Starter', rate: 54, aliases: ['crispy corn', 'crispy sweet corn'] },
{ name: 'Corn Chilli', category: 'Starter', rate: 54, aliases: ['corn chilli', 'chilli corn', 'chili corn'] },
{ name: 'Corn Salt and Pepper', category: 'Starter', rate: 56, aliases: ['corn salt and pepper', 'salt pepper corn'] },
{ name: 'Baby Corn Chilli', category: 'Starter', rate: 56, aliases: ['baby corn chilli', 'baby corn chili'] },
{ name: 'Baby Corn Manchurian', category: 'Starter', rate: 56, aliases: ['baby corn manchurian', 'babycorn manchurian'] },
{ name: 'Crispy Baby Corn', category: 'Starter', rate: 58, aliases: ['crispy baby corn', 'baby corn crispy'] },
{ name: 'Honey Chilli Potato', category: 'Starter', rate: 50, aliases: ['honey chilli potato', 'honey chili potato'] },
{ name: 'Chilli Potato', category: 'Starter', rate: 48, aliases: ['chilli potato', 'chili potato'] },
{ name: 'Schezwan Potato', category: 'Starter', rate: 50, aliases: ['schezwan potato', 'szechuan potato'] },
{ name: 'Mushroom Chilli', category: 'Starter', rate: 60, aliases: ['mushroom chilli', 'mushroom chili'] },
{ name: 'Mushroom Manchurian', category: 'Starter', rate: 60, aliases: ['mushroom manchurian', 'dry mushroom manchurian'] },
{ name: 'Crispy Mushroom', category: 'Starter', rate: 62, aliases: ['crispy mushroom', 'crispy fried mushroom'] },
{ name: 'Mushroom Salt and Pepper', category: 'Starter', rate: 62, aliases: ['mushroom salt and pepper', 'salt pepper mushroom'] },
{ name: 'Gobhi Manchurian Dry', category: 'Starter', rate: 52, aliases: ['gobhi manchurian dry', 'cauliflower manchurian dry'] },
{ name: 'Crispy Gobhi', category: 'Starter', rate: 52, aliases: ['crispy gobhi', 'crispy cauliflower'] },
{ name: 'Chilli Garlic Gobhi', category: 'Starter', rate: 54, aliases: ['chilli garlic gobhi', 'chili garlic cauliflower'] },
{ name: 'Chinese Bhel', category: 'Starter', rate: 48, aliases: ['chinese bhel', 'crispy chinese bhel'] },
{ name: 'Veg Momos', category: 'Starter', rate: 52, aliases: ['veg momos', 'vegetable momos'] },
{ name: 'Fried Veg Momos', category: 'Starter', rate: 55, aliases: ['fried veg momos', 'fried vegetable momos'] },
{ name: 'Tandoori Veg Momos', category: 'Starter', rate: 60, aliases: ['tandoori veg momos', 'tandoor vegetable momos'] },
{ name: 'Paneer Momos', category: 'Starter', rate: 58, aliases: ['paneer momos'] },
{ name: 'Fried Paneer Momos', category: 'Starter', rate: 62, aliases: ['fried paneer momos'] },

// Starter — Fried and Indian

{ name: 'Veg Cutlet', category: 'Starter', rate: 42, aliases: ['veg cutlet', 'vegetable cutlet'] },
{ name: 'Cheese Cutlet', category: 'Starter', rate: 52, aliases: ['cheese cutlet', 'cheesy cutlet'] },
{ name: 'Corn Cutlet', category: 'Starter', rate: 48, aliases: ['corn cutlet', 'sweet corn cutlet'] },
{ name: 'Beetroot Cutlet', category: 'Starter', rate: 48, aliases: ['beetroot cutlet', 'beet cutlet'] },
{ name: 'Veg Croquette', category: 'Starter', rate: 52, aliases: ['veg croquette', 'vegetable croquette'] },
{ name: 'Cheese Corn Croquette', category: 'Starter', rate: 58, aliases: ['cheese corn croquette', 'corn cheese croquette'] },
{ name: 'Veg Lollipop', category: 'Starter', rate: 52, aliases: ['veg lollipop', 'vegetable lollipop'] },
{ name: 'Paneer Lollipop', category: 'Starter', rate: 60, aliases: ['paneer lollipop'] },
{ name: 'Corn Cheese Balls', category: 'Starter', rate: 58, aliases: ['corn cheese balls', 'cheese corn balls'] },
{ name: 'Veg Cheese Balls', category: 'Starter', rate: 58, aliases: ['veg cheese balls', 'vegetable cheese balls'] },
{ name: 'Potato Cheese Balls', category: 'Starter', rate: 55, aliases: ['potato cheese balls', 'aloo cheese balls'] },
{ name: 'Spinach Cheese Balls', category: 'Starter', rate: 58, aliases: ['spinach cheese balls', 'palak cheese balls'] },
{ name: 'Stuffed Mushroom', category: 'Starter', rate: 65, aliases: ['stuffed mushroom', 'bharwa mushroom'] },
{ name: 'Mushroom Duplex', category: 'Starter', rate: 66, aliases: ['mushroom duplex', 'duplex mushroom'] },
{ name: 'Mushroom Cheese Balls', category: 'Starter', rate: 64, aliases: ['mushroom cheese balls', 'cheese mushroom balls'] },
{ name: 'Aloo Nazakat', category: 'Starter', rate: 56, aliases: ['aloo nazakat', 'potato nazakat'] },
{ name: 'Aloo 65', category: 'Starter', rate: 48, aliases: ['aloo 65', 'potato 65'] },
{ name: 'Sabudana Vada', category: 'Starter', rate: 44, aliases: ['sabudana vada', 'sago vada'] },
{ name: 'Batata Vada', category: 'Starter', rate: 42, aliases: ['batata vada', 'aloo vada'] },
{ name: 'Bread Roll', category: 'Starter', rate: 44, aliases: ['bread roll', 'potato bread roll'] },
{ name: 'Cheese Bread Roll', category: 'Starter', rate: 52, aliases: ['cheese bread roll', 'cheesy bread roll'] },
{ name: 'Veg Samosa', category: 'Starter', rate: 42, aliases: ['veg samosa', 'vegetable samosa'] },
{ name: 'Mini Samosa', category: 'Starter', rate: 36, aliases: ['mini samosa', 'cocktail samosa'] },
{ name: 'Punjabi Samosa', category: 'Starter', rate: 44, aliases: ['punjabi samosa', 'large samosa'] },
{ name: 'Onion Pakoda', category: 'Starter', rate: 38, aliases: ['onion pakoda', 'onion pakora', 'pyaz pakoda'] },
{ name: 'Mix Veg Pakoda', category: 'Starter', rate: 42, aliases: ['mix veg pakoda', 'mixed vegetable pakora'] },
{ name: 'Palak Pakoda', category: 'Starter', rate: 40, aliases: ['palak pakoda', 'spinach pakora'] },
{ name: 'Corn Pakoda', category: 'Starter', rate: 44, aliases: ['corn pakoda', 'sweet corn pakora'] },
{ name: 'Baby Corn Pakoda', category: 'Starter', rate: 48, aliases: ['baby corn pakoda', 'baby corn pakora'] },
{ name: 'Cheese Pakoda', category: 'Starter', rate: 58, aliases: ['cheese pakoda', 'cheese pakora'] },
{ name: 'Mirchi Bhajiya', category: 'Starter', rate: 38, aliases: ['mirchi bhajiya', 'mirchi pakoda', 'chilli bhajiya'] },
{ name: 'Kanda Bhajiya', category: 'Starter', rate: 38, aliases: ['kanda bhajiya', 'pyaz bhajiya'] },
{ name: 'Methi Gota', category: 'Starter', rate: 42, aliases: ['methi gota', 'methi na gota'] },
{ name: 'Dal Vada', category: 'Starter', rate: 42, aliases: ['dal vada', 'daal vada'] },
{ name: 'Moong Dal Pakoda', category: 'Starter', rate: 42, aliases: ['moong dal pakoda', 'moong daal pakora'] },

// Starter — Continental and Premium

{ name: 'French Fries', category: 'Starter', rate: 42, aliases: ['french fries', 'potato fries'] },
{ name: 'Peri Peri Fries', category: 'Starter', rate: 48, aliases: ['peri peri fries', 'peri-peri fries'] },
{ name: 'Cheese Fries', category: 'Starter', rate: 55, aliases: ['cheese fries', 'cheesy fries'] },
{ name: 'Potato Wedges', category: 'Starter', rate: 46, aliases: ['potato wedges', 'seasoned potato wedges'] },
{ name: 'Peri Peri Potato Wedges', category: 'Starter', rate: 50, aliases: ['peri peri potato wedges', 'peri-peri wedges'] },
{ name: 'Hash Browns', category: 'Starter', rate: 48, aliases: ['hash browns', 'hash brown'] },
{ name: 'Garlic Bread', category: 'Starter', rate: 46, aliases: ['garlic bread', 'classic garlic bread'] },
{ name: 'Cheese Garlic Bread', category: 'Starter', rate: 55, aliases: ['cheese garlic bread', 'cheesy garlic bread'] },
{ name: 'Bruschetta', category: 'Starter', rate: 58, aliases: ['bruschetta', 'tomato bruschetta'] },
{ name: 'Cheese Chilli Toast', category: 'Starter', rate: 54, aliases: ['cheese chilli toast', 'cheese chili toast'] },
{ name: 'Veg Canape', category: 'Starter', rate: 58, aliases: ['veg canape', 'vegetable canape', 'veg canapé'] },
{ name: 'Corn Canape', category: 'Starter', rate: 60, aliases: ['corn canape', 'sweet corn canape'] },
{ name: 'Paneer Canape', category: 'Starter', rate: 64, aliases: ['paneer canape', 'paneer canapé'] },
{ name: 'Stuffed Cheese Jalapeno', category: 'Starter', rate: 62, aliases: ['stuffed cheese jalapeno', 'cheese jalapeno poppers'] },
{ name: 'Jalapeno Cheese Balls', category: 'Starter', rate: 60, aliases: ['jalapeno cheese balls', 'jalapeño cheese balls'] },
{ name: 'Mozzarella Sticks', category: 'Starter', rate: 65, aliases: ['mozzarella sticks', 'cheese sticks'] },
{ name: 'Onion Rings', category: 'Starter', rate: 48, aliases: ['onion rings', 'crispy onion rings'] },
{ name: 'Nachos with Salsa', category: 'Starter', rate: 52, aliases: ['nachos with salsa', 'nachos salsa'] },
{ name: 'Loaded Nachos', category: 'Starter', rate: 65, aliases: ['loaded nachos', 'cheesy loaded nachos'] },
{ name: 'Mini Veg Pizza', category: 'Starter', rate: 62, aliases: ['mini veg pizza', 'mini vegetable pizza'] },
{ name: 'Mini Cheese Pizza', category: 'Starter', rate: 65, aliases: ['mini cheese pizza', 'mini cheesy pizza'] },
{ name: 'Veg Quesadilla', category: 'Starter', rate: 64, aliases: ['veg quesadilla', 'vegetable quesadilla'] },
{ name: 'Cheese Quesadilla', category: 'Starter', rate: 68, aliases: ['cheese quesadilla', 'cheesy quesadilla'] },
{ name: 'Veg Tacos', category: 'Starter', rate: 62, aliases: ['veg tacos', 'vegetable tacos'] },
{ name: 'Mexican Corn Cups', category: 'Starter', rate: 56, aliases: ['mexican corn cups', 'mexican sweet corn cup'] },
{ name: 'Cheese Fondue Bites', category: 'Starter', rate: 72, aliases: ['cheese fondue bites', 'fondue cheese bites'] },

// Starter — Gujarati and Regional

{ name: 'Khandvi', category: 'Starter', rate: 42, aliases: ['khandvi', 'patudi'] },
{ name: 'Khaman', category: 'Starter', rate: 40, aliases: ['khaman', 'khaman dhokla'] },
{ name: 'Nylon Khaman', category: 'Starter', rate: 42, aliases: ['nylon khaman', 'nylon dhokla'] },
{ name: 'White Dhokla', category: 'Starter', rate: 40, aliases: ['white dhokla', 'khatta dhokla'] },
{ name: 'Sandwich Dhokla', category: 'Starter', rate: 46, aliases: ['sandwich dhokla', 'layered dhokla'] },
{ name: 'Mini Patra', category: 'Starter', rate: 44, aliases: ['mini patra', 'aloo vadi', 'alu vadi'] },
{ name: 'Lilva Kachori', category: 'Starter', rate: 48, aliases: ['lilva kachori', 'tuvar lilva kachori'] },
{ name: 'Dry Fruit Kachori', category: 'Starter', rate: 58, aliases: ['dry fruit kachori', 'dryfruit kachori'] },
{ name: 'Raj Kachori', category: 'Starter', rate: 58, aliases: ['raj kachori', 'royal kachori'] },
{ name: 'Pyaz Kachori', category: 'Starter', rate: 48, aliases: ['pyaz kachori', 'onion kachori'] },
{ name: 'Dal Kachori', category: 'Starter', rate: 46, aliases: ['dal kachori', 'daal kachori'] },
{ name: 'Mini Kachori', category: 'Starter', rate: 38, aliases: ['mini kachori', 'cocktail kachori'] },
{ name: 'Rajasthani Mirchi Vada', category: 'Starter', rate: 46, aliases: ['rajasthani mirchi vada', 'jodhpuri mirchi vada'] },
{ name: 'Makai Chevdo Cups', category: 'Starter', rate: 48, aliases: ['makai chevdo cups', 'corn chevda cups'] },
 
  // Starter — Paneer

{ name: 'Paneer Tikka', category: 'Starter', rate: 58, aliases: ['paneer tikka', 'classic paneer tikka'] },
{ name: 'Malai Paneer Tikka', category: 'Starter', rate: 62, aliases: ['malai paneer tikka', 'paneer malai tikka'] },
{ name: 'Achari Paneer Tikka', category: 'Starter', rate: 62, aliases: ['achari paneer tikka', 'achar paneer tikka'] },
{ name: 'Hariyali Paneer Tikka', category: 'Starter', rate: 62, aliases: ['hariyali paneer tikka', 'green paneer tikka'] },
{ name: 'Lasooni Paneer Tikka', category: 'Starter', rate: 64, aliases: ['lasooni paneer tikka', 'lahsuni paneer tikka', 'garlic paneer tikka'] },
{ name: 'Afghani Paneer Tikka', category: 'Starter', rate: 66, aliases: ['afghani paneer tikka', 'paneer afghani tikka'] },
{ name: 'Pahadi Paneer Tikka', category: 'Starter', rate: 64, aliases: ['pahadi paneer tikka', 'pahaadi paneer tikka'] },
{ name: 'Tandoori Paneer Tikka', category: 'Starter', rate: 62, aliases: ['tandoori paneer tikka', 'tandoor paneer tikka'] },
{ name: 'Kali Mirch Paneer Tikka', category: 'Starter', rate: 64, aliases: ['kali mirch paneer tikka', 'pepper paneer tikka'] },
{ name: 'Peri Peri Paneer Tikka', category: 'Starter', rate: 66, aliases: ['peri peri paneer tikka', 'peri-peri paneer tikka'] },
{ name: 'Cheese Paneer Tikka', category: 'Starter', rate: 70, aliases: ['cheese paneer tikka', 'cheesy paneer tikka'] },
{ name: 'Stuffed Paneer Tikka', category: 'Starter', rate: 72, aliases: ['stuffed paneer tikka', 'bharwa paneer tikka'] },
{ name: 'Paneer Shashlik', category: 'Starter', rate: 64, aliases: ['paneer shashlik', 'paneer shaslik'] },
{ name: 'Paneer Seekh Kebab', category: 'Starter', rate: 65, aliases: ['paneer seekh kebab', 'paneer seekh kabab'] },
{ name: 'Paneer Malai Seekh', category: 'Starter', rate: 68, aliases: ['paneer malai seekh', 'malai paneer seekh'] },
{ name: 'Paneer Angara', category: 'Starter', rate: 66, aliases: ['paneer angara', 'angara paneer starter'] },
{ name: 'Paneer Hariyali', category: 'Starter', rate: 64, aliases: ['paneer hariyali starter', 'hariyali paneer starter'] },
{ name: 'Paneer 65', category: 'Starter', rate: 62, aliases: ['paneer 65', 'paneer sixty five'] },
{ name: 'Paneer Pakoda', category: 'Starter', rate: 55, aliases: ['paneer pakoda', 'paneer pakora'] },
{ name: 'Paneer Fingers', category: 'Starter', rate: 60, aliases: ['paneer fingers', 'crispy paneer fingers'] },
{ name: 'Paneer Cheese Balls', category: 'Starter', rate: 65, aliases: ['paneer cheese balls', 'cheese paneer balls'] },
{ name: 'Paneer Corn Balls', category: 'Starter', rate: 62, aliases: ['paneer corn balls', 'corn paneer balls'] },
{ name: 'Paneer Kurkure', category: 'Starter', rate: 64, aliases: ['paneer kurkure', 'crispy paneer kurkure'] },

// Starter — Kebab and Tandoori

{ name: 'Hara Bhara Kebab', category: 'Starter', rate: 55, aliases: ['hara bhara kebab', 'hara bhara kabab'] },
{ name: 'Veg Seekh Kebab', category: 'Starter', rate: 54, aliases: ['veg seekh kebab', 'vegetable seekh kabab'] },
{ name: 'Subz Seekh Kebab', category: 'Starter', rate: 56, aliases: ['subz seekh kebab', 'sabz seekh kabab'] },
{ name: 'Dahi Ke Kebab', category: 'Starter', rate: 60, aliases: ['dahi ke kebab', 'dahi kebab', 'dahi kabab'] },
{ name: 'Dahi Sholay', category: 'Starter', rate: 62, aliases: ['dahi sholay', 'dahi ke sholay'] },
{ name: 'Corn Seekh Kebab', category: 'Starter', rate: 58, aliases: ['corn seekh kebab', 'sweet corn seekh kabab'] },
{ name: 'Mushroom Seekh Kebab', category: 'Starter', rate: 62, aliases: ['mushroom seekh kebab', 'mushroom seekh kabab'] },
{ name: 'Beetroot Kebab', category: 'Starter', rate: 56, aliases: ['beetroot kebab', 'beetroot kabab', 'beet kebab'] },
{ name: 'Rajma Kebab', category: 'Starter', rate: 54, aliases: ['rajma kebab', 'rajma kabab'] },
{ name: 'Chana Dal Kebab', category: 'Starter', rate: 52, aliases: ['chana dal kebab', 'chana daal kabab'] },
{ name: 'Moong Dal Kebab', category: 'Starter', rate: 54, aliases: ['moong dal kebab', 'moong daal kabab'] },
{ name: 'Soya Seekh Kebab', category: 'Starter', rate: 55, aliases: ['soya seekh kebab', 'soy seekh kabab'] },
{ name: 'Soya Chaap Tikka', category: 'Starter', rate: 58, aliases: ['soya chaap tikka', 'soy chaap tikka'] },
{ name: 'Malai Soya Chaap', category: 'Starter', rate: 62, aliases: ['malai soya chaap', 'soya malai chaap'] },
{ name: 'Achari Soya Chaap', category: 'Starter', rate: 60, aliases: ['achari soya chaap', 'achar soya chaap'] },
{ name: 'Afghani Soya Chaap', category: 'Starter', rate: 64, aliases: ['afghani soya chaap', 'soya afghani chaap'] },
{ name: 'Tandoori Soya Chaap', category: 'Starter', rate: 60, aliases: ['tandoori soya chaap', 'tandoor soya chaap'] },
{ name: 'Tandoori Mushroom', category: 'Starter', rate: 62, aliases: ['tandoori mushroom', 'tandoor mushroom'] },
{ name: 'Stuffed Tandoori Mushroom', category: 'Starter', rate: 68, aliases: ['stuffed tandoori mushroom', 'bharwa tandoori mushroom'] },
{ name: 'Tandoori Aloo', category: 'Starter', rate: 52, aliases: ['tandoori aloo', 'tandoor potato'] },
{ name: 'Bharwa Tandoori Aloo', category: 'Starter', rate: 58, aliases: ['bharwa tandoori aloo', 'stuffed tandoori aloo'] },
{ name: 'Tandoori Broccoli', category: 'Starter', rate: 68, aliases: ['tandoori broccoli', 'tandoor broccoli'] },
{ name: 'Malai Broccoli', category: 'Starter', rate: 72, aliases: ['malai broccoli', 'broccoli malai tikka'] },
{ name: 'Tandoori Gobhi', category: 'Starter', rate: 55, aliases: ['tandoori gobhi', 'tandoori cauliflower'] },
{ name: 'Veg Galouti Kebab', category: 'Starter', rate: 62, aliases: ['veg galouti kebab', 'vegetable galouti kabab'] },
{ name: 'Kathal Galouti Kebab', category: 'Starter', rate: 65, aliases: ['kathal galouti kebab', 'jackfruit galouti kebab'] },

// Starter — Chinese and Indo-Chinese

{ name: 'Spring Roll', category: 'Starter', rate: 52, aliases: ['spring roll', 'veg spring roll', 'vegetable spring roll'] },
{ name: 'Cheese Spring Roll', category: 'Starter', rate: 58, aliases: ['cheese spring roll', 'cheesy spring roll'] },
{ name: 'Paneer Spring Roll', category: 'Starter', rate: 60, aliases: ['paneer spring roll'] },
{ name: 'Schezwan Spring Roll', category: 'Starter', rate: 56, aliases: ['schezwan spring roll', 'szechuan spring roll'] },
{ name: 'Paneer Chilli', category: 'Starter', rate: 60, aliases: ['paneer chilli', 'paneer chili', 'chilli paneer'] },
{ name: 'Dry Paneer Manchurian', category: 'Starter', rate: 62, aliases: ['dry paneer manchurian', 'paneer manchurian dry'] },
{ name: 'Crispy Paneer', category: 'Starter', rate: 62, aliases: ['crispy paneer', 'crispy fried paneer'] },
{ name: 'Honey Chilli Paneer', category: 'Starter', rate: 65, aliases: ['honey chilli paneer', 'honey chili paneer'] },
{ name: 'Schezwan Paneer', category: 'Starter', rate: 64, aliases: ['schezwan paneer dry', 'szechuan paneer dry'] },
{ name: 'Dragon Paneer', category: 'Starter', rate: 66, aliases: ['dragon paneer', 'paneer dragon'] },
{ name: 'Kung Pao Paneer', category: 'Starter', rate: 68, aliases: ['kung pao paneer', 'kungpao paneer'] },
{ name: 'Paneer Salt and Pepper', category: 'Starter', rate: 64, aliases: ['paneer salt and pepper', 'salt pepper paneer'] },
{ name: 'Veg Manchurian Dry', category: 'Starter', rate: 52, aliases: ['veg manchurian dry', 'dry veg manchurian'] },
{ name: 'Veg Crispy', category: 'Starter', rate: 54, aliases: ['veg crispy', 'crispy vegetables'] },
{ name: 'Veg 65', category: 'Starter', rate: 52, aliases: ['veg 65', 'vegetable 65'] },
{ name: 'Crispy Corn', category: 'Starter', rate: 54, aliases: ['crispy corn', 'crispy sweet corn'] },
{ name: 'Corn Chilli', category: 'Starter', rate: 54, aliases: ['corn chilli', 'chilli corn', 'chili corn'] },
{ name: 'Corn Salt and Pepper', category: 'Starter', rate: 56, aliases: ['corn salt and pepper', 'salt pepper corn'] },
{ name: 'Baby Corn Chilli', category: 'Starter', rate: 56, aliases: ['baby corn chilli', 'baby corn chili'] },
{ name: 'Baby Corn Manchurian', category: 'Starter', rate: 56, aliases: ['baby corn manchurian', 'babycorn manchurian'] },
{ name: 'Crispy Baby Corn', category: 'Starter', rate: 58, aliases: ['crispy baby corn', 'baby corn crispy'] },
{ name: 'Honey Chilli Potato', category: 'Starter', rate: 50, aliases: ['honey chilli potato', 'honey chili potato'] },
{ name: 'Chilli Potato', category: 'Starter', rate: 48, aliases: ['chilli potato', 'chili potato'] },
{ name: 'Schezwan Potato', category: 'Starter', rate: 50, aliases: ['schezwan potato', 'szechuan potato'] },
{ name: 'Mushroom Chilli', category: 'Starter', rate: 60, aliases: ['mushroom chilli', 'mushroom chili'] },
{ name: 'Mushroom Manchurian', category: 'Starter', rate: 60, aliases: ['mushroom manchurian', 'dry mushroom manchurian'] },
{ name: 'Crispy Mushroom', category: 'Starter', rate: 62, aliases: ['crispy mushroom', 'crispy fried mushroom'] },
{ name: 'Mushroom Salt and Pepper', category: 'Starter', rate: 62, aliases: ['mushroom salt and pepper', 'salt pepper mushroom'] },
{ name: 'Gobhi Manchurian Dry', category: 'Starter', rate: 52, aliases: ['gobhi manchurian dry', 'cauliflower manchurian dry'] },
{ name: 'Crispy Gobhi', category: 'Starter', rate: 52, aliases: ['crispy gobhi', 'crispy cauliflower'] },
{ name: 'Chilli Garlic Gobhi', category: 'Starter', rate: 54, aliases: ['chilli garlic gobhi', 'chili garlic cauliflower'] },
{ name: 'Chinese Bhel', category: 'Starter', rate: 48, aliases: ['chinese bhel', 'crispy chinese bhel'] },
{ name: 'Veg Momos', category: 'Starter', rate: 52, aliases: ['veg momos', 'vegetable momos'] },
{ name: 'Fried Veg Momos', category: 'Starter', rate: 55, aliases: ['fried veg momos', 'fried vegetable momos'] },
{ name: 'Tandoori Veg Momos', category: 'Starter', rate: 60, aliases: ['tandoori veg momos', 'tandoor vegetable momos'] },
{ name: 'Paneer Momos', category: 'Starter', rate: 58, aliases: ['paneer momos'] },
{ name: 'Fried Paneer Momos', category: 'Starter', rate: 62, aliases: ['fried paneer momos'] },

// Starter — Fried and Indian

{ name: 'Veg Cutlet', category: 'Starter', rate: 42, aliases: ['veg cutlet', 'vegetable cutlet'] },
{ name: 'Cheese Cutlet', category: 'Starter', rate: 52, aliases: ['cheese cutlet', 'cheesy cutlet'] },
{ name: 'Corn Cutlet', category: 'Starter', rate: 48, aliases: ['corn cutlet', 'sweet corn cutlet'] },
{ name: 'Beetroot Cutlet', category: 'Starter', rate: 48, aliases: ['beetroot cutlet', 'beet cutlet'] },
{ name: 'Veg Croquette', category: 'Starter', rate: 52, aliases: ['veg croquette', 'vegetable croquette'] },
{ name: 'Cheese Corn Croquette', category: 'Starter', rate: 58, aliases: ['cheese corn croquette', 'corn cheese croquette'] },
{ name: 'Veg Lollipop', category: 'Starter', rate: 52, aliases: ['veg lollipop', 'vegetable lollipop'] },
{ name: 'Paneer Lollipop', category: 'Starter', rate: 60, aliases: ['paneer lollipop'] },
{ name: 'Corn Cheese Balls', category: 'Starter', rate: 58, aliases: ['corn cheese balls', 'cheese corn balls'] },
{ name: 'Veg Cheese Balls', category: 'Starter', rate: 58, aliases: ['veg cheese balls', 'vegetable cheese balls'] },
{ name: 'Potato Cheese Balls', category: 'Starter', rate: 55, aliases: ['potato cheese balls', 'aloo cheese balls'] },
{ name: 'Spinach Cheese Balls', category: 'Starter', rate: 58, aliases: ['spinach cheese balls', 'palak cheese balls'] },
{ name: 'Stuffed Mushroom', category: 'Starter', rate: 65, aliases: ['stuffed mushroom', 'bharwa mushroom'] },
{ name: 'Mushroom Duplex', category: 'Starter', rate: 66, aliases: ['mushroom duplex', 'duplex mushroom'] },
{ name: 'Mushroom Cheese Balls', category: 'Starter', rate: 64, aliases: ['mushroom cheese balls', 'cheese mushroom balls'] },
{ name: 'Aloo Nazakat', category: 'Starter', rate: 56, aliases: ['aloo nazakat', 'potato nazakat'] },
{ name: 'Aloo 65', category: 'Starter', rate: 48, aliases: ['aloo 65', 'potato 65'] },
{ name: 'Sabudana Vada', category: 'Starter', rate: 44, aliases: ['sabudana vada', 'sago vada'] },
{ name: 'Batata Vada', category: 'Starter', rate: 42, aliases: ['batata vada', 'aloo vada'] },
{ name: 'Bread Roll', category: 'Starter', rate: 44, aliases: ['bread roll', 'potato bread roll'] },
{ name: 'Cheese Bread Roll', category: 'Starter', rate: 52, aliases: ['cheese bread roll', 'cheesy bread roll'] },
{ name: 'Veg Samosa', category: 'Starter', rate: 42, aliases: ['veg samosa', 'vegetable samosa'] },
{ name: 'Mini Samosa', category: 'Starter', rate: 36, aliases: ['mini samosa', 'cocktail samosa'] },
{ name: 'Punjabi Samosa', category: 'Starter', rate: 44, aliases: ['punjabi samosa', 'large samosa'] },
{ name: 'Onion Pakoda', category: 'Starter', rate: 38, aliases: ['onion pakoda', 'onion pakora', 'pyaz pakoda'] },
{ name: 'Mix Veg Pakoda', category: 'Starter', rate: 42, aliases: ['mix veg pakoda', 'mixed vegetable pakora'] },
{ name: 'Palak Pakoda', category: 'Starter', rate: 40, aliases: ['palak pakoda', 'spinach pakora'] },
{ name: 'Corn Pakoda', category: 'Starter', rate: 44, aliases: ['corn pakoda', 'sweet corn pakora'] },
{ name: 'Baby Corn Pakoda', category: 'Starter', rate: 48, aliases: ['baby corn pakoda', 'baby corn pakora'] },
{ name: 'Cheese Pakoda', category: 'Starter', rate: 58, aliases: ['cheese pakoda', 'cheese pakora'] },
{ name: 'Mirchi Bhajiya', category: 'Starter', rate: 38, aliases: ['mirchi bhajiya', 'mirchi pakoda', 'chilli bhajiya'] },
{ name: 'Kanda Bhajiya', category: 'Starter', rate: 38, aliases: ['kanda bhajiya', 'pyaz bhajiya'] },
{ name: 'Methi Gota', category: 'Starter', rate: 42, aliases: ['methi gota', 'methi na gota'] },
{ name: 'Dal Vada', category: 'Starter', rate: 42, aliases: ['dal vada', 'daal vada'] },
{ name: 'Moong Dal Pakoda', category: 'Starter', rate: 42, aliases: ['moong dal pakoda', 'moong daal pakora'] },

// Starter — Continental and Premium

{ name: 'French Fries', category: 'Starter', rate: 42, aliases: ['french fries', 'potato fries'] },
{ name: 'Peri Peri Fries', category: 'Starter', rate: 48, aliases: ['peri peri fries', 'peri-peri fries'] },
{ name: 'Cheese Fries', category: 'Starter', rate: 55, aliases: ['cheese fries', 'cheesy fries'] },
{ name: 'Potato Wedges', category: 'Starter', rate: 46, aliases: ['potato wedges', 'seasoned potato wedges'] },
{ name: 'Peri Peri Potato Wedges', category: 'Starter', rate: 50, aliases: ['peri peri potato wedges', 'peri-peri wedges'] },
{ name: 'Hash Browns', category: 'Starter', rate: 48, aliases: ['hash browns', 'hash brown'] },
{ name: 'Garlic Bread', category: 'Starter', rate: 46, aliases: ['garlic bread', 'classic garlic bread'] },
{ name: 'Cheese Garlic Bread', category: 'Starter', rate: 55, aliases: ['cheese garlic bread', 'cheesy garlic bread'] },
{ name: 'Bruschetta', category: 'Starter', rate: 58, aliases: ['bruschetta', 'tomato bruschetta'] },
{ name: 'Cheese Chilli Toast', category: 'Starter', rate: 54, aliases: ['cheese chilli toast', 'cheese chili toast'] },
{ name: 'Veg Canape', category: 'Starter', rate: 58, aliases: ['veg canape', 'vegetable canape', 'veg canapé'] },
{ name: 'Corn Canape', category: 'Starter', rate: 60, aliases: ['corn canape', 'sweet corn canape'] },
{ name: 'Paneer Canape', category: 'Starter', rate: 64, aliases: ['paneer canape', 'paneer canapé'] },
{ name: 'Stuffed Cheese Jalapeno', category: 'Starter', rate: 62, aliases: ['stuffed cheese jalapeno', 'cheese jalapeno poppers'] },
{ name: 'Jalapeno Cheese Balls', category: 'Starter', rate: 60, aliases: ['jalapeno cheese balls', 'jalapeño cheese balls'] },
{ name: 'Mozzarella Sticks', category: 'Starter', rate: 65, aliases: ['mozzarella sticks', 'cheese sticks'] },
{ name: 'Onion Rings', category: 'Starter', rate: 48, aliases: ['onion rings', 'crispy onion rings'] },
{ name: 'Nachos with Salsa', category: 'Starter', rate: 52, aliases: ['nachos with salsa', 'nachos salsa'] },
{ name: 'Loaded Nachos', category: 'Starter', rate: 65, aliases: ['loaded nachos', 'cheesy loaded nachos'] },
{ name: 'Mini Veg Pizza', category: 'Starter', rate: 62, aliases: ['mini veg pizza', 'mini vegetable pizza'] },
{ name: 'Mini Cheese Pizza', category: 'Starter', rate: 65, aliases: ['mini cheese pizza', 'mini cheesy pizza'] },
{ name: 'Veg Quesadilla', category: 'Starter', rate: 64, aliases: ['veg quesadilla', 'vegetable quesadilla'] },
{ name: 'Cheese Quesadilla', category: 'Starter', rate: 68, aliases: ['cheese quesadilla', 'cheesy quesadilla'] },
{ name: 'Veg Tacos', category: 'Starter', rate: 62, aliases: ['veg tacos', 'vegetable tacos'] },
{ name: 'Mexican Corn Cups', category: 'Starter', rate: 56, aliases: ['mexican corn cups', 'mexican sweet corn cup'] },
{ name: 'Cheese Fondue Bites', category: 'Starter', rate: 72, aliases: ['cheese fondue bites', 'fondue cheese bites'] },

// Starter — Gujarati and Regional

{ name: 'Khandvi', category: 'Starter', rate: 42, aliases: ['khandvi', 'patudi'] },
{ name: 'Khaman', category: 'Starter', rate: 40, aliases: ['khaman', 'khaman dhokla'] },
{ name: 'Nylon Khaman', category: 'Starter', rate: 42, aliases: ['nylon khaman', 'nylon dhokla'] },
{ name: 'White Dhokla', category: 'Starter', rate: 40, aliases: ['white dhokla', 'khatta dhokla'] },
{ name: 'Sandwich Dhokla', category: 'Starter', rate: 46, aliases: ['sandwich dhokla', 'layered dhokla'] },
{ name: 'Mini Patra', category: 'Starter', rate: 44, aliases: ['mini patra', 'aloo vadi', 'alu vadi'] },
{ name: 'Lilva Kachori', category: 'Starter', rate: 48, aliases: ['lilva kachori', 'tuvar lilva kachori'] },
{ name: 'Dry Fruit Kachori', category: 'Starter', rate: 58, aliases: ['dry fruit kachori', 'dryfruit kachori'] },
{ name: 'Raj Kachori', category: 'Starter', rate: 58, aliases: ['raj kachori', 'royal kachori'] },
{ name: 'Pyaz Kachori', category: 'Starter', rate: 48, aliases: ['pyaz kachori', 'onion kachori'] },
{ name: 'Dal Kachori', category: 'Starter', rate: 46, aliases: ['dal kachori', 'daal kachori'] },
{ name: 'Mini Kachori', category: 'Starter', rate: 38, aliases: ['mini kachori', 'cocktail kachori'] },
{ name: 'Rajasthani Mirchi Vada', category: 'Starter', rate: 46, aliases: ['rajasthani mirchi vada', 'jodhpuri mirchi vada'] },
{ name: 'Makai Chevdo Cups', category: 'Starter', rate: 48, aliases: ['makai chevdo cups', 'corn chevda cups'] },

];

const DISH_COST_ITEMS_PART_2: readonly DishCostItem[] = [

// Chinese — Noodles

{ name: 'Veg Hakka Noodles', category: 'Chinese', rate: 45, aliases: ['veg hakka noodles', 'vegetable hakka noodles', 'hakka noodles'] },
{ name: 'Schezwan Noodles', category: 'Chinese', rate: 48, aliases: ['schezwan noodles', 'szechuan noodles', 'veg schezwan noodles'] },
{ name: 'Chilli Garlic Noodles', category: 'Chinese', rate: 48, aliases: ['chilli garlic noodles', 'chili garlic noodles'] },
{ name: 'Singapore Noodles', category: 'Chinese', rate: 50, aliases: ['singapore noodles', 'singapore style noodles'] },
{ name: 'Shanghai Noodles', category: 'Chinese', rate: 50, aliases: ['shanghai noodles', 'shanghai style noodles'] },
{ name: 'Hong Kong Noodles', category: 'Chinese', rate: 52, aliases: ['hong kong noodles', 'hongkong noodles'] },
{ name: 'Pan Fried Noodles', category: 'Chinese', rate: 54, aliases: ['pan fried noodles', 'pan-fried noodles'] },
{ name: 'American Chopsuey', category: 'Chinese', rate: 55, aliases: ['american chopsuey', 'american chop suey'] },
{ name: 'Chinese Chopsuey', category: 'Chinese', rate: 54, aliases: ['chinese chopsuey', 'chinese chop suey'] },
{ name: 'Triple Schezwan Noodles', category: 'Chinese', rate: 58, aliases: ['triple schezwan noodles', 'triple szechuan noodles'] },
{ name: 'Burnt Garlic Noodles', category: 'Chinese', rate: 50, aliases: ['burnt garlic noodles', 'burnt garlic hakka noodles'] },
{ name: 'Ginger Garlic Noodles', category: 'Chinese', rate: 48, aliases: ['ginger garlic noodles', 'adrak garlic noodles'] },
{ name: 'Black Pepper Noodles', category: 'Chinese', rate: 50, aliases: ['black pepper noodles', 'pepper noodles'] },
{ name: 'Hot Garlic Noodles', category: 'Chinese', rate: 50, aliases: ['hot garlic noodles', 'spicy garlic noodles'] },
{ name: 'Vegetable Chow Mein', category: 'Chinese', rate: 46, aliases: ['vegetable chow mein', 'veg chow mein', 'chowmein'] },
{ name: 'Paneer Hakka Noodles', category: 'Chinese', rate: 56, aliases: ['paneer hakka noodles', 'paneer noodles'] },
{ name: 'Mushroom Hakka Noodles', category: 'Chinese', rate: 54, aliases: ['mushroom hakka noodles', 'mushroom noodles'] },
{ name: 'Baby Corn Noodles', category: 'Chinese', rate: 52, aliases: ['baby corn noodles', 'babycorn noodles'] },
{ name: 'Mixed Vegetable Noodles', category: 'Chinese', rate: 48, aliases: ['mixed vegetable noodles', 'mix veg noodles'] },
{ name: 'Broccoli Noodles', category: 'Chinese', rate: 54, aliases: ['broccoli noodles', 'veg broccoli noodles'] },
{ name: 'Tofu Noodles', category: 'Chinese', rate: 56, aliases: ['tofu noodles', 'tofu hakka noodles'] },
{ name: 'Rice Noodles', category: 'Chinese', rate: 52, aliases: ['veg rice noodles', 'vegetable rice noodles'] },
{ name: 'Glass Noodles', category: 'Chinese', rate: 54, aliases: ['veg glass noodles', 'vegetable glass noodles'] },

// Chinese — Fried Rice

{ name: 'Veg Fried Rice', category: 'Chinese', rate: 45, aliases: ['veg fried rice', 'vegetable fried rice'] },
{ name: 'Schezwan Fried Rice', category: 'Chinese', rate: 48, aliases: ['schezwan fried rice', 'szechuan fried rice', 'schezwan rice'] },
{ name: 'Chilli Garlic Fried Rice', category: 'Chinese', rate: 48, aliases: ['chilli garlic fried rice', 'chili garlic fried rice'] },
{ name: 'Burnt Garlic Fried Rice', category: 'Chinese', rate: 50, aliases: ['burnt garlic fried rice', 'garlic burnt rice'] },
{ name: 'Singapore Fried Rice', category: 'Chinese', rate: 50, aliases: ['singapore fried rice', 'singapore rice'] },
{ name: 'Shanghai Fried Rice', category: 'Chinese', rate: 50, aliases: ['shanghai fried rice', 'shanghai rice'] },
{ name: 'Hong Kong Fried Rice', category: 'Chinese', rate: 52, aliases: ['hong kong fried rice', 'hongkong fried rice'] },
{ name: 'Triple Schezwan Fried Rice', category: 'Chinese', rate: 58, aliases: ['triple schezwan fried rice', 'triple szechuan rice'] },
{ name: 'Mushroom Fried Rice', category: 'Chinese', rate: 52, aliases: ['mushroom fried rice', 'veg mushroom rice'] },
{ name: 'Paneer Fried Rice', category: 'Chinese', rate: 54, aliases: ['paneer fried rice', 'paneer rice chinese'] },
{ name: 'Baby Corn Fried Rice', category: 'Chinese', rate: 50, aliases: ['baby corn fried rice', 'babycorn fried rice'] },
{ name: 'Corn Fried Rice', category: 'Chinese', rate: 48, aliases: ['corn fried rice', 'sweet corn fried rice'] },
{ name: 'Broccoli Fried Rice', category: 'Chinese', rate: 52, aliases: ['broccoli fried rice', 'veg broccoli rice'] },
{ name: 'Tofu Fried Rice', category: 'Chinese', rate: 54, aliases: ['tofu fried rice', 'veg tofu rice'] },
{ name: 'Black Pepper Fried Rice', category: 'Chinese', rate: 50, aliases: ['black pepper fried rice', 'pepper fried rice'] },
{ name: 'Ginger Fried Rice', category: 'Chinese', rate: 48, aliases: ['ginger fried rice', 'adrak fried rice'] },
{ name: 'Garlic Fried Rice', category: 'Chinese', rate: 48, aliases: ['garlic fried rice', 'lasoon fried rice'] },
{ name: 'Lemon Fried Rice', category: 'Chinese', rate: 48, aliases: ['lemon fried rice', 'lime fried rice'] },
{ name: 'Basil Fried Rice', category: 'Chinese', rate: 52, aliases: ['basil fried rice', 'thai basil fried rice'] },
{ name: 'Manchurian Fried Rice', category: 'Chinese', rate: 56, aliases: ['manchurian fried rice', 'veg manchurian rice'] },

// Chinese — Manchurian

{ name: 'Veg Manchurian Gravy', category: 'Chinese', rate: 46, aliases: ['veg manchurian gravy', 'vegetable manchurian gravy'] },
{ name: 'Veg Manchurian Dry', category: 'Chinese', rate: 48, aliases: ['veg manchurian dry', 'dry veg manchurian'] },
{ name: 'Paneer Manchurian Gravy', category: 'Chinese', rate: 58, aliases: ['paneer manchurian gravy', 'paneer manchurian'] },
{ name: 'Paneer Manchurian Dry', category: 'Chinese', rate: 60, aliases: ['paneer manchurian dry', 'dry paneer manchurian'] },
{ name: 'Baby Corn Manchurian', category: 'Chinese', rate: 54, aliases: ['baby corn manchurian', 'babycorn manchurian'] },
{ name: 'Mushroom Manchurian', category: 'Chinese', rate: 58, aliases: ['mushroom manchurian', 'veg mushroom manchurian'] },
{ name: 'Gobhi Manchurian Gravy', category: 'Chinese', rate: 50, aliases: ['gobhi manchurian gravy', 'cauliflower manchurian gravy'] },
{ name: 'Gobhi Manchurian Dry', category: 'Chinese', rate: 52, aliases: ['gobhi manchurian dry', 'dry cauliflower manchurian'] },
{ name: 'Tofu Manchurian', category: 'Chinese', rate: 58, aliases: ['tofu manchurian', 'veg tofu manchurian'] },
{ name: 'Corn Manchurian', category: 'Chinese', rate: 52, aliases: ['corn manchurian', 'sweet corn manchurian'] },

// Chinese — Paneer Gravies

{ name: 'Chilli Paneer Gravy', category: 'Chinese', rate: 60, aliases: ['chilli paneer gravy', 'chili paneer gravy', 'paneer chilli gravy'] },
{ name: 'Chilli Paneer Dry', category: 'Chinese', rate: 62, aliases: ['chilli paneer dry', 'dry chilli paneer', 'paneer chilli dry'] },
{ name: 'Schezwan Paneer', category: 'Chinese', rate: 62, aliases: ['schezwan paneer', 'szechuan paneer'] },
{ name: 'Hot Garlic Paneer', category: 'Chinese', rate: 62, aliases: ['hot garlic paneer', 'paneer hot garlic'] },
{ name: 'Honey Chilli Paneer', category: 'Chinese', rate: 64, aliases: ['honey chilli paneer', 'honey chili paneer'] },
{ name: 'Dragon Paneer', category: 'Chinese', rate: 66, aliases: ['dragon paneer', 'paneer dragon'] },
{ name: 'Kung Pao Paneer', category: 'Chinese', rate: 66, aliases: ['kung pao paneer', 'kungpao paneer'] },
{ name: 'Black Pepper Paneer', category: 'Chinese', rate: 64, aliases: ['black pepper paneer', 'pepper paneer'] },
{ name: 'Paneer in Garlic Sauce', category: 'Chinese', rate: 62, aliases: ['paneer in garlic sauce', 'garlic sauce paneer'] },
{ name: 'Paneer in Hot Bean Sauce', category: 'Chinese', rate: 64, aliases: ['paneer in hot bean sauce', 'hot bean paneer'] },
{ name: 'Paneer in Black Bean Sauce', category: 'Chinese', rate: 66, aliases: ['paneer in black bean sauce', 'black bean paneer'] },
{ name: 'Sweet and Sour Paneer', category: 'Chinese', rate: 62, aliases: ['sweet and sour paneer', 'sweet sour paneer'] },
{ name: 'Paneer Salt and Pepper', category: 'Chinese', rate: 62, aliases: ['paneer salt and pepper', 'salt pepper paneer'] },

// Chinese — Vegetable Gravies

{ name: 'Vegetable in Hot Garlic Sauce', category: 'Chinese', rate: 52, aliases: ['vegetable in hot garlic sauce', 'veg hot garlic sauce'] },
{ name: 'Vegetable in Schezwan Sauce', category: 'Chinese', rate: 52, aliases: ['vegetable in schezwan sauce', 'veg schezwan gravy'] },
{ name: 'Vegetable in Black Bean Sauce', category: 'Chinese', rate: 54, aliases: ['vegetable in black bean sauce', 'veg black bean sauce'] },
{ name: 'Vegetable in Garlic Sauce', category: 'Chinese', rate: 52, aliases: ['vegetable in garlic sauce', 'veg garlic sauce'] },
{ name: 'Vegetable in Sweet and Sour Sauce', category: 'Chinese', rate: 52, aliases: ['vegetable in sweet and sour sauce', 'sweet sour vegetables'] },
{ name: 'Vegetable in Oyster Style Sauce', category: 'Chinese', rate: 54, aliases: ['vegetable in oyster style sauce', 'veg oyster sauce'] },
{ name: 'Vegetable in Chilli Basil Sauce', category: 'Chinese', rate: 54, aliases: ['vegetable in chilli basil sauce', 'veg chilli basil'] },
{ name: 'Vegetable in Burnt Garlic Sauce', category: 'Chinese', rate: 54, aliases: ['vegetable in burnt garlic sauce', 'burnt garlic vegetables'] },
{ name: 'Chinese Mixed Vegetable', category: 'Chinese', rate: 50, aliases: ['chinese mixed vegetable', 'chinese mix veg'] },
{ name: 'Stir Fried Vegetables', category: 'Chinese', rate: 50, aliases: ['stir fried vegetables', 'stir fry vegetables'] },
{ name: 'Exotic Vegetables in Garlic Sauce', category: 'Chinese', rate: 58, aliases: ['exotic vegetables in garlic sauce', 'exotic veg garlic sauce'] },
{ name: 'Exotic Vegetables in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ['exotic vegetables in black pepper sauce', 'exotic veg pepper sauce'] },

// Chinese — Mushroom, Baby Corn and Broccoli

{ name: 'Chilli Mushroom', category: 'Chinese', rate: 58, aliases: ['chilli mushroom', 'chili mushroom'] },
{ name: 'Mushroom in Hot Garlic Sauce', category: 'Chinese', rate: 60, aliases: ['mushroom in hot garlic sauce', 'hot garlic mushroom'] },
{ name: 'Mushroom in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ['mushroom in black pepper sauce', 'black pepper mushroom'] },
{ name: 'Mushroom in Schezwan Sauce', category: 'Chinese', rate: 60, aliases: ['mushroom in schezwan sauce', 'schezwan mushroom'] },
{ name: 'Baby Corn Chilli', category: 'Chinese', rate: 54, aliases: ['baby corn chilli', 'baby corn chili'] },
{ name: 'Baby Corn in Hot Garlic Sauce', category: 'Chinese', rate: 56, aliases: ['baby corn in hot garlic sauce', 'hot garlic baby corn'] },
{ name: 'Baby Corn in Schezwan Sauce', category: 'Chinese', rate: 56, aliases: ['baby corn in schezwan sauce', 'schezwan baby corn'] },
{ name: 'Broccoli in Garlic Sauce', category: 'Chinese', rate: 58, aliases: ['broccoli in garlic sauce', 'garlic broccoli'] },
{ name: 'Broccoli in Black Pepper Sauce', category: 'Chinese', rate: 60, aliases: ['broccoli in black pepper sauce', 'pepper broccoli'] },
{ name: 'Broccoli Mushroom Stir Fry', category: 'Chinese', rate: 62, aliases: ['broccoli mushroom stir fry', 'mushroom broccoli stir fry'] },
{ name: 'Baby Corn Mushroom Gravy', category: 'Chinese', rate: 58, aliases: ['baby corn mushroom gravy', 'babycorn mushroom gravy'] },

// Chinese — Tofu

{ name: 'Chilli Tofu', category: 'Chinese', rate: 58, aliases: ['chilli tofu', 'chili tofu'] },
{ name: 'Schezwan Tofu', category: 'Chinese', rate: 60, aliases: ['schezwan tofu', 'szechuan tofu'] },
{ name: 'Tofu in Hot Garlic Sauce', category: 'Chinese', rate: 60, aliases: ['tofu in hot garlic sauce', 'hot garlic tofu'] },
{ name: 'Tofu in Black Bean Sauce', category: 'Chinese', rate: 62, aliases: ['tofu in black bean sauce', 'black bean tofu'] },
{ name: 'Kung Pao Tofu', category: 'Chinese', rate: 62, aliases: ['kung pao tofu', 'kungpao tofu'] },
{ name: 'Sweet and Sour Tofu', category: 'Chinese', rate: 60, aliases: ['sweet and sour tofu', 'sweet sour tofu'] },
{ name: 'Tofu Salt and Pepper', category: 'Chinese', rate: 60, aliases: ['tofu salt and pepper', 'salt pepper tofu'] },

// Chinese — Crispy and Dry Dishes

{ name: 'Crispy Corn', category: 'Chinese', rate: 52, aliases: ['crispy corn', 'crispy sweet corn'] },
{ name: 'Corn Salt and Pepper', category: 'Chinese', rate: 52, aliases: ['corn salt and pepper', 'salt pepper corn'] },
{ name: 'Crispy Baby Corn', category: 'Chinese', rate: 54, aliases: ['crispy baby corn', 'baby corn crispy'] },
{ name: 'Baby Corn Salt and Pepper', category: 'Chinese', rate: 56, aliases: ['baby corn salt and pepper', 'salt pepper baby corn'] },
{ name: 'Crispy Mushroom', category: 'Chinese', rate: 58, aliases: ['crispy mushroom', 'crispy fried mushroom'] },
{ name: 'Mushroom Salt and Pepper', category: 'Chinese', rate: 58, aliases: ['mushroom salt and pepper', 'salt pepper mushroom'] },
{ name: 'Crispy Vegetables', category: 'Chinese', rate: 52, aliases: ['crispy vegetables', 'veg crispy'] },
{ name: 'Vegetable Salt and Pepper', category: 'Chinese', rate: 52, aliases: ['vegetable salt and pepper', 'veg salt pepper'] },
{ name: 'Honey Chilli Potato', category: 'Chinese', rate: 48, aliases: ['honey chilli potato', 'honey chili potato'] },
{ name: 'Chilli Potato', category: 'Chinese', rate: 46, aliases: ['chilli potato', 'chili potato'] },
{ name: 'Schezwan Potato', category: 'Chinese', rate: 48, aliases: ['schezwan potato', 'szechuan potato'] },
{ name: 'Crispy Lotus Stem', category: 'Chinese', rate: 62, aliases: ['crispy lotus stem', 'crispy kamal kakdi'] },
{ name: 'Honey Chilli Lotus Stem', category: 'Chinese', rate: 64, aliases: ['honey chilli lotus stem', 'honey chili kamal kakdi'] },
{ name: 'Crispy Spinach', category: 'Chinese', rate: 50, aliases: ['crispy spinach', 'crispy palak'] },
{ name: 'Chinese Bhel', category: 'Chinese', rate: 46, aliases: ['chinese bhel', 'crispy chinese bhel'] },

// Chinese — Momos and Rolls

{ name: 'Veg Steamed Momos', category: 'Chinese', rate: 48, aliases: ['veg steamed momos', 'vegetable steamed momos', 'steamed veg momos'] },
{ name: 'Veg Fried Momos', category: 'Chinese', rate: 52, aliases: ['veg fried momos', 'fried vegetable momos'] },
{ name: 'Veg Schezwan Momos', category: 'Chinese', rate: 54, aliases: ['veg schezwan momos', 'schezwan vegetable momos'] },
{ name: 'Paneer Momos', category: 'Chinese', rate: 56, aliases: ['paneer momos', 'steamed paneer momos'] },
{ name: 'Fried Paneer Momos', category: 'Chinese', rate: 60, aliases: ['fried paneer momos', 'paneer fried momos'] },
{ name: 'Mushroom Momos', category: 'Chinese', rate: 56, aliases: ['mushroom momos', 'veg mushroom momos'] },
{ name: 'Cheese Corn Momos', category: 'Chinese', rate: 60, aliases: ['cheese corn momos', 'corn cheese momos'] },
{ name: 'Veg Spring Roll', category: 'Chinese', rate: 50, aliases: ['veg spring roll', 'vegetable spring roll'] },
{ name: 'Paneer Spring Roll', category: 'Chinese', rate: 56, aliases: ['paneer spring roll'] },
{ name: 'Schezwan Spring Roll', category: 'Chinese', rate: 54, aliases: ['schezwan spring roll', 'szechuan spring roll'] },

// Chinese — Combo Dishes

{ name: 'Hakka Noodles with Manchurian', category: 'Chinese', rate: 72, aliases: ['hakka noodles with manchurian', 'noodles manchurian combo'] },
{ name: 'Fried Rice with Manchurian', category: 'Chinese', rate: 72, aliases: ['fried rice with manchurian', 'rice manchurian combo'] },
{ name: 'Schezwan Rice with Manchurian', category: 'Chinese', rate: 76, aliases: ['schezwan rice with manchurian', 'schezwan manchurian combo'] },
{ name: 'Triple Schezwan Rice', category: 'Chinese', rate: 78, aliases: ['triple schezwan rice', 'triple szechuan rice combo'] },
{ name: 'Chinese Combo Plate', category: 'Chinese', rate: 82, aliases: ['chinese combo plate', 'veg chinese combo'] },

// Italian — Pasta

{ name: 'White Sauce Pasta', category: 'Italian', rate: 58, aliases: ['white sauce pasta', 'creamy white sauce pasta', 'alfredo pasta'] },
{ name: 'Red Sauce Pasta', category: 'Italian', rate: 56, aliases: ['red sauce pasta', 'tomato sauce pasta', 'arrabbiata pasta'] },
{ name: 'Pink Sauce Pasta', category: 'Italian', rate: 60, aliases: ['pink sauce pasta', 'rose sauce pasta'] },
{ name: 'Pesto Pasta', category: 'Italian', rate: 64, aliases: ['pesto pasta', 'basil pesto pasta'] },
{ name: 'Aglio Olio Pasta', category: 'Italian', rate: 58, aliases: ['aglio olio pasta', 'aglio e olio pasta', 'garlic olive oil pasta'] },
{ name: 'Arrabbiata Pasta', category: 'Italian', rate: 58, aliases: ['arrabbiata pasta', 'penne arrabbiata'] },
{ name: 'Alfredo Pasta', category: 'Italian', rate: 62, aliases: ['alfredo pasta', 'creamy alfredo pasta'] },
{ name: 'Mac and Cheese', category: 'Italian', rate: 64, aliases: ['mac and cheese', 'macaroni and cheese', 'mac n cheese'] },
{ name: 'Cheese Pasta', category: 'Italian', rate: 62, aliases: ['cheese pasta', 'cheesy pasta'] },
{ name: 'Garlic Cream Pasta', category: 'Italian', rate: 62, aliases: ['garlic cream pasta', 'creamy garlic pasta'] },
{ name: 'Tomato Basil Pasta', category: 'Italian', rate: 58, aliases: ['tomato basil pasta', 'basil tomato pasta'] },
{ name: 'Mushroom White Sauce Pasta', category: 'Italian', rate: 64, aliases: ['mushroom white sauce pasta', 'creamy mushroom pasta'] },
{ name: 'Broccoli White Sauce Pasta', category: 'Italian', rate: 66, aliases: ['broccoli white sauce pasta', 'creamy broccoli pasta'] },
{ name: 'Corn White Sauce Pasta', category: 'Italian', rate: 62, aliases: ['corn white sauce pasta', 'sweet corn pasta'] },
{ name: 'Spinach Corn Pasta', category: 'Italian', rate: 64, aliases: ['spinach corn pasta', 'palak corn pasta'] },
{ name: 'Paneer Tikka Pasta', category: 'Italian', rate: 68, aliases: ['paneer tikka pasta', 'tandoori paneer pasta'] },
{ name: 'Tandoori Pasta', category: 'Italian', rate: 64, aliases: ['tandoori pasta', 'tandoor pasta'] },
{ name: 'Peri Peri Pasta', category: 'Italian', rate: 62, aliases: ['peri peri pasta', 'peri-peri pasta'] },
{ name: 'Schezwan Pasta', category: 'Italian', rate: 60, aliases: ['schezwan pasta', 'szechuan pasta'] },
{ name: 'Mexican Pasta', category: 'Italian', rate: 64, aliases: ['mexican pasta', 'mexican style pasta'] },
{ name: 'Masala Pasta', category: 'Italian', rate: 56, aliases: ['masala pasta', 'indian masala pasta'] },
{ name: 'Mixed Vegetable Pasta', category: 'Italian', rate: 60, aliases: ['mixed vegetable pasta', 'mix veg pasta', 'vegetable pasta'] },
{ name: 'Exotic Vegetable Pasta', category: 'Italian', rate: 68, aliases: ['exotic vegetable pasta', 'exotic veg pasta'] },
{ name: 'Four Cheese Pasta', category: 'Italian', rate: 72, aliases: ['four cheese pasta', '4 cheese pasta'] },
{ name: 'Truffle Mushroom Pasta', category: 'Italian', rate: 78, aliases: ['truffle mushroom pasta', 'mushroom truffle pasta'] },

// Italian — Penne, Spaghetti and Other Pasta

{ name: 'Penne Alfredo', category: 'Italian', rate: 62, aliases: ['penne alfredo', 'alfredo penne'] },
{ name: 'Penne Arrabbiata', category: 'Italian', rate: 58, aliases: ['penne arrabbiata', 'arrabbiata penne'] },
{ name: 'Penne Pink Sauce', category: 'Italian', rate: 60, aliases: ['penne pink sauce', 'pink sauce penne'] },
{ name: 'Penne Pesto', category: 'Italian', rate: 64, aliases: ['penne pesto', 'pesto penne'] },
{ name: 'Spaghetti Aglio Olio', category: 'Italian', rate: 60, aliases: ['spaghetti aglio olio', 'aglio olio spaghetti'] },
{ name: 'Spaghetti Arrabbiata', category: 'Italian', rate: 60, aliases: ['spaghetti arrabbiata', 'arrabbiata spaghetti'] },
{ name: 'Spaghetti Pomodoro', category: 'Italian', rate: 60, aliases: ['spaghetti pomodoro', 'tomato spaghetti'] },
{ name: 'Spaghetti Pesto', category: 'Italian', rate: 66, aliases: ['spaghetti pesto', 'pesto spaghetti'] },
{ name: 'Fusilli White Sauce', category: 'Italian', rate: 60, aliases: ['fusilli white sauce', 'white sauce fusilli'] },
{ name: 'Fusilli Red Sauce', category: 'Italian', rate: 58, aliases: ['fusilli red sauce', 'red sauce fusilli'] },
{ name: 'Fusilli Pink Sauce', category: 'Italian', rate: 62, aliases: ['fusilli pink sauce', 'pink sauce fusilli'] },
{ name: 'Farfalle Alfredo', category: 'Italian', rate: 64, aliases: ['farfalle alfredo', 'bow tie alfredo pasta'] },
{ name: 'Farfalle Pesto', category: 'Italian', rate: 66, aliases: ['farfalle pesto', 'bow tie pesto pasta'] },
{ name: 'Macaroni Red Sauce', category: 'Italian', rate: 54, aliases: ['macaroni red sauce', 'red sauce macaroni'] },
{ name: 'Macaroni White Sauce', category: 'Italian', rate: 56, aliases: ['macaroni white sauce', 'white sauce macaroni'] },
{ name: 'Baked Macaroni', category: 'Italian', rate: 64, aliases: ['baked macaroni', 'cheese baked macaroni'] },

// Italian — Pizza

{ name: 'Margherita Pizza', category: 'Italian', rate: 62, aliases: ['margherita pizza', 'margarita pizza', 'cheese tomato pizza'] },
{ name: 'Cheese Pizza', category: 'Italian', rate: 60, aliases: ['cheese pizza', 'plain cheese pizza'] },
{ name: 'Double Cheese Margherita Pizza', category: 'Italian', rate: 68, aliases: ['double cheese margherita pizza', 'double cheese margarita pizza'] },
{ name: 'Farmhouse Pizza', category: 'Italian', rate: 70, aliases: ['farmhouse pizza', 'farm house pizza'] },
{ name: 'Veggie Delight Pizza', category: 'Italian', rate: 68, aliases: ['veggie delight pizza', 'vegetable delight pizza'] },
{ name: 'Garden Fresh Pizza', category: 'Italian', rate: 68, aliases: ['garden fresh pizza', 'garden vegetable pizza'] },
{ name: 'Corn Cheese Pizza', category: 'Italian', rate: 66, aliases: ['corn cheese pizza', 'cheese corn pizza'] },
{ name: 'Paneer Tikka Pizza', category: 'Italian', rate: 74, aliases: ['paneer tikka pizza', 'tandoori paneer pizza'] },
{ name: 'Tandoori Paneer Pizza', category: 'Italian', rate: 76, aliases: ['tandoori paneer pizza', 'paneer tandoori pizza'] },
{ name: 'Mushroom Pizza', category: 'Italian', rate: 70, aliases: ['mushroom pizza', 'cheese mushroom pizza'] },
{ name: 'Capsicum Onion Pizza', category: 'Italian', rate: 66, aliases: ['capsicum onion pizza', 'onion capsicum pizza'] },
{ name: 'Onion Tomato Pizza', category: 'Italian', rate: 64, aliases: ['onion tomato pizza', 'tomato onion pizza'] },
{ name: 'Jalapeno Pizza', category: 'Italian', rate: 68, aliases: ['jalapeno pizza', 'jalapeño pizza'] },
{ name: 'Olive Jalapeno Pizza', category: 'Italian', rate: 72, aliases: ['olive jalapeno pizza', 'jalapeno olive pizza'] },
{ name: 'Mexican Green Wave Pizza', category: 'Italian', rate: 72, aliases: ['mexican green wave pizza', 'mexican veg pizza'] },
{ name: 'Italian Garden Pizza', category: 'Italian', rate: 72, aliases: ['italian garden pizza', 'garden italian pizza'] },
{ name: 'Spinach Corn Pizza', category: 'Italian', rate: 70, aliases: ['spinach corn pizza', 'palak corn pizza'] },
{ name: 'Broccoli Mushroom Pizza', category: 'Italian', rate: 76, aliases: ['broccoli mushroom pizza', 'mushroom broccoli pizza'] },
{ name: 'Exotic Vegetable Pizza', category: 'Italian', rate: 78, aliases: ['exotic vegetable pizza', 'exotic veg pizza'] },
{ name: 'Four Cheese Pizza', category: 'Italian', rate: 82, aliases: ['four cheese pizza', '4 cheese pizza'] },
{ name: 'Peri Peri Paneer Pizza', category: 'Italian', rate: 78, aliases: ['peri peri paneer pizza', 'peri-peri paneer pizza'] },
{ name: 'Schezwan Paneer Pizza', category: 'Italian', rate: 76, aliases: ['schezwan paneer pizza', 'szechuan paneer pizza'] },
{ name: 'Thin Crust Margherita Pizza', category: 'Italian', rate: 68, aliases: ['thin crust margherita pizza', 'thin crust margarita pizza'] },
{ name: 'Wood Fired Margherita Pizza', category: 'Italian', rate: 78, aliases: ['wood fired margherita pizza', 'woodfire margarita pizza'] },
{ name: 'Mini Veg Pizza', category: 'Italian', rate: 58, aliases: ['mini veg pizza', 'mini vegetable pizza'] },
{ name: 'Mini Cheese Pizza', category: 'Italian', rate: 60, aliases: ['mini cheese pizza', 'small cheese pizza'] },

// Italian — Lasagna and Baked Dishes

{ name: 'Vegetable Lasagna', category: 'Italian', rate: 65, aliases: ['vegetable lasagna', 'veg lasagna', 'lasagne'] },
{ name: 'Spinach Corn Lasagna', category: 'Italian', rate: 68, aliases: ['spinach corn lasagna', 'palak corn lasagna'] },
{ name: 'Mushroom Lasagna', category: 'Italian', rate: 70, aliases: ['mushroom lasagna', 'veg mushroom lasagna'] },
{ name: 'Paneer Lasagna', category: 'Italian', rate: 72, aliases: ['paneer lasagna', 'paneer lasagne'] },
{ name: 'Cheese Lasagna', category: 'Italian', rate: 72, aliases: ['cheese lasagna', 'cheesy lasagna'] },
{ name: 'Baked Vegetable Lasagna', category: 'Italian', rate: 70, aliases: ['baked vegetable lasagna', 'baked veg lasagna'] },
{ name: 'Baked Pasta', category: 'Italian', rate: 66, aliases: ['baked pasta', 'cheese baked pasta'] },
{ name: 'Baked Penne', category: 'Italian', rate: 66, aliases: ['baked penne', 'cheesy baked penne'] },
{ name: 'Pasta Au Gratin', category: 'Italian', rate: 68, aliases: ['pasta au gratin', 'pasta gratin'] },
{ name: 'Vegetable Au Gratin', category: 'Italian', rate: 70, aliases: ['vegetable au gratin', 'veg au gratin'] },
{ name: 'Broccoli Au Gratin', category: 'Italian', rate: 72, aliases: ['broccoli au gratin', 'broccoli gratin'] },
{ name: 'Corn Spinach Au Gratin', category: 'Italian', rate: 70, aliases: ['corn spinach au gratin', 'spinach corn gratin'] },
{ name: 'Cannelloni Florentine', category: 'Italian', rate: 74, aliases: ['cannelloni florentine', 'spinach cannelloni'] },
{ name: 'Stuffed Pasta Shells', category: 'Italian', rate: 72, aliases: ['stuffed pasta shells', 'cheese stuffed pasta shells'] },

// Italian — Garlic Bread and Starters

{ name: 'Garlic Bread', category: 'Italian', rate: 46, aliases: ['garlic bread', 'classic garlic bread'] },
{ name: 'Cheese Garlic Bread', category: 'Italian', rate: 54, aliases: ['cheese garlic bread', 'cheesy garlic bread'] },
{ name: 'Stuffed Garlic Bread', category: 'Italian', rate: 62, aliases: ['stuffed garlic bread', 'filled garlic bread'] },
{ name: 'Corn Cheese Garlic Bread', category: 'Italian', rate: 60, aliases: ['corn cheese garlic bread', 'cheese corn garlic bread'] },
{ name: 'Jalapeno Cheese Garlic Bread', category: 'Italian', rate: 62, aliases: ['jalapeno cheese garlic bread', 'jalapeño cheese garlic bread'] },
{ name: 'Bruschetta', category: 'Italian', rate: 58, aliases: ['bruschetta', 'classic bruschetta'] },
{ name: 'Tomato Basil Bruschetta', category: 'Italian', rate: 60, aliases: ['tomato basil bruschetta', 'basil tomato bruschetta'] },
{ name: 'Cheese Corn Bruschetta', category: 'Italian', rate: 62, aliases: ['cheese corn bruschetta', 'corn cheese bruschetta'] },
{ name: 'Mushroom Bruschetta', category: 'Italian', rate: 64, aliases: ['mushroom bruschetta', 'cheese mushroom bruschetta'] },
{ name: 'Olive Jalapeno Bruschetta', category: 'Italian', rate: 64, aliases: ['olive jalapeno bruschetta', 'jalapeno olive bruschetta'] },
{ name: 'Crostini', category: 'Italian', rate: 56, aliases: ['crostini', 'vegetable crostini'] },
{ name: 'Tomato Crostini', category: 'Italian', rate: 58, aliases: ['tomato crostini', 'tomato basil crostini'] },
{ name: 'Mushroom Crostini', category: 'Italian', rate: 62, aliases: ['mushroom crostini', 'garlic mushroom crostini'] },
{ name: 'Cheese Crostini', category: 'Italian', rate: 60, aliases: ['cheese crostini', 'cheesy crostini'] },
{ name: 'Mozzarella Sticks', category: 'Italian', rate: 64, aliases: ['mozzarella sticks', 'fried mozzarella sticks'] },
{ name: 'Cheese Jalapeno Poppers', category: 'Italian', rate: 62, aliases: ['cheese jalapeno poppers', 'jalapeno cheese poppers'] },
{ name: 'Arancini Balls', category: 'Italian', rate: 68, aliases: ['arancini balls', 'risotto balls'] },
{ name: 'Cheese Arancini', category: 'Italian', rate: 70, aliases: ['cheese arancini', 'cheesy risotto balls'] },

// Italian — Risotto

{ name: 'Vegetable Risotto', category: 'Italian', rate: 68, aliases: ['vegetable risotto', 'veg risotto'] },
{ name: 'Mushroom Risotto', category: 'Italian', rate: 72, aliases: ['mushroom risotto', 'creamy mushroom risotto'] },
{ name: 'Spinach Corn Risotto', category: 'Italian', rate: 70, aliases: ['spinach corn risotto', 'palak corn risotto'] },
{ name: 'Tomato Basil Risotto', category: 'Italian', rate: 68, aliases: ['tomato basil risotto', 'basil tomato risotto'] },
{ name: 'Pesto Risotto', category: 'Italian', rate: 72, aliases: ['pesto risotto', 'basil pesto risotto'] },
{ name: 'Broccoli Risotto', category: 'Italian', rate: 72, aliases: ['broccoli risotto', 'creamy broccoli risotto'] },
{ name: 'Four Cheese Risotto', category: 'Italian', rate: 78, aliases: ['four cheese risotto', '4 cheese risotto'] },
{ name: 'Truffle Mushroom Risotto', category: 'Italian', rate: 84, aliases: ['truffle mushroom risotto', 'mushroom truffle risotto'] },

// Italian — Calzone, Panini and Sandwiches

{ name: 'Vegetable Calzone', category: 'Italian', rate: 68, aliases: ['vegetable calzone', 'veg calzone'] },
{ name: 'Cheese Corn Calzone', category: 'Italian', rate: 70, aliases: ['cheese corn calzone', 'corn cheese calzone'] },
{ name: 'Paneer Tikka Calzone', category: 'Italian', rate: 74, aliases: ['paneer tikka calzone', 'tandoori paneer calzone'] },
{ name: 'Mushroom Cheese Calzone', category: 'Italian', rate: 74, aliases: ['mushroom cheese calzone', 'cheese mushroom calzone'] },
{ name: 'Vegetable Panini', category: 'Italian', rate: 60, aliases: ['vegetable panini', 'veg panini'] },
{ name: 'Pesto Vegetable Panini', category: 'Italian', rate: 64, aliases: ['pesto vegetable panini', 'pesto veg panini'] },
{ name: 'Paneer Panini', category: 'Italian', rate: 66, aliases: ['paneer panini', 'paneer cheese panini'] },
{ name: 'Mushroom Panini', category: 'Italian', rate: 66, aliases: ['mushroom panini', 'mushroom cheese panini'] },
{ name: 'Grilled Italian Sandwich', category: 'Italian', rate: 58, aliases: ['grilled italian sandwich', 'italian grilled sandwich'] },
{ name: 'Pesto Cheese Sandwich', category: 'Italian', rate: 62, aliases: ['pesto cheese sandwich', 'cheese pesto sandwich'] },

// Italian — Salad and Sides

{ name: 'Italian Salad', category: 'Italian', rate: 42, aliases: ['italian salad', 'classic italian salad'] },
{ name: 'Pasta Salad', category: 'Italian', rate: 48, aliases: ['pasta salad', 'cold pasta salad'] },
{ name: 'Pesto Pasta Salad', category: 'Italian', rate: 54, aliases: ['pesto pasta salad', 'basil pesto pasta salad'] },
{ name: 'Caprese Salad', category: 'Italian', rate: 62, aliases: ['caprese salad', 'tomato mozzarella salad'] },
{ name: 'Greek Pasta Salad', category: 'Italian', rate: 56, aliases: ['greek pasta salad', 'mediterranean pasta salad'] },
{ name: 'Roasted Vegetable Salad', category: 'Italian', rate: 54, aliases: ['roasted vegetable salad', 'roast veg salad'] },
{ name: 'Herbed Vegetables', category: 'Italian', rate: 48, aliases: ['herbed vegetables', 'italian herb vegetables'] },
{ name: 'Sauteed Vegetables', category: 'Italian', rate: 50, aliases: ['sauteed vegetables', 'sautéed vegetables'] },
{ name: 'Grilled Vegetables', category: 'Italian', rate: 54, aliases: ['grilled vegetables', 'italian grilled vegetables'] },
{ name: 'Mashed Potato', category: 'Italian', rate: 44, aliases: ['mashed potato', 'creamy mashed potato'] },
{ name: 'Herb Roasted Potato', category: 'Italian', rate: 48, aliases: ['herb roasted potato', 'italian roasted potato'] },
  
 // South Indian — Dosa

{ name: 'Plain Dosa', category: 'South Indian', rate: 36, aliases: ['plain dosa', 'sada dosa', 'plain dosai'] },
{ name: 'Masala Dosa', category: 'South Indian', rate: 42, aliases: ['masala dosa', 'masala dosai'] },
{ name: 'Mysore Masala Dosa', category: 'South Indian', rate: 48, aliases: ['mysore masala dosa', 'mysuru masala dosa'] },
{ name: 'Mysore Plain Dosa', category: 'South Indian', rate: 44, aliases: ['mysore plain dosa', 'mysore sada dosa'] },
{ name: 'Butter Dosa', category: 'South Indian', rate: 42, aliases: ['butter dosa', 'butter plain dosa'] },
{ name: 'Butter Masala Dosa', category: 'South Indian', rate: 48, aliases: ['butter masala dosa'] },
{ name: 'Cheese Dosa', category: 'South Indian', rate: 52, aliases: ['cheese dosa', 'cheesy dosa'] },
{ name: 'Cheese Masala Dosa', category: 'South Indian', rate: 58, aliases: ['cheese masala dosa', 'cheesy masala dosa'] },
{ name: 'Paneer Dosa', category: 'South Indian', rate: 56, aliases: ['paneer dosa', 'paneer stuffed dosa'] },
{ name: 'Paneer Masala Dosa', category: 'South Indian', rate: 60, aliases: ['paneer masala dosa'] },
{ name: 'Paneer Cheese Dosa', category: 'South Indian', rate: 64, aliases: ['paneer cheese dosa', 'cheese paneer dosa'] },
{ name: 'Schezwan Dosa', category: 'South Indian', rate: 52, aliases: ['schezwan dosa', 'szechuan dosa'] },
{ name: 'Schezwan Masala Dosa', category: 'South Indian', rate: 56, aliases: ['schezwan masala dosa', 'szechuan masala dosa'] },
{ name: 'Schezwan Cheese Dosa', category: 'South Indian', rate: 62, aliases: ['schezwan cheese dosa', 'cheese schezwan dosa'] },
{ name: 'Spring Dosa', category: 'South Indian', rate: 56, aliases: ['spring dosa', 'vegetable spring dosa'] },
{ name: 'Chinese Dosa', category: 'South Indian', rate: 58, aliases: ['chinese dosa', 'chinese style dosa'] },
{ name: 'Noodle Dosa', category: 'South Indian', rate: 58, aliases: ['noodle dosa', 'noodles dosa'] },
{ name: 'Manchurian Dosa', category: 'South Indian', rate: 60, aliases: ['manchurian dosa', 'veg manchurian dosa'] },
{ name: 'Pizza Dosa', category: 'South Indian', rate: 64, aliases: ['pizza dosa', 'dosa pizza'] },
{ name: 'Corn Cheese Dosa', category: 'South Indian', rate: 60, aliases: ['corn cheese dosa', 'cheese corn dosa'] },
{ name: 'Palak Dosa', category: 'South Indian', rate: 48, aliases: ['palak dosa', 'spinach dosa'] },
{ name: 'Beetroot Dosa', category: 'South Indian', rate: 48, aliases: ['beetroot dosa', 'beet dosa'] },
{ name: 'Tomato Dosa', category: 'South Indian', rate: 46, aliases: ['tomato dosa', 'thakkali dosa'] },
{ name: 'Onion Dosa', category: 'South Indian', rate: 44, aliases: ['onion dosa', 'pyaz dosa'] },
{ name: 'Onion Masala Dosa', category: 'South Indian', rate: 48, aliases: ['onion masala dosa', 'pyaz masala dosa'] },
{ name: 'Garlic Dosa', category: 'South Indian', rate: 46, aliases: ['garlic dosa', 'lasoon dosa', 'lahsuni dosa'] },
{ name: 'Podi Dosa', category: 'South Indian', rate: 46, aliases: ['podi dosa', 'gunpowder dosa', 'milagai podi dosa'] },
{ name: 'Ghee Podi Dosa', category: 'South Indian', rate: 52, aliases: ['ghee podi dosa', 'ghee gunpowder dosa'] },
{ name: 'Ghee Roast Dosa', category: 'South Indian', rate: 52, aliases: ['ghee roast dosa', 'ghee dosa'] },
{ name: 'Paper Dosa', category: 'South Indian', rate: 48, aliases: ['paper dosa', 'paper plain dosa'] },
{ name: 'Paper Masala Dosa', category: 'South Indian', rate: 54, aliases: ['paper masala dosa'] },
{ name: 'Family Paper Dosa', category: 'South Indian', rate: 72, aliases: ['family paper dosa', 'family dosa'] },
{ name: 'Topi Dosa', category: 'South Indian', rate: 48, aliases: ['topi dosa', 'cap dosa'] },
{ name: 'Cone Dosa', category: 'South Indian', rate: 48, aliases: ['cone dosa', 'dosa cone'] },
{ name: 'Set Dosa', category: 'South Indian', rate: 44, aliases: ['set dosa', 'set dosai'] },
{ name: 'Benne Dosa', category: 'South Indian', rate: 48, aliases: ['benne dosa', 'butter benne dosa'] },
{ name: 'Davangere Benne Dosa', category: 'South Indian', rate: 52, aliases: ['davangere benne dosa', 'davangere butter dosa'] },
{ name: 'Neer Dosa', category: 'South Indian', rate: 44, aliases: ['neer dosa', 'neer dosai'] },
{ name: 'Rava Dosa', category: 'South Indian', rate: 46, aliases: ['rava dosa', 'sooji dosa'] },
{ name: 'Rava Masala Dosa', category: 'South Indian', rate: 52, aliases: ['rava masala dosa', 'sooji masala dosa'] },
{ name: 'Onion Rava Dosa', category: 'South Indian', rate: 50, aliases: ['onion rava dosa', 'pyaz rava dosa'] },
{ name: 'Onion Rava Masala Dosa', category: 'South Indian', rate: 56, aliases: ['onion rava masala dosa'] },
{ name: 'Moong Dal Dosa', category: 'South Indian', rate: 46, aliases: ['moong dal dosa', 'moong daal dosa'] },
{ name: 'Pesarattu', category: 'South Indian', rate: 48, aliases: ['pesarattu', 'green moong dosa'] },
{ name: 'Pesarattu Upma', category: 'South Indian', rate: 54, aliases: ['pesarattu upma', 'upma pesarattu'] },
{ name: 'Adai Dosa', category: 'South Indian', rate: 50, aliases: ['adai dosa', 'adai dosai', 'mixed dal dosa'] },
{ name: 'Ragi Dosa', category: 'South Indian', rate: 48, aliases: ['ragi dosa', 'nachni dosa'] },
{ name: 'Oats Dosa', category: 'South Indian', rate: 48, aliases: ['oats dosa', 'oat dosa'] },
{ name: 'Quinoa Dosa', category: 'South Indian', rate: 56, aliases: ['quinoa dosa'] },
{ name: 'Jowar Dosa', category: 'South Indian', rate: 48, aliases: ['jowar dosa', 'sorghum dosa'] },
{ name: 'Millet Dosa', category: 'South Indian', rate: 50, aliases: ['millet dosa', 'multi millet dosa'] },

// South Indian — Idli

{ name: 'Plain Idli', category: 'South Indian', rate: 34, aliases: ['plain idli', 'steamed idli'] },
{ name: 'Idli Sambhar', category: 'South Indian', rate: 38, aliases: ['idli sambhar', 'idli sambar', 'idli with sambhar'] },
{ name: 'Mini Idli Sambhar', category: 'South Indian', rate: 40, aliases: ['mini idli sambhar', 'mini idli sambar'] },
{ name: 'Button Idli Sambhar', category: 'South Indian', rate: 40, aliases: ['button idli sambhar', 'button idli sambar'] },
{ name: 'Cocktail Idli', category: 'South Indian', rate: 42, aliases: ['cocktail idli', 'mini cocktail idli'] },
{ name: 'Podi Idli', category: 'South Indian', rate: 42, aliases: ['podi idli', 'gunpowder idli', 'milagai podi idli'] },
{ name: 'Ghee Podi Idli', category: 'South Indian', rate: 46, aliases: ['ghee podi idli', 'ghee gunpowder idli'] },
{ name: 'Fried Idli', category: 'South Indian', rate: 42, aliases: ['fried idli', 'crispy fried idli'] },
{ name: 'Masala Fried Idli', category: 'South Indian', rate: 46, aliases: ['masala fried idli', 'spicy fried idli'] },
{ name: 'Chilli Idli', category: 'South Indian', rate: 48, aliases: ['chilli idli', 'chili idli'] },
{ name: 'Schezwan Idli', category: 'South Indian', rate: 48, aliases: ['schezwan idli', 'szechuan idli'] },
{ name: 'Manchurian Idli', category: 'South Indian', rate: 50, aliases: ['manchurian idli', 'idli manchurian'] },
{ name: 'Idli Upma', category: 'South Indian', rate: 42, aliases: ['idli upma', 'idli uppuma'] },
{ name: 'Stuffed Idli', category: 'South Indian', rate: 46, aliases: ['stuffed idli', 'bharwa idli'] },
{ name: 'Vegetable Idli', category: 'South Indian', rate: 42, aliases: ['vegetable idli', 'veg idli'] },
{ name: 'Rava Idli', category: 'South Indian', rate: 40, aliases: ['rava idli', 'sooji idli'] },
{ name: 'Kanchipuram Idli', category: 'South Indian', rate: 44, aliases: ['kanchipuram idli', 'kanchipuram kovil idli'] },
{ name: 'Thatte Idli', category: 'South Indian', rate: 44, aliases: ['thatte idli', 'plate idli'] },
{ name: 'Mallige Idli', category: 'South Indian', rate: 42, aliases: ['mallige idli', 'jasmine idli'] },
{ name: 'Ragi Idli', category: 'South Indian', rate: 42, aliases: ['ragi idli', 'nachni idli'] },
{ name: 'Oats Idli', category: 'South Indian', rate: 42, aliases: ['oats idli', 'oat idli'] },
{ name: 'Moong Dal Idli', category: 'South Indian', rate: 44, aliases: ['moong dal idli', 'moong daal idli'] },
{ name: 'Millet Idli', category: 'South Indian', rate: 44, aliases: ['millet idli', 'multi millet idli'] },
{ name: 'Kotte Kadubu', category: 'South Indian', rate: 44, aliases: ['kotte kadubu', 'kotte idli', 'leaf idli'] },

// South Indian — Vada and Bhaji

{ name: 'Medu Vada', category: 'South Indian', rate: 40, aliases: ['medu vada', 'medu wada', 'uddina vada'] },
{ name: 'Medu Vada Sambhar', category: 'South Indian', rate: 44, aliases: ['medu vada sambhar', 'medu vada sambar', 'vada sambhar'] },
{ name: 'Mini Medu Vada', category: 'South Indian', rate: 40, aliases: ['mini medu vada', 'mini medu wada'] },
{ name: 'Sambhar Vada', category: 'South Indian', rate: 44, aliases: ['sambhar vada', 'sambar vada'] },
{ name: 'Rasam Vada', category: 'South Indian', rate: 44, aliases: ['rasam vada', 'vada rasam'] },
{ name: 'Curd Vada', category: 'South Indian', rate: 46, aliases: ['curd vada', 'thayir vada', 'dahi vada south indian'] },
{ name: 'Masala Vada', category: 'South Indian', rate: 40, aliases: ['masala vada', 'paruppu vadai'] },
{ name: 'Dal Vada South Indian', category: 'South Indian', rate: 40, aliases: ['south indian dal vada', 'chana dal vada south indian'] },
{ name: 'Mysore Bonda', category: 'South Indian', rate: 42, aliases: ['mysore bonda', 'mysuru bonda'] },
{ name: 'Aloo Bonda', category: 'South Indian', rate: 40, aliases: ['aloo bonda', 'potato bonda'] },
{ name: 'Punugulu', category: 'South Indian', rate: 40, aliases: ['punugulu', 'punukulu'] },
{ name: 'Mangalore Bajji', category: 'South Indian', rate: 42, aliases: ['mangalore bajji', 'mangalore bonda', 'goli baje'] },
{ name: 'Banana Bajji', category: 'South Indian', rate: 42, aliases: ['banana bajji', 'raw banana bajji', 'vazhakkai bajji'] },
{ name: 'Onion Bajji', category: 'South Indian', rate: 40, aliases: ['onion bajji', 'vengaya bajji'] },
{ name: 'Chilli Bajji', category: 'South Indian', rate: 40, aliases: ['chilli bajji', 'mirchi bajji', 'milagai bajji'] },
{ name: 'Bread Bajji', category: 'South Indian', rate: 42, aliases: ['bread bajji', 'bread pakoda south indian'] },

// South Indian — Uttapam

{ name: 'Plain Uttapam', category: 'South Indian', rate: 40, aliases: ['plain uttapam', 'sada uttapam'] },
{ name: 'Onion Uttapam', category: 'South Indian', rate: 44, aliases: ['onion uttapam', 'pyaz uttapam'] },
{ name: 'Tomato Uttapam', category: 'South Indian', rate: 44, aliases: ['tomato uttapam', 'thakkali uttapam'] },
{ name: 'Onion Tomato Uttapam', category: 'South Indian', rate: 46, aliases: ['onion tomato uttapam', 'tomato onion uttapam'] },
{ name: 'Vegetable Uttapam', category: 'South Indian', rate: 48, aliases: ['vegetable uttapam', 'veg uttapam'] },
{ name: 'Masala Uttapam', category: 'South Indian', rate: 48, aliases: ['masala uttapam'] },
{ name: 'Cheese Uttapam', category: 'South Indian', rate: 54, aliases: ['cheese uttapam', 'cheesy uttapam'] },
{ name: 'Paneer Uttapam', category: 'South Indian', rate: 56, aliases: ['paneer uttapam'] },
{ name: 'Paneer Cheese Uttapam', category: 'South Indian', rate: 62, aliases: ['paneer cheese uttapam', 'cheese paneer uttapam'] },
{ name: 'Corn Cheese Uttapam', category: 'South Indian', rate: 58, aliases: ['corn cheese uttapam', 'cheese corn uttapam'] },
{ name: 'Schezwan Uttapam', category: 'South Indian', rate: 52, aliases: ['schezwan uttapam', 'szechuan uttapam'] },
{ name: 'Podi Uttapam', category: 'South Indian', rate: 46, aliases: ['podi uttapam', 'gunpowder uttapam'] },
{ name: 'Mini Uttapam', category: 'South Indian', rate: 44, aliases: ['mini uttapam', 'small uttapam'] },
{ name: 'Mini Vegetable Uttapam', category: 'South Indian', rate: 48, aliases: ['mini vegetable uttapam', 'mini veg uttapam'] },
{ name: 'Rava Uttapam', category: 'South Indian', rate: 46, aliases: ['rava uttapam', 'sooji uttapam'] },
{ name: 'Oats Uttapam', category: 'South Indian', rate: 48, aliases: ['oats uttapam', 'oat uttapam'] },

// South Indian — Upma, Pongal and Breakfast

{ name: 'Rava Upma', category: 'South Indian', rate: 38, aliases: ['rava upma', 'sooji upma', 'uppuma'] },
{ name: 'Vegetable Upma', category: 'South Indian', rate: 42, aliases: ['vegetable upma', 'veg upma'] },
{ name: 'Tomato Upma', category: 'South Indian', rate: 42, aliases: ['tomato upma', 'thakkali upma'] },
{ name: 'Lemon Upma', category: 'South Indian', rate: 42, aliases: ['lemon upma', 'lime upma'] },
{ name: 'Semiya Upma', category: 'South Indian', rate: 42, aliases: ['semiya upma', 'vermicelli upma', 'sevai upma'] },
{ name: 'Aval Upma', category: 'South Indian', rate: 40, aliases: ['aval upma', 'poha upma', 'beaten rice upma'] },
{ name: 'Bread Upma', category: 'South Indian', rate: 42, aliases: ['bread upma', 'masala bread upma'] },
{ name: 'Ven Pongal', category: 'South Indian', rate: 44, aliases: ['ven pongal', 'khara pongal', 'savory pongal'] },
{ name: 'Sweet Pongal', category: 'South Indian', rate: 46, aliases: ['sweet pongal', 'sakkarai pongal', 'chakkara pongal'] },
{ name: 'Rava Pongal', category: 'South Indian', rate: 44, aliases: ['rava pongal', 'sooji pongal'] },
{ name: 'Millet Pongal', category: 'South Indian', rate: 48, aliases: ['millet pongal', 'multi millet pongal'] },
{ name: 'Khara Bath', category: 'South Indian', rate: 42, aliases: ['khara bath', 'kharabath'] },
{ name: 'Kesari Bath', category: 'South Indian', rate: 44, aliases: ['kesari bath', 'kesari bhath', 'rava kesari'] },
{ name: 'Chow Chow Bath', category: 'South Indian', rate: 52, aliases: ['chow chow bath', 'chow chow bhath'] },
{ name: 'Akki Roti', category: 'South Indian', rate: 48, aliases: ['akki roti', 'rice flour roti'] },
{ name: 'Ragi Roti', category: 'South Indian', rate: 48, aliases: ['ragi roti', 'nachni roti'] },
{ name: 'Adai Avial', category: 'South Indian', rate: 56, aliases: ['adai avial', 'adai with avial'] },

// South Indian — Rice

{ name: 'Lemon Rice', category: 'South Indian', rate: 38, aliases: ['lemon rice', 'nimbu rice', 'chitranna'] },
{ name: 'Tamarind Rice', category: 'South Indian', rate: 40, aliases: ['tamarind rice', 'puliyogare', 'puliyodarai'] },
{ name: 'Curd Rice', category: 'South Indian', rate: 40, aliases: ['curd rice', 'yogurt rice', 'thayir sadam'] },
{ name: 'Coconut Rice', category: 'South Indian', rate: 42, aliases: ['coconut rice', 'thengai sadam'] },
{ name: 'Tomato Rice', category: 'South Indian', rate: 42, aliases: ['tomato rice', 'thakkali sadam'] },
{ name: 'Sambhar Rice', category: 'South Indian', rate: 44, aliases: ['sambhar rice', 'sambar rice'] },
{ name: 'Rasam Rice', category: 'South Indian', rate: 42, aliases: ['rasam rice', 'rasam sadam'] },
{ name: 'Bisibele Bath', category: 'South Indian', rate: 46, aliases: ['bisibele bath', 'bisi bele bath', 'bisi bele bhath'] },
{ name: 'Vegetable Bath', category: 'South Indian', rate: 44, aliases: ['vegetable bath', 'vegetable bhath', 'veg bath'] },
{ name: 'Vangi Bath', category: 'South Indian', rate: 44, aliases: ['vangi bath', 'brinjal rice', 'eggplant rice'] },
{ name: 'Mango Rice', category: 'South Indian', rate: 42, aliases: ['mango rice', 'raw mango rice', 'mavinakayi chitranna'] },
{ name: 'Mint Rice', category: 'South Indian', rate: 42, aliases: ['mint rice', 'pudina rice'] },
{ name: 'Coriander Rice', category: 'South Indian', rate: 42, aliases: ['coriander rice', 'dhaniya rice'] },
{ name: 'Peanut Rice', category: 'South Indian', rate: 42, aliases: ['peanut rice', 'groundnut rice'] },
{ name: 'Sesame Rice', category: 'South Indian', rate: 42, aliases: ['sesame rice', 'til rice', 'ellu sadam'] },
{ name: 'South Indian Vegetable Pulao', category: 'South Indian', rate: 46, aliases: ['south indian vegetable pulao', 'south indian veg pulao'] },
{ name: 'Coconut Milk Pulao', category: 'South Indian', rate: 50, aliases: ['coconut milk pulao', 'coconut pulao'] },
{ name: 'Chettinad Vegetable Rice', category: 'South Indian', rate: 50, aliases: ['chettinad vegetable rice', 'chettinad veg rice'] },
{ name: 'Karnataka Puliyogare', category: 'South Indian', rate: 42, aliases: ['karnataka puliyogare', 'karnataka tamarind rice'] },
{ name: 'Andhra Pulihora', category: 'South Indian', rate: 42, aliases: ['andhra pulihora', 'andhra tamarind rice'] },

// South Indian — Appam, Idiyappam and Kerala

{ name: 'Appam', category: 'South Indian', rate: 44, aliases: ['appam', 'palappam'] },
{ name: 'Appam with Vegetable Stew', category: 'South Indian', rate: 58, aliases: ['appam with vegetable stew', 'appam veg stew'] },
{ name: 'Appam with Kadala Curry', category: 'South Indian', rate: 56, aliases: ['appam with kadala curry', 'appam chana curry'] },
{ name: 'Idiyappam', category: 'South Indian', rate: 44, aliases: ['idiyappam', 'string hoppers', 'nool puttu'] },
{ name: 'Idiyappam with Vegetable Stew', category: 'South Indian', rate: 58, aliases: ['idiyappam with vegetable stew', 'idiyappam veg stew'] },
{ name: 'Idiyappam with Coconut Milk', category: 'South Indian', rate: 52, aliases: ['idiyappam with coconut milk', 'string hoppers coconut milk'] },
{ name: 'Puttu with Kadala Curry', category: 'South Indian', rate: 54, aliases: ['puttu with kadala curry', 'puttu kadala'] },
{ name: 'Kerala Parotta with Vegetable Kurma', category: 'South Indian', rate: 58, aliases: ['kerala parotta with vegetable kurma', 'malabar parotta veg kurma'] },
{ name: 'Malabar Parotta', category: 'South Indian', rate: 42, aliases: ['malabar parotta', 'kerala parotta'] },
{ name: 'Vegetable Stew', category: 'South Indian', rate: 48, aliases: ['kerala vegetable stew', 'veg stew kerala'] },
{ name: 'Kadala Curry', category: 'South Indian', rate: 44, aliases: ['kadala curry', 'kerala black chana curry'] },
{ name: 'Avial', category: 'South Indian', rate: 46, aliases: ['avial', 'aviyal', 'kerala mixed vegetable avial'] },
{ name: 'Olan', category: 'South Indian', rate: 44, aliases: ['olan', 'kerala olan'] },
{ name: 'Kootu Curry', category: 'South Indian', rate: 46, aliases: ['kootu curry', 'kerala kootu curry'] },
{ name: 'Thoran', category: 'South Indian', rate: 42, aliases: ['vegetable thoran', 'kerala thoran'] },

// South Indian — Snacks and Regional Items

{ name: 'Kuzhi Paniyaram', category: 'South Indian', rate: 44, aliases: ['kuzhi paniyaram', 'appe', 'paddu', 'gunta ponganalu'] },
{ name: 'Masala Paniyaram', category: 'South Indian', rate: 46, aliases: ['masala paniyaram', 'masala appe'] },
{ name: 'Cheese Paniyaram', category: 'South Indian', rate: 52, aliases: ['cheese paniyaram', 'cheese appe'] },
{ name: 'Vegetable Paniyaram', category: 'South Indian', rate: 48, aliases: ['vegetable paniyaram', 'veg appe'] },
{ name: 'Kothu Parotta', category: 'South Indian', rate: 54, aliases: ['veg kothu parotta', 'vegetable kothu parotta'] },
{ name: 'Chilli Parotta', category: 'South Indian', rate: 52, aliases: ['chilli parotta', 'chili parotta'] },
{ name: 'Mini Ghee Idli', category: 'South Indian', rate: 46, aliases: ['mini ghee idli', 'ghee button idli'] },
{ name: 'Rasam Shots', category: 'South Indian', rate: 28, aliases: ['rasam shots', 'rasam shot'] },
{ name: 'Mini Dosa Rolls', category: 'South Indian', rate: 50, aliases: ['mini dosa rolls', 'dosa roll bites'] },
{ name: 'Idli Chaat', category: 'South Indian', rate: 48, aliases: ['idli chaat', 'south indian idli chaat'] },
{ name: 'Dosa Chaat', category: 'South Indian', rate: 52, aliases: ['dosa chaat', 'south indian dosa chaat'] },
{ name: 'South Indian Platter', category: 'South Indian', rate: 78, aliases: ['south indian platter', 'south indian combo platter'] },
{ name: 'Mini South Indian Platter', category: 'South Indian', rate: 68, aliases: ['mini south indian platter', 'mini south indian combo'] },

// South Indian — Accompaniments and Curries

{ name: 'Sambhar', category: 'South Indian', rate: 22, aliases: ['south indian sambhar', 'south indian sambar'] },
{ name: 'Vegetable Sambhar', category: 'South Indian', rate: 24, aliases: ['vegetable sambhar', 'vegetable sambar'] },
{ name: 'Tiffin Sambhar', category: 'South Indian', rate: 24, aliases: ['tiffin sambhar', 'tiffin sambar'] },
{ name: 'Rasam', category: 'South Indian', rate: 22, aliases: ['south indian rasam', 'tomato rasam'] },
{ name: 'Pepper Rasam', category: 'South Indian', rate: 24, aliases: ['pepper rasam', 'milagu rasam'] },
{ name: 'Lemon Rasam', category: 'South Indian', rate: 24, aliases: ['lemon rasam', 'elumichai rasam'] },
{ name: 'Mysore Rasam', category: 'South Indian', rate: 26, aliases: ['mysore rasam', 'mysuru rasam'] },
{ name: 'Vegetable Kurma', category: 'South Indian', rate: 44, aliases: ['south indian vegetable kurma', 'south indian veg korma'] },
{ name: 'Potato Masala', category: 'South Indian', rate: 34, aliases: ['dosa potato masala', 'south indian aloo masala'] },
{ name: 'Coconut Chutney', category: 'South Indian', rate: 8, aliases: ['coconut chutney', 'nariyal chutney', 'thengai chutney'] },
{ name: 'Tomato Chutney', category: 'South Indian', rate: 8, aliases: ['south indian tomato chutney', 'thakkali chutney'] },
{ name: 'Peanut Chutney', category: 'South Indian', rate: 8, aliases: ['peanut chutney', 'groundnut chutney'] },
{ name: 'Mint Coconut Chutney', category: 'South Indian', rate: 9, aliases: ['mint coconut chutney', 'pudina coconut chutney'] },
 
 

 // Sabji — Mixed Vegetable

{ name: 'Mix Veg', category: 'Sabji', rate: 48, aliases: ['mix veg', 'mixed vegetable sabji', 'mixed vegetables'] },
{ name: 'Mix Veg Curry', category: 'Sabji', rate: 50, aliases: ['mix veg curry', 'mixed vegetable curry'] },
{ name: 'Mix Veg Dry', category: 'Sabji', rate: 48, aliases: ['mix veg dry', 'dry mixed vegetable'] },
{ name: 'Veg Kolhapuri', category: 'Sabji', rate: 56, aliases: ['veg kolhapuri', 'vegetable kolhapuri'] },
{ name: 'Veg Jalfrezi', category: 'Sabji', rate: 54, aliases: ['veg jalfrezi', 'vegetable jalfrezi'] },
{ name: 'Veg Kadai', category: 'Sabji', rate: 56, aliases: ['veg kadai', 'kadai vegetable', 'kadhai veg'] },
{ name: 'Veg Handi', category: 'Sabji', rate: 56, aliases: ['veg handi', 'vegetable handi'] },
{ name: 'Veg Makhanwala', category: 'Sabji', rate: 58, aliases: ['veg makhanwala', 'vegetable makhanwala'] },
{ name: 'Veg Jaipuri', category: 'Sabji', rate: 58, aliases: ['veg jaipuri', 'vegetable jaipuri'] },
{ name: 'Veg Hyderabadi', category: 'Sabji', rate: 58, aliases: ['veg hyderabadi', 'vegetable hyderabadi'] },
{ name: 'Veg Mughlai', category: 'Sabji', rate: 62, aliases: ['veg mughlai', 'vegetable mughlai'] },
{ name: 'Veg Diwani Handi', category: 'Sabji', rate: 60, aliases: ['veg diwani handi', 'diwani vegetable handi'] },
{ name: 'Subz Miloni', category: 'Sabji', rate: 58, aliases: ['subz miloni', 'sabz miloni'] },
{ name: 'Subz Bahar', category: 'Sabji', rate: 58, aliases: ['subz bahar', 'sabz bahar'] },
{ name: 'Subz Panchratna', category: 'Sabji', rate: 60, aliases: ['subz panchratna', 'vegetable panchratna'] },
{ name: 'Navratan Korma', category: 'Sabji', rate: 64, aliases: ['navratan korma', 'navratna kurma', 'navratan kurma'] },
{ name: 'Vegetable Korma', category: 'Sabji', rate: 56, aliases: ['vegetable korma', 'veg korma', 'vegetable kurma'] },
{ name: 'Vegetable Stew', category: 'Sabji', rate: 52, aliases: ['vegetable stew', 'veg stew'] },
{ name: 'Vegetable Do Pyaza', category: 'Sabji', rate: 54, aliases: ['vegetable do pyaza', 'veg dopiaza'] },
{ name: 'Vegetable Lahori', category: 'Sabji', rate: 58, aliases: ['vegetable lahori', 'veg lahori'] },

// Sabji — Potato

{ name: 'Aloo Gobi', category: 'Sabji', rate: 50, aliases: ['aloo gobi', 'alu gobi', 'potato cauliflower sabji'] },
{ name: 'Aloo Matar', category: 'Sabji', rate: 46, aliases: ['aloo matar', 'alu matar', 'potato peas curry'] },
{ name: 'Aloo Tamatar', category: 'Sabji', rate: 44, aliases: ['aloo tamatar', 'alu tomato sabji', 'potato tomato curry'] },
{ name: 'Aloo Palak', category: 'Sabji', rate: 48, aliases: ['aloo palak', 'potato spinach curry'] },
{ name: 'Aloo Methi', category: 'Sabji', rate: 48, aliases: ['aloo methi', 'potato fenugreek sabji'] },
{ name: 'Aloo Jeera', category: 'Sabji', rate: 44, aliases: ['aloo jeera', 'jeera aloo', 'cumin potato'] },
{ name: 'Aloo Fry', category: 'Sabji', rate: 42, aliases: ['aloo fry', 'potato fry sabji'] },
{ name: 'Aloo Masala', category: 'Sabji', rate: 44, aliases: ['aloo masala sabji', 'potato masala curry'] },
{ name: 'Dum Aloo', category: 'Sabji', rate: 52, aliases: ['dum aloo', 'dum alu'] },
{ name: 'Kashmiri Dum Aloo', category: 'Sabji', rate: 58, aliases: ['kashmiri dum aloo', 'kashmiri dum alu'] },
{ name: 'Punjabi Dum Aloo', category: 'Sabji', rate: 56, aliases: ['punjabi dum aloo', 'punjabi dum alu'] },
{ name: 'Banarasi Dum Aloo', category: 'Sabji', rate: 56, aliases: ['banarasi dum aloo', 'banaras dum aloo'] },
{ name: 'Aloo Do Pyaza', category: 'Sabji', rate: 48, aliases: ['aloo do pyaza', 'potato dopiaza'] },
{ name: 'Aloo Capsicum', category: 'Sabji', rate: 48, aliases: ['aloo capsicum', 'potato capsicum sabji'] },
{ name: 'Aloo Beans', category: 'Sabji', rate: 46, aliases: ['aloo beans', 'potato french beans sabji'] },
{ name: 'Aloo Baingan', category: 'Sabji', rate: 46, aliases: ['aloo baingan', 'potato brinjal sabji'] },
{ name: 'Aloo Parwal', category: 'Sabji', rate: 48, aliases: ['aloo parwal', 'potato pointed gourd sabji'] },
{ name: 'Aloo Shimla Mirch', category: 'Sabji', rate: 48, aliases: ['aloo shimla mirch', 'potato bell pepper sabji'] },
{ name: 'Baby Potato Masala', category: 'Sabji', rate: 52, aliases: ['baby potato masala', 'baby aloo masala'] },
{ name: 'Achari Aloo', category: 'Sabji', rate: 50, aliases: ['achari aloo', 'pickle masala potato'] },

// Sabji — Cauliflower, Cabbage and Broccoli

{ name: 'Gobi Matar', category: 'Sabji', rate: 48, aliases: ['gobi matar', 'cauliflower peas sabji'] },
{ name: 'Gobi Masala', category: 'Sabji', rate: 50, aliases: ['gobi masala', 'cauliflower masala curry'] },
{ name: 'Gobi Do Pyaza', category: 'Sabji', rate: 52, aliases: ['gobi do pyaza', 'cauliflower dopiaza'] },
{ name: 'Adraki Gobi', category: 'Sabji', rate: 52, aliases: ['adraki gobi', 'ginger cauliflower sabji'] },
{ name: 'Gobi Kaju Masala', category: 'Sabji', rate: 58, aliases: ['gobi kaju masala', 'cauliflower cashew curry'] },
{ name: 'Cabbage Peas Sabji', category: 'Sabji', rate: 44, aliases: ['cabbage peas sabji', 'patta gobhi matar'] },
{ name: 'Cabbage Potato Sabji', category: 'Sabji', rate: 44, aliases: ['cabbage potato sabji', 'patta gobhi aloo'] },
{ name: 'Cabbage Capsicum Sabji', category: 'Sabji', rate: 46, aliases: ['cabbage capsicum sabji', 'patta gobhi shimla mirch'] },
{ name: 'Broccoli Masala', category: 'Sabji', rate: 62, aliases: ['broccoli masala', 'broccoli curry'] },
{ name: 'Broccoli Mushroom Masala', category: 'Sabji', rate: 68, aliases: ['broccoli mushroom masala', 'mushroom broccoli curry'] },
{ name: 'Broccoli Corn Sabji', category: 'Sabji', rate: 64, aliases: ['broccoli corn sabji', 'corn broccoli curry'] },
{ name: 'Broccoli Kaju Masala', category: 'Sabji', rate: 72, aliases: ['broccoli kaju masala', 'broccoli cashew curry'] },

// Sabji — Mushroom

{ name: 'Mushroom Masala', category: 'Sabji', rate: 62, aliases: ['mushroom masala', 'mushroom curry'] },
{ name: 'Mushroom Matar', category: 'Sabji', rate: 62, aliases: ['mushroom matar', 'mushroom peas curry'] },
{ name: 'Mushroom Do Pyaza', category: 'Sabji', rate: 64, aliases: ['mushroom do pyaza', 'mushroom dopiaza'] },
{ name: 'Kadai Mushroom', category: 'Sabji', rate: 66, aliases: ['kadai mushroom', 'kadhai mushroom'] },
{ name: 'Mushroom Handi', category: 'Sabji', rate: 66, aliases: ['mushroom handi', 'handi mushroom'] },
{ name: 'Mushroom Makhanwala', category: 'Sabji', rate: 68, aliases: ['mushroom makhanwala', 'butter mushroom curry'] },
{ name: 'Mushroom Kali Mirch', category: 'Sabji', rate: 68, aliases: ['mushroom kali mirch', 'black pepper mushroom curry'] },
{ name: 'Mushroom Palak', category: 'Sabji', rate: 64, aliases: ['mushroom palak', 'spinach mushroom curry'] },
{ name: 'Mushroom Corn Masala', category: 'Sabji', rate: 64, aliases: ['mushroom corn masala', 'corn mushroom curry'] },
{ name: 'Mushroom Kaju Masala', category: 'Sabji', rate: 72, aliases: ['mushroom kaju masala', 'mushroom cashew curry'] },
{ name: 'Mushroom Malai Curry', category: 'Sabji', rate: 70, aliases: ['mushroom malai curry', 'creamy mushroom curry'] },
{ name: 'Mushroom Chettinad', category: 'Sabji', rate: 66, aliases: ['mushroom chettinad', 'chettinad mushroom curry'] },

// Sabji — Kofta

{ name: 'Malai Kofta', category: 'Sabji', rate: 58, aliases: ['malai kofta', 'malai kofta curry'] },
{ name: 'Veg Kofta Curry', category: 'Sabji', rate: 54, aliases: ['veg kofta curry', 'vegetable kofta curry'] },
{ name: 'Paneer Kofta Curry', category: 'Sabji', rate: 68, aliases: ['paneer kofta curry', 'paneer kofta masala'] },
{ name: 'Palak Kofta Curry', category: 'Sabji', rate: 60, aliases: ['palak kofta curry', 'spinach kofta curry'] },
{ name: 'Lauki Kofta Curry', category: 'Sabji', rate: 52, aliases: ['lauki kofta curry', 'bottle gourd kofta'] },
{ name: 'Cabbage Kofta Curry', category: 'Sabji', rate: 52, aliases: ['cabbage kofta curry', 'patta gobhi kofta'] },
{ name: 'Corn Kofta Curry', category: 'Sabji', rate: 58, aliases: ['corn kofta curry', 'sweet corn kofta'] },
{ name: 'Cheese Kofta Curry', category: 'Sabji', rate: 68, aliases: ['cheese kofta curry', 'cheesy kofta curry'] },
{ name: 'Nargisi Veg Kofta', category: 'Sabji', rate: 64, aliases: ['nargisi veg kofta', 'vegetable nargisi kofta'] },
{ name: 'Shahi Kofta Curry', category: 'Sabji', rate: 64, aliases: ['shahi kofta curry', 'royal kofta curry'] },
{ name: 'Dry Fruit Kofta Curry', category: 'Sabji', rate: 72, aliases: ['dry fruit kofta curry', 'dryfruit kofta'] },
{ name: 'Kaju Kofta Curry', category: 'Sabji', rate: 72, aliases: ['kaju kofta curry', 'cashew kofta curry'] },

// Sabji — Green Peas, Corn and Capsicum

{ name: 'Matar Masala', category: 'Sabji', rate: 48, aliases: ['matar masala', 'green peas masala'] },
{ name: 'Matar Mushroom', category: 'Sabji', rate: 62, aliases: ['matar mushroom', 'peas mushroom curry'] },
{ name: 'Matar Methi Malai', category: 'Sabji', rate: 60, aliases: ['matar methi malai', 'malai methi matar'] },
{ name: 'Methi Matar', category: 'Sabji', rate: 50, aliases: ['methi matar', 'fenugreek peas sabji'] },
{ name: 'Corn Masala', category: 'Sabji', rate: 52, aliases: ['corn masala', 'sweet corn masala curry'] },
{ name: 'Corn Palak', category: 'Sabji', rate: 54, aliases: ['corn palak', 'spinach corn curry'] },
{ name: 'Corn Capsicum', category: 'Sabji', rate: 52, aliases: ['corn capsicum', 'sweet corn capsicum sabji'] },
{ name: 'Corn Methi Malai', category: 'Sabji', rate: 58, aliases: ['corn methi malai', 'malai methi corn'] },
{ name: 'Baby Corn Masala', category: 'Sabji', rate: 56, aliases: ['baby corn masala', 'babycorn curry'] },
{ name: 'Baby Corn Mushroom Masala', category: 'Sabji', rate: 64, aliases: ['baby corn mushroom masala', 'babycorn mushroom curry'] },
{ name: 'Capsicum Masala', category: 'Sabji', rate: 50, aliases: ['capsicum masala', 'shimla mirch masala'] },
{ name: 'Bharwa Capsicum', category: 'Sabji', rate: 56, aliases: ['bharwa capsicum', 'stuffed capsicum', 'stuffed bell pepper'] },
{ name: 'Capsicum Do Pyaza', category: 'Sabji', rate: 52, aliases: ['capsicum do pyaza', 'bell pepper dopiaza'] },
{ name: 'Capsicum Corn Masala', category: 'Sabji', rate: 54, aliases: ['capsicum corn masala', 'bell pepper corn curry'] },

// Sabji — Brinjal

{ name: 'Baingan Bharta', category: 'Sabji', rate: 50, aliases: ['baingan bharta', 'brinjal bharta', 'eggplant bharta'] },
{ name: 'Baingan Masala', category: 'Sabji', rate: 48, aliases: ['baingan masala', 'brinjal masala curry'] },
{ name: 'Bharwa Baingan', category: 'Sabji', rate: 52, aliases: ['bharwa baingan', 'stuffed brinjal', 'stuffed eggplant'] },
{ name: 'Baingan Aloo', category: 'Sabji', rate: 46, aliases: ['baingan aloo', 'brinjal potato sabji'] },
{ name: 'Baingan Matar', category: 'Sabji', rate: 48, aliases: ['baingan matar', 'brinjal peas curry'] },
{ name: 'Bagara Baingan', category: 'Sabji', rate: 56, aliases: ['bagara baingan', 'baghare baingan'] },
{ name: 'Hyderabadi Baingan', category: 'Sabji', rate: 56, aliases: ['hyderabadi baingan', 'hyderabad brinjal curry'] },
{ name: 'Achari Baingan', category: 'Sabji', rate: 52, aliases: ['achari baingan', 'pickle masala brinjal'] },

// Sabji — Okra and Beans

{ name: 'Bhindi Masala', category: 'Sabji', rate: 48, aliases: ['bhindi masala', 'okra masala'] },
{ name: 'Bhindi Fry', category: 'Sabji', rate: 46, aliases: ['bhindi fry', 'fried okra'] },
{ name: 'Bhindi Do Pyaza', category: 'Sabji', rate: 50, aliases: ['bhindi do pyaza', 'okra dopiaza'] },
{ name: 'Bharwa Bhindi', category: 'Sabji', rate: 52, aliases: ['bharwa bhindi', 'stuffed okra'] },
{ name: 'Kurkuri Bhindi', category: 'Sabji', rate: 54, aliases: ['kurkuri bhindi', 'crispy okra'] },
{ name: 'Bhindi Aloo', category: 'Sabji', rate: 46, aliases: ['bhindi aloo', 'okra potato sabji'] },
{ name: 'French Beans Aloo', category: 'Sabji', rate: 46, aliases: ['french beans aloo', 'beans potato sabji'] },
{ name: 'French Beans Masala', category: 'Sabji', rate: 48, aliases: ['french beans masala', 'beans masala sabji'] },
{ name: 'Beans Carrot Sabji', category: 'Sabji', rate: 46, aliases: ['beans carrot sabji', 'carrot beans sabji'] },
{ name: 'Beans Coconut Sabji', category: 'Sabji', rate: 48, aliases: ['beans coconut sabji', 'beans nariyal sabji'] },
{ name: 'Cluster Beans Sabji', category: 'Sabji', rate: 46, aliases: ['cluster beans sabji', 'gawar sabji', 'guvar sabji'] },
{ name: 'Gawar Aloo', category: 'Sabji', rate: 46, aliases: ['gawar aloo', 'guvar aloo', 'cluster beans potato'] },

// Sabji — Spinach and Leafy Vegetables

{ name: 'Palak Corn', category: 'Sabji', rate: 54, aliases: ['palak corn', 'spinach corn curry'] },
{ name: 'Palak Mushroom', category: 'Sabji', rate: 64, aliases: ['palak mushroom', 'spinach mushroom curry'] },
{ name: 'Palak Kofta', category: 'Sabji', rate: 60, aliases: ['palak kofta', 'spinach kofta curry'] },
{ name: 'Palak Aloo', category: 'Sabji', rate: 48, aliases: ['palak aloo', 'spinach potato curry'] },
{ name: 'Palak Chana', category: 'Sabji', rate: 50, aliases: ['palak chana', 'spinach chickpea curry'] },
{ name: 'Sarson Ka Saag', category: 'Sabji', rate: 54, aliases: ['sarson ka saag', 'mustard greens curry'] },
{ name: 'Methi Aloo', category: 'Sabji', rate: 48, aliases: ['methi aloo', 'fenugreek potato sabji'] },
{ name: 'Methi Matar', category: 'Sabji', rate: 50, aliases: ['methi matar sabji', 'fenugreek peas curry'] },
{ name: 'Methi Chaman', category: 'Sabji', rate: 62, aliases: ['methi chaman', 'fenugreek paneer curry'] },
{ name: 'Bathua Aloo', category: 'Sabji', rate: 48, aliases: ['bathua aloo', 'bathua potato sabji'] },
{ name: 'Chaulai Sabji', category: 'Sabji', rate: 46, aliases: ['chaulai sabji', 'amaranth leaves sabji'] },

// Sabji — Bottle Gourd, Ridge Gourd and Pumpkin

{ name: 'Lauki Chana Dal', category: 'Sabji', rate: 46, aliases: ['lauki chana dal', 'bottle gourd chana dal'] },
{ name: 'Lauki Masala', category: 'Sabji', rate: 44, aliases: ['lauki masala', 'bottle gourd curry'] },
{ name: 'Lauki Matar', category: 'Sabji', rate: 46, aliases: ['lauki matar', 'bottle gourd peas curry'] },
{ name: 'Lauki Kofta', category: 'Sabji', rate: 52, aliases: ['lauki kofta', 'bottle gourd kofta curry'] },
{ name: 'Turai Masala', category: 'Sabji', rate: 44, aliases: ['turai masala', 'ridge gourd curry'] },
{ name: 'Turai Chana Dal', category: 'Sabji', rate: 46, aliases: ['turai chana dal', 'ridge gourd chana dal'] },
{ name: 'Tinda Masala', category: 'Sabji', rate: 44, aliases: ['tinda masala', 'apple gourd curry'] },
{ name: 'Bharwa Tinda', category: 'Sabji', rate: 48, aliases: ['bharwa tinda', 'stuffed apple gourd'] },
{ name: 'Kaddu Ki Sabji', category: 'Sabji', rate: 42, aliases: ['kaddu ki sabji', 'pumpkin sabji'] },
{ name: 'Khatta Meetha Kaddu', category: 'Sabji', rate: 46, aliases: ['khatta meetha kaddu', 'sweet sour pumpkin'] },
{ name: 'Pumpkin Masala', category: 'Sabji', rate: 46, aliases: ['pumpkin masala', 'kaddu masala'] },
{ name: 'Parwal Masala', category: 'Sabji', rate: 48, aliases: ['parwal masala', 'pointed gourd curry'] },
{ name: 'Bharwa Parwal', category: 'Sabji', rate: 52, aliases: ['bharwa parwal', 'stuffed pointed gourd'] },

// Sabji — Raw Banana and Jackfruit

{ name: 'Raw Banana Masala', category: 'Sabji', rate: 48, aliases: ['raw banana masala', 'kachha kela masala'] },
{ name: 'Raw Banana Fry', category: 'Sabji', rate: 46, aliases: ['raw banana fry', 'kachha kela fry'] },
{ name: 'Banana Kofta Curry', category: 'Sabji', rate: 54, aliases: ['banana kofta curry', 'raw banana kofta'] },
{ name: 'Kathal Masala', category: 'Sabji', rate: 56, aliases: ['kathal masala', 'jackfruit masala curry'] },
{ name: 'Kathal Do Pyaza', category: 'Sabji', rate: 58, aliases: ['kathal do pyaza', 'jackfruit dopiaza'] },
{ name: 'Kathal Korma', category: 'Sabji', rate: 60, aliases: ['kathal korma', 'jackfruit korma'] },
{ name: 'Kathal Rogan Josh', category: 'Sabji', rate: 62, aliases: ['kathal rogan josh', 'jackfruit rogan josh'] },

// Sabji — Premium and Cashew Gravies

{ name: 'Kaju Curry', category: 'Sabji', rate: 76, aliases: ['kaju curry', 'cashew curry'] },
{ name: 'Kaju Masala', category: 'Sabji', rate: 78, aliases: ['kaju masala', 'cashew masala curry'] },
{ name: 'Kaju Matar', category: 'Sabji', rate: 74, aliases: ['kaju matar', 'cashew peas curry'] },
{ name: 'Kaju Mushroom', category: 'Sabji', rate: 78, aliases: ['kaju mushroom', 'cashew mushroom curry'] },
{ name: 'Kaju Corn Masala', category: 'Sabji', rate: 76, aliases: ['kaju corn masala', 'cashew corn curry'] },
{ name: 'Kaju Korma', category: 'Sabji', rate: 80, aliases: ['kaju korma', 'cashew korma'] },
{ name: 'Dry Fruit Curry', category: 'Sabji', rate: 82, aliases: ['dry fruit curry', 'dryfruit curry'] },
{ name: 'Shahi Vegetable Curry', category: 'Sabji', rate: 68, aliases: ['shahi vegetable curry', 'shahi veg curry'] },
{ name: 'Badami Vegetable Curry', category: 'Sabji', rate: 72, aliases: ['badami vegetable curry', 'almond vegetable curry'] },
{ name: 'Malai Vegetable Curry', category: 'Sabji', rate: 64, aliases: ['malai vegetable curry', 'creamy vegetable curry'] },
{ name: 'Vegetable Khurchan', category: 'Sabji', rate: 62, aliases: ['vegetable khurchan', 'veg khurchan'] },
{ name: 'Vegetable Lababdar', category: 'Sabji', rate: 64, aliases: ['vegetable lababdar', 'veg lababdar'] },
{ name: 'Vegetable Tawa Masala', category: 'Sabji', rate: 58, aliases: ['vegetable tawa masala', 'tawa veg'] },
{ name: 'Tawa Sabji', category: 'Sabji', rate: 60, aliases: ['tawa sabji', 'assorted tawa vegetables'] },

  
];

const DISH_COST_ITEMS_PART_3: readonly DishCostItem[] = [
  // Chaat
  { name: 'Pani Puri', category: 'Chaat', rate: 32, aliases: ['golgappa', 'puchka'] },
  { name: 'Sev Puri', category: 'Chaat', rate: 38 },
  { name: 'Dahi Puri', category: 'Chaat', rate: 42 },
  { name: 'Bhel Puri', category: 'Chaat', rate: 36, aliases: ['bhel'] },
  { name: 'Papdi Chaat', category: 'Chaat', rate: 42 },
  { name: 'Aloo Tikki Chaat', category: 'Chaat', rate: 44 },
  { name: 'Dahi Bhalla', category: 'Chaat', rate: 46, aliases: ['dahi vada chaat'] },
  { name: 'Ragda Pattice', category: 'Chaat', rate: 48 },

  // Punjabi
  { name: 'Chole Bhature', category: 'Punjabi', rate: 72 },
  { name: 'Amritsari Kulcha', category: 'Punjabi', rate: 68 },
  { name: 'Rajma Masala', category: 'Punjabi', rate: 58 },
  { name: 'Sarson Ka Saag', category: 'Punjabi', rate: 68 },
  { name: 'Punjabi Chole', category: 'Punjabi', rate: 62 },
  { name: 'Matar Mushroom Masala', category: 'Punjabi', rate: 72 },
  { name: 'Veg Kolhapuri', category: 'Punjabi', rate: 68 },
  { name: 'Malai Kofta', category: 'Punjabi', rate: 78 },

  // Paneer
  { name: 'Paneer Butter Masala', category: 'Paneer', rate: 82, aliases: ['pbm'] },
  { name: 'Kadai Paneer', category: 'Paneer', rate: 80 },
  { name: 'Shahi Paneer', category: 'Paneer', rate: 84 },
  { name: 'Palak Paneer', category: 'Paneer', rate: 76 },
  { name: 'Paneer Tikka Masala', category: 'Paneer', rate: 86 },
  { name: 'Paneer Lababdar', category: 'Paneer', rate: 86 },
  { name: 'Matar Paneer', category: 'Paneer', rate: 76 },
  { name: 'Paneer Bhurji', category: 'Paneer', rate: 78 },

  // Kathiyawadi
  { name: 'Sev Tameta', category: 'Kathiyawadi', rate: 48 },
  { name: 'Lasaniya Bataka', category: 'Kathiyawadi', rate: 46 },
  { name: 'Ringan No Olo', category: 'Kathiyawadi', rate: 48, aliases: ['baingan bharta kathiyawadi'] },
  { name: 'Bajra Rotla', category: 'Kathiyawadi', rate: 22 },
  { name: 'Kathiyawadi Khichdi', category: 'Kathiyawadi', rate: 44 },
  { name: 'Vagharelo Rotlo', category: 'Kathiyawadi', rate: 42 },

  // Rajasthani
  { name: 'Dal Baati Churma', category: 'Rajasthani', rate: 78 },
  { name: 'Gatte Ki Sabji', category: 'Rajasthani', rate: 58 },
  { name: 'Ker Sangri', category: 'Rajasthani', rate: 64 },
  { name: 'Papad Ki Sabji', category: 'Rajasthani', rate: 52 },
  { name: 'Rajasthani Kadhi', category: 'Rajasthani', rate: 42 },
  { name: 'Panchmel Dal', category: 'Rajasthani', rate: 48 },

  // Gujarati
  { name: 'Gujarati Dal', category: 'Gujarati', rate: 32 },
  { name: 'Undhiyu', category: 'Gujarati', rate: 62 },
  { name: 'Bharela Ringan Bataka', category: 'Gujarati', rate: 48 },
  { name: 'Gujarati Kadhi', category: 'Gujarati', rate: 30 },
  { name: 'Dal Dhokli', category: 'Gujarati', rate: 48 },
  { name: 'Handvo', category: 'Gujarati', rate: 42 },

  // Dal / Kadhi
  { name: 'Dal Tadka', category: 'Dal / Kadhi', rate: 30 },
  { name: 'Dal Fry', category: 'Dal / Kadhi', rate: 28 },
  { name: 'Dal Makhani', category: 'Dal / Kadhi', rate: 42 },
  { name: 'Kadhi Pakora', category: 'Dal / Kadhi', rate: 34 },
  { name: 'Moong Dal', category: 'Dal / Kadhi', rate: 26 },
  { name: 'Mix Dal', category: 'Dal / Kadhi', rate: 32 },

  // Rice
  { name: 'Steamed Rice', category: 'Rice', rate: 22 },
  { name: 'Jeera Rice', category: 'Rice', rate: 26 },
  { name: 'Veg Pulao', category: 'Rice', rate: 38 },
  { name: 'Veg Biryani', category: 'Rice', rate: 52 },
  { name: 'Peas Pulao', category: 'Rice', rate: 34 },
  { name: 'Kashmiri Pulao', category: 'Rice', rate: 48 },

  // Bread
  { name: 'Tandoori Roti', category: 'Bread', rate: 14 },
  { name: 'Butter Roti', category: 'Bread', rate: 18 },
  { name: 'Plain Naan', category: 'Bread', rate: 22 },
  { name: 'Butter Naan', category: 'Bread', rate: 26 },
  { name: 'Lachha Paratha', category: 'Bread', rate: 28 },
  { name: 'Missi Roti', category: 'Bread', rate: 22 },

  // Sweet
  { name: 'Gulab Jamun', category: 'Sweet', rate: 28 },
  { name: 'Rasmalai', category: 'Sweet', rate: 44 },
  { name: 'Jalebi', category: 'Sweet', rate: 32 },
  { name: 'Moong Dal Halwa', category: 'Sweet', rate: 52 },
  { name: 'Gajar Halwa', category: 'Sweet', rate: 48 },
  { name: 'Shrikhand', category: 'Sweet', rate: 42 },
  { name: 'Basundi', category: 'Sweet', rate: 46 },
  { name: 'Kaju Katli', category: 'Sweet', rate: 58 },

  // Ice Cream
  { name: 'Vanilla Ice Cream', category: 'Ice Cream', rate: 26 },
  { name: 'Chocolate Ice Cream', category: 'Ice Cream', rate: 30 },
  { name: 'Butterscotch Ice Cream', category: 'Ice Cream', rate: 32 },
  { name: 'Kesar Pista Ice Cream', category: 'Ice Cream', rate: 36 },
  { name: 'Rajbhog Ice Cream', category: 'Ice Cream', rate: 38 },
  { name: 'Kulfi', category: 'Ice Cream', rate: 34 },

  // Salad
  { name: 'Green Salad', category: 'Salad', rate: 10 },
  { name: 'Kachumber Salad', category: 'Salad', rate: 12 },
  { name: 'Russian Salad', category: 'Salad', rate: 28 },
  { name: 'Sprout Salad', category: 'Salad', rate: 22 },
  { name: 'Fruit Salad', category: 'Salad', rate: 32 },

  // Papad
  { name: 'Roasted Papad', category: 'Papad', rate: 4 },
  { name: 'Fried Papad', category: 'Papad', rate: 6 },
  { name: 'Masala Papad', category: 'Papad', rate: 12 },
  { name: 'Khichiya Papad', category: 'Papad', rate: 8 },

  // Farsan
  { name: 'Khaman Dhokla', category: 'Farsan', rate: 24 },
  { name: 'Khandvi Farsan', category: 'Farsan', rate: 28 },
  { name: 'Patra', category: 'Farsan', rate: 28 },
  { name: 'Samosa', category: 'Farsan', rate: 20 },
  { name: 'Lilva Kachori Farsan', category: 'Farsan', rate: 30 },
  { name: 'Fafda', category: 'Farsan', rate: 24 },

  // Beverage
  { name: 'Masala Chaas', category: 'Beverage', rate: 14, aliases: ['buttermilk'] },
  { name: 'Sweet Lassi', category: 'Beverage', rate: 26 },
  { name: 'Masala Tea', category: 'Beverage', rate: 12 },
  { name: 'Coffee', category: 'Beverage', rate: 18 },
  { name: 'Mineral Water', category: 'Beverage', rate: 10 },

  // Live Counter
  { name: 'Live Dosa Counter', category: 'Live Counter', rate: 72 },
  { name: 'Live Pasta Counter', category: 'Live Counter', rate: 82 },
  { name: 'Live Chaat Counter', category: 'Live Counter', rate: 68 },
  { name: 'Live Tawa Sabji Counter', category: 'Live Counter', rate: 86 },
  { name: 'Live Jalebi Counter', category: 'Live Counter', rate: 64 },
  { name: 'Live Pizza Counter', category: 'Live Counter', rate: 92 },

  // Breakfast
  { name: 'Poha', category: 'Breakfast', rate: 34 },
  { name: 'Upma Breakfast', category: 'Breakfast', rate: 36 },
  { name: 'Thepla Breakfast', category: 'Breakfast', rate: 38 },
  { name: 'Puri Bhaji', category: 'Breakfast', rate: 48 },
  { name: 'Aloo Paratha', category: 'Breakfast', rate: 52 },
  { name: 'Bread Pakora', category: 'Breakfast', rate: 40 },

  // Jain
  { name: 'Jain Paneer Masala', category: 'Jain', rate: 78 },
  { name: 'Jain Veg Handi', category: 'Jain', rate: 64 },
  { name: 'Jain Dal Tadka', category: 'Jain', rate: 32 },
  { name: 'Jain Pulao', category: 'Jain', rate: 42 },
  { name: 'Jain Pav Bhaji', category: 'Jain', rate: 58 },
  { name: 'Jain Chole', category: 'Jain', rate: 56 },

  // Kids
  { name: 'Mini Burger', category: 'Kids', rate: 46 },
  { name: 'French Fries', category: 'Kids', rate: 38 },
  { name: 'Cheese Sandwich', category: 'Kids', rate: 44 },
  { name: 'Mini Samosa', category: 'Kids', rate: 28 },
  { name: 'Smileys', category: 'Kids', rate: 36 },
  { name: 'Chocolate Milkshake', category: 'Kids', rate: 42 },

  // Condiments
  { name: 'Mint Chutney', category: 'Condiments', rate: 6 },
  { name: 'Tamarind Chutney', category: 'Condiments', rate: 6 },
  { name: 'Mango Pickle', category: 'Condiments', rate: 5 },
  { name: 'Lemon Pickle', category: 'Condiments', rate: 5 },
  { name: 'Boondi Raita', category: 'Condiments', rate: 18 },
  { name: 'Plain Curd', category: 'Condiments', rate: 14 },
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
    merged.set(normalizeCatalogKey(clean.name), clean);
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
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeDishName(value: string) {
  return normalizeDishName(value).split(' ').filter(Boolean);
}

function isExactAliasMatch(input: string, candidate: string) {
  return normalizeDishName(input) === normalizeDishName(candidate);
}

function isAliasContained(input: string, candidate: string) {
  const normalizedInput = normalizeDishName(input);
  const normalizedCandidate = normalizeDishName(candidate);
  return normalizedInput.includes(normalizedCandidate);
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
