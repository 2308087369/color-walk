"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { ColorCard } from "@/components/color-card";
import { getColors, getColorPhotos, deletePhoto, analyzePhoto, type Color, type UserPhoto } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Search, X, Camera, Download, Trash2, Maximize2, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ColorsPage() {
  const [colors, setColors] = useState<Color[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);
  const hasMore = colors.length < total;

  // Selected color for viewing photos
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [colorPhotos, setColorPhotos] = useState<UserPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<UserPhoto | null>(null);
  const [analyzingPhotoId, setAnalyzingPhotoId] = useState<number | null>(null);

  // 防抖搜索
  const loadColors = useCallback(async (pageNum: number, append = false, search = "") => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const data = await getColors(pageNum, 24, search);
      if (append) {
        setColors((prev) => {
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

  // 当搜索词变化时，重新从第一页加载数据（带有防抖效果）
  useEffect(() => {
    const timer = setTimeout(() => {
      loadColors(1, false, searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery, loadColors]);

  // 无限滚动
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadColors(page + 1, true, searchQuery);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, loadColors, searchQuery]);

  // 查看颜色详情及照片
  const handleColorClick = async (color: Color) => {
    setSelectedColor(color);
    setLoadingPhotos(true);
    try {
      const photos = await getColorPhotos(color.id);
      setColorPhotos(photos);
    } catch (error) {
      console.error("Failed to load photos:", error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const closeColorDetails = () => {
    setSelectedColor(null);
    setColorPhotos([]);
    setPreviewPhoto(null);
  };

  const handleDeletePhoto = async (photoId: number) => {
    // eslint-disable-next-line no-restricted-globals
    const confirmed = window.confirm("确定要删除这张打卡照片吗？");
    if (!confirmed) {
      return;
    }
    
    try {
      await deletePhoto(photoId);
      // Remove from local state
      setColorPhotos(prev => prev.filter(p => p.id !== photoId));
      if (previewPhoto?.id === photoId) {
        setPreviewPhoto(null);
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
      alert("删除失败，请稍后重试");
    }
  };

  const handleAnalyzePhoto = async (photoId: number) => {
    setAnalyzingPhotoId(photoId);
    try {
      await analyzePhoto(photoId);
      setColorPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, description_status: "pending", description_error: undefined } : p
      ));
      if (previewPhoto?.id === photoId) {
        setPreviewPhoto(prev => prev ? { ...prev, description_status: "pending", description_error: undefined } : null);
      }
      if (selectedColor) {
        let attempts = 0;
        const timer = setInterval(async () => {
          attempts += 1;
          const latestPhotos = await getColorPhotos(selectedColor.id);
          setColorPhotos(latestPhotos);
          const latest = latestPhotos.find((p) => p.id === photoId);
          if (latest && previewPhoto?.id === photoId) {
            setPreviewPhoto(latest);
          }
          if (attempts >= 15 || (latest && latest.description_status !== "pending")) {
            clearInterval(timer);
            setAnalyzingPhotoId(null);
          }
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to analyze photo:", error);
      alert("生成描述失败，请稍后重试");
      setAnalyzingPhotoId(null);
    }
  };

  const handleGeneratePoster = async (photo: UserPhoto, color: Color | null) => {
    if (!color) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imageUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://180.213.184.159:5120"}${photo.file_path}`;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("图片加载失败"));
    });

    const imageAreaX = 80;
    const imageAreaY = 140;
    const imageAreaW = 920;
    const imageAreaH = 1100;
    ctx.drawImage(image, imageAreaX, imageAreaY, imageAreaW, imageAreaH);

    ctx.fillStyle = color.hex_code;
    ctx.fillRect(80, 1280, 920, 180);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px sans-serif";
    ctx.fillText(`${color.name} ${color.hex_code.toUpperCase()}`, 120, 1385);
    ctx.font = "36px sans-serif";
    const description = photo.description || "今日打卡完成，记录属于我的传统色瞬间。";
    const lines = description.match(/.{1,18}/g) || [];
    lines.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(line, 120, 1545 + idx * 52);
    });
    ctx.font = "30px sans-serif";
    ctx.fillStyle = "#c8c8c8";
    ctx.fillText("ColorWalk 色彩之城", 120, 1770);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `poster-${color.name}-${photo.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPhoto = async (photoUrl: string, filename: string) => {
    try {
      // Direct download link approach instead of fetch to avoid CORS/blob issues
      const a = document.createElement('a');
      a.href = photoUrl;
      a.download = `color-city-${filename}`;
      // Target blank helps if download attribute is ignored by browser for cross-origin
      a.target = "_blank"; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download photo:", error);
      alert("下载失败，请稍后重试");
    }
  };

  return (
    <main className="min-h-screen bg-background pb-20 relative">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 pt-12 pb-4 safe-area-inset-top">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">色卡图鉴</h1>
            <p className="text-xs text-muted-foreground">
              共 {total} 种中国传统颜色
            </p>
          </div>
        </div>

        {/* Search */}
        <div
          className={cn(
            "relative flex items-center rounded-xl bg-muted/50 transition-all duration-300",
            searchFocused && "bg-muted ring-1 ring-foreground/20"
          )}
        >
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索颜色名称或色值..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-transparent py-2.5 pl-9 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Color Grid */}
      <section className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8" />
          </div>
        ) : colors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">没有找到相关颜色</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {colors.map((color) => (
                <div key={color.id} onClick={() => handleColorClick(color)} className="cursor-pointer">
                  <ColorCard color={color} />
                </div>
              ))}
            </div>

            {/* Load More Indicator */}
            {!searchQuery && (
              <div ref={observerRef} className="flex items-center justify-center py-8">
                {loadingMore && <Spinner className="h-6 w-6" />}
                {!hasMore && colors.length > 0 && (
                  <p className="text-sm text-muted-foreground">已加载全部颜色</p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <BottomNav />

      {/* Color Details & Photos Modal */}
      {selectedColor && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="safe-area-inset-top" />
          <div className="flex items-center justify-between p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full border shadow-sm"
                style={{ backgroundColor: selectedColor.hex_code }}
              />
              <div>
                <h3 className="font-bold">{selectedColor.name}</h3>
                <p className="text-xs text-muted-foreground uppercase">{selectedColor.hex_code}</p>
              </div>
            </div>
            <button 
              onClick={closeColorDetails}
              className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Camera className="h-4 w-4" />
              我的打卡记录
            </h4>
            
            {loadingPhotos ? (
              <div className="flex justify-center py-10">
                <Spinner className="h-6 w-6 text-primary" />
              </div>
            ) : colorPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {colorPhotos.map(photo => {
                  const photoUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://180.213.184.159:5120'}${photo.file_path}`;
                  return (
                    <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={photoUrl}
                        alt="打卡照片"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      
                      {/* 悬浮操作层 */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewPhoto(photo);
                          }}
                          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
                          title="全屏查看"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPhoto(photoUrl, photo.file_path.split('/').pop() || 'photo.jpg');
                          }}
                          className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-colors"
                          title="下载图片"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                          className="h-8 w-8 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* 底部信息条 */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6 pointer-events-none">
                        <p className="text-[10px] text-white font-medium">
                          匹配度: {photo.match_percentage.toFixed(1)}%
                        </p>
                        <p className="text-[9px] text-white/80">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground text-sm">还没有该颜色的打卡记录</p>
                <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                  去打卡页面上传包含「{selectedColor.name}」的照片吧
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen Image Preview */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setPreviewPhoto(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors text-white"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewPhoto(null);
            }}
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-[90vw] max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`${process.env.NEXT_PUBLIC_API_URL || 'http://180.213.184.159:5120'}${previewPhoto.file_path}`}
              alt="全屏预览"
              className="max-w-full max-h-[75vh] object-contain rounded-sm"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* AI Description Panel */}
            <div 
              className="absolute -bottom-6 left-0 right-0 translate-y-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-3 max-w-2xl mx-auto shadow-2xl">
                {previewPhoto.description ? (
                  <>
                    <p className="text-white/90 text-sm leading-relaxed text-pretty">
                      {previewPhoto.description}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-white/50 text-xs">
                        匹配度 {previewPhoto.match_percentage.toFixed(1)}% · 打卡于 {new Date(previewPhoto.created_at).toLocaleString()} · {previewPhoto.description_status === "pending" ? "描述生成中" : "描述已完成"}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleGeneratePoster(previewPhoto, selectedColor)}
                          className="text-xs flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
                        >
                          海报分享
                        </button>
                        <button
                          onClick={() => handleAnalyzePhoto(previewPhoto.id)}
                          disabled={analyzingPhotoId === previewPhoto.id}
                          className="text-xs flex items-center gap-1.5 text-white/70 hover:text-white transition-colors disabled:opacity-50"
                        >
                          {analyzingPhotoId === previewPhoto.id ? (
                            <>
                              <Spinner className="h-3 w-3" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3" />
                              重新生成
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="text-white/50 text-sm">
                      匹配度 {previewPhoto.match_percentage.toFixed(1)}% · {previewPhoto.description_status === "pending" ? "AI 描述生成中..." : "尚未生成 AI 描述"}
                    </div>
                    <button
                      onClick={() => handleAnalyzePhoto(previewPhoto.id)}
                      disabled={analyzingPhotoId === previewPhoto.id}
                      className="text-sm flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-white transition-colors disabled:opacity-50"
                    >
                      {analyzingPhotoId === previewPhoto.id ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          AI 智能描述
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
