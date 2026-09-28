"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavMain({
  items,
  label,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    badge?: number
    badgeVariant?: "destructive" | "default" | "secondary" | "outline"
  }[]
  label?: string
}) {
  const pathname = usePathname()

  if (items.length === 0) return null

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {item.icon}
                    <span className="truncate">{item.title}</span>
                  </div>
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${
                        item.badgeVariant === "destructive"
                          ? "bg-rose-500 text-white dark:bg-rose-600 animate-badge-glow-destructive"
                          : item.badgeVariant === "secondary"
                          ? "bg-amber-500 text-white dark:bg-amber-600 animate-badge-glow-secondary"
                          : "bg-primary text-primary-foreground animate-badge-glow-primary"
                      }`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
