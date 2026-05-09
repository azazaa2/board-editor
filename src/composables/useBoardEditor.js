import Konva from 'konva';
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';
import {
  createDemoShapes,
  PALETTE,
  SHIFT_END,
  SHIFT_START,
  TOOLS,
} from '../constants/editor.js';

export function useBoardEditor() {
  const role = ref('admin');
  const activeTool = ref('select');
  const shapes = ref([]);
  const selectedId = ref(null);
  const mouseX = ref(0);
  const mouseY = ref(0);
  const clock = ref('');
  const autoSaveIn = ref(30);
  const container = ref(null);
  const zoomLevel = ref(1);
  const isPanning = ref(false);
  const isSpaceDown = ref(false);
  const clipboard = ref(null);
  const guardId = Math.floor(Math.random() * 9000) + 1000;

  const ctxMenu = reactive({
    visible: false,
    x: 0,
    y: 0,
    targetId: null,
    targetShape: null,
    worldX: 0,
    worldY: 0,
  });

  const selectedShape = computed(() =>
    shapes.value.find((shape) => shape.id === selectedId.value),
  );

  const activeToolLabel = computed(() => {
    const tool = TOOLS.find((item) => item.id === activeTool.value);
    return tool ? tool.label.toUpperCase() : '-';
  });

  const canvasCursorClass = computed(() => {
    if (isPanning.value) return 'cursor-grabbing';
    if (activeTool.value === 'pan' || isSpaceDown.value) return 'cursor-grab';

    if (
      role.value === 'admin' &&
      ['rect', 'circle', 'line', 'text'].includes(activeTool.value)
    ) {
      return 'cursor-crosshair';
    }

    return '';
  });

  let stage;
  let layer;
  let transformer;
  let resizeObserver;
  let isDrawing = false;
  let drawingShape = null;
  let startPos = null;
  let clockTimer;
  let autoSaveTimer;

  const uid = () => Math.random().toString(36).slice(2, 10);

  const setContainer = (element) => {
    container.value = element;
  };

  const clearLayerShapes = () => {
    if (!layer) return;

    layer.getChildren().forEach((node) => {
      if (node !== transformer) {
        node.destroy();
      }
    });
  };

  const getWorldPos = () => {
    const position = stage?.getPointerPosition();
    if (!position) return null;

    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(position);
  };

  const updateZoomDisplay = () => {
    if (stage) {
      zoomLevel.value = stage.scaleX();
    }
  };

  const doZoom = (oldScale, pointer, deltaY) => {
    const scaleBy = 1.08;
    const direction = deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.15, Math.min(5, newScale));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const createNode = (shape) => {
    const isAdmin = role.value === 'admin';
    const isTemp = shape.id === '__temp__';
    const draggable = isAdmin && !isTemp && !shape.locked;
    const common = { id: shape.id, draggable };

    let node = null;

    if (shape.type === 'rect') {
      node = new Konva.Rect({
        ...common,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: shape.fill,
        opacity: shape.opacity ?? 0.65,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth || 2,
        cornerRadius: 2,
        dash: shape.locked ? [6, 4] : undefined,
      });
    } else if (shape.type === 'circle') {
      node = new Konva.Circle({
        ...common,
        x: shape.x,
        y: shape.y,
        radius: shape.radius,
        fill: shape.fill,
        opacity: shape.opacity ?? 0.65,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth || 2,
        dash: shape.locked ? [6, 4] : undefined,
      });
    } else if (shape.type === 'line') {
      node = new Konva.Line({
        ...common,
        points: shape.points,
        stroke: shape.stroke,
        strokeWidth: shape.strokeWidth || 3,
        lineCap: 'round',
        dash: shape.locked ? [6, 4] : undefined,
      });
    } else if (shape.type === 'text') {
      node = new Konva.Text({
        ...common,
        x: shape.x,
        y: shape.y,
        text: shape.text,
        fontSize: shape.fontSize || 18,
        fontFamily: 'Inter Tight, sans-serif',
        fontStyle: '600',
        fill: shape.fill || '#e8ece8',
        opacity: shape.locked ? 0.7 : 1,
      });
    }

    if (!node || isTemp || !isAdmin) {
      return node;
    }

    node.on('click tap', (event) => {
      if (event.evt?.button === 2) return;
      event.cancelBubble = true;
      if (!shape.locked) {
        selectedId.value = shape.id;
      }
    });

    node.on('dragend', () => {
      if (shape.type === 'line') {
        const dx = node.x();
        const dy = node.y();
        const points = shape.points.map((point, index) =>
          index % 2 === 0 ? point + dx : point + dy,
        );
        updateShapeById(shape.id, { points });
        node.position({ x: 0, y: 0 });
        return;
      }

      updateShapeById(shape.id, { x: node.x(), y: node.y() });
    });

    node.on('transformend', () => {
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      if (shape.type === 'rect') {
        updateShapeById(shape.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
        });
      } else if (shape.type === 'circle') {
        updateShapeById(shape.id, {
          x: node.x(),
          y: node.y(),
          radius: Math.max(5, shape.radius * Math.max(scaleX, scaleY)),
        });
      } else if (shape.type === 'text') {
        updateShapeById(shape.id, {
          x: node.x(),
          y: node.y(),
          fontSize: Math.max(8, (shape.fontSize || 18) * scaleY),
        });
      }
    });

    return node;
  };

  const renderTempShape = () => {
    if (!layer) return;

    const temp = layer.findOne('#__temp__');
    if (temp) {
      temp.destroy();
    }

    if (!drawingShape) {
      layer.batchDraw();
      return;
    }

    const node = createNode({ ...drawingShape, id: '__temp__' });
    if (node) {
      layer.add(node);
    }

    layer.batchDraw();
  };

  const renderShapes = () => {
    if (!layer) return;

    clearLayerShapes();

    shapes.value.forEach((shape) => {
      const node = createNode(shape);
      if (node) {
        layer.add(node);
      }
    });

    if (selectedId.value && role.value === 'admin') {
      const shape = shapes.value.find((item) => item.id === selectedId.value);
      if (shape && !shape.locked) {
        const node = layer.findOne(`#${selectedId.value}`);
        if (node) {
          transformer.nodes([node]);
          transformer.moveToTop();
        } else {
          transformer.nodes([]);
        }
      } else {
        transformer.nodes([]);
      }
    } else {
      transformer.nodes([]);
    }

    layer.batchDraw();
  };

  const updateShapeById = (id, patch) => {
    const index = shapes.value.findIndex((shape) => shape.id === id);
    if (index < 0) return;

    shapes.value[index] = { ...shapes.value[index], ...patch };
    renderShapes();
  };

  const resetView = () => {
    if (!stage) return;

    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    layer.batchDraw();
    updateZoomDisplay();
  };

  const fitToView = () => {
    if (!stage || !shapes.value.length) {
      resetView();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.value.forEach((shape) => {
      if (shape.type === 'rect') {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(maxX, shape.x + shape.width);
        maxY = Math.max(maxY, shape.y + shape.height);
      } else if (shape.type === 'circle') {
        minX = Math.min(minX, shape.x - shape.radius);
        minY = Math.min(minY, shape.y - shape.radius);
        maxX = Math.max(maxX, shape.x + shape.radius);
        maxY = Math.max(maxY, shape.y + shape.radius);
      } else if (shape.type === 'text') {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(
          maxX,
          shape.x + (shape.text?.length || 5) * (shape.fontSize || 18) * 0.55,
        );
        maxY = Math.max(maxY, shape.y + (shape.fontSize || 18) * 1.2);
      } else if (shape.type === 'line') {
        for (let index = 0; index < shape.points.length; index += 2) {
          minX = Math.min(minX, shape.points[index]);
          maxX = Math.max(maxX, shape.points[index]);
          minY = Math.min(minY, shape.points[index + 1]);
          maxY = Math.max(maxY, shape.points[index + 1]);
        }
      }
    });

    const padding = 80;
    const width = maxX - minX;
    const height = maxY - minY;
    if (width <= 0 || height <= 0) {
      resetView();
      return;
    }

    const scale = Math.min(
      (stage.width() - padding * 2) / width,
      (stage.height() - padding * 2) / height,
      3,
    );

    stage.scale({ x: scale, y: scale });
    stage.position({
      x: stage.width() / 2 - (minX + width / 2) * scale,
      y: stage.height() / 2 - (minY + height / 2) * scale,
    });
    layer.batchDraw();
    updateZoomDisplay();
  };

  const zoomIn = () => {
    if (!stage) return;

    doZoom(stage.scaleX(), { x: stage.width() / 2, y: stage.height() / 2 }, -100);
    layer.batchDraw();
    updateZoomDisplay();
  };

  const zoomOut = () => {
    if (!stage) return;

    doZoom(stage.scaleX(), { x: stage.width() / 2, y: stage.height() / 2 }, 100);
    layer.batchDraw();
    updateZoomDisplay();
  };

  const duplicateShape = (id) => {
    const source = shapes.value.find((shape) => shape.id === id);
    if (!source) return;

    const copy = JSON.parse(JSON.stringify(source));
    const offset = 20;
    copy.id = uid();
    copy.locked = false;

    if (copy.type === 'line') {
      copy.points = copy.points.map((point) => point + offset);
    } else {
      copy.x += offset;
      copy.y += offset;
    }

    if (copy.name) {
      copy.name += ' (копия)';
    }

    shapes.value.push(copy);
    selectedId.value = copy.id;
    renderShapes();
  };

  const bringToFront = (id) => {
    const index = shapes.value.findIndex((shape) => shape.id === id);
    if (index < 0 || index === shapes.value.length - 1) return;

    const [shape] = shapes.value.splice(index, 1);
    shapes.value.push(shape);
    renderShapes();
  };

  const sendToBack = (id) => {
    const index = shapes.value.findIndex((shape) => shape.id === id);
    if (index <= 0) return;

    const [shape] = shapes.value.splice(index, 1);
    shapes.value.unshift(shape);
    renderShapes();
  };

  const copyShape = (id) => {
    const shape = shapes.value.find((item) => item.id === id);
    if (shape) {
      clipboard.value = JSON.parse(JSON.stringify(shape));
    }
  };

  const pasteAt = (x, y) => {
    if (!clipboard.value) return;

    const copy = JSON.parse(JSON.stringify(clipboard.value));
    copy.id = uid();
    copy.locked = false;

    if (copy.type === 'line') {
      const dx = x - copy.points[0];
      const dy = y - copy.points[1];
      copy.points = copy.points.map((point, index) =>
        index % 2 === 0 ? point + dx : point + dy,
      );
    } else {
      copy.x = x;
      copy.y = y;
    }

    shapes.value.push(copy);
    selectedId.value = copy.id;
    renderShapes();
  };

  const deleteShape = (id) => {
    shapes.value = shapes.value.filter((shape) => shape.id !== id);
    if (selectedId.value === id) {
      selectedId.value = null;
    }
    renderShapes();
  };

  const deleteSelected = () => {
    if (selectedId.value) {
      deleteShape(selectedId.value);
    }
  };

  const duplicateSelected = () => {
    if (selectedId.value) {
      duplicateShape(selectedId.value);
    }
  };

  const clearAll = () => {
    if (!window.confirm('Очистить всю карту?')) return;

    shapes.value = [];
    selectedId.value = null;
    renderShapes();
  };

  const updateShape = (patch) => {
    if (!selectedId.value) return;
    updateShapeById(selectedId.value, patch);
  };

  const selectShape = (id) => {
    if (role.value !== 'admin') return;

    const shape = shapes.value.find((item) => item.id === id);
    if (!shape || shape.locked) return;

    selectedId.value = id;
    renderShapes();
  };

  const setTool = (toolId) => {
    activeTool.value = toolId;
    if (toolId !== 'select') {
      selectedId.value = null;
    }
    renderShapes();
  };

  const closeContextMenu = () => {
    ctxMenu.visible = false;
    ctxMenu.targetId = null;
    ctxMenu.targetShape = null;
  };

  const setRole = (nextRole) => {
    role.value = nextRole;
    activeTool.value = 'select';
    selectedId.value = null;
    closeContextMenu();
    nextTick(renderShapes);
  };

  const saveMap = () => {
    const data = JSON.stringify(shapes.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-map-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const loadDemo = () => {
    shapes.value = createDemoShapes(uid);
    selectedId.value = null;
    renderShapes();
  };

  const handleWheel = (event) => {
    event.evt.preventDefault();

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    if (event.evt.ctrlKey || event.evt.metaKey) {
      doZoom(oldScale, pointer, event.evt.deltaY);
    } else if (event.evt.shiftKey) {
      stage.x(stage.x() - event.evt.deltaY);
    } else {
      stage.x(stage.x() - (event.evt.deltaX || 0));
      stage.y(stage.y() - (event.evt.deltaY || 0));
    }

    layer.batchDraw();
    updateZoomDisplay();
  };

  const handleMouseDown = (event) => {
    if (event.evt?.button === 2) return;

    const isPanTrigger =
      event.evt?.button === 1 ||
      (event.evt?.button === 0 &&
        (isSpaceDown.value || activeTool.value === 'pan'));

    if (isPanTrigger) {
      isPanning.value = true;
      stage.draggable(true);
      stage.startDrag();
      return;
    }

    if (role.value !== 'admin') return;

    if (activeTool.value === 'select') {
      if (event.target === stage) {
        selectedId.value = null;
        transformer.nodes([]);
        layer.batchDraw();
      }
      return;
    }

    if (activeTool.value === 'pan') return;

    const worldPos = getWorldPos();
    if (!worldPos) return;

    if (activeTool.value === 'text') {
      const text = window.prompt('Введите текст:', 'Объект');
      if (text) {
        shapes.value.push({
          id: uid(),
          type: 'text',
          x: worldPos.x,
          y: worldPos.y,
          text,
          fontSize: 18,
          fill: '#e8ece8',
          name: text.slice(0, 24),
        });
        renderShapes();
      }
      activeTool.value = 'select';
      return;
    }

    isDrawing = true;
    startPos = worldPos;

    if (activeTool.value === 'rect') {
      drawingShape = {
        id: uid(),
        type: 'rect',
        x: worldPos.x,
        y: worldPos.y,
        width: 0,
        height: 0,
        fill: '#c4f542',
        opacity: 0.65,
        stroke: '#c4f542',
        strokeWidth: 2,
      };
    } else if (activeTool.value === 'circle') {
      drawingShape = {
        id: uid(),
        type: 'circle',
        x: worldPos.x,
        y: worldPos.y,
        radius: 0,
        fill: '#5ec5ff',
        opacity: 0.65,
        stroke: '#5ec5ff',
        strokeWidth: 2,
      };
    } else if (activeTool.value === 'line') {
      drawingShape = {
        id: uid(),
        type: 'line',
        points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
        stroke: '#ff6b35',
        strokeWidth: 3,
      };
    }
  };

  const handleMouseMove = () => {
    const worldPos = getWorldPos();
    if (!worldPos) return;

    mouseX.value = Math.round(worldPos.x);
    mouseY.value = Math.round(worldPos.y);

    if (!isDrawing || !drawingShape) return;

    if (drawingShape.type === 'rect') {
      drawingShape.width = worldPos.x - startPos.x;
      drawingShape.height = worldPos.y - startPos.y;
    } else if (drawingShape.type === 'circle') {
      const dx = worldPos.x - startPos.x;
      const dy = worldPos.y - startPos.y;
      drawingShape.radius = Math.sqrt(dx * dx + dy * dy);
    } else if (drawingShape.type === 'line') {
      drawingShape.points = [startPos.x, startPos.y, worldPos.x, worldPos.y];
    }

    renderTempShape();
  };

  const handleMouseUp = () => {
    if (isPanning.value) {
      isPanning.value = false;
      stage.draggable(false);
      updateZoomDisplay();
      return;
    }

    if (!isDrawing || !drawingShape) return;
    isDrawing = false;

    if (drawingShape.type === 'rect') {
      if (drawingShape.width < 0) {
        drawingShape.x += drawingShape.width;
        drawingShape.width = Math.abs(drawingShape.width);
      }
      if (drawingShape.height < 0) {
        drawingShape.y += drawingShape.height;
        drawingShape.height = Math.abs(drawingShape.height);
      }
      if (drawingShape.width < 4 || drawingShape.height < 4) {
        drawingShape = null;
        renderShapes();
        return;
      }
    } else if (drawingShape.type === 'circle' && drawingShape.radius < 4) {
      drawingShape = null;
      renderShapes();
      return;
    }

    shapes.value.push(drawingShape);
    selectedId.value = drawingShape.id;
    drawingShape = null;
    activeTool.value = 'select';
    renderShapes();
  };

  const findShapeFromNode = (node) => {
    if (!node || node === stage) return null;
    if (node.getParent?.().className === 'Transformer') return null;

    const id = node.id();
    return shapes.value.find((shape) => shape.id === id) || null;
  };

  const handleContextMenu = (event) => {
    event.evt.preventDefault();
    if (role.value !== 'admin') return;

    const position = stage.getPointerPosition();
    const worldPos = getWorldPos();
    if (!position || !worldPos || !container.value) return;

    const rect = container.value.getBoundingClientRect();
    const screenX = rect.left + position.x;
    const screenY = rect.top + position.y;
    const targetShape =
      event.target !== stage ? findShapeFromNode(event.target) : null;

    if (targetShape) {
      selectedId.value = targetShape.id;
      renderShapes();
    }

    const menuWidth = 240;
    const menuHeight = targetShape ? 360 : 280;
    ctxMenu.visible = true;
    ctxMenu.x = Math.min(screenX, window.innerWidth - menuWidth - 8);
    ctxMenu.y = Math.min(screenY, window.innerHeight - menuHeight - 8);
    ctxMenu.targetId = targetShape ? targetShape.id : null;
    ctxMenu.targetShape = targetShape || null;
    ctxMenu.worldX = worldPos.x;
    ctxMenu.worldY = worldPos.y;
  };

  const ctxAction = (action) => {
    const shape = ctxMenu.targetShape;
    const worldX = ctxMenu.worldX;
    const worldY = ctxMenu.worldY;
    closeContextMenu();

    switch (action) {
      case 'duplicate':
        if (shape) duplicateShape(shape.id);
        break;
      case 'delete':
        if (shape) deleteShape(shape.id);
        break;
      case 'rename':
        if (shape) {
          const name = window.prompt('Имя объекта:', shape.name || shape.type);
          if (name !== null) {
            updateShapeById(shape.id, { name });
          }
        }
        break;
      case 'toFront':
        if (shape) bringToFront(shape.id);
        break;
      case 'toBack':
        if (shape) sendToBack(shape.id);
        break;
      case 'copyCoords':
        if (shape && navigator.clipboard) {
          const coords =
            shape.type === 'line'
              ? `points: [${shape.points.map((point) => Math.round(point)).join(', ')}]`
              : `x: ${Math.round(shape.x)}, y: ${Math.round(shape.y)}`;
          navigator.clipboard.writeText(coords).catch(() => {});
        }
        break;
      case 'lock':
        if (shape) {
          updateShapeById(shape.id, { locked: !shape.locked });
          if (!shape.locked) {
            selectedId.value = null;
          }
        }
        break;
      case 'paste':
        if (clipboard.value) {
          pasteAt(worldX, worldY);
        }
        break;
      case 'addRect':
        shapes.value.push({
          id: uid(),
          type: 'rect',
          x: worldX - 60,
          y: worldY - 40,
          width: 120,
          height: 80,
          fill: '#c4f542',
          opacity: 0.65,
          stroke: '#c4f542',
          strokeWidth: 2,
        });
        selectedId.value = shapes.value.at(-1).id;
        renderShapes();
        break;
      case 'addCircle':
        shapes.value.push({
          id: uid(),
          type: 'circle',
          x: worldX,
          y: worldY,
          radius: 40,
          fill: '#5ec5ff',
          opacity: 0.65,
          stroke: '#5ec5ff',
          strokeWidth: 2,
        });
        selectedId.value = shapes.value.at(-1).id;
        renderShapes();
        break;
      case 'addText': {
        const text = window.prompt('Введите текст:', 'Объект');
        if (text) {
          shapes.value.push({
            id: uid(),
            type: 'text',
            x: worldX,
            y: worldY,
            text,
            fontSize: 18,
            fill: '#e8ece8',
            name: text.slice(0, 24),
          });
          selectedId.value = shapes.value.at(-1).id;
          renderShapes();
        }
        break;
      }
      case 'resetView':
        resetView();
        break;
      case 'fitToView':
        fitToView();
        break;
      default:
        break;
    }
  };

  const onKeyDown = (event) => {
    const targetTag = event.target?.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

    if (event.code === 'Space' && !isSpaceDown.value) {
      event.preventDefault();
      isSpaceDown.value = true;
      return;
    }

    if (role.value !== 'admin') return;

    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'd') {
        event.preventDefault();
        duplicateSelected();
        return;
      }
      if (key === 'c' && selectedId.value) {
        copyShape(selectedId.value);
        return;
      }
      if (key === 'v' && clipboard.value && stage) {
        const center = stage.getRelativePointerPosition() || {
          x: (stage.width() / 2 - stage.x()) / stage.scaleX(),
          y: (stage.height() / 2 - stage.y()) / stage.scaleY(),
        };
        pasteAt(center.x, center.y);
      }
      return;
    }

    const key = event.key.toLowerCase();
    const map = {
      v: 'select',
      h: 'pan',
      r: 'rect',
      c: 'circle',
      l: 'line',
      t: 'text',
    };

    if (map[key]) {
      setTool(map[key]);
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      deleteSelected();
    } else if (event.key === 'Escape') {
      selectedId.value = null;
      activeTool.value = 'select';
      closeContextMenu();
      renderShapes();
    } else if (event.key === 'F2') {
      if (selectedShape.value) {
        const name = window.prompt(
          'Имя объекта:',
          selectedShape.value.name || selectedShape.value.type,
        );
        if (name !== null) {
          updateShape({ name });
        }
      }
    } else if (event.key === ']' && selectedId.value) {
      bringToFront(selectedId.value);
    } else if (event.key === '[' && selectedId.value) {
      sendToBack(selectedId.value);
    } else if (event.key === '0') {
      resetView();
    } else if (key === 'f') {
      fitToView();
    } else if (event.key === '+' || event.key === '=') {
      zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      zoomOut();
    }
  };

  const onKeyUp = (event) => {
    if (event.code === 'Space') {
      isSpaceDown.value = false;
    }
  };

  const tick = () => {
    const date = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    clock.value = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  const initKonva = () => {
    const element = container.value;
    if (!element) return;

    stage = new Konva.Stage({
      container: element,
      width: element.offsetWidth,
      height: element.offsetHeight,
      draggable: false,
    });

    layer = new Konva.Layer();
    stage.add(layer);

    transformer = new Konva.Transformer({
      anchorStroke: '#c4f542',
      anchorFill: '#0a0e0d',
      anchorSize: 8,
      borderStroke: '#c4f542',
      borderDash: [4, 4],
      rotateAnchorOffset: 24,
      ignoreStroke: true,
    });
    layer.add(transformer);

    stage.on('mousedown touchstart', handleMouseDown);
    stage.on('mousemove touchmove', handleMouseMove);
    stage.on('mouseup touchend', handleMouseUp);
    stage.on('wheel', handleWheel);
    stage.on('contextmenu', handleContextMenu);

    resizeObserver = new ResizeObserver(() => {
      stage.width(element.offsetWidth);
      stage.height(element.offsetHeight);
      layer.batchDraw();
    });
    resizeObserver.observe(element);

    renderShapes();
  };

  onMounted(() => {
    nextTick(initKonva);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    tick();
    clockTimer = window.setInterval(tick, 1000);
    autoSaveTimer = window.setInterval(() => {
      autoSaveIn.value = autoSaveIn.value > 0 ? autoSaveIn.value - 1 : 30;
    }, 1000);
    window.setTimeout(loadDemo, 200);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.clearInterval(clockTimer);
    window.clearInterval(autoSaveTimer);
    resizeObserver?.disconnect();
    stage?.destroy();
  });

  watch(selectedId, () => {
    renderShapes();
  });

  return {
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
    palette: PALETTE,
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
    shiftEnd: SHIFT_END,
    shiftStart: SHIFT_START,
    tools: TOOLS,
    updateShape,
    zoomIn,
    zoomLevel,
    zoomOut,
  };
}
