<script setup>
import { ref } from 'vue';
import { CREDENTIALS, ROLES } from '../constants/editor.js';

const emit = defineEmits(['login']);

const login = ref('');
const password = ref('');
const error = ref('');

const submit = () => {
  error.value = '';
  const match = CREDENTIALS.find(
    (c) => c.login === login.value.trim() && c.password === password.value,
  );
  if (!match) {
    error.value = 'Неверный логин или пароль';
    return;
  }
  emit('login', { role: match.role, name: match.name, login: match.login });
};

const fillDemo = (creds) => {
  login.value = creds.login;
  password.value = creds.password;
  error.value = '';
};
</script>

<template>
  <div class="login-screen">
    <div class="login-bg"></div>

    <div class="login-card">
      <div class="login-brand">
        <span class="login-brand-dot"></span>
        <div class="login-brand-text">
          <div class="login-brand-name">SENTINEL<span class="login-brand-suffix">-F</span></div>
          <div class="login-brand-meta">FIRE & SECURITY · OBJECT MAPPING</div>
        </div>
      </div>

      <div class="login-title">Авторизация</div>
      <div class="login-subtitle">Войдите для доступа к карте объекта</div>

      <form class="login-form" @submit.prevent="submit">
        <label class="login-field">
          <span class="login-label">Логин</span>
          <input
            v-model="login"
            class="login-input"
            type="text"
            autocomplete="username"
            placeholder="engineer / duty / user"
            autofocus
          />
        </label>

        <label class="login-field">
          <span class="login-label">Пароль</span>
          <input
            v-model="password"
            class="login-input"
            type="password"
            autocomplete="current-password"
            placeholder="••••"
          />
        </label>

        <div v-if="error" class="login-error">{{ error }}</div>

        <button type="submit" class="login-btn">Войти в систему</button>
      </form>

      <div class="login-divider">демо-учётные записи</div>

      <div class="login-demo">
        <button
          v-for="cred in CREDENTIALS"
          :key="cred.login"
          type="button"
          class="login-demo-btn"
          @click="fillDemo(cred)"
        >
          <div class="login-demo-role">{{ ROLES[cred.role].label }}</div>
          <div class="login-demo-creds">{{ cred.login }} / {{ cred.password }}</div>
          <div class="login-demo-desc">{{ ROLES[cred.role].description }}</div>
        </button>
      </div>
    </div>
  </div>
</template>
