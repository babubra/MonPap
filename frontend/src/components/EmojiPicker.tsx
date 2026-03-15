/**
 * EmojiPicker — обёртка над emoji-picker-react.
 * Кнопка-триггер + попап с полным набором эмодзи.
 */

import { useState, useRef, useEffect } from 'react';
import Picker, { EmojiStyle, Theme } from 'emoji-picker-react';
import './EmojiPicker.css';

interface EmojiPickerProps {
  value: string | null;
  onChange: (emoji: string) => void;
  /** Заглушка при отсутствии иконки */
  placeholder?: string;
}

export function EmojiPicker({ value, onChange, placeholder = '😀' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Определяем тему из data-атрибута на <html>
  const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
  useEffect(() => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    setTheme(current === 'light' ? Theme.LIGHT : Theme.DARK);

    const observer = new MutationObserver(() => {
      const t = html.getAttribute('data-theme');
      setTheme(t === 'light' ? Theme.LIGHT : Theme.DARK);
    });
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="emoji-picker-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Выбрать иконку"
      >
        <span className="emoji-picker-icon">{value || placeholder}</span>
      </button>

      {open && (
        <div className="emoji-picker-popover">
          <Picker
            onEmojiClick={(emojiData) => {
              onChange(emojiData.emoji);
              setOpen(false);
            }}
            emojiStyle={EmojiStyle.NATIVE}
            theme={theme}
            searchPlaceholder="Поиск..."
            width={300}
            height={380}
            previewConfig={{ showPreview: false }}
            skinTonesDisabled
            lazyLoadEmojis
          />
          {value && (
            <button
              type="button"
              className="emoji-picker-clear"
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Убрать иконку
            </button>
          )}
        </div>
      )}
    </div>
  );
}
