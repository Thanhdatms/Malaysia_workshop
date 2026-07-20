import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './workflow.css';
import WorkflowNode from './WorkflowNode';
import NodePalette from './NodePalette';
import { WorkflowActionsProvider } from './WorkflowActionsContext';
import { NODE_TYPES } from './nodeConfig';

const nodeTypes = { workflowNode: WorkflowNode };
const defaultEdgeOptions = { markerEnd: { type: MarkerType.ArrowClosed } };

let counter = 0;
function newId(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export default function WorkflowCanvas({
  initialNodes,
  initialEdges,
  onGraphChange,
  readOnly = false,
  compact = false,
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (onGraphChange) onGraphChange(nodes, edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const updateNodeData = useCallback(
    (id, patch) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
      );
    },
    [setNodes]
  );

  const deleteNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  const onConnect = useCallback(
    (connection) => {
      setEdges((eds) => addEdge({ ...connection, id: newId('edge') }, eds));
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/workflow-node-type');
      if (!nodeType || !NODE_TYPES[nodeType]) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const config = NODE_TYPES[nodeType];
      setNodes((nds) =>
        nds.concat({
          id: newId('node'),
          type: 'workflowNode',
          position,
          data: { nodeType, label: config.label, description: '' },
        })
      );
    },
    [screenToFlowPosition, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <WorkflowActionsProvider value={{ updateNodeData, deleteNode, readOnly }}>
      <div
        className={`wf-layout ${readOnly ? 'wf-layout--readonly' : ''} ${compact ? 'wf-layout--compact' : ''}`}
      >
        {!readOnly && <NodePalette />}
        <div
          className="wf-canvas"
          ref={wrapperRef}
          onDrop={readOnly ? undefined : onDrop}
          onDragOver={readOnly ? undefined : onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={readOnly ? undefined : onNodesChange}
            onEdgesChange={readOnly ? undefined : onEdgesChange}
            onConnect={readOnly ? undefined : onConnect}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={18} />
            <Controls showInteractive={!readOnly} />
            <MiniMap pannable zoomable />
          </ReactFlow>
        </div>
      </div>
    </WorkflowActionsProvider>
  );
}
