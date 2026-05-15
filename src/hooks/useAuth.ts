import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (!error && data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: { message: "Este e-mail já está cadastrado. Faça login ou recupere sua senha.", code: "email_exists" } };
    }
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already")) {
        return { error: { ...error, message: "Este e-mail já está cadastrado. Faça login ou recupere sua senha." } };
      }
    }
    return { error };
  };

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }).then((r) => ({ error: r.error }));

  const signOut = () => supabase.auth.signOut();

  const resetPassword = (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }).then((r) => ({ error: r.error }));

  const updatePassword = (password: string) =>
    supabase.auth.updateUser({ password }).then((r) => ({ error: r.error }));

  const resendConfirmationEmail = (email: string) =>
    supabase.auth.resend({ type: "signup", email }).then((r) => ({ error: r.error }));

  return { user, session, loading, signUp, signIn, signOut, resetPassword, updatePassword, resendConfirmationEmail };
}