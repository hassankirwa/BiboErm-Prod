"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, MessageSquare, HelpCircle, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";

function SearchField({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects, clients, documents..."
          className="h-9 w-full rounded-full border-border bg-muted/40 pl-9 pr-3 text-sm md:pr-14"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground lg:inline-block">
          ⌘ K
        </kbd>
      </div>
    </div>
  );
}

export function AppTopbar() {
  const router = useRouter();
  const { user, roles, logout, homeRoute } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const roleLabel = roles[0]?.replace(/_/g, " ") ?? "User";

  return (
    <header className="sticky top-0 z-40 w-full max-w-full shrink-0 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center gap-2 overflow-hidden px-3 sm:gap-3 sm:px-4">
        <SidebarTrigger className="shrink-0 md:hidden" />

        <Link href={homeRoute} className="flex min-w-0 shrink-0 items-center">
          <Image
            src="/image.png"
            alt="BIBO Windows & Doors"
            width={140}
            height={40}
            className="h-7 w-auto max-w-[120px] object-contain sm:h-8 sm:max-w-none"
            priority
          />
        </Link>

        <SearchField className="mx-auto hidden min-w-0 max-w-xl flex-1 md:block" />

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0" asChild>
            <Link href="/notifications">
              <Bell className="h-4 w-4" />
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
              >
                7
              </Badge>
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative hidden h-9 w-9 shrink-0 sm:inline-flex"
          >
            <MessageSquare className="h-4 w-4" />
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px]"
            >
              3
            </Badge>
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-9 w-9 shrink-0 sm:inline-flex">
            <HelpCircle className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex shrink-0 items-center gap-1 rounded-[5px] px-1 py-1 hover:bg-muted/60 sm:gap-2 sm:px-2">
                <UserAvatar
                  name={user?.name ?? "User"}
                  src={user?.avatar_url}
                  className="h-8 w-8"
                />
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium leading-none">{user?.name ?? "User"}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{roleLabel}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/workspace/settings">Profile & settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SearchField className="border-t border-border/60 px-3 py-2.5 md:hidden" />
    </header>
  );
}
