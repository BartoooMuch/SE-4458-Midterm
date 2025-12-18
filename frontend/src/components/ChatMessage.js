import React from 'react';

export const ChatMessage = ({ message }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderBillDetails = (text) => {
    // Check if message contains bill information
    const billPattern = /Amount Due: ([\d.]+) TL|Due Date: ([\d-]+)|Status: (\w+)/g;
    const matches = [...text.matchAll(billPattern)];
    
    if (matches.length > 0) {
      const details = {};
      matches.forEach(match => {
        if (match[1]) details.amount = match[1];
        if (match[2]) details.dueDate = match[2];
        if (match[3]) details.status = match[3];
      });

      return (
        <div className="bill-details">
          {details.amount && (
            <div className="bill-detail-item">
              <span className="bill-detail-label">Amount Due:</span>
              <span className="bill-detail-value">{details.amount} TL</span>
            </div>
          )}
          {details.dueDate && (
            <div className="bill-detail-item">
              <span className="bill-detail-label">Due Date:</span>
              <span className="bill-detail-value">{details.dueDate}</span>
            </div>
          )}
          {details.status && (
            <div className="bill-detail-item">
              <span className="bill-detail-label">Status:</span>
              <span className="bill-detail-value">{details.status}</span>
            </div>
          )}
        </div>
      );
    }

    // Check for bill details breakdown
    if (text.includes('Service Type:') || text.includes('Description:')) {
      const lines = text.split('\n');
      return (
        <div className="bill-details">
          {lines.map((line, index) => {
            if (line.trim() && (line.includes(':') || line.includes('-'))) {
              return (
                <div key={index} className="bill-detail-item">
                  <span className="bill-detail-value">{line.trim()}</span>
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`message ${message.sender}`}>
      <div className="message-avatar">
        {message.sender === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-bubble">
        <div>{message.text}</div>
        {renderBillDetails(message.text)}
        {message.timestamp && (
          <div className="message-timestamp">
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};


