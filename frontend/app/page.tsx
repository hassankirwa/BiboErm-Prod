"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Mail } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/workspace");
  };

  return (
    <AuthSplitLayout>
      <header className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          Sign in
        </h2>
        <p className="mt-1.5 text-sm text-neutral-500">
          Use your Bibo work account.
        </p>
      </header>

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium text-foreground"
          >
            <span className="lg:hidden">Email</span>
            <span className="hidden lg:inline">Email address</span>
          </label>
          <div className="login-field login-field-email group relative">
            <input
              id="email"
              type="email"
              placeholder="you@bibo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="login-input pr-11"
            />
            <Mail
              className="pointer-events-none absolute right-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground/50"
              aria-hidden
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="login-field relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-[18px]" />
              ) : (
                <Eye className="size-[18px]" />
              )}
            </button>
          </div>
        </div>

        <div className="login-options-row hidden items-center justify-between pt-1 lg:flex">
          <div className="flex items-center gap-2.5">
            <Checkbox id="remember" className="border-border" />
            <label
              htmlFor="remember"
              className="cursor-pointer text-sm text-muted-foreground/90"
            >
              Keep me signed in
            </label>
          </div>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary/90"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "login-submit-btn flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60",
            "mt-1 lg:mt-2"
          )}
        >
          {isLoading ? "Signing in..." : "Sign In"}
          {!isLoading && (
            <ArrowRight className="size-4 max-lg:hidden" aria-hidden />
          )}
        </button>

        <p className="login-mobile-forgot text-center lg:hidden">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary/90"
          >
            Forgot password?
          </Link>
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-neutral-500">
        Need access?{" "}
        <Link
          href="/recover-email"
          className="font-medium text-primary hover:text-primary/90"
        >
          Contact IT Admin
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
