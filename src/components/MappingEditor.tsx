import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TLOS_EXT } from "@/lib/tlo-extended";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lock, Save, Plus, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Row = {
  id?: string;
  course_id: string;
  co_code: string;
  co_statement: string;
  tlo_ids: string[];
  bloom_level: string | null;
  notes: string | null;
  published: boolean;
};

export function MappingEditor({
  courseId,
  seedRows,
}: {
  courseId: string;
  seedRows: { id: string; statement: string; bloom: string; tloMap: string[] }[];
}) {
  const { isStaff: isAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [courseId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_mappings")
      .select("*")
      .eq("course_id", courseId)
      .order("co_code");
    if (error) toast.error(error.message);
    if (data && data.length > 0) {
      setRows(data as Row[]);
    } else {
      // Seed from static defaults (in-memory only)
      setRows(
        seedRows.map((s) => ({
          course_id: courseId,
          co_code: s.id,
          co_statement: s.statement,
          tlo_ids: s.tloMap,
          bloom_level: s.bloom,
          notes: null,
          published: true,
        })),
      );
    }
    setLoading(false);
  }

  async function saveRow(idx: number) {
    if (!isAdmin) return;
    const r = rows[idx];
    setSavingId(r.co_code);
    const payload = { ...r, course_id: courseId, updated_by: user?.id ?? null };
    const { data, error } = await supabase
      .from("course_mappings")
      .upsert(payload, { onConflict: "course_id,co_code" })
      .select()
      .single();
    setSavingId(null);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((x, i) => (i === idx ? (data as Row) : x)));
    toast.success(`Saved ${r.co_code}`);
  }

  async function publishAll() {
    if (!isAdmin) return;
    const updates = rows.map((r) => ({
      ...r,
      course_id: courseId,
      published: true,
      updated_by: user?.id ?? null,
    }));
    const { error } = await supabase
      .from("course_mappings")
      .upsert(updates, { onConflict: "course_id,co_code" });
    if (error) return toast.error(error.message);
    toast.success("Published mappings for cohort visibility.");
    load();
  }

  function update(idx: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function toggleTlo(idx: number, tlo: string) {
    const r = rows[idx];
    const has = r.tlo_ids.includes(tlo);
    update(idx, { tlo_ids: has ? r.tlo_ids.filter((x) => x !== tlo) : [...r.tlo_ids, tlo] });
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      {
        course_id: courseId,
        co_code: `CO${rs.length + 1}`,
        co_statement: "",
        tlo_ids: [],
        bloom_level: "Apply",
        notes: null,
        published: false,
      },
    ]);
  }
  async function removeRow(idx: number) {
    const r = rows[idx];
    if (r.id) {
      const { error } = await supabase.from("course_mappings").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  if (loading) return <p className="font-mono text-xs text-muted-foreground">Loading mappings…</p>;

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-mono text-lg">CO ↔ TLO Mapping</h3>
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "Edit the canonical mapping. Publish to push to student-facing views."
              : "Read-only view of the published curriculum mapping."}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={publishAll} className="font-mono text-xs">
            Publish all
          </Button>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Lock className="h-3 w-3" /> Admin sign-in to edit
          </Link>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {rows.map((r, idx) => (
          <div
            key={(r.id ?? r.co_code) + idx}
            className="rounded-lg border border-border/40 bg-background/30 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {isAdmin ? (
                  <Input
                    value={r.co_code}
                    onChange={(e) => update(idx, { co_code: e.target.value })}
                    className="h-7 w-24 bg-background/40 font-mono text-xs"
                  />
                ) : (
                  <p className="font-mono text-sm text-primary">{r.co_code}</p>
                )}
                <Badge variant="outline" className="font-mono text-[10px]">
                  Bloom · {r.bloom_level ?? "—"}
                </Badge>
                {r.published ? (
                  <Badge className="bg-primary/30 font-mono text-[10px] text-primary">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Draft
                  </Badge>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Pub
                    </span>
                    <Switch
                      checked={r.published}
                      onCheckedChange={(v) => update(idx, { published: v })}
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeRow(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingId === r.co_code}
                    onClick={() => saveRow(idx)}
                    className="font-mono text-[11px]"
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {savingId === r.co_code ? "Saving…" : "Save"}
                  </Button>
                </div>
              )}
            </div>

            {isAdmin ? (
              <Textarea
                value={r.co_statement}
                onChange={(e) => update(idx, { co_statement: e.target.value })}
                rows={2}
                className="mt-2 bg-background/40 text-sm"
              />
            ) : (
              <p className="mt-2 text-sm">{r.co_statement}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {TLOS_EXT.map((t) => {
                const selected = r.tlo_ids.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => toggleTlo(idx, t.id)}
                    className={`rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                      selected
                        ? "border-primary/60 bg-primary/20 text-primary"
                        : "border-border/40 bg-background/30 text-muted-foreground hover:bg-background/50"
                    } ${!isAdmin ? "cursor-default opacity-90" : ""}`}
                    title={t.statement}
                  >
                    {t.id}
                  </button>
                );
              })}
            </div>

            {isAdmin && (
              <Textarea
                placeholder="Admin notes (visible to faculty)…"
                value={r.notes ?? ""}
                onChange={(e) => update(idx, { notes: e.target.value })}
                rows={2}
                className="mt-2 bg-background/40 text-xs"
              />
            )}
          </div>
        ))}

        {isAdmin && (
          <Button variant="outline" onClick={addRow} className="font-mono text-xs">
            <Plus className="mr-1 h-3 w-3" /> Add CO row
          </Button>
        )}
      </div>
    </div>
  );
}
