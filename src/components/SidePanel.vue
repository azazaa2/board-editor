<script setup>
import { computed } from 'vue';
import { LEGEND_ITEMS } from '../constants/editor.js';

const props = defineProps({
  palette: {
    type: Array,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  guardId: {
    type: Number,
    required: true,
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedShape: {
    type: Object,
    default: null,
  },
  shapes: {
    type: Array,
    required: true,
  },
  shiftEnd: {
    type: String,
    required: true,
  },
  shiftStart: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  'delete-shape',
  'load-demo',
  'save-map',
  'select-shape',
  'update-shape',
]);

const reversedShapes = computed(() => [...props.shapes].reverse());

const getShapeName = (shape) =>
  shape.name || `${shape.type.toUpperCase()}_${shape.id.slice(-4)}`;
</script>

<template>
  <div class="sidepanel">
    <div class="panel-section">
      <div class="panel-title">
        <span>Объекты</span>
        <span class="panel-title-count">{{ shapes.length }}</span>
      </div>
      <ul v-if="shapes.length" class="layer-list">
        <li
          v-for="shape in reversedShapes"
          :key="shape.id"
          class="layer-item"
          :class="{ selected: shape.id === selectedId }"
          @click="emit('select-shape', shape.id)"
        >
          <span
            class="layer-icon"
            :style="{ color: shape.fill || shape.stroke || 'currentColor' }"
          >
            <svg
              v-if="shape.type === 'rect'"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
            >
              <rect x="1" y="2" width="12" height="10" rx="1" />
            </svg>
            <svg
              v-else-if="shape.type === 'circle'"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
            >
              <circle cx="7" cy="7" r="6" />
            </svg>
            <svg
              v-else-if="shape.type === 'text'"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
            >
              <path d="M2 3h10v2H8v8H6V5H2V3z" />
            </svg>
            <svg
              v-else
              width="14"
              height="14"
              viewBox="0 0 14 14"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="2" y1="12" x2="12" y2="2" />
            </svg>
          </span>
          <span class="layer-name">{{ getShapeName(shape) }}</span>
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
            v-if="role === 'admin'"
            class="layer-delete"
            @click.stop="emit('delete-shape', shape.id)"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M3 3l6 6M9 3l-6 6" />
            </svg>
          </button>
        </li>
      </ul>
      <div v-else class="empty-state">
        {{ role === 'admin' ? 'Выберите инструмент и начните рисовать' : 'Карта пуста' }}
      </div>
    </div>

    <div v-if="role === 'admin' && selectedShape" class="panel-section">
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

      <div v-if="selectedShape.type !== 'line'" class="prop-row">
        <span class="prop-label">Заливка</span>
        <div class="color-grid">
          <div
            v-for="color in palette"
            :key="color"
            class="color-swatch"
            :class="{ active: selectedShape.fill === color }"
            :style="{ background: color, color }"
            @click="emit('update-shape', { fill: color })"
          ></div>
        </div>
      </div>
    </div>

    <div v-if="role === 'admin'" class="panel-section">
      <div class="panel-title">Управление</div>
      <div class="hint-row">
        <div><span class="key">ПКМ</span> - меню</div>
        <div><span class="key">Space</span> + ЛКМ - панорама</div>
        <div><span class="key">СКМ</span> / колесо - пан / зум</div>
        <div><span class="key">Ctrl+D</span> - дублировать</div>
        <div><span class="key">F</span> - по размеру · <span class="key">0</span> - сброс</div>
      </div>
    </div>

    <div v-if="role === 'guard'" class="panel-section">
      <div class="panel-title">Легенда</div>
      <div v-for="item in LEGEND_ITEMS" :key="item.label" class="legend-item">
        <div class="legend-swatch" :style="{ background: item.color }"></div>
        <span>{{ item.label }}</span>
      </div>
    </div>

    <div class="panel-section">
      <div class="panel-title">{{ role === 'admin' ? 'Действия' : 'Сессия' }}</div>
      <div v-if="role === 'admin'" class="btn-row">
        <button class="btn btn-primary" @click="emit('save-map')">Сохранить</button>
        <button class="btn" @click="emit('load-demo')">Демо</button>
      </div>
      <div v-else class="guard-meta">
        <div>Пост: <span class="guard-meta-value">№4 - Главные ворота</span></div>
        <div>Смена: <span class="guard-meta-text">{{ shiftStart }} - {{ shiftEnd }}</span></div>
        <div>ID: <span class="guard-meta-text">G-{{ guardId }}</span></div>
      </div>
    </div>
  </div>
</template>
