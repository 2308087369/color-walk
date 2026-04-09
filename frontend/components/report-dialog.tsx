"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { submitReport } from "@/lib/api";

export function ReportDialog() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast({
        title: "请输入举报或反馈内容",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      await submitReport({ content, contact });
      toast({
        title: "提交成功",
        description: "感谢您的反馈，我们将尽快处理。"
      });
      setOpen(false);
      setContent("");
      setContact("");
    } catch (error: any) {
      toast({
        title: "提交失败",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="hover:text-foreground transition-colors ml-4 text-[10px] text-muted-foreground/60 underline-offset-4 hover:underline">
          反馈与举报
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[90vw] rounded-xl">
        <DialogHeader>
          <DialogTitle>反馈与举报</DialogTitle>
          <DialogDescription>
            您可以直接在这里提交反馈/举报，或通过以下方式联系我们：
            <br />
            邮箱：2308087369@qq.com
            <br />
            手机：17302380694
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="content">内容 <span className="text-destructive">*</span></Label>
            <Textarea
              id="content"
              placeholder="请输入您的反馈、建议或举报内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact">联系方式（选填）</Label>
            <Input
              id="contact"
              placeholder="请留下您的邮箱或手机号，以便我们回复您"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "提交中..." : "提交反馈"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}