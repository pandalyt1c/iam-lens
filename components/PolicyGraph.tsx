"use client";

import { useMemo } from "react";
import dagre from "dagre";
import {
  Background,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ParsedPolicy, ParsedStatement } from "@/lib/parser";

type NodeData = {
  label: string;
  effect?: "Allow" | "Deny";
  isWildcard?: boolean;
};

type PrincipalNode = Node<NodeData, "principal">;
type StatementNode = Node<NodeData, "statement">;
type ActionNode = Node<NodeData, "action">;
type ResourceNode = Node<NodeData, "resource">;
type GraphNode = PrincipalNode | StatementNode | ActionNode | ResourceNode;

const NODE_WIDTH = 220;
const NODE_HEIGHT = 56;

function truncate(s: string, max = 40): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function principalLabel(kind: string, value: string): string {
  if (kind === "Wildcard") return "Anyone (*)";
  return `${kind}: ${truncate(value, 32)}`;
}

function buildGraph(policy: ParsedPolicy): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];
  const principalIds = new Map<string, string>();

  policy.statements.forEach((s, sIdx) => {
    const stmtId = `stmt-${sIdx}`;
    nodes.push({
      id: stmtId,
      type: "statement",
      data: {
        label: s.sid ?? `Statement ${sIdx + 1}`,
        effect: s.effect,
      },
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      className: s.effect === "Allow" ? "rf-stmt-allow" : "rf-stmt-deny",
    });

    s.principals.forEach((p, pIdx) => {
      const key = `${p.kind}:${p.value}`;
      let pid = principalIds.get(key);
      if (!pid) {
        pid = `prin-${sIdx}-${pIdx}`;
        principalIds.set(key, pid);
        nodes.push({
          id: pid,
          type: "principal",
          data: {
            label: principalLabel(p.kind, p.value),
            isWildcard: p.kind === "Wildcard",
          },
          position: { x: 0, y: 0 },
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          className: p.kind === "Wildcard" ? "rf-principal rf-wildcard" : "rf-principal",
        });
      }
      edges.push({
        id: `e-${pid}-${stmtId}`,
        source: pid,
        target: stmtId,
        animated: s.effect === "Allow",
      });
    });

    addLeafNodes(s, sIdx, stmtId, nodes, edges);
  });

  layout(nodes, edges);
  return { nodes, edges };
}

function addLeafNodes(
  s: ParsedStatement,
  sIdx: number,
  stmtId: string,
  nodes: GraphNode[],
  edges: Edge[],
) {
  const actionPrefix = s.isNotAction ? "NOT " : "";
  s.actions.forEach((a, i) => {
    const id = `act-${sIdx}-${i}`;
    nodes.push({
      id,
      type: "action",
      data: {
        label: `${actionPrefix}${a}`,
        isWildcard: a === "*",
      },
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      className: a === "*" ? "rf-action rf-wildcard" : "rf-action",
    });
    edges.push({
      id: `e-${stmtId}-${id}`,
      source: stmtId,
      target: id,
    });
  });

  if (s.resources.length === 0) {
    const id = `res-${sIdx}-none`;
    nodes.push({
      id,
      type: "resource",
      data: { label: "(no resource)" },
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      className: "rf-resource",
    });
    s.actions.forEach((_, i) => {
      edges.push({
        id: `e-act-${sIdx}-${i}-${id}`,
        source: `act-${sIdx}-${i}`,
        target: id,
      });
    });
    return;
  }

  const resourcePrefix = s.isNotResource ? "NOT " : "";
  s.resources.forEach((r, j) => {
    const id = `res-${sIdx}-${j}`;
    nodes.push({
      id,
      type: "resource",
      data: {
        label: `${resourcePrefix}${truncate(r, 36)}`,
        isWildcard: r === "*",
      },
      position: { x: 0, y: 0 },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      className: r === "*" ? "rf-resource rf-wildcard" : "rf-resource",
    });
    s.actions.forEach((_, i) => {
      edges.push({
        id: `e-act-${sIdx}-${i}-res-${j}`,
        source: `act-${sIdx}-${i}`,
        target: id,
      });
    });
  });
}

function layout(nodes: GraphNode[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 24, ranksep: 80 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  nodes.forEach((n) => {
    const pos = g.node(n.id);
    n.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
    n.targetPosition = Position.Left;
    n.sourcePosition = Position.Right;
  });
}

export function PolicyGraph({ policy }: { policy: ParsedPolicy }) {
  const { nodes, edges } = useMemo(() => buildGraph(policy), [policy]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
        Nothing to graph yet.
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-md border border-border/60">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
      >
        <Background gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(15,23,42,0.6)"
          bgColor="#0a0a0a"
          nodeColor={(n) => {
            if (n.type === "statement") {
              return n.data?.effect === "Deny" ? "#ef4444" : "#10b981";
            }
            if (n.data?.isWildcard) return "#f59e0b";
            if (n.type === "principal") return "#94a3b8";
            if (n.type === "action") return "#cbd5e1";
            return "#818cf8";
          }}
          nodeStrokeColor="#f8fafc"
          nodeStrokeWidth={3}
          nodeBorderRadius={4}
        />
      </ReactFlow>
    </div>
  );
}
