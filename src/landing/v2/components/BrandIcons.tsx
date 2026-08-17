'use client';

import React from 'react';
import {
  GeminiFilled,
  MistralFilled,
  OpenAIFilled,
  TelegramFilled,
  WhatsAppOutlined,
} from '@ant-design/icons';
import {
  CalendarDays,
  Coins,
  Database,
  HardDrive,
  MessageSquareCode,
  Sheet,
} from 'lucide-react';

/**
 * Иконки брендов для блока интеграций.
 *
 * 'use client' обязателен: компоненты из @ant-design/icons читают React-контекст
 * (IconContext), а в Server Component обращение к useContext падает. Иконки —
 * листовые и невесомые, поэтому клиентская граница здесь ничего не стоит,
 * а разметка всё равно приезжает в SSR-HTML.
 *
 * Все иконки МОНОХРОМНЫЕ и красятся через currentColor: фирменные цвета
 * ломали бы обе темы (на графите половина логотипов проваливается, на белом —
 * рябит). Единый цвет задаётся токеном на родителе.
 *
 * @ant-design/icons уже присутствует в бандле лендинга: его тянут сами
 * компоненты antd (Collapse, Drawer, Segmented), поэтому три иконки
 * AI-провайдеров добавляют лишь определения путей.
 */

export interface BrandIconProps {
  size?: number;
  className?: string;
}

/**
 * Avito. Логотип скопирован из src/dashboard/steps/Channals/AvitoIcon.tsx
 * НАМЕРЕННО, а не импортирован: лендинг (App Router) и дашборд (Pages Router) —
 * разные бандлы, и связывать их ради одной иконки нельзя.
 *
 * Оригинал содержит фирменные цвета в атрибутах fill, но они там перебиты
 * inline-стилем `fill: none; stroke: currentColor`, то есть фактически иконка
 * уже монохромная-контурная. Здесь оставлен только этот рабочий вариант:
 * четыре окружности контуром, без мёртвых цветовых атрибутов.
 */
export function AvitoIcon({ size = 16, className }: BrandIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      className={className}
      fill="none"
      focusable="false"
      aria-hidden
    >
      <g
        transform="translate(7.024 7.024) scale(.92683)"
        stroke="currentColor"
        strokeWidth={14.63157}
        fill="none"
      >
        <circle cx={61.924} cy={124.146} r={47.924} />
        <circle cx={149.044} cy={137.052} r={28.955} />
        <circle cx={71.086} cy={48.058} r={17.921} />
        <circle cx={137.789} cy={58.893} r={38.964} />
      </g>
    </svg>
  );
}

/** Обёртка для иконок antd: у них размер задаётся через fontSize. */
function AntIcon({
  Component,
  size = 16,
  className,
}: BrandIconProps & { Component: React.ComponentType<Record<string, unknown>> }) {
  return (
    <Component
      className={className}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden
    />
  );
}

export const TelegramIcon = ({ size, className }: BrandIconProps) => (
  <AntIcon Component={TelegramFilled} size={size} className={className} />
);

export const WhatsAppIcon = ({ size, className }: BrandIconProps) => (
  <AntIcon Component={WhatsAppOutlined} size={size} className={className} />
);

export const OpenAiIcon = ({ size, className }: BrandIconProps) => (
  <AntIcon Component={OpenAIFilled} size={size} className={className} />
);

export const GeminiIcon = ({ size, className }: BrandIconProps) => (
  <AntIcon Component={GeminiFilled} size={size} className={className} />
);

export const MistralIcon = ({ size, className }: BrandIconProps) => (
  <AntIcon Component={MistralFilled} size={size} className={className} />
);

/* --- Сервисы без официальных иконок в antd.
       Берём нейтральные символы из lucide: точный логотип здесь не нужен,
       важнее единый визуальный ряд и читаемость в обеих темах. --- */

export const WidgetIcon = ({ size = 16, className }: BrandIconProps) => (
  <MessageSquareCode size={size} className={className} aria-hidden />
);

export const CalendarIcon = ({ size = 16, className }: BrandIconProps) => (
  <CalendarDays size={size} className={className} aria-hidden />
);

export const SheetsIcon = ({ size = 16, className }: BrandIconProps) => (
  <Sheet size={size} className={className} aria-hidden />
);

export const BybitIcon = ({ size = 16, className }: BrandIconProps) => (
  <Coins size={size} className={className} aria-hidden />
);

export const MinioIcon = ({ size = 16, className }: BrandIconProps) => (
  <HardDrive size={size} className={className} aria-hidden />
);

export const MariaDbIcon = ({ size = 16, className }: BrandIconProps) => (
  <Database size={size} className={className} aria-hidden />
);
