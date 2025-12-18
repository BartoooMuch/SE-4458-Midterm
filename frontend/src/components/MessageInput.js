import React from 'react';

export const MessageInput = ({ value, onChange, onSend, disabled }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(value);
    }
  };

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <input
          type="text"
          className="message-input"
          placeholder="What can I assist you?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <button
          className="send-button"
          onClick={() => onSend(value)}
          disabled={disabled || !value.trim()}
        >
          <span className="send-button-icon">→</span>
        </button>
      </div>
    </div>
  );
};


