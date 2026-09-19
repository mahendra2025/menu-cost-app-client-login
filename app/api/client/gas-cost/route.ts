import {
  cookies,
} from 'next/headers';
import {
  NextResponse,
} from 'next/server';

import {
  getClientCookieName,
  readClientSessionToken,
} from '../../../../lib/clientAuth';

import {
  readGasCostMaster,
} from '../../../../lib/gasCostMasterServer';

export async function GET() {
  try {
    const cookieStore =
      await cookies();

    const tenantId =
      readClientSessionToken(
        cookieStore.get(
          getClientCookieName(),
        )?.value,
      );

    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'Client login required',
        },
        {
          status: 401,
        },
      );
    }

    const master =
      await readGasCostMaster({
        includeInactive:
          false,
        includeDishOverrides:
          true,
      });

    return NextResponse.json(
      master,
    );
  } catch (error) {
    console.error(
      'Client Gas Cost GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load gas cost master.',
      },
      {
        status: 500,
      },
    );
  }
}
