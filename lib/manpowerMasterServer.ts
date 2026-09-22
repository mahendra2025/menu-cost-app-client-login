import {
  DEFAULT_MANPOWER_RULES,
  normalizeManpowerRules,
  type ManpowerRuleConfig,
} from './manpowerMaster';

import {
  prisma,
} from './prisma';

export async function readManpowerMaster() {
  const setting =
    await prisma.manpowerMasterSetting.findUnique({
      where: {
        id: 'global',
      },
    });

  return {
    rules:
      normalizeManpowerRules(
        setting?.rules as
          | Partial<ManpowerRuleConfig>
          | undefined,
      ),

    updatedAt:
      setting?.updatedAt
        ?.toISOString() ??
      null,
  };
}

export async function saveManpowerMaster(
  rulesInput:
    Partial<ManpowerRuleConfig>,
) {
  const rules =
    normalizeManpowerRules(
      rulesInput,
    );

  const setting =
    await prisma.manpowerMasterSetting.upsert({
      where: {
        id: 'global',
      },

      create: {
        id: 'global',
        rules,
      },

      update: {
        rules,
      },
    });

  return {
    rules,
    updatedAt:
      setting.updatedAt
        .toISOString(),
  };
}

export async function ensureManpowerMaster() {
  const existing =
    await prisma.manpowerMasterSetting.findUnique({
      where: {
        id: 'global',
      },
      select: {
        id: true,
      },
    });

  if (existing) {
    return;
  }

  await prisma.manpowerMasterSetting.create({
    data: {
      id: 'global',
      rules:
        DEFAULT_MANPOWER_RULES,
    },
  });
}
