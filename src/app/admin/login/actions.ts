'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOGIN_NOT_CONFIGURED, attemptLogin } from '@/lib/admin/login';
import { clientIpFrom } from '@/lib/admin/rate-limit';
import { prismaAttemptStore } from '@/lib/admin/rate-limit-db';
import { safeNext } from '@/lib/admin/redirect';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/admin/session';

export type LoginState = { error?: string };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const result = await attemptLogin({
    password: String(formData.get('password') ?? ''),
    ip: clientIpFrom(await headers()),
    secret: process.env.SESSION_SECRET ?? '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
    store: prismaAttemptStore(),
  });

  if (!result.ok) {
    if (result.error === LOGIN_NOT_CONFIGURED) {
      console.error('Admin login is not configured: set SESSION_SECRET and ADMIN_PASSWORD_HASH (see docs/admin-setup.md).');
    }
    return { error: result.error };
  }

  (await cookies()).set(SESSION_COOKIE, result.token, sessionCookieOptions(process.env.NODE_ENV === 'production'));
  redirect(safeNext(String(formData.get('next') ?? '')));
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/admin/login');
}
