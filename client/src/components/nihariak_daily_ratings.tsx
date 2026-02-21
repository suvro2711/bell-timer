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
  upset_count: number;
  upset_reason: string;
};

type FormState = {
  date: string;
  niharika_rating: number;
  good_action_shubhro: string;
  bad_action_shubhro: string;
  shubro_rating: number;
  shubhro_comments: string;
  future_imporvement: string;
  upset_reason: string;
};

type UpsetEntry = {
  timestamp: string;
  reason: string;
  intensity: number;
};

const ratingOptions = Array.from({ length: 9 }, (_, i) => 1 + i * 0.5);

/* ── SVG Heart Components ─────────────────────────────────── */

function FullHeart({ size = 22, className = "" }: Readonly<{ size?: number; className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`inline-block ${className}`}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#ef4444"
      />
    </svg>
  );
}

let halfHeartId = 0;
function HalfHeart({ size = 22, className = "" }: Readonly<{ size?: number; className?: string }>) {
  const [clipId] = useState(() => `halfClip-${++halfHeartId}`);
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`inline-block ${className}`}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="12" height="24" />
        </clipPath>
      </defs>
      {/* empty outline */}
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#e5e7eb"
        stroke="#d1d5db"
        strokeWidth="0.5"
      />
      {/* filled left half */}
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#ef4444"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}

function EmptyHeart({ size = 22, className = "" }: Readonly<{ size?: number; className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`inline-block ${className}`}>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="#e5e7eb"
        stroke="#d1d5db"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** Render a row of SVG hearts for a given rating (display only) */
function HeartDisplay({ value, size = 22 }: Readonly<{ value: number; size?: number }>) {
  const full = Math.floor(value);
  const hasHalf = value % 1 >= 0.25; // 0.5 → true
  const hearts: React.ReactNode[] = [];

  for (let i = 0; i < full; i++) hearts.push(<FullHeart key={`f${i}`} size={size} />);
  if (hasHalf) hearts.push(<HalfHeart key="h" size={size} />);
  while (hearts.length < 5) hearts.push(<EmptyHeart key={`e${hearts.length}`} size={size} />);

  return <span className="inline-flex items-center gap-0.5">{hearts}</span>;
}

/** Interactive heart rating selector with hover preview (0.5-step) */
function HeartRatingSelector({
  value,
  onChange,
  size = 30,
  label,
}: Readonly<{
  value: number;
  onChange: (v: number) => void;
  size?: number;
  label?: string;
}>) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const display = hoverValue ?? value;

  const handleClick = (heartIndex: number, isLeftHalf: boolean) => {
    onChange(isLeftHalf ? heartIndex + 0.5 : heartIndex + 1);
  };

  const handleHover = (heartIndex: number, isLeftHalf: boolean) => {
    setHoverValue(isLeftHalf ? heartIndex + 0.5 : heartIndex + 1);
  };

  const renderHeart = (isFull: boolean, isHalf: boolean, heartSize: number) => {
    if (isFull) return <FullHeart size={heartSize} />;
    if (isHalf) return <HalfHeart size={heartSize} />;
    return <EmptyHeart size={heartSize} />;
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div
        className="inline-flex items-center gap-0.5 cursor-pointer"
        onMouseLeave={() => setHoverValue(null)}
        tabIndex={-1}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const full = Math.floor(display);
          const hasHalf = display % 1 >= 0.25;
          const isFull = i < full;
          const isHalf = i === full && hasHalf;

          return (
            <span
              key={i}
              className="relative transition-transform hover:scale-110"
              style={{ width: size, height: size }}
            >
              {/* left-half click zone */}
              <button
                type="button"
                className="absolute inset-y-0 left-0 w-1/2 z-10 bg-transparent border-0 p-0 cursor-pointer"
                onMouseEnter={() => handleHover(i, true)}
                onClick={() => handleClick(i, true)}
                aria-label={`${i + 0.5} stars`}
              />
              {/* right-half click zone */}
              <button
                type="button"
                className="absolute inset-y-0 right-0 w-1/2 z-10 bg-transparent border-0 p-0 cursor-pointer"
                onMouseEnter={() => handleHover(i, false)}
                onClick={() => handleClick(i, false)}
                aria-label={`${i + 1} stars`}
              />
              {renderHeart(isFull, isHalf, size)}
            </span>
          );
        })}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{display} / 5</span>
    </div>
  );
}

