'use client';

import React from 'react';
import {
  Bot,
  Calendar,
  CalendarClock,
  Check,
  Clock,
  Contact,
  Database,
  FileText,
  Globe,
  Headset,
  Image,
  MessageSquareCode,
  Network,
  Phone,
  PhoneOutgoing,
  Radar,
  Search,
  Send,
  Sheet,
  Shield,
  Sparkles,
  Target,
  User,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { StepIconName } from './types';

/**
 * Сценарии — сериализуемые данные и не импортируют React,
 * поэтому иконка в шаге хранится строкой. Здесь строка превращается
 * в компонент ровно один раз, на этапе рендера.
 *
 * Набор намеренно только из lucide-react: он уже используется во всём
 * лендинге v2, и подмешивать сюда второй пакет иконок значило бы
 * утяжелить чанк ради нескольких глифов.
 */
const MAP: Record<StepIconName, LucideIcon> = {
  bot: Bot,
  user: User,
  phone: Phone,
  phoneOutgoing: PhoneOutgoing,
  calendar: Calendar,
  check: Check,
  search: Search,
  radar: Radar,
  crm: Database,
  shield: Shield,
  zap: Zap,
  send: Send,
  headset: Headset,
  globe: Globe,
  clock: Clock,
  sparkles: Sparkles,
  file: FileText,
  sheet: Sheet,
  image: Image,
  contacts: Contact,
  proxy: Network,
  schedule: CalendarClock,
  target: Target,
  widget: MessageSquareCode,
};

export function StepIcon({
  name,
  size = 15,
}: {
  name?: StepIconName;
  size?: number;
}) {
  const Icon = name ? MAP[name] : undefined;
  if (!Icon) return null;
  return <Icon size={size} aria-hidden />;
}

export function getStepIcon(name?: StepIconName): LucideIcon | undefined {
  return name ? MAP[name] : undefined;
}
