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
      email: "admin@meherbanacworks.com",
      password: "admin12345",
    },
  });

  return (
    <form action={formAction} className="grid gap-4">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Email
        <input
          {...register("email", { required: true })}
          required
          type="email"
          className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Password
        <input
          {...register("password", { required: true })}
          required
          type="password"
          className="h-11 rounded-lg border border-slate-300 px-3 text-sm text-slate-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </label>
      {state.message ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Login"}
      </button>
    </form>
  );
}
