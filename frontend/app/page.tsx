"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

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
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <Image
        src="/background.jpeg"
        alt=""
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-white/50" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="liquid-glass px-6 py-8 sm:px-8">
          <div className="liquid-glass-shine" aria-hidden />
          <div className="liquid-glass-glow" aria-hidden />
          <div className="liquid-glass-content">
          <div className="mb-6 flex justify-center">
            <Image
              src="/image.png"
              alt="BIBO Windows & Doors"
              width={300}
              height={80}
              className="h-auto w-full max-w-[280px] object-contain drop-shadow-sm"
              priority
            />
          </div>

          <Card className="gap-4 border-0 bg-transparent py-0 shadow-none">
            <CardHeader className="space-y-1 px-0 pb-2">
              <CardTitle className="text-xl font-semibold text-foreground">
                Sign in
              </CardTitle>
              <CardDescription className="text-foreground/70">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="liquid-glass-input h-9 rounded-[10px]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-foreground/70 hover:text-primary"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="liquid-glass-input h-9 pr-10 rounded-[10px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                className="w-full h-9 rounded-[10px]"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

          <p className="mt-5 text-center text-xs text-foreground/70">
            {"Don't have an account? "}
            <Button variant="link" className="h-auto p-0 text-xs text-primary">
              Contact administrator
            </Button>
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
