import type { ManpowerRow, MenuItem } from './types';

export type DishManpowerAssignment = {
  dishId: string;
  dishName: string;
  category: string;
  functionLabel: string;
  roles: Array<{
    rowId: string;
    role: string;
    quantity: number;
  }>;
};

export function buildDishManpowerAssignments(
  menu: MenuItem[],
  manpower: ManpowerRow[],
): DishManpowerAssignment[] {
  const activeRows = (Array.isArray(manpower) ? manpower : [])
    .filter((row) => Math.max(0, Number(row.quantity) || 0) > 0);

  return (Array.isArray(menu) ? menu : []).map((dish) => ({
    dishId: dish.id,
    dishName: dish.name || 'Unnamed dish',
    category: dish.category || 'Other',
    functionLabel: [dish.dayLabel, dish.mealLabel]
      .filter(Boolean)
      .join(' - ') || 'Event Menu',
    roles: activeRows
      .filter((row) =>
        (Array.isArray(row.assignedDishIds) ? row.assignedDishIds : [])
          .includes(dish.id),
      )
      .map((row) => ({
        rowId: row.id,
        role: row.role || 'Staff',
        quantity: Math.max(0, Number(row.quantity) || 0),
      })),
  }));
}

export function assignedDishNames(
  row: ManpowerRow,
  menu: MenuItem[],
) {
  const menuNameById = new Map(
    (Array.isArray(menu) ? menu : []).map((dish) => [dish.id, dish.name]),
  );

  return (Array.isArray(row.assignedDishIds) ? row.assignedDishIds : [])
    .map((dishId) => menuNameById.get(dishId))
    .filter((name): name is string => Boolean(name));
}
