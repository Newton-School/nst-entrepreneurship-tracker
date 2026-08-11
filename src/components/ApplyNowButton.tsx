import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ApplyNowButtonProps {
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export function ApplyNowButton({
  className,
  variant = "default",
  size = "default",
  label = "Apply Now",
}: ApplyNowButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      subject: "",
      venture: "",
    },
    onSubmit: async ({ value }) => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        if (!user) {
          throw new Error("Sign in before submitting a proposal.");
        }
        const { subject, venture } = value;
        const { error } = await supabase.from("proposal").insert([
          {
            user_id: user.id,
            subject,
            venture,
          },
        ]);
        if (error) throw new Error(error.message);
        form.reset();
        setDone(true);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setDone(false);
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={
            "group bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-[0.18em] text-[11px] " +
            (className ?? "")
          }
        >
          {label}
          <ArrowUpRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-strong border-border/60 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono tracking-tight">
            Apply — NST Entrepreneurship Track
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Execution-first founders only. We review on a rolling basis.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="py-6 text-center font-mono text-sm">
            <p className="gold-text text-base">Application received.</p>
            <p className="mt-2 text-muted-foreground">
              We&apos;ll get back within 5 business days.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-3"
          >
            <form.Field
              name="subject"
              validators={{
                onChange: ({ value }) =>
                  !value || !value.trim() ? "Subject is required" : undefined,
              }}
              children={(field) => (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Subject
                  </Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    className="bg-background/40"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length ? (
                    <p className="text-[11px] text-destructive font-mono">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />
            <form.Field
              name="venture"
              validators={{
                onChange: ({ value }) =>
                  !value || !value.trim() ? "Venture details are required" : undefined,
              }}
              children={(field) => (
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.name}
                    className="text-xs uppercase tracking-widest text-muted-foreground"
                  >
                    Venture / Idea
                  </Label>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    required
                    rows={3}
                    className="bg-background/40"
                    placeholder="What problem are you solving and what have you executed so far?"
                  />
                  {field.state.meta.isTouched && field.state.meta.errors.length ? (
                    <p className="text-[11px] text-destructive font-mono">
                      {field.state.meta.errors.join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            />
            {submitError ? (
              <p className="text-[11px] text-destructive font-mono">{submitError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono uppercase tracking-widest text-xs"
              >
                {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Submit Application
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
