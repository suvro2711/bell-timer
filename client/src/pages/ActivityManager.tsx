import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Save, Tag } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useActivityTaxonomy,
  useSaveActivityTaxonomy,
  useUniqueActivities,
} from "@/hooks/useActivityTaxonomy";

interface RowState {
  group: string;
  tagsInput: string;
}

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  );
}

const ActivityManager: React.FC = () => {
  const { toast } = useToast();
  const {
    data: uniqueActivities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUniqueActivities();
  const { data: taxonomy, isLoading: taxonomyLoading } = useActivityTaxonomy();
  const saveMutation = useSaveActivityTaxonomy();

  const [rows, setRows] = useState<Record<string, RowState>>({});

  // Merge unique activities (from logged data) with any persisted mappings.
  const activityNames = useMemo(() => {
    const names = new Set<string>();
    (uniqueActivities ?? []).forEach((name) => names.add(name));
    (taxonomy ?? []).forEach((entry) => names.add(entry.activity_name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [uniqueActivities, taxonomy]);

  // Initialise editable row state once data has loaded.
  useEffect(() => {
    if (activitiesLoading || taxonomyLoading) return;

    const taxonomyMap = new Map(
      (taxonomy ?? []).map((entry) => [entry.activity_name, entry]),
    );

    const nextRows: Record<string, RowState> = {};
    activityNames.forEach((name) => {
      const saved = taxonomyMap.get(name);
      nextRows[name] = {
        group: saved?.group ?? "",
        tagsInput: (saved?.tags ?? []).join(", "),
      };
    });
    setRows(nextRows);
  }, [activityNames, taxonomy, activitiesLoading, taxonomyLoading]);

  const knownGroups = useMemo(() => {
    const groups = new Set<string>();
    Object.values(rows).forEach((row) => {
      if (row.group.trim()) groups.add(row.group.trim());
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const updateRow = (name: string, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...patch },
    }));
  };

  const handleSave = async () => {
    const entries = activityNames.map((name) => ({
      activity_name: name,
      group: (rows[name]?.group ?? "").trim(),
      tags: parseTags(rows[name]?.tagsInput ?? ""),
    }));

    try {
      await saveMutation.mutateAsync(entries);
      toast({ title: "Saved", description: "Activity groups and tags were saved." });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const isLoading = activitiesLoading || taxonomyLoading;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <a className="p-2 hover:bg-secondary rounded-lg transition-colors" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </a>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="w-6 h-6" /> Activity Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Group and tag your unique activities. Saved to your workbook.
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending || isLoading} data-testid="save-button">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {activitiesError && (
        <div className="text-red-500 mb-4" data-testid="activities-error">
          Failed to load activities: {activitiesError instanceof Error ? activitiesError.message : "Unknown error"}
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground" data-testid="activities-loading">Loading activities...</div>
      ) : activityNames.length === 0 ? (
        <div className="text-muted-foreground" data-testid="activities-empty">No activities found in your logged data yet.</div>
      ) : (
        <>
          {knownGroups.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Groups:</span>
              {knownGroups.map((group) => (
                <Badge key={group} variant="secondary">
                  {group}
                </Badge>
              ))}
            </div>
          )}

          <datalist id="known-groups">
            {knownGroups.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Activity</TableHead>
                <TableHead className="w-1/4">Group</TableHead>
                <TableHead>Tags (comma separated)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityNames.map((name) => (
                <TableRow key={name} data-testid={`activity-row-${name}`}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell>
                    <Input
                      list="known-groups"
                      placeholder="e.g. Work"
                      data-testid={`group-input-${name}`}
                      value={rows[name]?.group ?? ""}
                      onChange={(e) => updateRow(name, { group: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="e.g. focus, billable"
                      data-testid={`tags-input-${name}`}
                      value={rows[name]?.tagsInput ?? ""}
                      onChange={(e) => updateRow(name, { tagsInput: e.target.value })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
};

export default ActivityManager;
