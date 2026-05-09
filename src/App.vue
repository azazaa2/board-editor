<script setup>
import AdminToolbar from './components/AdminToolbar.vue';
import CanvasArea from './components/CanvasArea.vue';
import ContextMenu from './components/ContextMenu.vue';
import SidePanel from './components/SidePanel.vue';
import StatusBar from './components/StatusBar.vue';
import TopBar from './components/TopBar.vue';
import { useBoardEditor } from './composables/useBoardEditor.js';

const {
  activeTool,
  activeToolLabel,
  autoSaveIn,
  canvasCursorClass,
  clipboard,
  clearAll,
  clock,
  closeContextMenu,
  ctxAction,
  ctxMenu,
  deleteSelected,
  deleteShape,
  duplicateSelected,
  fitToView,
  guardId,
  loadDemo,
  mouseX,
  mouseY,
  palette,
  resetView,
  role,
  saveMap,
  selectShape,
  selectedId,
  selectedShape,
  setContainer,
  setRole,
  setTool,
  shapes,
  shiftEnd,
  shiftStart,
  tools,
  updateShape,
  zoomIn,
  zoomLevel,
  zoomOut,
} = useBoardEditor();
</script>

<template>
  <div id="app" @click="closeContextMenu" @contextmenu.prevent>
    <TopBar :clock="clock" :role="role" @set-role="setRole" />

    <div class="main">
      <AdminToolbar
        v-if="role === 'admin'"
        :active-tool="activeTool"
        :has-selection="Boolean(selectedId)"
        :tools="tools"
        @clear-all="clearAll"
        @delete-selected="deleteSelected"
        @duplicate-selected="duplicateSelected"
        @reset-view="resetView"
        @set-tool="setTool"
      />

      <CanvasArea
        :canvas-cursor-class="canvasCursorClass"
        :mouse-x="mouseX"
        :mouse-y="mouseY"
        :role="role"
        :set-container="setContainer"
        :shapes-count="shapes.length"
        :zoom-level="zoomLevel"
        @fit-to-view="fitToView"
        @reset-view="resetView"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
      />

      <SidePanel
        :guard-id="guardId"
        :palette="palette"
        :role="role"
        :selected-id="selectedId"
        :selected-shape="selectedShape"
        :shapes="shapes"
        :shift-end="shiftEnd"
        :shift-start="shiftStart"
        @delete-shape="deleteShape"
        @load-demo="loadDemo"
        @save-map="saveMap"
        @select-shape="selectShape"
        @update-shape="updateShape"
      />
    </div>

    <StatusBar
      :active-tool-label="activeToolLabel"
      :auto-save-in="autoSaveIn"
      :role="role"
      :shapes-count="shapes.length"
      :zoom-level="zoomLevel"
    />

    <ContextMenu :clipboard="clipboard" :ctx-menu="ctxMenu" @action="ctxAction" />
  </div>
</template>
