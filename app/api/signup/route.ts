import { NextResponse } from 'next/server';

import {
  createClientSessionToken,
  getClientCookieName,
} from '../../../lib/clientAuth';

import {
  getAdminCookieName,
} from '../../../lib/adminAuth';

import {
  hashPassword,
} from '../../../lib/passwords';

import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const businessName = String(
      body.businessName || '',
    )
      .trim()
      .replace(/\s+/g, ' ');

    const email = String(
      body.email || '',
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password || '',
    ).trim();

    const confirmPassword = String(
      body.confirmPassword || '',
    ).trim();

    if (
      !businessName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            'Complete all required fields.',
        },
        { status: 400 },
      );
    }

    if (businessName.length > 120) {
      return NextResponse.json(
        {
          error:
            'Business name is too long.',
        },
        { status: 400 },
      );
    }

    const validEmail =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email,
      );

    if (!validEmail) {
      return NextResponse.json(
        {
          error:
            'Enter a valid email address.',
        },
        { status: 400 },
      );
    }

    if (
      password.length < 8 ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            'Password must be 8–128 characters.',
        },
        { status: 400 },
      );
    }

    if (
      password !==
      confirmPassword
    ) {
      return NextResponse.json(
        {
          error:
            'Passwords do not match.',
        },
        { status: 400 },
      );
    }

    const adminEmail =
      process.env.ADMIN_USER_ID
        ?.trim()
        .toLowerCase();

    if (
      adminEmail &&
      email === adminEmail
    ) {
      return NextResponse.json(
        {
          error:
            'This email cannot be used.',
        },
        { status: 409 },
      );
    }

    const existing =
      await prisma.tenant.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            'An account already exists with this email.',
        },
        { status: 409 },
      );
    }

    const tenant =
      await prisma.tenant.create({
        data: {
          name:
            businessName,
          email,
          password:
            hashPassword(
              password,
            ),

          plan: 'FREE',
          status: 'ACTIVE',
          onboardingCompleted: false,
        },

        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          status: true,
        },
      });

    const response =
      NextResponse.json({
        ok: true,

        session: {
          tenantId:
            tenant.id,

          tenantName:
            tenant.name,

          email:
            tenant.email,

          plan:
            tenant.plan,

          status:
            'ACTIVE',
        },
      });

    response.cookies.set({
      name:
        getClientCookieName(),

      value:
        createClientSessionToken(
          tenant.id,
        ),

      httpOnly: true,
      sameSite: 'lax',

      secure:
        process.env.NODE_ENV ===
        'production',

      path: '/',
    });

    response.cookies.set({
      name:
        getAdminCookieName(),

      value: '',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      'Signup error:',
      error,
    );

    return NextResponse.json(
      {
        error:
          'Could not create account.',
      },
      { status: 500 },
    );
  }
}
