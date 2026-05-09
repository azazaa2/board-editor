<script setup>
defineProps({
  canvasCursorClass: {
    type: String,
    required: true,
  },
  mouseX: {
    type: Number,
    required: true,
  },
  mouseY: {
    type: Number,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  setContainer: {
    type: Function,
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

const emit = defineEmits(['fit-to-view', 'reset-view', 'zoom-in', 'zoom-out']);
</script>

<template>
  <div class="canvas-area" :class="canvasCursorClass">
    <div class="canvas-overlay">
      <div class="badge badge-live">
        {{ role === 'admin' ? 'РЕЖИМ РЕДАКТОРА' : 'ТРАНСЛЯЦИЯ' }}
      </div>
      <div v-if="role === 'guard'" class="badge badge-readonly">ТОЛЬКО ПРОСМОТР</div>
      <div class="badge">ОБЪЕКТОВ: {{ shapesCount }}</div>
    </div>

    <div id="konva-container" :ref="setContainer"></div>

    <div class="zoom-controls">
      <button class="zoom-btn" title="Уменьшить [-]" @click="emit('zoom-out')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 7h10" />
        </svg>
      </button>
      <div class="zoom-level" title="Сброс масштаба [0]" @click="emit('reset-view')">
        {{ Math.round(zoomLevel * 100) }}%
      </div>
      <button class="zoom-btn" title="Увеличить [+]" @click="emit('zoom-in')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 2v10M2 7h10" />
        </svg>
      </button>
      <div class="zoom-separator"></div>
      <button class="zoom-btn" title="По размеру [F]" @click="emit('fit-to-view')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
        </svg>
      </button>
    </div>

    <div class="canvas-coords">
      X: {{ String(mouseX).padStart(4, '0') }} · Y: {{ String(mouseY).padStart(4, '0') }}
    </div>
  </div>
</template>
