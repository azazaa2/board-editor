<script setup>
import CanvasArea from './components/CanvasArea.vue';
import ContextMenu from './components/ContextMenu.vue';
import EngineerToolbar from './components/EngineerToolbar.vue';
import LoginScreen from './components/LoginScreen.vue';
import SidePanel from './components/SidePanel.vue';
import StatusBar from './components/StatusBar.vue';
import TopBar from './components/TopBar.vue';
import { useBoardEditor } from './composables/useBoardEditor.js';

const {
  acknowledgeAll,
  activeSensorKind,
  activeTool,
  activeToolLabel,
  autoSaveIn,
  canvasCursorClass,
  clearAll,
  clipboard,
  clock,
  closeContextMenu,
  ctxAction,
  ctxMenu,
  deleteSelected,
  deleteShape,
  duplicateSelected,
  fitToView,
  guardId,
  isDuty,
  isEngineer,
  loadDemo,
  login,
  logout,
  mouseX,
  mouseY,
  palette,
  resetView,
  saveMap,
  selectShape,
  selectedId,
  selectedShape,
  sensorTypes,
  session,
  setContainer,
  setSensorKind,
  setTool,
  setZoneStatus,
  shapes,
  shiftEnd,
  shiftStart,
  stats,
  statusInfo,
  toggleZoneStatus,
  tools,
  updateShape,
  zoomIn,
  zoomLevel,
  zoomOut,
} = useBoardEditor();
</script>

<template>
  <LoginScreen v-if="!session" @login="login" />

  <div v-else id="app" @click="closeContextMenu" @contextmenu.prevent>
    <TopBar
      :clock="clock"
      :session="session"
      :stats="stats"
      @logout="logout"
    />

    <div class="main">
      <EngineerToolbar
        v-if="isEngineer"
        :active-sensor-kind="activeSensorKind"
        :active-tool="activeTool"
        :has-selection="Boolean(selectedId)"
        :sensor-types="sensorTypes"
        :tools="tools"
        @clear-all="clearAll"
        @delete-selected="deleteSelected"
        @duplicate-selected="duplicateSelected"
        @reset-view="resetView"
        @set-sensor-kind="setSensorKind"
        @set-tool="setTool"
      />

      <CanvasArea
        :canvas-cursor-class="canvasCursorClass"
        :is-duty="isDuty"
        :is-engineer="isEngineer"
        :mouse-x="mouseX"
        :mouse-y="mouseY"
        :set-container="setContainer"
        :stats="stats"
        :zoom-level="zoomLevel"
        @fit-to-view="fitToView"
        @reset-view="resetView"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
      />

      <SidePanel
        :guard-id="guardId"
        :is-duty="isDuty"
        :is-engineer="isEngineer"
        :palette="palette"
        :selected-id="selectedId"
        :selected-shape="selectedShape"
        :sensor-types="sensorTypes"
        :session="session"
        :shapes="shapes"
        :shift-end="shiftEnd"
        :shift-start="shiftStart"
        :stats="stats"
        :status-info="statusInfo"
        @acknowledge-all="acknowledgeAll"
        @delete-shape="deleteShape"
        @load-demo="loadDemo"
        @save-map="saveMap"
        @select-shape="selectShape"
        @set-zone-status="setZoneStatus"
        @toggle-zone-status="toggleZoneStatus"
        @update-shape="updateShape"
      />
    </div>

    <StatusBar
      :active-tool-label="activeToolLabel"
      :auto-save-in="autoSaveIn"
      :is-engineer="isEngineer"
      :session="session"
      :stats="stats"
      :zoom-level="zoomLevel"
    />

    <ContextMenu
      :clipboard="clipboard"
      :ctx-menu="ctxMenu"
      :is-duty="isDuty"
      :is-engineer="isEngineer"
      @action="ctxAction"
    />
  </div>
</template>
