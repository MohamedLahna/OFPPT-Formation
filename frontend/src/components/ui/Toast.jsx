import { useState } from 'react';

export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const remove = (id) => setToasts((items) => items.filter((toast) => toast.id !== id));
  const add = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(() => remove(id), 4000);
  };
  return { toasts, remove, success: (message) => add(message, 'success'), error: (message) => add(message, 'error'), info: (message) => add(message, 'info') };
};

export const ToastContainer = ({ toasts, onRemove }) => (
  <div className="toast-stack">
    {toasts.map((toast) => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        <span>{toast.message}</span>
        <button type="button" onClick={() => onRemove(toast.id)}>×</button>
      </div>
    ))}
  </div>
);
