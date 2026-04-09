"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("+86 ");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = phone.trim();
      await register(username, password, cleanPhone);
      router.push("/login?registered=true"); // 注册成功后跳转到登录页
    } catch (err: any) {
      setError(err.message || "注册失败，该用户名可能已被使用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#faf7f2] dark:bg-zinc-950 p-6 relative overflow-hidden">
      {/* 背景水墨纹理/装饰 */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-[#8f4b2e]/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#c93756]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-64 h-64 bg-[#b35c44]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-[#c93756]/20 to-[#8f4b2e]/10 mb-2 shadow-inner border border-[#c93756]/10">
            <span className="text-2xl font-serif text-[#c93756]">印</span>
          </div>
          <h1 className="text-3xl font-bold tracking-widest text-[#8f4b2e] dark:text-[#d4a373] font-serif">
            缔结契约
          </h1>
          <p className="text-muted-foreground text-sm tracking-widest opacity-80">
            化身寻色人 · 点亮色彩图鉴
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5 bg-background/50 dark:bg-background/80 backdrop-blur-xl p-8 rounded-2xl shadow-sm border border-border/50">
          <div className="space-y-4">
            <div className="space-y-2 relative group">
              <Input
                type="text"
                placeholder="在此留名 (用户名)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 bg-transparent border-b-2 border-x-0 border-t-0 rounded-none focus-visible:ring-0 focus-visible:border-[#c93756] transition-colors px-2 text-base"
              />
            </div>
            <div className="space-y-2 relative group">
              <Input
                type="text"
                placeholder="飞鸽传书 (手机号 例如: +86 ...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-12 bg-transparent border-b-2 border-x-0 border-t-0 rounded-none focus-visible:ring-0 focus-visible:border-[#c93756] transition-colors px-2 text-base"
              />
            </div>
            <div className="space-y-2 relative group">
              <Input
                type="password"
                placeholder="信物秘钥 (密码)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-transparent border-b-2 border-x-0 border-t-0 rounded-none focus-visible:ring-0 focus-visible:border-[#c93756] transition-colors px-2 text-base"
              />
            </div>
            <div className="space-y-2 relative group">
              <Input
                type="password"
                placeholder="确认秘钥"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 bg-transparent border-b-2 border-x-0 border-t-0 rounded-none focus-visible:ring-0 focus-visible:border-[#c93756] transition-colors px-2 text-base"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#c93756] animate-in fade-in slide-in-from-left-2 duration-300">
              {error}
            </p>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full h-12 text-base tracking-widest bg-gradient-to-r from-[#8f4b2e] to-[#c93756] hover:from-[#7a3f26] hover:to-[#b32f4a] text-white rounded-xl shadow-md transition-all hover:scale-[1.02]" 
              disabled={loading}
            >
              {loading ? "结契中..." : "正式结契"}
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/40">
            已有通关文牒？{" "}
            <Link href="/login" className="text-[#c93756] hover:text-[#8f4b2e] transition-colors hover:underline underline-offset-4">
              直接入城
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
