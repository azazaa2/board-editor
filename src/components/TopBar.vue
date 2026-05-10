<script setup>
import { ROLES } from '../constants/editor.js';

defineProps({
  clock: { type: String, required: true },
  session: { type: Object, required: true },
  stats: { type: Object, required: true },
});

const emit = defineEmits(['logout']);
</script>

<template>
  <div class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      SENTINEL<span class="brand-suffix">-F</span>
      <span class="brand-meta">FIRE & SECURITY · v1.0</span>
    </div>

    <div class="topbar-stats">
      <div class="topbar-stat">
        <span class="topbar-stat-label">Зон</span>
        <span class="topbar-stat-value">{{ stats.zones }}</span>
      </div>
      <div class="topbar-stat">
        <span class="topbar-stat-label">Датчиков</span>
        <span class="topbar-stat-value">{{ stats.sensors }}</span>
      </div>
      <div class="topbar-stat" :class="{ 'topbar-stat-alarm': stats.alarms > 0 }">
        <span class="topbar-stat-label">Сработок</span>
        <span class="topbar-stat-value">{{ stats.alarms }}</span>
      </div>
    </div>

    <div class="clock">{{ clock }}</div>

    <div class="user-block">
      <div class="user-info">
        <div class="user-name">{{ session.name }}</div>
        <div class="user-role">{{ ROLES[session.role].label }}</div>
      </div>
      <button class="logout-btn" title="Выйти" @click="emit('logout')">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </div>
  </div>
</template>
