"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPublicColor, type Color } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Palette, ChevronLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const colorId = params.id as string;
  
  const [color, setColor] = useState<Color | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadColor = async () => {
      try {
        const data = await getPublicColor(parseInt(colorId));
        setColor(data);
      } catch (err) {
        setError("哎呀，找不到这个颜色，可能链接有误或颜色已被删除。");
      } finally {
        setLoading(false);
      }
    };
    
    if (colorId) {
      loadColor();
    }
  }, [colorId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">正在提取色彩...</p>
      </div>
    );
  }

  if (error || !color) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Palette className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Button onClick={() => router.push("/")} variant="outline">
          返回首页
        </Button>
      </div>
    );
  }

  // 简化的亮度计算，决定文字颜色
  const r = parseInt(color.hex_code.slice(1, 3), 16);
  const g = parseInt(color.hex_code.slice(3, 5), 16);
  const b = parseInt(color.hex_code.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const textColor = luminance > 0.5 ? "#000000" : "#ffffff";

  return (
    <main 
      className="min-h-screen flex flex-col transition-colors duration-1000 ease-in-out relative"
      style={{ backgroundColor: color.hex_code }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 pointer-events-none" />
      
      {/* 顶部导航 */}
      <header className="px-4 pt-12 pb-4 safe-area-inset-top flex items-center justify-between relative z-10">
        <button 
          onClick={() => router.push("/")}
          className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors hover:bg-white/30"
          style={{ color: textColor }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </header>

      {/* 颜色展示区 */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10" style={{ color: textColor }}>
        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-4">
            <Sparkles className="h-6 w-6 mr-2" />
            <span className="font-medium tracking-widest">朋友向你分享了一抹绝色</span>
          </div>
          
          <h1 className="text-7xl font-black tracking-tight drop-shadow-lg">
            {color.name}
          </h1>
          
          <div className="inline-block px-6 py-2 rounded-full bg-black/10 backdrop-blur-sm">
            <p className="text-2xl font-mono tracking-widest uppercase drop-shadow-md">
              {color.hex_code}
            </p>
          </div>
        </div>
      </div>

      {/* 底部行动召唤 */}
      <div className="p-6 safe-area-inset-bottom relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl text-center space-y-4">
          <p className="text-foreground font-medium">加入「色彩之城」</p>
          <p className="text-sm text-muted-foreground">探索 700+ 种中国传统色彩，用镜头收集身边的颜色，开启你的城市色彩漫步。</p>
          <Link href="/" className="block w-full">
            <Button className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg hover:shadow-xl transition-all">
              立即探索
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}