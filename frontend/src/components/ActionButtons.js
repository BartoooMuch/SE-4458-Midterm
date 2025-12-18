import React from 'react';

export const ActionButtons = ({ onActionClick }) => {
  return (
    <div className="action-buttons-container">
      <div className="action-buttons">
        <button 
          className="action-button"
          onClick={() => onActionClick('query')}
        >
          <span className="action-button-icon">🔍</span>
          <span>Query Bill</span>
        </button>
        <button 
          className="action-button"
          onClick={() => onActionClick('queryDetailed')}
        >
          <span className="action-button-icon">📄</span>
          <span>Query Bill Detailed</span>
        </button>
        <button 
          className="action-button"
          onClick={() => onActionClick('pay')}
        >
          <span className="action-button-icon">💳</span>
          <span>Pay Bill</span>
        </button>
      </div>
    </div>
  );
};


