import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RatingRow = {
  rowNumber: number;
  date: string;
  niharika_rating: string | number;
  good_action_shubhro: string;
  bad_action_shubhro: string;
  shubro_rating: string | number;
  shubhro_comments: string;
  future_imporvement: string;
};

type FormState = {
  date: string;
  niharika_rating: number;
  good_action_shubhro: string;
  bad_action_shubhro: string;
  shubro_rating: number;
  shubhro_comments: string;
  future_imporvement: string;
};

const ratingOptions = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5);

function ratingToHearts(value: number) {
  const full = Math.floor(value);
  const half = value % 1 !== 0;
  const empty = 5 - full - (half ? 1 : 0);
  return `${"❤️".repeat(full)}${half ? "🩷" : ""}${"🤍".repeat(Math.max(0, empty))}`;
}

const emptyForm: FormState = {
  date: new Date().toISOString().slice(0, 10),
  niharika_rating: 3,
  good_action_shubhro: "",
  bad_action_shubhro: "",
  shubro_rating: 3,
  shubhro_comments: "",
  future_imporvement: "",
};

type QuickRange = "all" | "week" | "month" | "3months";

export function NihariakDailyRatings() {
  const queryClient = useQueryClient();
  const [sheetName, setSheetName] = useState("");
  const [minRating, setMinRating] = useState<number>(1);
  const [maxRating, setMaxRating] = useState<number>(5);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quickRange, setQuickRange] = useState<QuickRange>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RatingRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const queryKey = ["/api/niharika/ratings", sheetName];

  const { data = [], isLoading, error } = useQuery<RatingRow[]>({
    queryKey,
    queryFn: async () => {
      const url = sheetName
        ? `/api/niharika/ratings?sheetName=${encodeURIComponent(sheetName)}`
        : "/api/niharika/ratings";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const res = await fetch("/api/niharika/ratings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, sheetName: sheetName || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsModalOpen(false);
      setEditingRow(null);
      setForm(emptyForm);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ rowNumber, payload }: { rowNumber: number; payload: FormState }) => {
      const res = await fetch(`/api/niharika/ratings/${rowNumber}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, sheetName: sheetName || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsModalOpen(false);
      setEditingRow(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (rowNumber: number) => {
      const url = sheetName
        ? `/api/niharika/ratings/${rowNumber}?sheetName=${encodeURIComponent(sheetName)}`
        : `/api/niharika/ratings/${rowNumber}`;
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setIsModalOpen(false);
      setEditingRow(null);
      setForm(emptyForm);
    },
  });

  const setRangeFromQuickFilter = (range: QuickRange) => {
    setQuickRange(range);
    if (range === "all") {
      setStartDate("");
      setEndDate("");
      return;
    }

    const end = new Date();
    const start = new Date();

    if (range === "week") {
      start.setDate(end.getDate() - 6);
    } else if (range === "month") {
      start.setMonth(end.getMonth() - 1);
    } else if (range === "3months") {
      start.setMonth(end.getMonth() - 3);
    }

    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  };

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const niharikaRating = Number(row.niharika_rating || 0);
      const date = (row.date || "").slice(0, 10);
      const dateOk = (!startDate || date >= startDate) && (!endDate || date <= endDate);
      const ratingOk = niharikaRating >= minRating && niharikaRating <= maxRating;
      return dateOk && ratingOk;
    });
  }, [data, startDate, endDate, minRating, maxRating]);

  const avgNiharika = useMemo(() => {
    if (!filtered.length) return 0;
    const sum = filtered.reduce((acc, row) => acc + Number(row.niharika_rating || 0), 0);
    return sum / filtered.length;
  }, [filtered]);

  const avgShubhro = useMemo(() => {
    if (!filtered.length) return 0;
    const sum = filtered.reduce((acc, row) => acc + Number(row.shubro_rating || 0), 0);
    return sum / filtered.length;
  }, [filtered]);

  const averageRangeLabel = useMemo(() => {
    if (!startDate || !endDate) return "all time (filtered by rating)";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    if (diffDays <= 7) return "selected week range";
    if (diffDays <= 31) return "selected month range";
    return `${diffDays}-day range`;
  }, [startDate, endDate]);

  const openCreate = () => {
    setEditingRow(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (row: RatingRow) => {
    setEditingRow(row);
    setForm({
      date: (row.date || "").slice(0, 10),
      niharika_rating: Number(row.niharika_rating || 1),
      good_action_shubhro: row.good_action_shubhro || "",
      bad_action_shubhro: row.bad_action_shubhro || "",
      shubro_rating: Number(row.shubro_rating || 1),
      shubhro_comments: row.shubhro_comments || "",
      future_imporvement: row.future_imporvement || "",
    });
    setIsModalOpen(true);
  };

  const submit = () => {
    if (editingRow) {
      updateMutation.mutate({ rowNumber: editingRow.rowNumber, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Niharika Daily Ratings</h1>
          <p className="text-sm text-muted-foreground">Filter, review, edit, and add daily entries.</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
        >
          + New Entry
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-card border border-border rounded-xl p-4">
        <div>
          <label htmlFor="sheet-name" className="text-xs text-muted-foreground">Sheet Name (optional)</label>
          <input
            id="sheet-name"
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Sheet1"
            className="w-full mt-1 px-3 py-2 rounded-md border bg-background"
          />
        </div>
        <div>
          <label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</label>
          <input id="start-date" type="date" value={startDate} onChange={(e) => { setQuickRange("all"); setStartDate(e.target.value); }} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
        </div>
        <div>
          <label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</label>
          <input id="end-date" type="date" value={endDate} onChange={(e) => { setQuickRange("all"); setEndDate(e.target.value); }} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
        </div>
        <div>
          <label htmlFor="min-rating" className="text-xs text-muted-foreground">Min Rating</label>
          <select id="min-rating" value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border bg-background">
            {ratingOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="max-rating" className="text-xs text-muted-foreground">Max Rating</label>
          <select id="max-rating" value={maxRating} onChange={(e) => setMaxRating(Number(e.target.value))} className="w-full mt-1 px-3 py-2 rounded-md border bg-background">
            {ratingOptions.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setRangeFromQuickFilter("all")} className={`px-3 py-1.5 rounded-full border text-sm ${quickRange === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>All</button>
        <button onClick={() => setRangeFromQuickFilter("week")} className={`px-3 py-1.5 rounded-full border text-sm ${quickRange === "week" ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>Last 7 days</button>
        <button onClick={() => setRangeFromQuickFilter("month")} className={`px-3 py-1.5 rounded-full border text-sm ${quickRange === "month" ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>Last month</button>
        <button onClick={() => setRangeFromQuickFilter("3months")} className={`px-3 py-1.5 rounded-full border text-sm ${quickRange === "3months" ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>Last 3 months</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average Niharika Rating</p>
          <p className="text-2xl font-bold">{avgNiharika.toFixed(2)} / 5</p>
          <p className="text-lg">{ratingToHearts(avgNiharika)}</p>
          <p className="text-xs text-muted-foreground mt-1">Based on {averageRangeLabel}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average Shubhro Rating</p>
          <p className="text-2xl font-bold">{avgShubhro.toFixed(2)} / 5</p>
          <p className="text-lg">{ratingToHearts(avgShubhro)}</p>
          <p className="text-xs text-muted-foreground mt-1">Based on {averageRangeLabel}</p>
        </div>
      </div>

      {isLoading && <div className="p-4">Loading ratings...</div>}
      {error && <div className="p-4 text-destructive">Failed to load ratings</div>}

      <div className="space-y-3">
        {filtered.map((row) => {
          const nRating = Number(row.niharika_rating || 0);
          const sRating = Number(row.shubro_rating || 0);
          return (
            <button
              key={row.rowNumber}
              onClick={() => openEdit(row)}
              className="w-full text-left rounded-xl border bg-card p-4 hover:border-primary/60 transition"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold">{row.date || "No date"}</p>
                  <p className="text-sm text-muted-foreground">{row.shubhro_comments || "No comments"}</p>
                </div>
                <div className="text-sm">
                  <p>Niharika: {ratingToHearts(nRating)} ({nRating})</p>
                  <p>Shubhro: {ratingToHearts(sRating)} ({sRating})</p>
                </div>
              </div>
              <div className="mt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
                <p><span className="font-medium text-foreground">Good:</span> {row.good_action_shubhro || "-"}</p>
                <p><span className="font-medium text-foreground">Bad:</span> {row.bad_action_shubhro || "-"}</p>
                <p><span className="font-medium text-foreground">Future:</span> {row.future_imporvement || "-"}</p>
              </div>
            </button>
          );
        })}
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-muted-foreground border rounded-xl bg-card">No rows found for selected filters.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-[200] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl bg-background border shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingRow ? "Edit Entry" : "New Entry"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="px-2 py-1 rounded border">Close</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="form-date" className="text-xs text-muted-foreground">Date</label>
                <input id="form-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
              </div>
              <div>
                <label htmlFor="form-niharika-rating" className="text-xs text-muted-foreground">Niharika Rating</label>
                <select id="form-niharika-rating" value={form.niharika_rating} onChange={(e) => setForm({ ...form, niharika_rating: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background">
                  {ratingOptions.map((r) => <option key={r} value={r}>{r} {ratingToHearts(r)}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="form-shubhro-rating" className="text-xs text-muted-foreground">Shubhro Rating</label>
                <select id="form-shubhro-rating" value={form.shubro_rating} onChange={(e) => setForm({ ...form, shubro_rating: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background">
                  {ratingOptions.map((r) => <option key={r} value={r}>{r} {ratingToHearts(r)}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="form-good-action" className="text-xs text-muted-foreground">Good Action by Shubhro</label>
                <input id="form-good-action" value={form.good_action_shubhro} onChange={(e) => setForm({ ...form, good_action_shubhro: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="form-bad-action" className="text-xs text-muted-foreground">Bad Action by Shubhro</label>
                <input id="form-bad-action" value={form.bad_action_shubhro} onChange={(e) => setForm({ ...form, bad_action_shubhro: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="form-comments" className="text-xs text-muted-foreground">Shubhro Comments</label>
                <textarea id="form-comments" value={form.shubhro_comments} onChange={(e) => setForm({ ...form, shubhro_comments: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" rows={3} />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="form-future" className="text-xs text-muted-foreground">Future Improvement</label>
                <textarea id="form-future" value={form.future_imporvement} onChange={(e) => setForm({ ...form, future_imporvement: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-md border bg-background" rows={3} />
              </div>
            </div>

            <button
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {editingRow ? "Save Changes" : "Create Entry"}
            </button>

            {editingRow && (
              <button
                onClick={() => deleteMutation.mutate(editingRow.rowNumber)}
                disabled={deleteMutation.isPending || createMutation.isPending || updateMutation.isPending}
                className="w-full py-2 rounded-lg border border-destructive text-destructive font-semibold disabled:opacity-60"
              >
                Delete Entry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
