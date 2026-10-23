import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { rpc } from './lib/supabase';
import { useOps } from './store';
import { appBase } from './lib/repository';
import { Button, Field, Callout, Loader, BrandLockup, I } from './ui';
export function ConnectionGate() {
  const { connection, connectionError, reload, session, signOut, navigate } = useOps();
  const [view, setView] = useState(location.hash === '#SignUp' ? 'signup' : 'signin'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [f, setF] = useState({ name: '', email: '', password: '', slug: '' });
  const set = (key, value) => setF((p) => ({ ...p, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (connection === 'onboarding' && view !== 'recovery' && location.hash !== '#Recovery') {
        await rpc('jastip_create_workspace', { p_name: f.name, p_slug: f.slug });
        navigate('Welcome');
        await reload();
      } else if (view === 'signup') {
        const { data: authData, error } = await supabase.auth.signUp({
          email: f.email,
          password: f.password,
          options: { data: { name: f.name }, emailRedirectTo: appBase() },
        });
        if (error) throw error;
        if (authData?.session) {
          await reload();
        } else {
          setMessage('Check your email to verify your account, then sign in.');
        }
      } else if (view === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email, {
          redirectTo: appBase() + '#Recovery',
        });
        if (error) throw error;
        setMessage('If this email has an account, a password reset link is on its way.');
      } else if (view === 'recovery' || location.hash === '#Recovery') {
        const { error } = await supabase.auth.updateUser({ password: f.password });
        if (error) throw error;
        sessionStorage.removeItem('jastip-password-recovery');
        location.hash = 'Overview';
        await reload();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: f.email,
          password: f.password,
        });
        if (error) throw error;
        await reload();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const recovery = view === 'recovery' || location.hash === '#Recovery';
  const onboarding = connection === 'onboarding' && !recovery;
  const waiting = connection === 'loading';
  const setup = connection === 'unconfigured';
  const failed = connection === 'error';
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <BrandLockup height={26} />
        </div>
        <h1>
          {waiting
            ? 'Connecting your workspace'
            : setup
              ? 'Connect Supabase'
              : failed
                ? 'Connection needs attention'
                : onboarding
                  ? 'Create your workspace'
                  : recovery
                    ? 'Set a new password'
                    : view === 'signup'
                      ? 'Create your account'
                      : view === 'reset'
                        ? 'Reset your password'
                        : 'Welcome back'}
        </h1>
        <p>
          {setup
            ? 'This build has no Supabase settings. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the hosting environment, then redeploy.'
            : onboarding
              ? 'Start with a clean workspace. No sample customers or orders will be added.'
              : 'Your orders, trips and pricing, together in one place.'}
        </p>
        {failed ? (
          <>
            <Callout>{connectionError}</Callout>
            <Button primary onClick={reload}>
              Retry connection
            </Button>
          </>
        ) : waiting ? (
          <Loader brand label="Getting your workspace ready…" />
        ) : setup ? (
          <pre>VITE_SUPABASE_URL=…{'\n'}VITE_SUPABASE_PUBLISHABLE_KEY=…</pre>
        ) : (
          <form onSubmit={submit}>
            {(view === 'signup' || onboarding) && (
              <Field label={onboarding ? 'Workspace name' : 'Your name'}>
                <input
                  required
                  maxLength="120"
                  value={f.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
            )}
            {onboarding ? (
              <Field label="Storefront URL name" hint="3–60 lowercase letters, numbers or hyphens.">
                <input
                  required
                  pattern="[a-z0-9][a-z0-9-]{2,59}"
                  value={f.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="my-travel-finds"
                />
              </Field>
            ) : (
              <>
                {!recovery && (
                  <Field label="Email address">
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      value={f.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                  </Field>
                )}
                {view !== 'reset' && (
                  <Field
                    label="Password"
                    hint={view === 'signup' || recovery ? 'Use at least 12 characters.' : undefined}
                  >
                    <input
                      required
                      type="password"
                      minLength={view === 'signup' || recovery ? 12 : 1}
                      autoComplete={
                        view === 'signup' || recovery ? 'new-password' : 'current-password'
                      }
                      value={f.password}
                      onChange={(e) => set('password', e.target.value)}
                    />
                  </Field>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="auth-message">
                {message}
              </p>
            )}
            <Button primary type="submit" disabled={busy}>
              {busy
                ? 'Please wait…'
                : onboarding
                  ? 'Create workspace'
                  : recovery
                    ? 'Save password'
                    : view === 'signup'
                      ? 'Create account'
                      : view === 'reset'
                        ? 'Send reset link'
                        : 'Sign in'}
            </Button>
          </form>
        )}
        {!waiting && !setup && !failed && !onboarding && !recovery && (
          <div className="auth-actions">
            <button
              className="text-btn"
              onClick={() => {
                setView(view === 'signup' ? 'signin' : 'signup');
                setError('');
                setMessage('');
              }}
            >
              {view === 'signup' ? 'Already have an account? Sign in' : 'Create an account'}
            </button>
            <button
              className="text-btn"
              onClick={() => setView(view === 'reset' ? 'signin' : 'reset')}
            >
              {view === 'reset' ? 'Back to sign in' : 'Forgot password?'}
            </button>
          </div>
        )}
        {connection === 'signedout' && !recovery && (
          <button className="text-btn auth-home" onClick={() => (location.hash = 'Home')}>
            <I name="ChevronLeft" size={13} /> About Bawa
          </button>
        )}
        {session && (
          <button className="text-btn" onClick={signOut}>
            Sign out
          </button>
        )}
      </section>
    </main>
  );
}
