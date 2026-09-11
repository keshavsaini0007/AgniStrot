import React from 'react';
import {
  AlertTriangle,
  AlarmClock,
  BarChart3,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardList,
  Eye,
  FileText,
  Home,
  Map,
  MapPin,
  Megaphone,
  Menu,
  NotebookPen,
  Pencil,
  Pickaxe,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Siren,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/use-theme';

export type IconName =
  | 'alert-triangle'
  | 'alarm-clock'
  | 'bar-chart-3'
  | 'bell'
  | 'calendar'
  | 'camera'
  | 'check'
  | 'check-circle-2'
  | 'chevron-left'
  | 'chevron-right'
  | 'circle'
  | 'clipboard-list'
  | 'eye'
  | 'file-text'
  | 'home'
  | 'map'
  | 'map-pin'
  | 'megaphone'
  | 'menu'
  | 'notebook-pen'
  | 'pencil'
  | 'pickaxe'
  | 'plus'
  | 'refresh-cw'
  | 'search'
  | 'settings'
  | 'siren'
  | 'trending-up'
  | 'users'
  | 'x-circle';

const ICONS: Record<IconName, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>> = {
  'alert-triangle': AlertTriangle,
  'alarm-clock': AlarmClock,
  'bar-chart-3': BarChart3,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  'check-circle-2': CheckCircle2,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  circle: Circle,
  'clipboard-list': ClipboardList,
  eye: Eye,
  'file-text': FileText,
  home: Home,
  map: Map,
  'map-pin': MapPin,
  megaphone: Megaphone,
  menu: Menu,
  'notebook-pen': NotebookPen,
  pencil: Pencil,
  pickaxe: Pickaxe,
  plus: Plus,
  'refresh-cw': RefreshCw,
  search: Search,
  settings: Settings,
  siren: Siren,
  'trending-up': TrendingUp,
  users: Users,
  'x-circle': XCircle,
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
}

export function Icon({ name, size = 20, color, filled = false }: IconProps) {
  const theme = useTheme();
  const Component = ICONS[name];
  if (filled) {
    return <Component size={size} color={color ?? theme.textMuted} fill={color ?? theme.textMuted} strokeWidth={0} />;
  }
  return <Component size={size} color={color ?? theme.textMuted} strokeWidth={2} />;
}