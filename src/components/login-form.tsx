"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { loginAction, type AuthActionState } from "@/lib/actions";

type LoginFields = {
  email: string;
  password: string;
};

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const { register } = useForm<LoginFields>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-800">
        User Name
        <input
          {...register("email", { required: true })}
          required
          type="email"
          autoComplete="username"
          placeholder="Enter email address"
          className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[#8b0f2f] focus:ring-2 focus:ring-[#8b0f2f]/15"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-slate-800">
        Password
        <input
          {...register("password", { required: true })}
          required
          type="password"
          autoComplete="current-password"
          placeholder="Enter password"
          className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none transition focus:border-[#8b0f2f] focus:ring-2 focus:ring-[#8b0f2f]/15"
        />
      </label>
      {state.message ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-[#8b0f2f] px-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#650820] disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
