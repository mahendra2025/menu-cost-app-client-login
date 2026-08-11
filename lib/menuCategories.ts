export const CATEGORIES = [
  'Welcome Drink', 'Mocktail', 'Soup', 'Starter', 'Chaat', 'Chinese',
  'Italian', 'South Indian', 'Punjabi', 'Paneer', 'Sabji', 'Kathiyawadi',
  'Rajasthani', 'Gujarati', 'North Indian', 'Mughlai', 'Awadhi',
  'Kashmiri', 'Bengali', 'Maharashtrian', 'Sindhi', 'Bihari', 'Odia',
  'Hyderabadi', 'Andhra', 'Kerala', 'Goan', 'Dal / Kadhi', 'Rice',
  'Bread', 'Sweet', 'Ice Cream', 'Salad', 'Papad', 'Farsan', 'Beverage',
  'Live Counter', 'Snacks', 'Sandwich', 'Pizza', 'Pasta', 'Continental',
  'Mexican', 'Thai', 'Lebanese', 'Sizzler', 'Street Food', 'Tandoor',
  'Fusion', 'Main Course', 'Jain', 'Satvik', 'Vegan', 'Kids', 'Fruit',
  'Bakery', 'Raita', 'Pickle', 'Dry Fruit', 'Paan', 'Mukhwas',
  'Condiments', 'Other',
] as const;

export type Category =
  (typeof CATEGORIES)[number];
