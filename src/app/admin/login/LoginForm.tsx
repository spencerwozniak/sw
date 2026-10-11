'use client';

import { useActionState } from 'react';
import { Button, Input } from '@/components/ui';
import { loginAction, type LoginState } from './actions';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      <Input label="Password" type="password" name="password" placeholder="Password" autoComplete="current-password" autoFocus required />
      {state.error && (
        <p role="alert" className="font-sans text-[0.875rem] text-fg">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="primary" fullWidth disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
