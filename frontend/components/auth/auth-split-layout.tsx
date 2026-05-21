import { AuthBrandPanel } from "./auth-brand-panel";
import { AuthFormPanel } from "./auth-form-panel";

export function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-page flex min-h-screen min-h-[100dvh] flex-col lg:flex-row">
      <AuthBrandPanel />
      <AuthFormPanel>{children}</AuthFormPanel>
    </div>
  );
}
