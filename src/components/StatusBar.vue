<script setup>
defineProps({
  activeToolLabel: {
    type: String,
    required: true,
  },
  autoSaveIn: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  shapesCount: {
    type: Number,
    required: true,
  },
  zoomLevel: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <div class="statusbar">
    <div class="status-item">
      <span class="status-dot"></span>
      <span>СИСТЕМА: ОНЛАЙН</span>
    </div>
    <div class="status-item">
      <span>РОЛЬ: {{ role === 'admin' ? 'АДМИНИСТРАТОР' : 'ОХРАННИК' }}</span>
    </div>
    <div v-if="role === 'admin'" class="status-item">
      <span>ИНСТРУМЕНТ: {{ activeToolLabel }}</span>
    </div>
    <div class="status-item">
      <span>МАСШТАБ: {{ Math.round(zoomLevel * 100) }}%</span>
    </div>
    <div class="status-spacer"></div>
    <div class="status-item">
      <span>{{ shapesCount }} ОБЪЕКТОВ · АВТОСОХРАНЕНИЕ ЧЕРЕЗ {{ autoSaveIn }}С</span>
    </div>
  </div>
</template>
