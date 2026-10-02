import { cookies } from 'next/headers';
import { getClientCookieName, readClientSessionToken } from './clientAuth';
import { prisma } from './prisma';

export async function requireClientTenantId() {
  const cookieStore = await cookies();
  const tenantId = readClientSessionToken(
    cookieStore.get(getClientCookieName())?.value,
  );

  if (!tenantId) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      status: true,
    },
  });

  if (
    !tenant ||
    String(tenant.status || '').toUpperCase() !== 'ACTIVE'
  ) {
    return null;
  }

  return tenant.id;
}
