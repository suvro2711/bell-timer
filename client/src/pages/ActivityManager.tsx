import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Save, Settings, Tag } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useActivityTaxonomy,
  useSaveActivityTaxonomy,
  useUniqueActivities,
} from "@/hooks/useActivityTaxonomy";
import { useActivityGroups } from "@/hooks/useActivityGroups";
import {
  RestrictedMultiSelect,
  CreatableMultiSelect,
} from "@/components/ui_compound/MultiSelect";
import ActivityGroupManager from "@/components/ActivityGroupManager";

interface RowState {
  groups: string[];
  tags: string[];
  is_background: boolean;
}

const ActivityManager: React.FC = () => {
  const { toast } = useToast();
  const {
    data: uniqueActivities,
    isLoading: activitiesLoading,
    error: activitiesError,
  } = useUniqueActivities();
  const { data: taxonomy, isLoading: taxonomyLoading } = useActivityTaxonomy();
  const { data: availableGroups = [] } = useActivityGroups();
  const saveMutation = useSaveActivityTaxonomy();

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [groupManagerOpen, setGroupManagerOpen] = useState(false);

  const activityNames = useMemo(() => {
    const names = new Set<string>();
    (uniqueActivities ?? []).forEach((name) => names.add(name));
    (taxonomy ?? []).forEach((entry) => names.add(entry.activity_name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [uniqueActivities, taxonomy]);

  useEffect(() => {
    if (activitiesLoading || taxonomyLoading) return;

    const taxonomyMap = new Map(
      (taxonomy ?? []).map((entry) => [entry.activity_name, entry]),
    );

    const nextRows: Record<string, RowState> = {};
    activityNames.forEach((name) => {
      const saved = taxonomyMap.get(name);
      nextRows[name] = {
        groups: saved?.groups ?? [],
        tags: saved?.tags ?? [],
        is_background: saved?.is_background ?? false,
      };
    });
    setRows(nextRows);
  }, [activityNames, taxonomy, activitiesLoading, taxonomyLoading]);

  const updateRow = (name: string, patch: Partial<RowState>) => {
    setRows((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  };

  const handleSave = async () => {
    const entries = activityNames.map((name) => ({
      activity_name: name,
      groups: rows[name]?.groups ?? [],
      tags: rows[name]?.tags ?? [],
      is_background: rows[name]?.is_background ?? false,
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
    <div className="p-6 max-w-5xl mx-auto">
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
              Assign groups and tags to activities. Saved to your workbook.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setGroupManagerOpen(true)}
            data-testid="manage-groups-button"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Groups
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || isLoading}
            data-testid="save-button"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {activitiesError && (
        <div className="text-red-500 mb-4" data-testid="activities-error">
          Failed to load activities:{" "}
          {activitiesError instanceof Error ? activitiesError.message : "Unknown error"}
        </div>
      )}

      {isLoading ? (
        <div className="text-muted-foreground" data-testid="activities-loading">
          Loading activities…
        </div>
      ) : activityNames.length === 0 ? (
        <div className="text-muted-foreground" data-testid="activities-empty">
          No activities found in your logged data yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">Activity</TableHead>
              <TableHead className="w-1/3">Groups</TableHead>
              <TableHead className="w-1/3">Tags</TableHead>
              <TableHead className="w-16 text-center">Background</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityNames.map((name) => (
              <TableRow key={name} data-testid={`activity-row-${name}`}>
                <TableCell className="font-medium align-top pt-3">{name}</TableCell>
                <TableCell className="align-top" data-testid={`groups-select-${name}`}>
                  <RestrictedMultiSelect
                    options={availableGroups}
                    value={rows[name]?.groups ?? []}
                    onChange={(vals) => updateRow(name, { groups: vals })}
                    inputId={`groups-input-${name}`}
                    placeholder="Select groups…"
                  />
                </TableCell>
                <TableCell className="align-top" data-testid={`tags-select-${name}`}>
                  <CreatableMultiSelect
                    value={rows[name]?.tags ?? []}
                    onChange={(vals) => updateRow(name, { tags: vals })}
                    inputId={`tags-input-${name}`}
                    placeholder="Type to add tags…"
                  />
                </TableCell>
                <TableCell className="text-center align-top pt-3">
                  <Checkbox
                    checked={rows[name]?.is_background ?? false}
                    onCheckedChange={(checked) =>
                      updateRow(name, { is_background: checked === true })
                    }
                    aria-label={`${name} can run in background`}
                    data-testid={`background-checkbox-${name}`}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ActivityGroupManager
        open={groupManagerOpen}
        onOpenChange={setGroupManagerOpen}
        currentGroups={availableGroups}
      />
    </div>
  );
};

export default ActivityManager;