/* ── Streak helper ────────────────────────────────────────── */

function computeGoodStreak(rows: RatingRow[]): { current: number; best: number } {
  // sort rows by date ascending
  const sorted = [...rows].sort((a, b) => {
    const da = (a.date || "").slice(0, 10);
    const db = (b.date || "").slice(0, 10);
    return da.localeCompare(db);
  });

  let best = 0;
  let current = 0;

  for (const row of sorted) {
    if (Number(row.niharika_rating || 0) >= 3) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }

  return { current, best };
}

const emptyForm: FormState = {
  date: new Date().toISOString().slice(0, 10),
  niharika_rating: 3,
  good_action_shubhro: "",
  bad_action_shubhro: "",
  shubro_rating: 3,
  shubhro_comments: "",
  future_imporvement: "",
  upset_reason: "",
};

function parseUpsetReason(upsetStr: string | undefined | null): UpsetEntry[] {
  if (!upsetStr || !upsetStr.trim()) return [];
  return upsetStr.split(",").map((entry) => {
    const obj: Record<string, string> = {};
    const parts = entry.split(";");
    parts.forEach((part) => {
      const colonIndex = part.indexOf(":");
      if (colonIndex > -1) {
        const key = part.substring(0, colonIndex).trim();
        let value = part.substring(colonIndex + 1).trim();
        if (key === "reason") {
          value = decodeURIComponent(value);
        }
        if (key) obj[key] = value || "";
      }
    });
    const intensityValue = obj.intensity ? Number(obj.intensity) : undefined;
    return {
      timestamp: obj.timestamp || new Date().toISOString(),
      reason: obj.reason || "",
      intensity: !isNaN(intensityValue ?? NaN) && intensityValue !== undefined ? intensityValue : 5,
    };
  }).filter((e) => e.reason);
}

function formatUpsetReason(entries: UpsetEntry[]): string {
  return entries
    .map((e) => `timestamp:${e.timestamp};reason:${encodeURIComponent(e.reason)};intensity:${e.intensity}`)
    .join(",");
}

