export type SabjiGasSuggestion = {
  kgPer100: number;
  group: string;
  noGas: false;
};

function key(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function suggestion(
  kgPer100: number,
  group: string,
): SabjiGasSuggestion {
  return {
    kgPer100,
    group,
    noGas: false,
  };
}

const EXACT_SABJI_GAS:
  Record<string, SabjiGasSuggestion> = {
    'mix veg dry': suggestion(0.75, 'Dry Sabji'),
    'veg kolhapuri': suggestion(1.15, 'Gravy Sabji'),
    'navratan korma': suggestion(1.20, 'Rich Gravy'),
    'dum aloo': suggestion(1.15, 'Dum Gravy'),
    'aloo gobhi matar': suggestion(0.85, 'Dry / Semi Gravy'),
    'aloo gobi matar': suggestion(0.85, 'Dry / Semi Gravy'),
    'bhindi masala': suggestion(0.85, 'Dry / Semi Gravy'),
    'baingan bharta': suggestion(1.20, 'Roast + Gravy'),
    'methi malai matar': suggestion(1.00, 'Cream Gravy'),
    'kaju curry': suggestion(1.15, 'Rich Gravy'),
    'veg jalfrezi': suggestion(0.90, 'Semi Gravy'),
    'corn palak': suggestion(0.95, 'Leafy Gravy'),
    'sev tameta': suggestion(0.85, 'Quick Gravy'),
    'tindora masala': suggestion(0.75, 'Dry Sabji'),
    'aloo jeera': suggestion(0.65, 'Dry Sabji'),
    'lauki chana dal': suggestion(1.05, 'Dal + Sabji'),
    'mushroom masala': suggestion(0.95, 'Semi Gravy'),
    'mushroom matar': suggestion(0.90, 'Semi Gravy'),
    'aloo matar': suggestion(0.80, 'Semi Gravy'),
    'bharwa bhindi': suggestion(0.95, 'Stuffed Sabji'),
    'aloo baingan': suggestion(0.85, 'Dry / Semi Gravy'),
    'veg handi': suggestion(1.10, 'Gravy Sabji'),
    'ringna bateta nu shaak': suggestion(0.85, 'Gujarati Shaak'),
    'valor papdi bateta nu shaak': suggestion(0.85, 'Gujarati Shaak'),
    'guvar dhokli nu shaak': suggestion(1.05, 'Gujarati Shaak'),
    'dudhi muthiya nu shaak': suggestion(1.15, 'Steamed + Gravy'),
    'bateta sukhi bhaji': suggestion(0.65, 'Dry Sabji'),
    'karela bateta nu shaak': suggestion(0.80, 'Gujarati Shaak'),
    'bhinda sambhariya': suggestion(0.90, 'Stuffed Sabji'),
    'bharwa ringna gujarati style': suggestion(0.95, 'Stuffed Sabji'),
    'choli bateta nu shaak': suggestion(0.90, 'Gujarati Shaak'),
    'paneer butter masala': suggestion(1.20, 'Paneer Gravy'),
    'kadai paneer': suggestion(1.15, 'Paneer Gravy'),
    'shahi paneer': suggestion(1.20, 'Rich Paneer Gravy'),
    'paneer tikka masala': suggestion(1.30, 'Tikka + Gravy'),
    'paneer lababdar': suggestion(1.20, 'Paneer Gravy'),
    'paneer do pyaza': suggestion(1.10, 'Paneer Gravy'),
    'paneer pasanda': suggestion(1.30, 'Stuffed Paneer Gravy'),
    'palak paneer': suggestion(1.15, 'Leafy Paneer Gravy'),
    'paneer methi malai': suggestion(1.10, 'Cream Paneer Gravy'),
    'achari paneer': suggestion(1.10, 'Paneer Gravy'),
    'achari aloo': suggestion(0.85, 'Semi Gravy'),
    'achari baingan': suggestion(0.90, 'Semi Gravy'),
    'adraki gobi': suggestion(0.80, 'Dry / Semi Gravy'),
    'aloo beans': suggestion(0.70, 'Dry Sabji'),
    'aloo capsicum': suggestion(0.75, 'Dry Sabji'),
    'aloo do pyaza': suggestion(0.80, 'Semi Gravy'),
    'aloo fry': suggestion(0.75, 'Dry / Fry'),
    'aloo masala': suggestion(0.85, 'Semi Gravy'),
    'aloo methi': suggestion(0.75, 'Dry Sabji'),
    'aloo palak': suggestion(0.85, 'Leafy Sabji'),
    'aloo parwal': suggestion(0.85, 'Dry / Semi Gravy'),
    'aloo shimla mirch': suggestion(0.75, 'Dry Sabji'),
    'aloo tamatar': suggestion(0.85, 'Quick Gravy'),
    'baby corn masala': suggestion(0.90, 'Semi Gravy'),
    'baby corn mushroom masala': suggestion(1.00, 'Semi Gravy'),
    'baby potato masala': suggestion(0.90, 'Semi Gravy'),
    'badami vegetable curry': suggestion(1.15, 'Rich Gravy'),
    'bagara baingan': suggestion(1.10, 'Rich Gravy'),
    'baingan aloo': suggestion(0.85, 'Dry / Semi Gravy'),
    'baingan masala': suggestion(0.95, 'Semi Gravy'),
    'baingan matar': suggestion(0.90, 'Semi Gravy'),
    'banana kofta curry': suggestion(1.45, 'Kofta + Gravy'),
    'banarasi dum aloo': suggestion(1.20, 'Dum Gravy'),
    'bathua aloo': suggestion(0.80, 'Leafy Sabji'),
    'beans carrot sabji': suggestion(0.70, 'Dry Sabji'),
    'beans coconut sabji': suggestion(0.75, 'Dry Sabji'),
    'bharwa baingan': suggestion(1.00, 'Stuffed Sabji'),
    'bharwa capsicum': suggestion(1.05, 'Stuffed Sabji'),
    'bharwa parwal': suggestion(1.05, 'Stuffed Sabji'),
    'bharwa tinda': suggestion(1.05, 'Stuffed Sabji'),
    'bhindi aloo': suggestion(0.75, 'Dry Sabji'),
    'bhindi do pyaza': suggestion(0.85, 'Semi Gravy'),
    'bhindi fry': suggestion(0.80, 'Dry / Fry'),
    'broccoli corn sabji': suggestion(0.75, 'Dry Sabji'),
    'broccoli kaju masala': suggestion(1.00, 'Rich Semi Gravy'),
    'broccoli masala': suggestion(0.90, 'Semi Gravy'),
    'broccoli mushroom masala': suggestion(1.00, 'Semi Gravy'),
    'cabbage capsicum sabji': suggestion(0.70, 'Dry Sabji'),
    'cabbage kofta curry': suggestion(1.45, 'Kofta + Gravy'),
    'cabbage peas sabji': suggestion(0.70, 'Dry Sabji'),
    'cabbage potato sabji': suggestion(0.75, 'Dry Sabji'),
    'capsicum corn masala': suggestion(0.85, 'Semi Gravy'),
    'capsicum do pyaza': suggestion(0.85, 'Semi Gravy'),
    'capsicum masala': suggestion(0.90, 'Semi Gravy'),
    'chaulai sabji': suggestion(0.80, 'Leafy Sabji'),
    'cheese kofta curry': suggestion(1.50, 'Kofta + Gravy'),
    'cluster beans sabji': suggestion(0.75, 'Dry Sabji'),
    'corn capsicum': suggestion(0.80, 'Dry / Semi Gravy'),
    'corn kofta curry': suggestion(1.45, 'Kofta + Gravy'),
    'corn masala': suggestion(0.90, 'Semi Gravy'),
    'corn methi malai': suggestion(1.00, 'Cream Gravy'),
    'dry fruit curry': suggestion(1.20, 'Rich Gravy'),
    'dry fruit kofta curry': suggestion(1.55, 'Kofta + Rich Gravy'),
    'french beans aloo': suggestion(0.70, 'Dry Sabji'),
    'french beans masala': suggestion(0.80, 'Dry / Semi Gravy'),
    'gawar aloo': suggestion(0.75, 'Dry Sabji'),
    'gobi do pyaza': suggestion(0.85, 'Semi Gravy'),
    'gobi kaju masala': suggestion(1.00, 'Rich Semi Gravy'),
    'gobi masala': suggestion(0.90, 'Semi Gravy'),
  };

/**
 * Starter LPG estimates per 100 guests.
 * They are deliberately cooking-method based and remain editable.
 * Real measured burner profiles or saved dish values always take priority.
 */
export function suggestSabjiGas(
  dishName: string,
): SabjiGasSuggestion {
  const name = key(dishName);
  const exact = EXACT_SABJI_GAS[name];

  if (exact) {
    return exact;
  }

  if (
    name.includes('kofta')
  ) {
    return suggestion(
      name.includes('dry fruit') ||
      name.includes('cheese')
        ? 1.50
        : 1.45,
      'Kofta + Gravy',
    );
  }

  if (
    name.includes('paneer tikka')
  ) {
    return suggestion(
      1.30,
      'Tikka + Gravy',
    );
  }

  if (
    name.includes('paneer')
  ) {
    return suggestion(
      1.15,
      'Paneer Gravy',
    );
  }

  if (
    name.includes('dum ')
  ) {
    return suggestion(
      1.20,
      'Dum Gravy',
    );
  }

  if (
    name.includes('bharwa') ||
    name.includes('stuffed') ||
    name.includes('sambhariya')
  ) {
    return suggestion(
      1.00,
      'Stuffed Sabji',
    );
  }

  if (
    name.includes('bharta')
  ) {
    return suggestion(
      1.20,
      'Roast + Gravy',
    );
  }

  if (
    name.includes('malai') ||
    name.includes('korma') ||
    name.includes('badami') ||
    name.includes('kaju') ||
    name.includes('dry fruit') ||
    name.includes('shahi')
  ) {
    return suggestion(
      1.15,
      'Rich Gravy',
    );
  }

  if (
    name.includes('palak') ||
    name.includes('methi') ||
    name.includes('bathua') ||
    name.includes('chaulai')
  ) {
    return suggestion(
      0.90,
      'Leafy Sabji',
    );
  }

  if (
    name.includes('fry')
  ) {
    return suggestion(
      0.80,
      'Dry / Fry',
    );
  }

  if (
    name.includes('sukhi') ||
    name.includes('dry') ||
    name.includes('jeera')
  ) {
    return suggestion(
      0.70,
      'Dry Sabji',
    );
  }

  if (
    name.includes('curry') ||
    name.includes('masala') ||
    name.includes('handi') ||
    name.includes('tamatar') ||
    name.includes('tameta') ||
    name.includes('do pyaza')
  ) {
    return suggestion(
      0.95,
      'Gravy / Semi Gravy',
    );
  }

  return suggestion(
    1.00,
    'Sabji Default',
  );
}
