import React from 'react';
import AlertTriangle from 'lucide-react-native/icons/triangle-alert';
import AlarmClock from 'lucide-react-native/icons/alarm-clock';
import BarChart3 from 'lucide-react-native/icons/chart-column';
import Bell from 'lucide-react-native/icons/bell';
import Calendar from 'lucide-react-native/icons/calendar';
import Camera from 'lucide-react-native/icons/camera';
import Check from 'lucide-react-native/icons/check';
import CheckCircle2 from 'lucide-react-native/icons/circle-check';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Circle from 'lucide-react-native/icons/circle';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Eye from 'lucide-react-native/icons/eye';
import FileText from 'lucide-react-native/icons/file-text';
import Home from 'lucide-react-native/icons/house';
import Map from 'lucide-react-native/icons/map';
import MapPin from 'lucide-react-native/icons/map-pin';
import Megaphone from 'lucide-react-native/icons/megaphone';
import Menu from 'lucide-react-native/icons/menu';
import NotebookPen from 'lucide-react-native/icons/notebook-pen';
import Pencil from 'lucide-react-native/icons/pencil';
import Pickaxe from 'lucide-react-native/icons/pickaxe';
import Plus from 'lucide-react-native/icons/plus';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Search from 'lucide-react-native/icons/search';
import Settings from 'lucide-react-native/icons/settings';
import Siren from 'lucide-react-native/icons/siren';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import Users from 'lucide-react-native/icons/users';
import XCircle from 'lucide-react-native/icons/circle-x';
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