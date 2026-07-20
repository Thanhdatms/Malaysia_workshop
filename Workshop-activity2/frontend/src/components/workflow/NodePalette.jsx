import { NODE_TYPES, NODE_TYPE_ORDER } from './nodeConfig';

export default function NodePalette() {
  function onDragStart(event, nodeType) {
    event.dataTransfer.setData('application/workflow-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="wf-palette">
      <div className="wf-palette__title">Drag onto canvas</div>
      {NODE_TYPE_ORDER.map((key) => {
        const cfg = NODE_TYPES[key];
        return (
          <div
            key={key}
            className="wf-palette__item"
            style={{ borderLeftColor: cfg.color }}
            draggable
            onDragStart={(e) => onDragStart(e, key)}
          >
            <span className="wf-palette__dot" style={{ background: cfg.color }} />
            {cfg.label}
          </div>
        );
      })}
      <p className="muted" style={{ fontSize: '0.78rem', marginTop: 14 }}>
        Drag a box onto the canvas, then drag from its edge to another box to draw an arrow.
        Click a title or description to edit the text.
      </p>
    </aside>
  );
}
