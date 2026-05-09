<script setup>
defineProps({
  activeTool: {
    type: String,
    required: true,
  },
  hasSelection: {
    type: Boolean,
    required: true,
  },
  tools: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits([
  'clear-all',
  'delete-selected',
  'duplicate-selected',
  'reset-view',
  'set-tool',
]);
</script>

<template>
  <div class="toolbar">
    <button
      v-for="tool in tools"
      :key="tool.id"
      class="tool"
      :class="{ active: activeTool === tool.id }"
      @click="emit('set-tool', tool.id)"
    >
      <span v-html="tool.icon"></span>
      <span class="tool-tooltip">
        {{ tool.label }}
        <span v-if="tool.shortcut" style="color: var(--text-dim)">
          [{{ tool.shortcut }}]
        </span>
      </span>
    </button>

    <div class="tool-divider"></div>

    <button class="tool" :disabled="!hasSelection" @click="emit('duplicate-selected')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="8" y="8" width="12" height="12" rx="1" />
        <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
      </svg>
      <span class="tool-tooltip">Дублировать [Ctrl+D]</span>
    </button>

    <button class="tool" :disabled="!hasSelection" @click="emit('delete-selected')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      </svg>
      <span class="tool-tooltip">Удалить [Del]</span>
    </button>

    <div class="tool-divider"></div>

    <button class="tool" @click="emit('reset-view')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9V5a2 2 0 012-2h4M21 9V5a2 2 0 00-2-2h-4M3 15v4a2 2 0 002 2h4M21 15v4a2 2 0 01-2 2h-4" />
      </svg>
      <span class="tool-tooltip">Сброс вида [0]</span>
    </button>

    <button class="tool" @click="emit('clear-all')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" />
      </svg>
      <span class="tool-tooltip">Очистить всё</span>
    </button>
  </div>
</template>
