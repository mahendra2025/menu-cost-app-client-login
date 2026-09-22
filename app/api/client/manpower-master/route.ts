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
  readManpowerMaster,
} from '../../../../lib/manpowerMasterServer';

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
      await readManpowerMaster();

    return NextResponse.json(
      master,
    );
  } catch (error) {
    console.error(
      'Client Manpower Master GET:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Failed to load manpower master.',
      },
      {
        status: 500,
      },
    );
  }
}
