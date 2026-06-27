import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  FolderTree,
  Plus,
  Pencil,
  Trash2,
  Save,
  Search,
  ChevronRight,
  X,
  Check,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RestrictedMultiSelect } from "@/components/ui_compound/MultiSelect";
import { useToast } from "@/hooks/use-toast";
import { useActivityGroups, useSaveActivityGroups } from "@/hooks/useActivityGroups";
import { useActivityTaxonomy } from "@/hooks/useActivityTaxonomy";
import {
  buildTree,
  flattenTree,
  getDescendants,
  wouldCreateCycle,
} from "@/lib/groupTree";
import type { GroupNode, ActivityTaxonomyEntry } from "@shared/routes";

const NONE_VALUE = "__none__";

const ActivityGroups: React.FC = () => {
  const { toast } = useToast();
  const { data: groupsData = [], isLoading: groupsLoading } = useActivityGroups();
  const { data: taxonomy = [], isLoading: taxonomyLoading } = useActivityTaxonomy();
  const saveGroups = useSaveActivityGroups();

  // Local editable copy of the groups list.
  const [groups, setGroups] = useState<GroupNode[]>([]);
  // Track whether the user has made local edits since the last server sync
  // so we never clobber unsaved work when the query re-fetches.
  const [isDirty, setIsDirty] = useState(false);

  // Sync server data → local state whenever groupsData changes AND there are
  // no unsaved local edits.  Using staleTime:0 on the query means groupsData
  // is always fresh on mount, so the dropdown is never empty.
  React.useEffect(() => {
    if (groupsLoading || isDirty) return;
    // Defensive: filter out any malformed entries (missing name) from the server.
    setGroups(groupsData.filter((g) => g.name).map((g) => ({ ...g })));
  }, [groupsData, groupsLoading, isDirty]);

  // Add-group form state
  const [newName, setNewName] = useState("");
  const [newParent, setNewParent] = useState<string>(NONE_VALUE);

  // Edit state
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editParent, setEditParent] = useState<string>(NONE_VALUE);
  const [editChildren, setEditChildren] = useState<string[]>([]);

  // Activities browser state
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("__all__");
  const [sorting, setSorting] = useState<SortingState>([]);

  const tree = useMemo(() => buildTree(groups), [groups]);
  const orderedNodes = useMemo(() => flattenTree(tree), [tree]);
  // Derive option list from local groups state (which is always kept in sync
  // with groupsData when not dirty) plus groupsData itself as a fallback for
  // the first render before the sync effect fires.  Filter out any undefined.
  const groupNames = useMemo(() => {
    const names = new Set([
      ...groupsData.map((g) => g.name).filter(Boolean),
      ...groups.map((g) => g.name).filter(Boolean),
    ]);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [groups, groupsData]);

  const addGroup = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (groups.some((g) => g.name?.toLowerCase() === trimmed.toLowerCase())) {
      toast({
        title: "Duplicate group",
        description: `"${trimmed}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    const parent = newParent === NONE_VALUE ? null : newParent;
    setGroups((prev) => [...prev, { name: trimmed, parent }]);
    setIsDirty(true);
    setNewName("");
    setNewParent(NONE_VALUE);
  };

  const startEdit = (node: GroupNode) => {
    setEditingName(node.name);
    setEditName(node.name);
    setEditParent(node.parent ?? NONE_VALUE);
    setEditChildren(groups.filter((g) => g.parent === node.name).map((g) => g.name));
  };

  const cancelEdit = () => {
    setEditingName(null);
    setEditName("");
    setEditParent(NONE_VALUE);
    setEditChildren([]);
  };

  const saveEdit = () => {
    if (!editingName) return;
    const original = editingName;
    const trimmed = editName.trim();
    if (!trimmed) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    // Duplicate name check (ignoring the group being renamed).
    if (
      trimmed.toLowerCase() !== original.toLowerCase() &&
      groups.some((g) => g.name?.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast({
        title: "Duplicate group",
        description: `"${trimmed}" already exists.`,
        variant: "destructive",
      });
      return;
    }

    const newParentVal = editParent === NONE_VALUE ? null : editParent;
    if (newParentVal && wouldCreateCycle(groups, original, newParentVal)) {
      toast({
        title: "Invalid parent",
        description: "A group cannot be nested under itself or its descendants.",
        variant: "destructive",
      });
      return;
    }

    setIsDirty(true);
    setGroups((prev) => {
      const childSet = new Set(editChildren);
      return prev.map((g) => {
        let next = { ...g };
        // Rename: update the node itself.
        if (g.name === original) {
          next = { ...next, name: trimmed, parent: newParentVal };
        }
        // Re-point parents that referenced the old name (for renames).
        if (g.parent === original) {
          next = { ...next, parent: trimmed };
        }
        return next;
      }).map((g) => {
        // Apply subgroup reassignment: selected children get this group as parent;
        // groups that were children but were unselected get detached to top-level.
        if (g.name === trimmed) return g; // don't reparent self
        const wasChild = prev.find((p) => p.name === g.name)?.parent === original;
        if (childSet.has(g.name)) {
          return { ...g, parent: trimmed };
        }
        if (wasChild && !childSet.has(g.name)) {
          return { ...g, parent: null };
        }
        return g;
      });
    });
    cancelEdit();
  };

  const deleteGroup = (name: string) => {
    const hasChildren = groups.some((g) => g.parent === name);
    if (hasChildren) {
      toast({
        title: "Cannot delete",
        description: `"${name}" has subgroups. Reassign or delete them first.`,
        variant: "destructive",
      });
      return;
    }
    setIsDirty(true);
    setGroups((prev) => prev.filter((g) => g.name !== name));
    if (editingName === name) cancelEdit();
  };

  const handlePersist = async () => {
    try {
      await saveGroups.mutateAsync(groups);
      setIsDirty(false);
      toast({ title: "Saved", description: "Activity groups updated." });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // ─── Activities table ──────────────────────────────────────────────────────

  const filteredActivities = useMemo<ActivityTaxonomyEntry[]>(() => {
    let entries = taxonomy.filter((e) => e.groups.length > 0);

    if (groupFilter !== "__all__") {
      const allowed = new Set<string>([
        groupFilter,
        ...Array.from(getDescendants(groups, groupFilter)),
      ]);
      entries = entries.filter((e) => e.groups.some((g) => allowed.has(g)));
    }
    return entries;
  }, [taxonomy, groupFilter, groups]);

  const columns = useMemo<ColumnDef<ActivityTaxonomyEntry>[]>(
    () => [
      {
        accessorKey: "activity_name",
        header: "Activity",
        cell: (info) => (
          <span className="font-medium">{info.getValue() as string}</span>
        ),
        filterFn: "includesString",
      },
      {
        id: "groups",
        accessorFn: (row) => row.groups.join(", "),
        header: "Groups",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.groups.map((g) => (
              <Badge key={g} variant="secondary">
                {g}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "tags",
        accessorFn: (row) => row.tags.join(", "),
        header: "Tags",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "is_background",
        header: "Background",
        cell: (info) => ((info.getValue() as boolean) ? "Yes" : "—"),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredActivities,
    columns,
    state: {
      sorting,
      globalFilter: search,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setSearch,
    globalFilterFn: (row, _columnId, filterValue) => {
      const name = (row.original.activity_name || "").toLowerCase();
      return name.includes(String(filterValue).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isLoading = groupsLoading || taxonomyLoading;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/activity-manager">
            <a
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              aria-label="Back to Activity Manager"
            >
              <ArrowLeft className="w-5 h-5" />
            </a>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderTree className="w-6 h-6" /> Activity Groups
            </h1>
            <p className="text-sm text-muted-foreground">
              Create nested groups and browse the activities assigned to them.
            </p>
          </div>
        </div>
        <Button
          onClick={handlePersist}
          disabled={saveGroups.isPending || isLoading}
          data-testid="save-groups-button"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveGroups.isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* ─── Group management ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Manage Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add-group form */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-group-input" className="text-sm font-medium">
                New group name
              </label>
              <Input
                id="new-group-input"
                placeholder="e.g. Deep Work"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addGroup();
                  }
                }}
                data-testid="new-group-input"
                className="sm:w-52"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Select parent group</label>
              <Select value={newParent} onValueChange={setNewParent}>
                <SelectTrigger className="sm:w-52" data-testid="new-group-parent">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None (top-level)</SelectItem>
                  {groupNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="secondary" onClick={addGroup} data-testid="add-group-button">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {/* Group tree */}
          {isLoading ? (
            <div className="text-muted-foreground" data-testid="groups-loading">
              Loading groups…
            </div>
          ) : orderedNodes.length === 0 ? (
            <div className="text-muted-foreground" data-testid="groups-empty">
              No groups yet. Create your first group above.
            </div>
          ) : (
            <div className="space-y-1" data-testid="group-tree">
              {orderedNodes.map((node) =>
                editingName === node.name ? (
                  <div
                    key={node.name}
                    className="rounded-lg border border-border p-3 space-y-3"
                    style={{ marginLeft: `${node.depth * 1.5}rem` }}
                    data-testid={`group-edit-${node.name}`}
                  >
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        data-testid="edit-group-name"
                        className="sm:max-w-xs"
                      />
                      <Select value={editParent} onValueChange={setEditParent}>
                        <SelectTrigger className="sm:max-w-xs" data-testid="edit-group-parent">
                          <SelectValue placeholder="Parent group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None (top-level)</SelectItem>
                          {groupNames
                            .filter(
                              (name) =>
                                name !== node.name &&
                                !getDescendants(groups, node.name).has(name),
                            )
                            .map((name) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Subgroups (groups nested under this one)
                      </label>
                      <RestrictedMultiSelect
                        options={groupNames.filter(
                          (name) =>
                            name !== node.name &&
                            !getDescendants(groups, node.name).has(name),
                        )}
                        value={editChildren}
                        onChange={setEditChildren}
                        placeholder="Select subgroups…"
                        inputId={`edit-children-${node.name}`}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} data-testid="cancel-edit-button">
                        <X className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={saveEdit} data-testid="confirm-edit-button">
                        <Check className="w-4 h-4 mr-1" /> Apply
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={node.name}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/50 group"
                    style={{ marginLeft: `${node.depth * 1.5}rem` }}
                    data-testid={`group-item-${node.name}`}
                  >
                    {node.depth > 0 && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-lg font-semibold">{node.name}</span>
                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(node)}
                        aria-label={`Edit ${node.name}`}
                        data-testid={`edit-group-${node.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteGroup(node.name)}
                        aria-label={`Delete ${node.name}`}
                        data-testid={`remove-group-${node.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Activities browser ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative sm:max-w-xs flex-1">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
                data-testid="activity-search"
              />
            </div>
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="sm:max-w-xs" data-testid="group-filter">
                <SelectValue placeholder="Filter by group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All groups</SelectItem>
                {groupNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="max-h-[28rem] overflow-auto rounded-lg border border-border"
            data-testid="activities-scroll"
          >
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : undefined
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{ asc: "▲", desc: "▼" }[
                            header.column.getIsSorted() as string
                          ] ?? null}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center text-muted-foreground py-8"
                      data-testid="activities-empty"
                    >
                      No activities match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-testid={`activity-row-${row.original.activity_name}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="align-top">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityGroups;
