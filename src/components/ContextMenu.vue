<script setup>
defineProps({
  clipboard: { type: Object, default: null },
  ctxMenu: { type: Object, required: true },
  isDuty: { type: Boolean, required: true },
  isEngineer: { type: Boolean, required: true },
});

const emit = defineEmits(['action']);
</script>

<template>
  <div
    v-if="ctxMenu.visible"
    class="context-menu"
    :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
    @click.stop
    @contextmenu.prevent
  >
    <template v-if="ctxMenu.targetId">
      <div class="ctx-header">
        <span class="ctx-header-icon">
          <svg
            v-if="ctxMenu.targetShape && ctxMenu.targetShape.type === 'rect'"
            width="12" height="12" viewBox="0 0 14 14" fill="currentColor"
          >
            <rect x="1" y="2" width="12" height="10" rx="1" />
          </svg>
          <svg
            v-else-if="ctxMenu.targetShape && ctxMenu.targetShape.type === 'circle'"
            width="12" height="12" viewBox="0 0 14 14" fill="currentColor"
          >
            <circle cx="7" cy="7" r="6" />
          </svg>
          <svg
            v-else-if="ctxMenu.targetShape && ctxMenu.targetShape.type === 'sensor'"
            width="12" height="12" viewBox="0 0 14 14" fill="currentColor"
          >
            <circle cx="7" cy="7" r="3" />
          </svg>
          <svg
            v-else-if="ctxMenu.targetShape && ctxMenu.targetShape.type === 'text'"
            width="12" height="12" viewBox="0 0 14 14" fill="currentColor"
          >
            <path d="M2 3h10v2H8v8H6V5H2V3z" />
          </svg>
          <svg
            v-else-if="ctxMenu.targetShape && ctxMenu.targetShape.type === 'line'"
            width="12" height="12" viewBox="0 0 14 14" stroke="currentColor" stroke-width="2"
          >
            <line x1="2" y1="12" x2="12" y2="2" />
          </svg>
        </span>
        {{ ctxMenu.targetShape && (ctxMenu.targetShape.name || ctxMenu.targetShape.type.toUpperCase()) }}
      </div>

      <template
        v-if="(isDuty || isEngineer) && ctxMenu.targetShape && (ctxMenu.targetShape.kind === 'zone' || ctxMenu.targetShape.kind === 'sensor')"
      >
        <div class="ctx-item ctx-item-ok" @click="emit('action', 'setOk')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12l5 5L20 7" />
          </svg>
          Норма
        </div>
        <div class="ctx-item ctx-item-alarm" @click="emit('action', 'setAlarm')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 22h20L12 2zM12 9v6M12 18h.01" />
          </svg>
          Тревога
        </div>
        <div v-if="isEngineer" class="ctx-divider"></div>
      </template>

      <template v-if="isEngineer">
        <div class="ctx-item" @click="emit('action', 'duplicate')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="8" y="8" width="12" height="12" rx="1" />
            <path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" />
          </svg>
          Дублировать
          <span class="ctx-shortcut">Ctrl+D</span>
        </div>

        <div class="ctx-item" @click="emit('action', 'rename')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Переименовать
          <span class="ctx-shortcut">F2</span>
        </div>

        <div class="ctx-item" @click="emit('action', 'toFront')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h12v12H4zM10 10h10v10H10z" />
          </svg>
          На передний план
          <span class="ctx-shortcut">]</span>
        </div>

        <div class="ctx-item" @click="emit('action', 'toBack')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 10h10v10H10zM4 4h12v12H4z" />
          </svg>
          На задний план
          <span class="ctx-shortcut">[</span>
        </div>

        <div class="ctx-divider"></div>

        <div class="ctx-item" @click="emit('action', 'lock')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path v-if="ctxMenu.targetShape && !ctxMenu.targetShape.locked" d="M7 11V7a5 5 0 0110 0v4" />
            <path v-else d="M7 11V7a5 5 0 019.9-1" />
          </svg>
          {{ ctxMenu.targetShape && ctxMenu.targetShape.locked ? 'Разблокировать' : 'Заблокировать' }}
        </div>

        <div class="ctx-divider"></div>

        <div class="ctx-item danger" @click="emit('action', 'delete')">
          <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          </svg>
          Удалить
          <span class="ctx-shortcut">Del</span>
        </div>
      </template>
    </template>

    <template v-else-if="isEngineer">
      <div class="ctx-header">
        <span class="ctx-header-icon">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
          </svg>
        </span>
        Холст
      </div>

      <div v-if="clipboard" class="ctx-item" @click="emit('action', 'paste')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" />
        </svg>
        Вставить здесь
        <span class="ctx-shortcut">Ctrl+V</span>
      </div>

      <div class="ctx-item" @click="emit('action', 'addZoneRect')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="14" rx="1" />
        </svg>
        Добавить зону (комната)
      </div>

      <div class="ctx-item" @click="emit('action', 'addZoneCircle')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
        Добавить круглую зону
      </div>

      <div class="ctx-item" @click="emit('action', 'addSensor')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
        Добавить датчик
      </div>

      <div class="ctx-divider"></div>

      <div class="ctx-item" @click="emit('action', 'resetView')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9V5a2 2 0 012-2h4M21 9V5a2 2 0 00-2-2h-4M3 15v4a2 2 0 002 2h4M21 15v4a2 2 0 01-2 2h-4" />
        </svg>
        Сбросить вид
        <span class="ctx-shortcut">0</span>
      </div>

      <div class="ctx-item" @click="emit('action', 'fitToView')">
        <svg class="ctx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
        </svg>
        По размеру
        <span class="ctx-shortcut">F</span>
      </div>
    </template>
  </div>
</template>
