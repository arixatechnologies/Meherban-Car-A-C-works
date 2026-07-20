"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { SpanLoader } from "@/components/span-loader";
import { loginAction, type AuthActionState } from "@/lib/actions";

type LoginFields = {
  email: string;
  password: string;
};

const initialState: AuthActionState = {};

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
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
        <span className="relative block">
          <input
            {...register("password", { required: true })}
            required
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Enter password"
            className={`${showPassword ? "" : "password-mask"} h-11 w-full rounded-lg border border-[#e2beb8] bg-[#fffaf7] px-3 pr-12 text-sm font-semibold text-[#2f1233] outline-none transition placeholder:text-[#a88996] focus:border-[#d97873] focus:ring-2 focus:ring-[#f8cdbf]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            title={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#5a173b] transition hover:bg-[#f6ddd5] focus:outline-none focus:ring-2 focus:ring-[#d97873]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>
      {state.message ? (
        <p className="rounded-lg bg-[#fde2e2] px-3 py-2 text-sm font-bold text-[#9d2f47]">{state.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-label={pending ? "Signing in" : undefined}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-[#5a173b] px-4 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#42102e] disabled:opacity-60"
      >
        {pending ? <SpanLoader size="button" /> : "Login"}
      </button>
    </form>
  );
}
