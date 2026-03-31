"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getDailyRecommendation, type Color } from "@/lib/api";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { Palette, Sparkles, Camera, ArrowRight, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const [dailyColors, setDailyColors] = useState<Color[]>([]);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        setUsername(user.username);
        
        // Load daily recommendations after auth
        const recommendation = await getDailyRecommendation(8);
        if (recommendation.colors && recommendation.colors.length > 0) {
          setDailyColors(recommendation.colors);
        }
      } catch (error) {
        // Handle unauthenticated state (the api wrapper will redirect to /login)
        console.error("Not authenticated");
      }
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setDailyColors((currentColors) => {
        if (currentColors.length === 0) return currentColors;
        setActiveColorIndex((prev) => (prev + 1) % currentColors.length);
        return currentColors;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const activeColor = dailyColors.length > 0 
    ? dailyColors[activeColorIndex] 
    : { hex_code: "#177cb0", name: "靛青" }; // Fallback color

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-12 pb-8">
        {/* 动态背景色块 */}
        <div className="absolute inset-0 overflow-hidden">
          {dailyColors.map((color, index) => (
            <div
              key={color.hex_code}
              className={cn(
                "absolute h-32 w-32 rounded-full blur-3xl transition-all duration-1000",
                mounted ? "opacity-20" : "opacity-0"
              )}
              style={{
                backgroundColor: color.hex_code,
                left: `${(index * 15) % 80}%`,
                top: `${(index * 20) % 60}%`,
                transform: `scale(${activeColorIndex === index ? 1.5 : 1})`,
                transitionDelay: `${index * 100}ms`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          {/* Logo & Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center transition-colors duration-500"
                style={{ backgroundColor: activeColor.hex_code }}
              >
                <span className="text-white text-lg font-bold">色</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-balance">色彩漫步</h1>
                <p className="text-xs text-muted-foreground">
                  {username ? `欢迎回来，${username}` : "Color City Walk"}
                </p>
              </div>
            </div>
            {username && (
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-full">
                <LogOut className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* 动态展示颜色 */}
          <div className="relative h-40 rounded-3xl overflow-hidden mb-6 shadow-lg">
            <div
              className="absolute inset-0 transition-colors duration-700"
              style={{ backgroundColor: activeColor.hex_code }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div className="text-white">
                <p className="text-2xl font-bold">{activeColor.name}</p>
                <p className="text-sm opacity-80 uppercase">{activeColor.hex_code}</p>
              </div>
              <div className="flex gap-1">
                {dailyColors.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      activeColorIndex === index
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 介绍文字 */}
          <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
            探索中国传统色彩之美，抽取你的专属出行色，用镜头捕捉城市中的每一抹色彩。
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">开始探索</h2>

        <Link href="/colors" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg active:scale-[0.98]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">色卡图鉴</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  浏览 759 种中国传统颜色，感受东方美学
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
            {/* 装饰色块 */}
            <div className="absolute -right-4 -bottom-4 flex gap-1 opacity-20">
              {["#9d2933", "#177cb0", "#ffd111", "#789262"].map((color) => (
                <div
                  key={color}
                  className="h-16 w-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </Link>

        <Link href="/draw" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg active:scale-[0.98]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">今日抽色</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  随机抽取专属出行色，开启色彩漫步之旅
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>

        <Link href="/detect" className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 transition-all duration-300 hover:border-border hover:shadow-lg active:scale-[0.98]">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold">识色打卡</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  拍照或上传图片，识别是否包含目标颜色
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
      </section>

      {/* 底部颜色预览 */}
      <section className="px-6 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground">今日推荐</h2>
          <Link href="/colors" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            查看全部
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dailyColors.map((color) => (
            <div
              key={color.hex_code}
              className="flex-shrink-0 w-16 h-20 rounded-xl overflow-hidden shadow-sm"
            >
              <div
                className="h-14 w-full"
                style={{ backgroundColor: color.hex_code }}
              />
              <div className="h-6 bg-card flex items-center justify-center">
                <span className="text-[10px] font-medium">{color.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
