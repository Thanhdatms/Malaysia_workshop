import { Handle, Position } from '@xyflow/react';
import { useWorkflowActions } from './WorkflowActionsContext';
import { NODE_TYPES } from './nodeConfig';

export default function WorkflowNode({ id, data, selected }) {
  const { updateNodeData, deleteNode, readOnly } = useWorkflowActions();
  const config = NODE_TYPES[data.nodeType] || NODE_TYPES.trigger;

  return (
    <div
      className="wf-node"
      style={{
        borderColor: config.color,
        boxShadow: selected ? `0 0 0 3px ${config.color}4d, var(--shadow)` : 'var(--shadow)',
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div className="wf-node__header" style={{ background: config.color }}>
        <span>{config.label}</span>
        {!readOnly && (
          <button
            type="button"
            className="wf-node__delete nodrag"
            title="Delete node"
            onClick={() => deleteNode(id)}
          >
            ×
          </button>
        )}
      </div>
      <div className="wf-node__body">
        <input
          className="wf-node__title nodrag"
          value={data.label}
          placeholder="Node title..."
          readOnly={readOnly}
          onChange={(e) => !readOnly && updateNodeData(id, { label: e.target.value })}
        />
        <textarea
          className="wf-node__desc nodrag"
          value={data.description}
          placeholder="Details (optional)..."
          readOnly={readOnly}
          onChange={(e) => !readOnly && updateNodeData(id, { description: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
