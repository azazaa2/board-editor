export const SHIFT_START = '08:00';
export const SHIFT_END = '20:00';

export const GRID_SIZE = 24;
export const SNAP_THRESHOLD = 10;

export const ROLES = {
  engineer: { id: 'engineer', label: 'Инженер', description: 'Редактирование карты, создание зон и датчиков' },
  duty: { id: 'duty', label: 'Дежурный', description: 'Управление статусами зон и датчиков' },
  user: { id: 'user', label: 'Пользователь', description: 'Просмотр зон и статусов' },
};

export const CREDENTIALS = [
  { login: 'engineer', password: '1234', role: 'engineer', name: 'Иванов А.С.' },
  { login: 'duty', password: '1234', role: 'duty', name: 'Петров В.М.' },
  { login: 'user', password: '1234', role: 'user', name: 'Сидоров К.Е.' },
];

export const STATUS = {
  ok: { id: 'ok', label: 'Норма', color: '#4ade80', glow: 'rgba(74, 222, 128, 0.55)' },
  alarm: { id: 'alarm', label: 'Сработка', color: '#ff3855', glow: 'rgba(255, 56, 85, 0.6)' },
};

export const PERIMETER_COLOR = '#0a0e0d';
export const PERIMETER_LIGHT = '#e8ece8';

export const PALETTE = [
  '#c4f542',
  '#ff6b35',
  '#ff3855',
  '#5ec5ff',
  '#a78bfa',
  '#4ade80',
  '#fbbf24',
  '#f472b6',
  '#11161a',
  '#525c63',
  '#8a9499',
  '#e8ece8',
];

export const SENSOR_TYPES = [
  { id: 'fire', label: 'Пожарный датчик', color: '#ff6b35', symbol: 'F' },
  { id: 'smoke', label: 'Датчик дыма', color: '#fbbf24', symbol: 'S' },
  { id: 'motion', label: 'Датчик движения', color: '#5ec5ff', symbol: 'M' },
  { id: 'door', label: 'Датчик двери', color: '#a78bfa', symbol: 'D' },
];

export const TOOLS = [
  {
    id: 'select',
    label: 'Выбор',
    shortcut: 'V',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7 17 2-7 7-2L3 3z"/></svg>',
  },
  {
    id: 'pan',
    label: 'Рука',
    shortcut: 'H',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 00-4 0M14 10V4a2 2 0 10-4 0v8M10 12V6a2 2 0 10-4 0v9a7 7 0 0014 0v-3a2 2 0 10-4 0"/></svg>',
  },
  {
    id: 'zone-rect',
    label: 'Зона (комната)',
    shortcut: 'R',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="1"/></svg>',
  },
  {
    id: 'zone-circle',
    label: 'Круглая зона',
    shortcut: 'C',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
  },
  {
    id: 'wall',
    label: 'Стена / периметр',
    shortcut: 'L',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="20" x2="20" y2="4"/></svg>',
  },
  {
    id: 'sensor',
    label: 'Датчик',
    shortcut: 'D',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>',
  },
  {
    id: 'text',
    label: 'Текст',
    shortcut: 'T',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M12 5v14"/></svg>',
  },
];

export const LEGEND_ITEMS = [
  { color: STATUS.ok.color, label: 'Норма (зона в порядке)' },
  { color: STATUS.alarm.color, label: 'Сработка (тревога)' },
  { color: PERIMETER_LIGHT, label: 'Стена / периметр' },
];

export const createDemoShapes = (uid) => [
  {
    id: uid(),
    kind: 'zone',
    type: 'rect',
    x: 96,
    y: 96,
    width: 312,
    height: 216,
    status: 'ok',
    name: 'Серверная',
    sensorKind: 'fire',
  },
  {
    id: uid(),
    kind: 'zone',
    type: 'rect',
    x: 432,
    y: 96,
    width: 192,
    height: 144,
    status: 'ok',
    name: 'Склад А',
    sensorKind: 'smoke',
  },
  {
    id: uid(),
    kind: 'zone',
    type: 'rect',
    x: 432,
    y: 264,
    width: 192,
    height: 144,
    status: 'alarm',
    name: 'Склад Б',
    sensorKind: 'fire',
  },
  {
    id: uid(),
    kind: 'zone',
    type: 'circle',
    x: 240,
    y: 432,
    radius: 72,
    status: 'ok',
    name: 'Холл',
    sensorKind: 'motion',
  },
  {
    id: uid(),
    kind: 'wall',
    type: 'line',
    points: [96, 312, 408, 312],
    name: 'Стена 1',
  },
  {
    id: uid(),
    kind: 'wall',
    type: 'line',
    points: [408, 96, 408, 408],
    name: 'Стена 2',
  },
  {
    id: uid(),
    kind: 'sensor',
    type: 'sensor',
    x: 192,
    y: 168,
    sensorKind: 'fire',
    status: 'ok',
    name: 'ПД-01',
  },
  {
    id: uid(),
    kind: 'sensor',
    type: 'sensor',
    x: 312,
    y: 240,
    sensorKind: 'smoke',
    status: 'ok',
    name: 'ДД-02',
  },
  {
    id: uid(),
    kind: 'sensor',
    type: 'sensor',
    x: 528,
    y: 168,
    sensorKind: 'motion',
    status: 'ok',
    name: 'ДВ-03',
  },
  {
    id: uid(),
    kind: 'sensor',
    type: 'sensor',
    x: 528,
    y: 336,
    sensorKind: 'fire',
    status: 'alarm',
    name: 'ПД-04',
  },
  {
    id: uid(),
    kind: 'label',
    type: 'text',
    x: 120,
    y: 120,
    text: 'СЕРВЕРНАЯ',
    fontSize: 14,
    name: 'Метка: серверная',
  },
  {
    id: uid(),
    kind: 'label',
    type: 'text',
    x: 456,
    y: 120,
    text: 'СКЛАД А',
    fontSize: 14,
    name: 'Метка: склад А',
  },
  {
    id: uid(),
    kind: 'label',
    type: 'text',
    x: 456,
    y: 288,
    text: 'СКЛАД Б',
    fontSize: 14,
    name: 'Метка: склад Б',
  },
];
