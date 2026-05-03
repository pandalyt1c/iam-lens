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

const MIN_WIDTH = 180;
const MAX_WIDTH = 320;
const CHAR_PX = 7.2;
const PADDING_X = 28;
const LINE_HEIGHT = 17;
const MIN_HEIGHT = 44;
const VERTICAL_PADDING = 20;

function sizeFor(label: string): { width: number; height: number } {
  const idealWidth = label.length * CHAR_PX + PADDING_X;
  const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, idealWidth));
  const charsPerLine = Math.max(8, Math.floor((width - PADDING_X) / CHAR_PX));
  const lines = Math.max(1, Math.ceil(label.length / charsPerLine));
  const height = Math.max(MIN_HEIGHT, lines * LINE_HEIGHT + VERTICAL_PADDING);
  return { width, height };
}

function truncate(s: string, max = 64): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function principalLabel(kind: string, value: string): string {
  if (kind === "Wildcard") return "Anyone (*)";
  return `${kind}: ${truncate(value, 56)}`;
}

function buildGraph(policy: ParsedPolicy): { nodes: GraphNode[]; edges: Edge[] } {
  const nodes: GraphNode[] = [];
  const edges: Edge[] = [];
  const principalIds = new Map<string, string>();

  policy.statements.forEach((s, sIdx) => {
    const stmtId = `stmt-${sIdx}`;
    const stmtLabel = s.sid ?? `Statement ${sIdx + 1}`;
    const stmtSize = sizeFor(stmtLabel);
    nodes.push({
      id: stmtId,
      type: "statement",
      data: {
        label: stmtLabel,
        effect: s.effect,
      },
      position: { x: 0, y: 0 },
      width: stmtSize.width,
      height: stmtSize.height,
      className: s.effect === "Allow" ? "rf-stmt-allow" : "rf-stmt-deny",
    });

    s.principals.forEach((p, pIdx) => {
      const key = `${p.kind}:${p.value}`;
      let pid = principalIds.get(key);
      if (!pid) {
        pid = `prin-${sIdx}-${pIdx}`;
        principalIds.set(key, pid);
        const label = principalLabel(p.kind, p.value);
        const size = sizeFor(label);
        nodes.push({
          id: pid,
          type: "principal",
          data: {
            label,
            isWildcard: p.kind === "Wildcard",
          },
          position: { x: 0, y: 0 },
          width: size.width,
          height: size.height,
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
    const label = `${actionPrefix}${a}`;
    const size = sizeFor(label);
    nodes.push({
      id,
      type: "action",
      data: {
        label,
        isWildcard: a === "*",
      },
      position: { x: 0, y: 0 },
      width: size.width,
      height: size.height,
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
    const size = sizeFor("(no resource)");
    nodes.push({
      id,
      type: "resource",
      data: { label: "(no resource)" },
      position: { x: 0, y: 0 },
      width: size.width,
      height: size.height,
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
    const label = `${resourcePrefix}${truncate(r, 80)}`;
    const size = sizeFor(label);
    nodes.push({
      id,
      type: "resource",
      data: {
        label,
        isWildcard: r === "*",
      },
      position: { x: 0, y: 0 },
      width: size.width,
      height: size.height,
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
  g.setGraph({ rankdir: "LR", nodesep: 18, ranksep: 90 });

  nodes.forEach((n) =>
    g.setNode(n.id, {
      width: n.width ?? MIN_WIDTH,
      height: n.height ?? MIN_HEIGHT,
    }),
  );
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  nodes.forEach((n) => {
    const pos = g.node(n.id);
    const w = n.width ?? MIN_WIDTH;
    const h = n.height ?? MIN_HEIGHT;
    n.position = { x: pos.x - w / 2, y: pos.y - h / 2 };
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
