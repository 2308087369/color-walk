"use client";

import { useState, useRef } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { getRandomColors, type Color } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Sparkles, RefreshCw, Share2, Check, Copy, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

export default function DrawPage() {
  const [drawnColor, setDrawnColor] = useState<Color | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shuffleColors, setShuffleColors] = useState<string[]>([]);
  const [excludeChecked, setExcludeChecked] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  // 抽取颜色动画
  const drawColor = async () => {
    setIsDrawing(true);
    setIsRevealed(false);
    setDrawnColor(null);

    // 生成随机颜色用于动画
    const tempColors = Array.from({ length: 20 }, () =>
      `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`
    );
    setShuffleColors(tempColors);

    try {
      const [color] = await getRandomColors(1, [], excludeChecked);

      // 等待动画效果
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setDrawnColor(color);
      setIsRevealed(true);
    } catch (error: any) {
      console.error("[v0] 抽取颜色失败:", error);
      alert(error.message || "抽取失败");
    } finally {
      setIsDrawing(false);
      setShuffleColors([]);
    }
  };

  const copyToClipboard = (text: string) => {
    // 现代浏览器 HTTPS 环境下的首选方案
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("分享链接已复制到剪贴板，快去发给朋友吧！");
      }).catch(err => {
        console.error("Clipboard API failed:", err);
        fallbackCopyTextToClipboard(text);
      });
    } else {
      // 降级方案：用于非 HTTPS 环境或旧浏览器
      fallbackCopyTextToClipboard(text);
    }
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 避免页面滚动
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert("分享链接已复制到剪贴板，快去发给朋友吧！");
      } else {
        alert("复制失败，请手动复制链接: " + text);
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      alert("复制失败，请手动复制链接: " + text);
    }

    document.body.removeChild(textArea);
  };

  // 复制颜色代码
  const copyColor = () => {
    if (drawnColor) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(drawnColor.hex_code);
      } else {
        fallbackCopyTextToClipboard(drawnColor.hex_code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 分享颜色链接
  const shareColor = () => {
    if (drawnColor) {
      const shareUrl = `${window.location.origin}/share/${drawnColor.id}`;
      
      // 尝试使用原生分享 API (移动端)
      if (navigator.share) {
        navigator.share({
          title: `色彩之城 - ${drawnColor.name}`,
          text: `我刚刚在色彩之城抽到了中国传统色「${drawnColor.name}」(${drawnColor.hex_code})，快来看看吧！`,
          url: shareUrl,
        }).catch((err) => {
          console.log("Share failed or was cancelled", err);
          // 降级：复制到剪贴板
          copyToClipboard(shareUrl);
        });
      } else {
        // 桌面端：直接复制链接到剪贴板
        copyToClipboard(shareUrl);
      }
    }
  };

  // 计算文字颜色
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 safe-area-inset-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">今日抽色</h1>
            <p className="text-sm text-muted-foreground">
              抽取你的专属出行色，开启色彩漫步
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-6 p-3 rounded-xl bg-muted/50 border border-border/50">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">排除已打卡颜色</p>
            <p className="text-xs text-muted-foreground">只抽取尚未探索的新颜色</p>
          </div>
          <Switch 
            checked={excludeChecked}
            onCheckedChange={setExcludeChecked}
            disabled={isDrawing}
          />
        </div>
      </header>

      {/* Draw Area */}
      <section className="px-6 flex flex-col items-center">
        {/* Color Card */}
        <div
          ref={cardRef}
          className={cn(
            "relative w-full max-w-xs aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl transition-all duration-500",
            isDrawing && "animate-pulse"
          )}
        >
          {/* 未抽取状态 */}
          {!drawnColor && !isDrawing && (
            <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 flex flex-col items-center justify-center gap-4">
              <div className="h-20 w-20 rounded-full bg-foreground/5 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">点击下方按钮抽取颜色</p>
            </div>
          )}

          {/* 抽取中动画 */}
          {isDrawing && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {shuffleColors.map((color, index) => (
                <div
                  key={index}
                  className="absolute inset-0 animate-pulse"
                  style={{
                    backgroundColor: color,
                    opacity: 0.8,
                    animationDelay: `${index * 75}ms`,
                    animationDuration: "150ms",
                  }}
                />
              ))}
              <div className="relative z-10 text-white font-bold text-xl drop-shadow-lg">
                抽取中...
              </div>
            </div>
          )}

          {/* 抽取结果 */}
          {drawnColor && isRevealed && (
            <div
              className={cn(
                "absolute inset-0 flex flex-col justify-end p-6 transition-all duration-700",
                isRevealed ? "opacity-100 scale-100" : "opacity-0 scale-95"
              )}
              style={{ backgroundColor: drawnColor.hex_code }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              <div
                className="relative z-10 space-y-2"
                style={{ color: getContrastColor(drawnColor.hex_code) }}
              >
                <p className="text-xs opacity-70">今日出行色</p>
                <h2 className="text-4xl font-bold">{drawnColor.name}</h2>
                <p className="text-sm opacity-80 uppercase font-mono">
                  {drawnColor.hex_code}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
          <Button
            onClick={drawColor}
            disabled={isDrawing}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
          >
            {isDrawing ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : drawnColor ? (
              <RefreshCw className="h-5 w-5" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            {isDrawing ? "抽取中..." : drawnColor ? "再抽一次" : "开始抽色"}
          </Button>

          {/* 结果操作 */}
          {drawnColor && isRevealed && (
            <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button
                variant="outline"
                onClick={copyColor}
                className="flex-1 h-12 rounded-xl gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制色值
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={shareColor}
                className="flex-1 h-12 rounded-xl gap-2"
              >
                <Share2 className="h-4 w-4" />
                分享
              </Button>
            </div>
          )}

          {/* 去打卡 */}
          {drawnColor && isRevealed && (
            <Link href={`/detect?colorId=${drawnColor.id}&colorName=${encodeURIComponent(drawnColor.name)}&colorHex=${encodeURIComponent(drawnColor.hex_code)}`} className="w-full">
              <Button
                variant="secondary"
                className="w-full h-12 rounded-xl gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150"
              >
                <Camera className="h-4 w-4" />
                去识色打卡
              </Button>
            </Link>
          )}
        </div>

        {/* Tips */}
        <div className="mt-12 text-center px-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            每次抽取都是全新的中国传统色
            <br />
            带上这抹色彩，开启你的城市漫步吧
          </p>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
