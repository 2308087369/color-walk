"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { getAchievements, getMySpectrum, type AchievementResponse, type SpectrumResponse } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function ProfilePage() {
  const [spectrum, setSpectrum] = useState<SpectrumResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [spectrumData, achievementData] = await Promise.all([
          getMySpectrum(),
          getAchievements()
        ]);
        setSpectrum(spectrumData);
        setAchievements(achievementData);
      } catch (error) {
        console.error("加载色谱数据失败", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="px-6 pt-12 pb-4 safe-area-inset-top">
        <h1 className="text-xl font-bold">我的色谱墙</h1>
        <p className="text-sm text-muted-foreground">查看你的打卡收藏与成就进度</p>
      </header>

      <section className="px-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border p-4">
                <div className="text-xs text-muted-foreground">已打卡颜色</div>
                <div className="text-2xl font-bold mt-1">{spectrum?.total_colors_checked || 0}</div>
              </div>
              <div className="rounded-2xl border border-border p-4">
                <div className="text-xs text-muted-foreground">打卡照片数</div>
                <div className="text-2xl font-bold mt-1">{spectrum?.total_photos || 0}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <h3 className="font-semibold mb-3">成就系统</h3>
              <div className="space-y-3">
                {achievements?.items.map((item) => {
                  const progress = Math.min(100, Math.round((item.progress / item.target) * 100));
                  return (
                    <div key={item.key} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>{item.title}</span>
                        <span className={item.achieved ? "text-emerald-500" : "text-muted-foreground"}>
                          {item.progress}/{item.target}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-foreground" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <h3 className="font-semibold mb-3">色谱收藏</h3>
              {spectrum?.items.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {spectrum.items.map((item) => (
                    <div key={item.color.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-md" style={{ backgroundColor: item.color.hex_code }} />
                        <div className="text-sm font-medium">{item.color.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {item.color.hex_code.toUpperCase()} · {item.photo_count} 张
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">还没有打卡记录，去识色页面开始吧。</div>
              )}
            </div>
          </>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
