import type { MenuItem } from './types';

function normalizeIdentityPart(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeServicePart(value: string) {
  return normalizeIdentityPart(value)
    .replace(/\s+/g, '-') || 'event';
}

export function menuItemIdentity(item: MenuItem) {
  const visibleServiceKey =
    `${normalizeIdentityPart(item.dayLabel || 'event')}::${normalizeIdentityPart(item.mealLabel || 'event menu')}`;

  const serviceKey =
    item.dayLabel || item.mealLabel
      ? visibleServiceKey
      : normalizeIdentityPart(item.serviceId || 'default');

  return [
    serviceKey,
    normalizeIdentityPart(item.name),
    normalizeIdentityPart(item.category),
  ].join('::');
}

export function mergeFunctionMenu({
  existingMenu,
  detectedMenu,
  functionName,
  functionPax,
  defaultPax,
}: {
  existingMenu: MenuItem[];
  detectedMenu: MenuItem[];
  functionName: string;
  functionPax: number;
  defaultPax: number;
}) {
  const cleanedFunctionName =
    functionName.trim();

  const importedMenu =
    detectedMenu.map((item) => {
      const dayLabel =
        item.dayLabel || '';

      return {
        ...item,
        serviceId:
          `function_${normalizeServicePart(dayLabel)}_${normalizeServicePart(cleanedFunctionName)}`,
        dayLabel,
        mealLabel:
          cleanedFunctionName,
        servicePax:
          Math.max(
            0,
            functionPax ||
            Number(item.servicePax) ||
            defaultPax ||
            0,
          ),
      };
    });

  const existingKeys =
    new Set(
      existingMenu.map(
        menuItemIdentity,
      ),
    );

  const newItems =
    importedMenu.filter(
      (item) =>
        !existingKeys.has(
          menuItemIdentity(item),
        ),
    );

  return {
    menu: [
      ...existingMenu,
      ...newItems,
    ],
    newItems,
  };
}
