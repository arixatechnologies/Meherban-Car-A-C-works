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
      <label className="grid gap-2 text-sm font-bold text-[#4b1737]">
        User Name
        <input
          {...register("email", { required: true })}
          required
          type="email"
          autoComplete="username"
          placeholder="Enter email address"
          className="h-11 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]"
        />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[#4b1737]">
        Password
        <input
          {...register("password", { required: true })}
          required
          type="password"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Enter password"
          className="password-mask h-11 rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]"
        />
      </label>
      {state.message ? (
        <p className="rounded-lg bg-[#fde2e2] px-3 py-2 text-sm font-bold text-[#9d2f47]">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-[#5a173b] px-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#42102e] disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