function UpsetReasonEditor({
  value,
  onChange,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
}>) {
  const entries = parseUpsetReason(value);
  const [newReason, setNewReason] = useState("");
  const [newIntensity, setNewIntensity] = useState(5);

  const addEntry = () => {
    if (!newReason.trim()) return;
    const updated = [
      ...entries,
      {
        timestamp: new Date().toISOString(),
        reason: newReason,
        intensity: newIntensity,
      },
    ];
    onChange(formatUpsetReason(updated));
    setNewReason("");
    setNewIntensity(5);
  };

  const removeEntry = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    onChange(formatUpsetReason(updated));
  };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Add Upset Event</label>
        <textarea
          value={newReason}
          onChange={(e) => setNewReason(e.target.value)}
          placeholder="Describe what made you upset..."
          className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
          rows={2}
        />
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Intensity (1-10)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={newIntensity}
              onChange={(e) => setNewIntensity(Number(e.target.value))}
              className="w-full mt-1"
            />
            <div className="text-center text-sm font-semibold mt-1 text-red-600">{newIntensity}</div>
          </div>
          <button
            onClick={addEntry}
            className="px-3 py-2 rounded-md bg-primary text-primary-foreground font-semibold text-sm"
          >
            Add
          </button>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2 border-t pt-2">
          <label className="text-xs text-muted-foreground">Recorded Upsets ({entries.length})</label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className="p-2 rounded-md border bg-background flex justify-between items-start gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="text-sm mt-1 break-words">{entry.reason}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">Intensity:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        entry.intensity >= 8
                          ? "bg-red-600 text-white"
                          : entry.intensity >= 5
                            ? "bg-orange-500 text-white"
                            : "bg-yellow-500 text-white"
                      }`}
                    >
                      {entry.intensity}/10
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(idx)}
                  className="px-2 py-1 text-xs rounded border border-destructive text-destructive hover:bg-destructive/10"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const streak = useMemo(() => computeGoodStreak(data), [data]);

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
      upset_reason: row.upset_reason || "",
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average Niharika Rating</p>
          <p className="text-2xl font-bold">{avgNiharika.toFixed(2)} / 5</p>
          <div className="mt-1"><HeartDisplay value={avgNiharika} size={24} /></div>
          <p className="text-xs text-muted-foreground mt-1">Based on {averageRangeLabel}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Average Shubhro Rating</p>
          <p className="text-2xl font-bold">{avgShubhro.toFixed(2)} / 5</p>
          <div className="mt-1"><HeartDisplay value={avgShubhro} size={24} /></div>
          <p className="text-xs text-muted-foreground mt-1">Based on {averageRangeLabel}</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-rose-500/10 to-orange-500/10 p-4">
          <p className="text-sm text-muted-foreground">🔥 Good-Rating Streak (≥3)</p>
          <p className="text-3xl font-extrabold text-rose-500">{streak.current} day{streak.current === 1 ? "" : "s"}</p>
          <p className="text-xs text-muted-foreground mt-1">Best ever: <span className="font-semibold text-foreground">{streak.best} day{streak.best === 1 ? "" : "s"}</span></p>
          <div className="mt-1.5 flex gap-0.5">
            {Array.from({ length: Math.min(streak.current, 20) }, (_, i) => (
              <FullHeart key={i} size={14} />
            ))}
            {streak.current > 20 && <span className="text-xs text-muted-foreground ml-1">+{streak.current - 20}</span>}
          </div>
        </div>
      </div>

      {isLoading && <div className="p-4">Loading ratings...</div>}
      {error && <div className="p-4 text-destructive">Failed to load ratings</div>}

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted border-b">
            <tr>
              <th className="px-4 py-2 text-left font-semibold">Date</th>
              <th className="px-4 py-2 text-left font-semibold">Niharika</th>
              <th className="px-4 py-2 text-left font-semibold">Shubhro</th>
              <th className="px-4 py-2 text-left font-semibold">Upsets</th>
              <th className="px-4 py-2 text-left font-semibold">Comments</th>
            </tr>
          </thead>
          <tbody>
            {[...filtered].reverse().map((row) => {
              const nRating = Number(row.niharika_rating || 0);
              const sRating = Number(row.shubro_rating || 0);
              const upsetCount = parseUpsetReason(row.upset_reason).length;
              return (
                <tr key={row.rowNumber} onClick={() => openEdit(row)} className="border-b hover:bg-muted/50 cursor-pointer transition">
                  <td className="px-4 py-2 font-medium">{row.date || "No date"}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <HeartDisplay value={nRating} size={14} />
                      <span className="text-muted-foreground">({nRating})</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <HeartDisplay value={sRating} size={14} />
                      <span className="text-muted-foreground">({sRating})</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">{upsetCount > 0 ? <span className="inline-block px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">{upsetCount}</span> : "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground truncate max-w-xs">{row.shubhro_comments || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">No rows found for selected filters.</div>
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
                <HeartRatingSelector
                  label="Niharika Rating"
                  value={form.niharika_rating}
                  onChange={(v) => setForm({ ...form, niharika_rating: v })}
                  size={32}
                />
              </div>
              <div>
                <HeartRatingSelector
                  label="Shubhro Rating"
                  value={form.shubro_rating}
                  onChange={(v) => setForm({ ...form, shubro_rating: v })}
                  size={32}
                />
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
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground block mb-2">Upset Events (Optional)</label>
                <UpsetReasonEditor
                  value={form.upset_reason}
                  onChange={(value) => setForm({ ...form, upset_reason: value })}
                />
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
