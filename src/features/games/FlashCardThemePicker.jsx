import React from 'react';
import { FLASH_CARD_THEMES } from './gameCatalog.js';

export default function FlashCardThemePicker({ value, onChange }) {
  return <div className="gm-theme-picker" role="radiogroup" aria-label="Chọn chủ đề thẻ ghi nhớ">
    {FLASH_CARD_THEMES.map((theme) => <button
      type="button"
      role="radio"
      aria-checked={value === theme.id}
      className={`gm-theme-choice gm-theme-${theme.id} ${value === theme.id ? 'is-selected' : ''}`}
      key={theme.id}
      onClick={() => onChange(theme.id)}
    >
      <span aria-hidden="true">{theme.emoji}</span>
      <strong>{theme.name}</strong>
    </button>)}
  </div>;
}
