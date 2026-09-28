"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationNavItemProps {
  href: string;
  icon: React.ReactNode;
  iconContainerClassName?: string;
  title: string;
  description: string;
  count?: number;
  badgeVariant?: "primary" | "destructive" | "amber";
  onClick?: () => void;
}

export function NotificationNavItem({
  href,
  icon,
  iconContainerClassName = "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  title,
  description,
  count = 0,
  badgeVariant = "primary",
  onClick,
}: NotificationNavItemProps) {
  const getBadgeClass = () => {
    switch (badgeVariant) {
      case "destructive":
        return "bg-rose-500 text-white";
      case "amber":
        return "bg-amber-500 text-white";
      case "primary":
      default:
        return "bg-primary text-primary-foreground";
    }
  };

  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between p-2.5 rounded-md hover:bg-accent/60 transition-colors text-sm group"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div
          className={cn(
            "p-2 rounded-lg transition-colors shrink-0",
            iconContainerClassName
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-xs sm:text-sm leading-none truncate">{title}</p>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
            {description}
          </p>
        </div>
      </div>
      {typeof count === "number" && count > 0 ? (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-semibold rounded-full shrink-0",
            getBadgeClass()
          )}
        >
          {count}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground shrink-0">0</span>
      )}
    </Link>
  );
}
