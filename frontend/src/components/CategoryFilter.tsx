/**
 * CategoryFilter — кастомный dropdown для фильтрации по категориям.
 * Поддерживает поиск, множественный выбор, группировку подкатегорий, иконки.
 */

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import type { Category } from '../api';
import './CategoryFilter.css';

interface CategoryFilterProps {
  categories: Category[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

/** Строит дерево: parent → children */
function buildTree(cats: Category[]) {
  const roots: Category[] = [];
  const childrenMap = new Map<number, Category[]>();

  for (const c of cats) {
    if (c.parent_id) {
      if (!childrenMap.has(c.parent_id)) childrenMap.set(c.parent_id, []);
      childrenMap.get(c.parent_id)!.push(c);
    } else {
      roots.push(c);
    }
  }

  return { roots, childrenMap };
}

export function CategoryFilter({ categories, selectedIds, onChange }: CategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  const { roots, childrenMap } = buildTree(categories);

  const searchLower = search.toLowerCase();
  const matchesSearch = (c: Category) =>
    !search || c.name.toLowerCase().includes(searchLower);

  const isSelected = (id: number) => selectedIds.includes(id);

  function toggle(id: number) {
    // Собираем все ID, связанные с этой категорией
    const children = childrenMap.get(id) || [];
    const childIds = children.map(c => c.id);
    const allIds = [id, ...childIds]; // родитель + все дети

    if (isSelected(id)) {
      // Убираем родителя и всех детей
      onChange(selectedIds.filter((x) => !allIds.includes(x)));
    } else {
      // Добавляем родителя и всех детей (без дублей)
      const newIds = new Set([...selectedIds, ...allIds]);
      onChange(Array.from(newIds));
    }
  }

  function selectAll() {
    onChange([]);
    setOpen(false);
  }

  // Кнопка label — считаем только «корневые» выбранные (не дочерние, если родитель тоже выбран)
  const buttonLabel = (() => {
    if (selectedIds.length === 0) return 'Все';
    // Убираем дочерние, если их родитель тоже выбран
    const topLevelSelected = selectedIds.filter(id => {
      const cat = categories.find(c => c.id === id);
      return cat && (!cat.parent_id || !selectedIds.includes(cat.parent_id));
    });
    if (topLevelSelected.length === 1) {
      const cat = categories.find((c) => c.id === topLevelSelected[0]);
      return cat ? (cat.icon ? `${cat.icon} ${cat.name}` : cat.name) : 'Все';
    }
    return `${topLevelSelected.length} кат.`;
  })();

  return (
    <div className="cat-filter" ref={containerRef}>
      <button
        className={`cat-filter-btn ${selectedIds.length > 0 ? 'cat-filter-btn--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="cat-filter-btn-label">{buttonLabel}</span>
        <ChevronDown size={12} className={`cat-filter-chevron ${open ? 'cat-filter-chevron--open' : ''}`} />
      </button>

      {open && (
        <div className="cat-filter-dropdown">
          {/* Search */}
          <div className="cat-filter-search">
            <Search size={14} className="cat-filter-search-icon" />
            <input
              ref={searchInputRef}
              className="cat-filter-search-input"
              placeholder="Поиск категорий..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="cat-filter-search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options */}
          <div className="cat-filter-options">
            {/* «Все категории» */}
            <button
              className={`cat-filter-option ${selectedIds.length === 0 ? 'cat-filter-option--active' : ''}`}
              onClick={selectAll}
            >
              <span className="cat-filter-option-check">
                {selectedIds.length === 0 && <Check size={14} />}
              </span>
              <span className="cat-filter-option-label">Все категории</span>
            </button>

            {roots
              .filter((r) => {
                const children = childrenMap.get(r.id) || [];
                return matchesSearch(r) || children.some(matchesSearch);
              })
              .map((root) => {
                const children = (childrenMap.get(root.id) || []).filter(matchesSearch);
                const showRoot = matchesSearch(root);

                return (
                  <div key={root.id}>
                    {showRoot && (
                      <button
                        className={`cat-filter-option ${isSelected(root.id) ? 'cat-filter-option--active' : ''}`}
                        onClick={() => toggle(root.id)}
                      >
                        <span className="cat-filter-option-check">
                          {isSelected(root.id) && <Check size={14} />}
                        </span>
                        {root.icon && <span className="cat-filter-option-icon">{root.icon}</span>}
                        <span className="cat-filter-option-label">{root.name}</span>
                      </button>
                    )}

                    {children.map((child) => (
                      <button
                        key={child.id}
                        className={`cat-filter-option cat-filter-option--child ${isSelected(child.id) ? 'cat-filter-option--active' : ''}`}
                        onClick={() => toggle(child.id)}
                      >
                        <span className="cat-filter-option-check">
                          {isSelected(child.id) && <Check size={14} />}
                        </span>
                        {child.icon && <span className="cat-filter-option-icon">{child.icon}</span>}
                        <span className="cat-filter-option-label">{child.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}

            {/* Категории без parent, которые не root (безродные) */}
            {categories
              .filter((c) => !c.parent_id && !roots.includes(c))
              .filter(matchesSearch)
              .map((c) => (
                <button
                  key={c.id}
                  className={`cat-filter-option ${isSelected(c.id) ? 'cat-filter-option--active' : ''}`}
                  onClick={() => toggle(c.id)}
                >
                  <span className="cat-filter-option-check">
                    {isSelected(c.id) && <Check size={14} />}
                  </span>
                  {c.icon && <span className="cat-filter-option-icon">{c.icon}</span>}
                  <span className="cat-filter-option-label">{c.name}</span>
                </button>
              ))}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="cat-filter-footer">
              <button className="cat-filter-clear" onClick={selectAll}>
                Сбросить фильтр
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
