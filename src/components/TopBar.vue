<script setup>
defineProps({
  clock: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['set-role']);
</script>

<template>
  <div class="topbar">
    <div class="brand">
      <span class="brand-dot"></span>
      SENTINEL
      <span class="brand-meta">v1.1 · OBJ.MAP</span>
    </div>

    <div class="clock">{{ clock }}</div>

    <div class="role-switch">
      <button
        class="role-btn"
        :class="{ active: role === 'admin' }"
        @click="emit('set-role', 'admin')"
      >
        Администратор
      </button>
      <button
        class="role-btn"
        :class="{ active: role === 'guard' }"
        @click="emit('set-role', 'guard')"
      >
        Охранник
      </button>
    </div>
  </div>
</template>
