"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Color } from "@/lib/api";
import { Check, Copy, Camera } from "lucide-react";

interface ColorCardProps {
  color: Color;
  onSelect?: (color: Color) => void;
  selected?: boolean;
  showDetails?: boolean;
}

export function ColorCard({ color, onSelect, selected, showDetails = true }: ColorCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(color.hex_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 计算文字颜色（根据背景亮度）
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  const textColor = getContrastColor(color.hex_code);

  return (
    <div
      onClick={() => onSelect?.(color)}
      className={cn(
        "group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer",
        "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        selected && "ring-2 ring-foreground ring-offset-2"
      )}
    >
      <div
        className="aspect-[3/4] w-full flex flex-col justify-end p-3"
        style={{ backgroundColor: color.hex_code }}
      >
        {/* 徽标：如果该颜色有打卡照片，在左上角显示照片数量 */}
        {color.photo_count && color.photo_count > 0 ? (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-2 py-1 text-white shadow-sm border border-white/10">
            <Camera className="h-3 w-3" />
            <span className="text-[10px] font-bold">{color.photo_count}</span>
          </div>
        ) : null}

        {showDetails && (
          <div className="space-y-1" style={{ color: textColor }}>
            <p className="text-lg font-bold leading-tight">{color.name}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs opacity-80 uppercase font-mono">{color.hex_code}</p>
              <button
                onClick={copyToClipboard}
                className="h-6 w-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all hover:bg-white/30"
              >
                {copied ? (
                  <Check className="h-3 w-3" style={{ color: textColor }} />
                ) : (
                  <Copy className="h-3 w-3" style={{ color: textColor }} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-foreground flex items-center justify-center">
          <Check className="h-4 w-4 text-background" />
        </div>
      )}
    </div>
  );
}
