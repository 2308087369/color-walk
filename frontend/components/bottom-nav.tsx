"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Palette, Sparkles, Camera, Home, Trophy } from "lucide-react";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/colors", label: "色卡", icon: Palette },
  { href: "/draw", label: "抽色", icon: Sparkles },
  { href: "/detect", label: "识色", icon: Camera },
  { href: "/profile", label: "色谱", icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/80 backdrop-blur-xl safe-area-inset-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-3 py-2 transition-all duration-300",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
                  isActive && "bg-foreground/10 scale-110"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive && "stroke-[2.5px]"
                  )}
                />
                {isActive && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-foreground animate-in fade-in zoom-in duration-300" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
