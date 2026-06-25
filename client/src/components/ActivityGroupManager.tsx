import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSaveActivityGroups } from "@/hooks/useActivityGroups";

interface ActivityGroupManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGroups: string[];
}

const ActivityGroupManager: React.FC<ActivityGroupManagerProps> = ({
  open,
  onOpenChange,
  currentGroups,
}) => {
  const { toast } = useToast();
  const saveMutation = useSaveActivityGroups();

  const [groups, setGroups] = useState<string[]>([]);
  const [newGroupInput, setNewGroupInput] = useState("");

  // Sync local state when dialog opens with current saved groups
  React.useEffect(() => {
    if (open) {
      setGroups([...currentGroups]);
      setNewGroupInput("");
    }
  }, [open, currentGroups]);

  const addGroup = () => {
    const trimmed = newGroupInput.trim();
    if (!trimmed) return;
    if (groups.some((g) => g.toLowerCase() === trimmed.toLowerCase())) {
      toast({ title: "Duplicate", description: `"${trimmed}" already exists.`, variant: "destructive" });
      return;
    }
    setGroups((prev) => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));
    setNewGroupInput("");
  };

  const removeGroup = (name: string) => {
    setGroups((prev) => prev.filter((g) => g !== name));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addGroup();
    }
  };

  const handleSave = async () => {
    // Auto-flush any text still in the input field
    let finalGroups = groups;
    const pending = newGroupInput.trim();
    if (pending && !groups.some((g) => g.toLowerCase() === pending.toLowerCase())) {
      finalGroups = [...groups, pending].sort((a, b) => a.localeCompare(b));
    }
    try {
      await saveMutation.mutateAsync(finalGroups);
      toast({ title: "Saved", description: "Activity groups updated." });
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="group-manager-dialog">
        <DialogHeader>
          <DialogTitle>Manage Groups</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="New group name…"
              value={newGroupInput}
              onChange={(e) => setNewGroupInput(e.target.value)}
              onKeyDown={handleKeyDown}
              data-testid="new-group-input"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={addGroup}
              data-testid="add-group-button"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups yet. Add one above.</p>
          ) : (
            <div className="flex flex-wrap gap-2" role="list">
              {groups.map((group) => (
                <Badge
                  key={group}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                  data-testid={`group-item-${group}`}
                  role="listitem"
                >
                  {group}
                  <button
                    type="button"
                    onClick={() => removeGroup(group)}
                    className="ml-1 rounded-sm hover:bg-destructive hover:text-white p-0.5 transition-colors"
                    aria-label={`Remove ${group}`}
                    data-testid={`remove-group-${group}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            data-testid="save-groups-button"
          >
            {saveMutation.isPending ? "Saving…" : "Save Groups"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ActivityGroupManager;
