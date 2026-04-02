"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPublicPhotoShare, type PublicPhotoShare } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Download, Link2, Share2 } from "lucide-react";

export default function PhotoSharePage() {
  const params = useParams();
  const router = useRouter();
  const photoId = Number(params.id);
  const [data, setData] = useState<PublicPhotoShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState("");

  const photoUrl = useMemo(() => {
    if (!data) return "";
    const base = process.env.NEXT_PUBLIC_API_URL || "http://180.213.184.159:5120";
    return `${base}${data.file_path}`;
  }, [data]);

  const posterDownloadUrl = useMemo(() => {
    if (!data) return "";
    const base = process.env.NEXT_PUBLIC_API_URL || "http://180.213.184.159:5120";
    return `${base}/colors/public/photos/${data.id}/poster`;
  }, [data]);

  useEffect(() => {
    const load = async () => {
      if (!photoId || Number.isNaN(photoId)) {
        setError("分享链接无效");
        setLoading(false);
        return;
      }
      try {
        const response = await getPublicPhotoShare(photoId);
        setData(response);
      } catch (err) {
        setError("该分享内容不存在或已失效");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [photoId]);

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1800);
    } catch (e) {
      alert("复制链接失败，请手动复制浏览器地址");
    }
  };

  const handleDownloadPoster = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      const link = document.createElement("a");
      link.href = posterDownloadUrl;
      link.download = `colorwalk-share-${data.id}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("生成海报失败，请稍后重试");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Spinner className="h-8 w-8 mb-4" />
        <p className="text-sm text-muted-foreground">正在加载分享海报...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <p className="text-muted-foreground mb-5">{error || "分享内容不可用"}</p>
        <Button onClick={() => router.push("/")}>返回首页</Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="px-4 pt-10 pb-4 flex items-center justify-between border-b border-border/40">
        <button
          onClick={() => router.back()}
          className="h-10 w-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold">分享海报</h1>
        <div className="w-10" />
      </header>

      <section className="p-4 space-y-4">
        <div className="rounded-2xl border border-border p-3 bg-card">
          <div className="aspect-[9/12] rounded-xl overflow-hidden relative bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="分享图片" className="w-full h-full object-cover" />
            <div className="absolute left-0 right-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <div className="text-white font-semibold">{data.color.name}</div>
              <div className="text-white/80 text-xs uppercase">{data.color.hex_code}</div>
              {data.description && (
                <div className="text-white/90 text-xs mt-1 line-clamp-2">{data.description}</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-4 bg-card space-y-3">
          <Button onClick={handleDownloadPoster} className="w-full h-11 rounded-xl gap-2" disabled={downloading}>
            {downloading ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            下载海报
          </Button>
          <Button onClick={handleCopyLink} variant="outline" className="w-full h-11 rounded-xl gap-2">
            <Link2 className="h-4 w-4" />
            {copySuccess ? "链接已复制" : "复制分享链接"}
          </Button>
          <Button onClick={() => router.push("/")} variant="ghost" className="w-full h-11 rounded-xl gap-2">
            <Share2 className="h-4 w-4" />
            去色彩之城继续探索
          </Button>
        </div>
      </section>
    </main>
  );
}
