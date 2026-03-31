"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { getAchievements, getMySpectrum, type AchievementResponse, type SpectrumResponse } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Award, Camera, Palette, Sparkles, Trophy } from "lucide-react";

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

  const totalAchievements = achievements?.items.length || 0;
  const unlockedAchievements = achievements?.total_achieved || 0;
  const completionRate = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

  return (
    <main className="min-h-screen bg-background pb-20">
      <header className="px-6 pt-12 pb-5 safe-area-inset-top border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">成就与色谱</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">记录你的色彩旅程，解锁专属收藏成就</p>
      </header>

      <section className="px-6 py-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">当前成就完成度</div>
                  <div className="mt-1 text-3xl font-bold">{completionRate}%</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    已解锁 {unlockedAchievements} / {totalAchievements}
                  </div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <Award className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Palette className="h-3.5 w-3.5" />
                  已打卡颜色
                </div>
                <div className="text-2xl font-bold mt-2">{spectrum?.total_colors_checked || 0}</div>
              </div>
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Camera className="h-3.5 w-3.5" />
                  打卡照片数
                </div>
                <div className="text-2xl font-bold mt-2">{spectrum?.total_photos || 0}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">成就系统</h3>
                <div className="text-xs text-muted-foreground">点击打卡持续升级</div>
              </div>
              <div className="space-y-3">
                {achievements?.items.map((item) => {
                  const progress = Math.min(100, Math.round((item.progress / item.target) * 100));
                  return (
                    <div
                      key={item.key}
                      className={item.achieved ? "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3" : "rounded-xl border border-border p-3"}
                    >
                      <div className="flex items-center justify-between text-sm mb-2 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sparkles className={item.achieved ? "h-4 w-4 text-emerald-500 shrink-0" : "h-4 w-4 text-muted-foreground shrink-0"} />
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className={item.achieved ? "text-emerald-500 shrink-0" : "text-muted-foreground shrink-0"}>
                          {item.progress}/{item.target}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={item.achieved ? "h-full bg-emerald-500 transition-all duration-500" : "h-full bg-foreground transition-all duration-500"}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <h3 className="font-semibold mb-3">色谱收藏</h3>
              {spectrum?.items.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {spectrum.items.map((item) => (
                    <div key={item.color.id} className="rounded-xl border border-border bg-background/60 p-3 hover:border-foreground/20 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md ring-1 ring-black/10" style={{ backgroundColor: item.color.hex_code }} />
                        <div className="text-sm font-medium truncate">{item.color.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between gap-2">
                        <span className="uppercase truncate">{item.color.hex_code}</span>
                        <span className="shrink-0">{item.photo_count} 张</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  还没有打卡记录，去识色页面开始你的第一张色彩打卡吧。
                </div>
              )}
            </div>
          </>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
