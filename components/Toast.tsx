
import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Toast } from '../types';

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const bg = 
    toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
    toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-indigo-50 border-indigo-200 text-indigo-800';
  
  const Icon = 
    toast.type === 'success' ? CheckCircle :
    toast.type === 'error' ? AlertCircle : Info;

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in-right min-w-[300px] ${bg}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button onClick={onRemove} className="hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
