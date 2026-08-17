'use client';

import { useEffect, type ReactNode } from 'react';

const CREATE_CATEGORY_VALUE = '__cost_create_category__';
const CREATE_CATEGORY_LABEL = '+ Create new category…';

function cleanCategory(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function setSelectValue(
  select: HTMLSelectElement,
  value: string,
) {
  const setter =
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value',
    )?.set;

  if (setter) {
    setter.call(select, value);
  } else {
    select.value = value;
  }
}

export default function CostLayout({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    let frame = 0;

    const getSelects = () =>
      Array.from(
        document.querySelectorAll<HTMLSelectElement>(
          'select.dish-category-select',
        ),
      );

    const addOption = (
      select: HTMLSelectElement,
      category: string,
    ) => {
      const exists = Array.from(
        select.options,
      ).some(
        (option) =>
          option.value
            .toLowerCase() ===
          category.toLowerCase(),
      );

      if (exists) return;

      const option =
        document.createElement('option');

      option.value = category;
      option.textContent = category;

      const createOption =
        Array.from(
          select.options,
        ).find(
          (item) =>
            item.value ===
            CREATE_CATEGORY_VALUE,
        );

      if (createOption) {
        select.insertBefore(
          option,
          createOption,
        );
      } else {
        select.appendChild(option);
      }
    };

    const handleChange = (
      event: Event,
    ) => {
      const select =
        event.currentTarget as HTMLSelectElement;

      if (
        select.value !==
        CREATE_CATEGORY_VALUE
      ) {
        select.dataset.previousCategory =
          select.value;

        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      const previous =
        select.dataset.previousCategory ||
        '';

      const entered =
        window.prompt(
          'Enter new dish category name:',
        );

      if (entered === null) {
        setSelectValue(
          select,
          previous,
        );
        return;
      }

      const category =
        cleanCategory(entered);

      if (!category) {
        window.alert(
          'Category name cannot be empty.',
        );

        setSelectValue(
          select,
          previous,
        );
        return;
      }

      if (category.length > 60) {
        window.alert(
          'Category name must be 60 characters or less.',
        );

        setSelectValue(
          select,
          previous,
        );
        return;
      }

      const existing =
        getSelects()
          .flatMap((item) =>
            Array.from(
              item.options,
            ),
          )
          .find(
            (option) =>
              option.value !==
                CREATE_CATEGORY_VALUE &&
              option.value.toLowerCase() ===
                category.toLowerCase(),
          )?.value;

      const finalCategory =
        existing || category;

      for (
        const item of getSelects()
      ) {
        addOption(
          item,
          finalCategory,
        );
      }

      setSelectValue(
        select,
        finalCategory,
      );

      select.dataset.previousCategory =
        finalCategory;

      select.dispatchEvent(
        new Event('change', {
          bubbles: true,
        }),
      );
    };

    const enhance = () => {
      const selects = getSelects();

      const categories =
        new Set<string>();

      for (const select of selects) {
        for (
          const option of
            Array.from(
              select.options,
            )
        ) {
          if (
            option.value &&
            option.value !==
              CREATE_CATEGORY_VALUE
          ) {
            categories.add(
              option.value,
            );
          }
        }
      }

      for (const select of selects) {
        if (
          select.value !==
          CREATE_CATEGORY_VALUE
        ) {
          select.dataset.previousCategory =
            select.value;
        }

        for (
          const category of
            categories
        ) {
          addOption(
            select,
            category,
          );
        }

        const alreadyHasCreate =
          Array.from(
            select.options,
          ).some(
            (option) =>
              option.value ===
              CREATE_CATEGORY_VALUE,
          );

        if (!alreadyHasCreate) {
          const option =
            document.createElement(
              'option',
            );

          option.value =
            CREATE_CATEGORY_VALUE;

          option.textContent =
            CREATE_CATEGORY_LABEL;

          select.appendChild(option);
        }

        if (
          select.dataset
            .categoryCreator !==
          'true'
        ) {
          select.dataset.categoryCreator =
            'true';

          select.addEventListener(
            'change',
            handleChange,
            true,
          );
        }
      }
    };

    const scheduleEnhance = () => {
      if (frame) return;

      frame =
        window.requestAnimationFrame(
          () => {
            frame = 0;
            enhance();
          },
        );
    };

    enhance();

    const observer =
      new MutationObserver(
        scheduleEnhance,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      observer.disconnect();

      if (frame) {
        cancelAnimationFrame(
          frame,
        );
      }
    };
  }, []);

  return <>{children}</>;
}
