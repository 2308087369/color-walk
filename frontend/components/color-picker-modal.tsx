"use client";

import { useState, useEffect, useCallback } from "react";
import { getColors, type Color } from "@/lib/api";
import { cn } from "@/lib/utils";
import { X, Search, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface ColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (color: Color) => void;
  selectedColor?: Color | null;
}

export function ColorPickerModal({
  open,
  onClose,
  onSelect,
  selectedColor,
}: ColorPickerModalProps) {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const hasMore = colors.length < total;

  const loadColors = useCallback(async (pageNum: number, append = false, search = "") => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const data = await getColors(pageNum, 50, search);
      if (append) {
        setColors((prev) => {
          // Remove duplicates
          const newItems = data.items.filter(item => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
      } else {
        setColors(data.items);
      }
      setTotal(data.total);
      setPage(pageNum);
    } catch (error) {
      console.error("[v0] 加载颜色失败:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadColors(1, false, searchQuery);
    }
  }, [open, loadColors, searchQuery]);

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      loadColors(page + 1, true, searchQuery);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[80vh] bg-background rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 px-4 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">选择目标颜色</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索颜色..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted/50 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
          </div>
        </div>

        {/* Color List */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
                {colors.map((color) => {
                  const isSelected = selectedColor?.id === color.id;
                  return (
                    <button
                      key={color.id}
                      onClick={() => {
                        onSelect(color);
                        onClose();
                      }}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95",
                        isSelected && "ring-2 ring-foreground ring-offset-2"
                      )}
                      title={`${color.name} ${color.hex_code}`}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: color.hex_code }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check className="h-5 w-5 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {!searchQuery && hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full mt-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {loadingMore ? (
                    <Spinner className="h-4 w-4 mx-auto" />
                  ) : (
                    "加载更多"
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
