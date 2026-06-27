import type { GroupNode } from "@shared/routes";

export interface GroupTreeNode extends GroupNode {
  depth: number;
  children: GroupTreeNode[];
}

/**
 * Builds a nested tree from a flat list of group nodes. Groups whose parent is
 * null or points to a missing group are treated as top-level. Cycles are broken
 * defensively so a malformed list can never cause infinite recursion.
 */
export function buildTree(nodes: GroupNode[]): GroupTreeNode[] {
  const names = new Set(nodes.map((n) => n.name));
  const childrenByParent = new Map<string | null, GroupNode[]>();

  for (const node of nodes) {
    const parent = node.parent && names.has(node.parent) ? node.parent : null;
    const list = childrenByParent.get(parent) ?? [];
    list.push({ ...node, parent });
    childrenByParent.set(parent, list);
  }

  const visited = new Set<string>();

  const build = (parent: string | null, depth: number): GroupTreeNode[] => {
    const list = childrenByParent.get(parent) ?? [];
    return list
      .filter((node) => !visited.has(node.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((node) => {
        visited.add(node.name);
        return {
          ...node,
          depth,
          children: build(node.name, depth + 1),
        };
      });
  };

  return build(null, 0);
}

/**
 * Flattens a tree into a depth-first ordered list (useful for indented rendering).
 */
export function flattenTree(tree: GroupTreeNode[]): GroupTreeNode[] {
  const result: GroupTreeNode[] = [];
  const walk = (nodes: GroupTreeNode[]) => {
    for (const node of nodes) {
      result.push(node);
      walk(node.children);
    }
  };
  walk(tree);
  return result;
}

/**
 * Returns the set of all descendant group names of `name` (not including itself).
 */
export function getDescendants(nodes: GroupNode[], name: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent) continue;
    const list = childrenByParent.get(node.parent) ?? [];
    list.push(node.name);
    childrenByParent.set(node.parent, list);
  }

  const result = new Set<string>();
  const stack = [...(childrenByParent.get(name) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    stack.push(...(childrenByParent.get(current) ?? []));
  }
  return result;
}

/**
 * Returns the ordered list of ancestor group names of `name` (closest first).
 */
export function getAncestors(nodes: GroupNode[], name: string): string[] {
  const parentByName = new Map<string, string | null>();
  for (const node of nodes) parentByName.set(node.name, node.parent);

  const result: string[] = [];
  const seen = new Set<string>();
  let current = parentByName.get(name) ?? null;
  while (current && !seen.has(current)) {
    seen.add(current);
    result.push(current);
    current = parentByName.get(current) ?? null;
  }
  return result;
}

/**
 * Returns true if assigning `newParent` to `name` would create a cycle, i.e.
 * `newParent` is `name` itself or one of its descendants.
 */
export function wouldCreateCycle(
  nodes: GroupNode[],
  name: string,
  newParent: string | null,
): boolean {
  if (!newParent) return false;
  if (newParent === name) return true;
  return getDescendants(nodes, name).has(newParent);
}
