"use client";

import * as React from "react";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { School, Phone, Mail, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VerificationStepperItemProps {
  stepNumber?: number | string | React.ReactNode;
  stepNodeClassName?: string;
  categoryTitle: string;
  categoryIcon?: React.ReactNode;
  categoryTitleClassName?: string;
  badgeLabel?: string;
  badgeClassName?: string;
  name?: string;
  photo?: string | null;
  avatarRingClassName?: string;
  subTitle?: React.ReactNode;
  location?: string;
  phone?: string | null;
  email?: string | null;
  institution?: string;
  institutionIcon?: React.ReactNode;
  statusSlot?: React.ReactNode;
  extraHeaderSlot?: React.ReactNode;
}

export function VerificationStepperItem({
  stepNumber,
  stepNodeClassName = "border-primary text-primary",
  categoryTitle,
  categoryIcon,
  categoryTitleClassName = "text-muted-foreground",
  badgeLabel,
  badgeClassName,
  name,
  photo,
  avatarRingClassName = "ring-primary/30",
  subTitle,
  location,
  phone,
  email,
  institution,
  institutionIcon = <School className="h-3.5 w-3.5 shrink-0" />,
  statusSlot,
  extraHeaderSlot,
}: VerificationStepperItemProps) {
  return (
    <div className="relative group">
      {/* Step Node Indicator */}
      {stepNumber !== undefined && (
        <div
          className={cn(
            "absolute -left-[30px] top-0 size-6 rounded-full bg-background border-2 flex items-center justify-center text-[11px] font-bold shadow-xs",
            stepNodeClassName
          )}
        >
          {stepNumber}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
              categoryTitleClassName
            )}
          >
            {categoryIcon}
            {categoryTitle}
          </span>
          <div className="flex items-center gap-1.5">
            {extraHeaderSlot}
            {badgeLabel && (
              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-semibold", badgeClassName)}>
                {badgeLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3.5 pt-1">
          <UserAvatar
            name={name || "Pengguna"}
            src={photo || undefined}
            className={cn("size-14 shrink-0 ring-2 ring-offset-2 ring-offset-background rounded-full", avatarRingClassName)}
            previewable
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h4 className="text-sm font-bold truncate leading-tight text-foreground">
              {name || "N/A"}
            </h4>

            {subTitle && (
              <div className="text-xs text-muted-foreground truncate font-medium">
                {subTitle}
              </div>
            )}

            {institution && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 font-medium">
                {institutionIcon}
                <span className="truncate">{institution}</span>
              </p>
            )}

            {location && (
              <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span>Desa {location}</span>
              </p>
            )}

            {statusSlot}

            {phone && (
              <p className="text-[11px] text-muted-foreground/90 truncate flex items-center gap-1 pt-0.5">
                <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="font-mono">{phone}</span>
              </p>
            )}

            {email && (
              <p className="text-[11px] text-muted-foreground/80 truncate flex items-center gap-1">
                <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate">{email}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
