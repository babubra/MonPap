/**
 * ConfirmDialog — кастомное модальное окно подтверждения,
 * замена window.confirm, которое конфликтует с React-рендерингом.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Да',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Фокус на кнопке подтверждения при открытии
  useEffect(() => {
    if (open) {
      setTimeout(() => confirmBtnRef.current?.focus(), 100);
    }
  }, [open]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="confirm-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className="confirm-dialog glass-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {title && <div className="confirm-dialog-title">{title}</div>}
            <div className="confirm-dialog-message">{message}</div>
            <div className="confirm-dialog-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button
                ref={confirmBtnRef}
                className="btn btn-primary btn-sm"
                onClick={onConfirm}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
