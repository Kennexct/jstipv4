// Shared modal frame for the order action dialogs.
import React from 'react';
import { Overlay, I } from './ui';

export function Frame({ title, children, foot, onClose }) {
  return (
    <Overlay onClose={onClose} title="ops-dialog-title">
      <div className="dialog-content">
        <div className="modal-head">
          <div>
            <h2 id="ops-dialog-title">{title}</h2>
          </div>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
            <I name="X" size={18} />
          </button>
        </div>
        {children}
        <div className="modal-foot">{foot}</div>
      </div>
    </Overlay>
  );
}
