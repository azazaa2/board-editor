<script setup>
import { computed } from 'vue';
import { LEGEND_ITEMS, ROLES } from '../constants/editor.js';

const props = defineProps({
  guardId: { type: Number, required: true },
  isDuty: { type: Boolean, required: true },
  isEngineer: { type: Boolean, required: true },
  palette: { type: Array, required: true },
  selectedId: { type: String, default: null },
  selectedShape: { type: Object, default: null },
  sensorTypes: { type: Array, required: true },
  session: { type: Object, required: true },
  shapes: { type: Array, required: true },
  shiftEnd: { type: String, required: true },
  shiftStart: { type: String, required: true },
  stats: { type: Object, required: true },
  statusInfo: { type: Object, required: true },
});

const emit = defineEmits([
  'acknowledge-all',
  'delete-shape',
  'load-demo',
  'save-map',
  'select-shape',
  'set-zone-status',
  'toggle-zone-status',
  'update-shape',
]);

const KIND_LABEL = {
  zone: 'Зоны',
  sensor: 'Датчики',
  wall: 'Стены / периметр',
  label: 'Метки',
};

const groupedShapes = computed(() => {
  const groups = { zone: [], sensor: [], wall: [], label: [] };
  [...props.shapes].reverse().forEach((shape) => {
    const kind = shape.kind || 'label';
    if (!groups[kind]) groups[kind] = [];
    groups[kind].push(shape);
  });
  return groups;
});

const sensorDef = (kind) =>
  props.sensorTypes.find((s) => s.id === kind) || props.sensorTypes[0];

const getShapeName = (shape) =>
  shape.name || `${shape.type.toUpperCase()}_${shape.id.slice(-4)}`;

const statusColor = (shape) =>
  shape.status === 'alarm'
    ? props.statusInfo.alarm.color
    : props.statusInfo.ok.color;

const statusLabel = (shape) =>
  shape.status === 'alarm'
    ? props.statusInfo.alarm.label
    : props.statusInfo.ok.label;

const handleSelect = (id) => emit('select-shape', id);

const handleStatusToggle = (id, event) => {
  event.stopPropagation();
  emit('toggle-zone-status', id);
};
</script>

