"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { ColorPickerModal } from "@/components/color-picker-modal";
import { detectColor, getTodayDrawnColors, type Color, type DetectionResult } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import {
  Upload,
  X,
  ChevronDown,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";

function DetectPageContent() {
  const searchParams = useSearchParams();
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [results, setResults] = useState<DetectionResult[] | null>(null);
  const [todayDrawnColors, setTodayDrawnColors] = useState<Color[]>([]);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropScale, setCropScale] = useState(70);
  const [cropOffsetX, setCropOffsetX] = useState(50);
  const [cropOffsetY, setCropOffsetY] = useState(50);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 URL 参数获取颜色
  useEffect(() => {
    const colorId = searchParams.get("colorId");
    const colorName = searchParams.get("colorName");
    const colorHex = searchParams.get("colorHex");

    if (colorId && colorName && colorHex) {
      setSelectedColor({
        id: parseInt(colorId),
        name: colorName,
        hex_code: colorHex,
        created_at: "",
        updated_at: "",
        created_by: "",
      });
    }
  }, [searchParams]);

  // 加载今日抽取的颜色
  useEffect(() => {
    const loadTodayDrawn = async () => {
      try {
        const colors = await getTodayDrawnColors();
        setTodayDrawnColors(colors);
      } catch (error) {
        console.error("Failed to load today's drawn colors:", error);
      }
    };
    loadTodayDrawn();
  }, []);

  // 处理文件上传
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setResults(null);
    }
  };

  // 清除图片
  const clearImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 清除所有
  const clearAll = () => {
    setImageFiles([]);
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 检测颜色
  const handleDetect = async () => {
    if (imageFiles.length === 0 || !selectedColor) return;

    setDetecting(true);
    try {
      const crop = cropEnabled ? {
        x: Math.max(0, Math.min((cropOffsetX - cropScale / 2) / 100, 1)),
        y: Math.max(0, Math.min((cropOffsetY - cropScale / 2) / 100, 1)),
        w: Math.max(0.1, Math.min(cropScale / 100, 1)),
        h: Math.max(0.1, Math.min(cropScale / 100, 1))
      } : undefined;
      const response = await detectColor(imageFiles, selectedColor.id, 60, crop);
      setResults(response.results);
    } catch (error) {
      console.error("[v0] 颜色检测失败:", error);
    } finally {
      setDetecting(false);
    }
  };

  // 清理
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, []);

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 safe-area-inset-top">
        <h1 className="text-xl font-bold">识色打卡</h1>
        <p className="text-sm text-muted-foreground">
          拍照或上传图片，识别是否包含目标颜色
        </p>
      </header>

      <section className="px-6 space-y-6">
        {/* 选择目标颜色 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">目标颜色</label>
          <button
            onClick={() => setShowColorPicker(true)}
            className="w-full h-14 rounded-2xl border border-border flex items-center justify-between px-4 transition-all hover:border-foreground/30 active:scale-[0.99]"
          >
            {selectedColor ? (
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg shadow-sm"
                  style={{ backgroundColor: selectedColor.hex_code }}
                />
                <div className="text-left">
                  <p className="font-medium">{selectedColor.name}</p>
                  <p className="text-xs text-muted-foreground uppercase">
                    {selectedColor.hex_code}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">点击选择颜色</span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          
          {/* 今日已抽颜色快捷选择 */}
          {todayDrawnColors.length > 0 && !selectedColor && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> 今日抽中颜色
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {todayDrawnColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className="flex-shrink-0 flex items-center gap-2 pr-3 pl-1.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors"
                  >
                    <div 
                      className="h-5 w-5 rounded-full" 
                      style={{ backgroundColor: color.hex_code }}
                    />
                    <span className="text-xs font-medium">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 颜色选择器弹窗 */}
        <ColorPickerModal
          open={showColorPicker}
          onClose={() => setShowColorPicker(false)}
          onSelect={(color) => {
            setSelectedColor(color);
            setShowColorPicker(false);
          }}
          selectedColor={selectedColor}
        />

        {/* 图片预览 */}
        {imagePreviews.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2">
              <div className="text-sm font-medium">局部裁剪识色</div>
              <button
                onClick={() => setCropEnabled((prev) => !prev)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  cropEnabled ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                )}
              >
                {cropEnabled ? "已开启" : "已关闭"}
              </button>
            </div>

            {cropEnabled && (
              <div className="rounded-xl border border-border p-3 space-y-3">
                <div className="text-xs text-muted-foreground">裁剪大小</div>
                <Slider value={[cropScale]} min={30} max={100} step={1} onValueChange={(v) => setCropScale(v[0])} />
                <div className="text-xs text-muted-foreground">水平位置</div>
                <Slider value={[cropOffsetX]} min={0} max={100} step={1} onValueChange={(v) => setCropOffsetX(v[0])} />
                <div className="text-xs text-muted-foreground">垂直位置</div>
                <Slider value={[cropOffsetY]} min={0} max={100} step={1} onValueChange={(v) => setCropOffsetY(v[0])} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative rounded-2xl overflow-hidden bg-muted aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`预览图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {cropEnabled && (
                  <div
                    className="absolute border-2 border-primary/80 bg-primary/10"
                    style={{
                      left: `${Math.max(0, cropOffsetX - cropScale / 2)}%`,
                      top: `${Math.max(0, cropOffsetY - cropScale / 2)}%`,
                      width: `${cropScale}%`,
                      height: `${cropScale}%`,
                      transform: "translate(0, 0)"
                    }}
                  />
                )}
                <button
                  onClick={() => clearImage(index)}
                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            
            <label className="flex flex-col items-center justify-center gap-2 aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 cursor-pointer transition-all hover:border-foreground/30 hover:bg-muted/50 active:scale-[0.98]">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">继续添加</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            </div>
          </div>
        )}

        {/* 上传按钮 (初始状态) */}
        {imagePreviews.length === 0 && (
          <label className="flex flex-col items-center justify-center gap-2 w-full h-40 rounded-2xl border-2 border-dashed border-border bg-muted/30 cursor-pointer transition-all hover:border-foreground/30 hover:bg-muted/50 active:scale-[0.98]">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <span className="text-sm font-medium">点击上传照片 (可多选)</span>
            <span className="text-xs text-muted-foreground">支持 JPG, PNG 等格式</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        )}

        {/* 检测按钮 */}
        {imagePreviews.length > 0 && selectedColor && (
          <Button
            onClick={handleDetect}
            disabled={detecting}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
          >
            {detecting ? (
              <>
                <Spinner className="h-5 w-5" />
                识别中...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                批量识色 ({imageFiles.length}张)
              </>
            )}
          </Button>
        )}

        {/* 检测结果 */}
        {results && results.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="font-medium text-lg">识别结果</h3>
            
            <div className="grid grid-cols-1 gap-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    "rounded-2xl border-2 p-4 flex flex-col gap-3",
                    result.percentage >= 1.0
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-amber-500/50 bg-amber-500/5"
                  )}
                >
                  <div className="flex gap-4 items-center">
                    <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0">
                      <img 
                        src={imagePreviews[index]} 
                        alt="检测图片" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.percentage >= 1.0 ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="font-semibold text-sm">
                          {result.percentage >= 1.0 ? "打卡成功" : "未检测到"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>匹配度: {result.percentage.toFixed(1)}%</span>
                        {!!result.matched_by?.length && (
                          <span>命中模型: {result.matched_by.join(" / ").toUpperCase()}</span>
                        )}
                        {result.saved && <span className="text-emerald-500">已保存至色卡</span>}
                      </div>
                    </div>
                  </div>
                  {result.saved && result.description && (
                    <div className="text-sm bg-background/50 p-3 rounded-xl text-muted-foreground border border-border/50">
                      ✨ {result.description}
                    </div>
                  )}
                  {!result.saved && !!result.failure_reasons?.length && (
                    <div className="text-sm bg-background/50 p-3 rounded-xl text-muted-foreground border border-border/50">
                      失败原因：{result.failure_reasons.join("、")}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 再试一次 */}
            <Button
              variant="outline"
              onClick={clearAll}
              className="w-full h-12 rounded-xl gap-2 mt-4"
            >
              <RefreshCw className="h-4 w-4" />
              重新上传
            </Button>
          </div>
        )}
      </section>

      {/* 颜色选择器 */}
      <ColorPickerModal
        open={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        onSelect={setSelectedColor}
        selectedColor={selectedColor}
      />

      <BottomNav />
    </main>
  );
}

export default function DetectPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </main>
      }
    >
      <DetectPageContent />
    </Suspense>
  );
}
