<script setup>
import { ROLES } from '../constants/editor.js';

defineProps({
  activeToolLabel: { type: String, required: true },
  autoSaveIn: { type: Number, required: true },
  isEngineer: { type: Boolean, required: true },
  session: { type: Object, required: true },
  stats: { type: Object, required: true },
  zoomLevel: { type: Number, required: true },
});
</script>

<template>
  <div class="statusbar">
    <div class="status-item">
      <span class="status-dot"></span>
      <span>СИСТЕМА: ОНЛАЙН</span>
    </div>
    <div class="status-item">
      <span>РОЛЬ: {{ ROLES[session.role].label.toUpperCase() }}</span>
    </div>
    <div v-if="isEngineer" class="status-item">
      <span>ИНСТРУМЕНТ: {{ activeToolLabel }}</span>
    </div>
    <div class="status-item">
      <span>МАСШТАБ: {{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    <div class="status-spacer"></div>
    <div v-if="stats.alarms > 0" class="status-item status-alarm">
      <span class="status-dot status-dot-alarm"></span>
      <span>АКТИВНЫХ СРАБОТОК: {{ stats.alarms }}</span>
    </div>
    <div v-if="isEngineer" class="status-item">
      <span>{{ stats.zones }} ЗОН · {{ stats.sensors }} ДАТЧИКОВ · АВТОСОХР. ЧЕРЕЗ {{ autoSaveIn }}С</span>
    </div>
    <div v-else class="status-item">
      <span>{{ stats.zones }} ЗОН · {{ stats.sensors }} ДАТЧИКОВ</span>
    </div>
  </div>
</template>