<template>
  <div class="sidepanel">
    <template v-for="(items, kind) in groupedShapes" :key="kind">
      <div v-if="items.length" class="panel-section">
        <div class="panel-title">
          <span>{{ KIND_LABEL[kind] || kind }}</span>
          <span class="panel-title-count">{{ items.length }}</span>
        </div>
        <ul class="layer-list">
          <li
            v-for="shape in items"
            :key="shape.id"
            class="layer-item"
            :class="{
              selected: shape.id === selectedId,
              'layer-item-alarm': (kind === 'zone' || kind === 'sensor') && shape.status === 'alarm',
            }"
            @click="handleSelect(shape.id)"
          >
            <span
              class="layer-icon"
              :style="{ color: (kind === 'zone' || kind === 'sensor') ? statusColor(shape) : 'var(--text-secondary)' }"
            >
              <svg v-if="shape.type === 'rect'" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="1" y="2" width="12" height="10" rx="1" />
              </svg>
              <svg v-else-if="shape.type === 'circle'" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="7" cy="7" r="6" />
              </svg>
              <svg v-else-if="shape.type === 'sensor'" width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="1.5" fill="none">
                <circle cx="7" cy="7" r="3" fill="currentColor" />
                <path d="M7 1v2M7 11v2M1 7h2M11 7h2" />
              </svg>
              <svg v-else-if="shape.type === 'text'" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M2 3h10v2H8v8H6V5H2V3z" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="2">
                <line x1="2" y1="12" x2="12" y2="2" />
              </svg>
            </span>

            <div class="layer-body">
              <div class="layer-name">{{ getShapeName(shape) }}</div>
              <div v-if="kind === 'sensor'" class="layer-sub">
                {{ sensorDef(shape.sensorKind).label }}
              </div>
              <div v-else-if="kind === 'zone' && shape.sensorKind" class="layer-sub">
                Тип: {{ sensorDef(shape.sensorKind).label }}
              </div>
            </div>

            <button
              v-if="(kind === 'zone' || kind === 'sensor') && (isDuty || !isEngineer)"
              class="status-pill"
              :class="{ 'status-pill-alarm': shape.status === 'alarm' }"
              :disabled="!isDuty"
              :title="isDuty ? 'Переключить статус' : statusLabel(shape)"
              @click="(e) => handleStatusToggle(shape.id, e)"
            >
              {{ statusLabel(shape) }}
            </button>
            <span
              v-else-if="kind === 'zone' || kind === 'sensor'"
              class="status-dot-inline"
              :style="{ background: statusColor(shape) }"
              :title="statusLabel(shape)"
            ></span>

            <svg
              v-if="shape.locked"
              class="lock-icon"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <rect x="2" y="6" width="8" height="5" rx="1" />
              <path d="M4 6V4a2 2 0 014 0v2" />
            </svg>
            <button
              v-if="isEngineer"
              class="layer-delete"
              @click.stop="emit('delete-shape', shape.id)"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </template>

    <div v-if="!shapes.length" class="panel-section">
      <div class="empty-state">
        {{ isEngineer ? 'Выберите инструмент и начните рисовать' : 'Карта пуста' }}
      </div>
    </div>

    <div v-if="isEngineer && selectedShape" class="panel-section">
      <div class="panel-title">Свойства</div>

      <div class="prop-row">
        <span class="prop-label">Имя</span>
        <input
          class="prop-input"
          :value="selectedShape.name"
          :placeholder="selectedShape.type"
          @input="emit('update-shape', { name: $event.target.value })"
        />
      </div>

      <div v-if="selectedShape.type === 'text'" class="prop-row">
        <span class="prop-label">Текст</span>
        <input
          class="prop-input"
          :value="selectedShape.text"
          @input="emit('update-shape', { text: $event.target.value })"
        />
      </div>

      <div v-if="selectedShape.kind === 'zone' || selectedShape.kind === 'sensor'" class="prop-row">
        <span class="prop-label">Тип</span>
        <div class="sensor-grid">
          <button
            v-for="kind in sensorTypes"
            :key="kind.id"
            class="sensor-grid-btn"
            :class="{ active: selectedShape.sensorKind === kind.id }"
            :style="{ '--sensor-color': kind.color }"
            :title="kind.label"
            @click="emit('update-shape', { sensorKind: kind.id })"
          >
            <span class="sensor-grid-symbol">{{ kind.symbol }}</span>
            <span class="sensor-grid-label">{{ kind.label.split(' ')[0] }}</span>
          </button>
        </div>
      </div>

      <div v-if="selectedShape.kind === 'zone' || selectedShape.kind === 'sensor'" class="prop-row">
        <span class="prop-label">Статус</span>
        <div class="status-row">
          <button
            class="status-btn status-btn-ok"
            :class="{ active: selectedShape.status === 'ok' }"
            @click="emit('set-zone-status', selectedShape.id, 'ok')"
          >
            {{ statusInfo.ok.label }}
          </button>
          <button
            class="status-btn status-btn-alarm"
            :class="{ active: selectedShape.status === 'alarm' }"
            @click="emit('set-zone-status', selectedShape.id, 'alarm')"
          >
            {{ statusInfo.alarm.label }}
          </button>
        </div>
      </div>

      <div v-if="selectedShape.kind === 'wall' || selectedShape.kind === 'label'" class="prop-row">
        <span class="prop-label">Цвет</span>
        <div class="color-grid">
          <div
            v-for="color in palette"
            :key="color"
            class="color-swatch"
            :class="{ active: (selectedShape.stroke || selectedShape.fill) === color }"
            :style="{ background: color }"
            @click="emit('update-shape', selectedShape.type === 'line' ? { stroke: color } : { fill: color })"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="isEngineer" class="panel-section">
      <div class="panel-title">Управление</div>
      <div class="hint-row">
        <div><span class="key">ПКМ</span> - меню</div>
        <div><span class="key">Space</span> + ЛКМ - панорама</div>
        <div><span class="key">Alt</span> - отключить привязку</div>
        <div><span class="key">Ctrl+D</span> - дублировать</div>
        <div><span class="key">F</span> - по размеру · <span class="key">0</span> - сброс</div>
        <div><span class="key">R/C/L/D/T</span> - инструменты</div>
      </div>
    </div>

    <div v-if="isDuty" class="panel-section">
      <div class="panel-title">Управление</div>
      <div class="duty-summary">
        <div class="duty-summary-row">
          <span>Зон в норме:</span>
          <span class="duty-summary-ok">{{ stats.zones + stats.sensors - stats.alarms }}</span>
        </div>
        <div class="duty-summary-row">
          <span>Сработок:</span>
          <span :class="stats.alarms > 0 ? 'duty-summary-alarm' : 'duty-summary-ok'">
            {{ stats.alarms }}
          </span>
        </div>
      </div>
      <button
        class="btn btn-danger"
        :disabled="stats.alarms === 0"
        @click="emit('acknowledge-all')"
      >
        Сбросить все сработки
      </button>
      <div class="hint-row" style="margin-top: 12px">
        <div>Кликните по зоне в списке или на карте, чтобы переключить статус.</div>
      </div>
    </div>

    <div v-if="!isEngineer" class="panel-section">
      <div class="panel-title">Легенда</div>
      <div v-for="item in LEGEND_ITEMS" :key="item.label" class="legend-item">
        <div class="legend-swatch" :style="{ background: item.color }"></div>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-title">{{ isEngineer ? 'Действия' : 'Сессия' }}</div>
      <div v-if="isEngineer" class="btn-row">
        <button class="btn btn-primary" @click="emit('save-map')">Сохранить</button>
        <button class="btn" @click="emit('load-demo')">Демо</button>
      </div>
      <div v-else class="guard-meta">
        <div>Оператор: <span class="guard-meta-value">{{ session.name }}</span></div>
        <div>Роль: <span class="guard-meta-text">{{ ROLES[session.role].label }}</span></div>
        <div>Смена: <span class="guard-meta-text">{{ shiftStart }} - {{ shiftEnd }}</span></div>
        <div>ID поста: <span class="guard-meta-text">G-{{ guardId }}</span></div>
      </div>
    </div>
  </div>
</template>
