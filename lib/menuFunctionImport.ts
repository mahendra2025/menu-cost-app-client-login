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

function menuServiceIdentity(item: MenuItem) {
  if (item.dayLabel || item.mealLabel) {
    return `${normalizeIdentityPart(item.dayLabel || 'event')}::${normalizeIdentityPart(item.mealLabel || 'event menu')}`;
  }

  return normalizeIdentityPart(
    item.serviceId || 'default',
  );
}

export function menuItemIdentity(item: MenuItem) {
  return [
    menuServiceIdentity(item),
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

  const detectedServiceCount =
    new Set(
      detectedMenu.map(
        menuServiceIdentity,
      ),
    ).size;

  const preserveDetectedServices =
    detectedServiceCount > 1;

  const importedMenu =
    detectedMenu.map((item) => {
      const dayLabel =
        item.dayLabel || '';

      if (preserveDetectedServices) {
        const mealLabel =
          String(
            item.mealLabel ||
            cleanedFunctionName ||
            'Event Menu',
          ).trim() ||
          'Event Menu';

        return {
          ...item,
          serviceId:
            String(
              item.serviceId || '',
            ).trim() ||
            `function_${normalizeServicePart(dayLabel)}_${normalizeServicePart(mealLabel)}`,
          dayLabel,
          mealLabel,
          servicePax:
            Math.max(
              0,
              Number(item.servicePax) ||
              functionPax ||
              defaultPax ||
              0,
            ),
        };
      }

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
