"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName, resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({ name, src, className, fallbackClassName }: UserAvatarProps) {
  const resolved = resolveMediaUrl(src);

  return (
    <Avatar className={className}>
      {resolved ? (
        <AvatarImage src={resolved} alt={name} referrerPolicy="no-referrer" />
      ) : null}
      <AvatarFallback className={cn("bg-primary text-primary-foreground text-xs", fallbackClassName)}>
        {initialsFromName(name)}
      </AvatarFallback>
    </Avatar>
  );
}
