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
  GRID_SIZE,
  PALETTE,
  PERIMETER_COLOR,
  PERIMETER_LIGHT,
  ROLES,
  SENSOR_TYPES,
  SHIFT_END,
  SHIFT_START,
  SNAP_THRESHOLD,
  STATUS,
  TOOLS,
} from '../constants/editor.js';

const SESSION_KEY = 'sentinel-f.session';

const isEditableTool = (toolId) =>
  ['zone-rect', 'zone-circle', 'wall', 'sensor', 'text'].includes(toolId);

export function useBoardEditor() {
  const session = ref(null);
  const role = computed(() => session.value?.role || null);
  const isEngineer = computed(() => role.value === 'engineer');
  const isDuty = computed(() => role.value === 'duty');

  const activeTool = ref('select');
  const activeSensorKind = ref('fire');
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
  const snapEnabled = ref(true);
  const snapDisabledByAlt = ref(false);
  const snapHint = ref(null);
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
    if (isEngineer.value && isEditableTool(activeTool.value)) return 'cursor-crosshair';
    if (isDuty.value) return 'cursor-pointer';
    return '';
  });

  const stats = computed(() => {
    let zones = 0;
    let sensors = 0;
    let alarms = 0;
    shapes.value.forEach((shape) => {
      if (shape.kind === 'zone') zones += 1;
      if (shape.kind === 'sensor') sensors += 1;
      if ((shape.kind === 'zone' || shape.kind === 'sensor') && shape.status === 'alarm') {
        alarms += 1;
      }
    });
    return { zones, sensors, alarms };
  });

  let stage;
  let layer;
  let snapLayer;
  let snapMarker;
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
    if (element && !stage) {
      nextTick(initKonva);
    }
  };

  const restoreSession = () => {
    try {
      const raw = window.localStorage?.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.role && ROLES[parsed.role]) {
          session.value = parsed;
        }
      }
    } catch {
      session.value = null;
    }
  };

  const persistSession = (value) => {
    try {
      if (value) {
        window.localStorage?.setItem(SESSION_KEY, JSON.stringify(value));
      } else {
        window.localStorage?.removeItem(SESSION_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  const login = (data) => {
    session.value = data;
    persistSession(data);
    activeTool.value = 'select';
    selectedId.value = null;
  };

  const logout = () => {
    session.value = null;
    persistSession(null);
    selectedId.value = null;
    activeTool.value = 'select';
  };

  const clearLayerShapes = () => {
    if (!layer) return;
    layer.getChildren().forEach((node) => {
      if (node !== transformer) node.destroy();
    });
  };

  const getWorldPos = () => {
    const position = stage?.getPointerPosition();
    if (!position) return null;
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(position);
  };

  const updateZoomDisplay = () => {
    if (stage) zoomLevel.value = stage.scaleX();
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

  const collectSnapPoints = (excludeId = null) => {
    const points = [];
    shapes.value.forEach((shape) => {
      if (shape.id === excludeId) return;
      if (shape.type === 'rect') {
        points.push({ x: shape.x, y: shape.y });
        points.push({ x: shape.x + shape.width, y: shape.y });
        points.push({ x: shape.x, y: shape.y + shape.height });
        points.push({ x: shape.x + shape.width, y: shape.y + shape.height });
        points.push({
          x: shape.x + shape.width / 2,
          y: shape.y + shape.height / 2,
        });
      } else if (shape.type === 'circle') {
        points.push({ x: shape.x, y: shape.y });
        points.push({ x: shape.x + shape.radius, y: shape.y });
        points.push({ x: shape.x - shape.radius, y: shape.y });
        points.push({ x: shape.x, y: shape.y + shape.radius });
        points.push({ x: shape.x, y: shape.y - shape.radius });
      } else if (shape.type === 'line') {
        for (let i = 0; i < shape.points.length; i += 2) {
          points.push({ x: shape.points[i], y: shape.points[i + 1] });
        }
      } else if (shape.type === 'sensor' || shape.type === 'text') {
        points.push({ x: shape.x, y: shape.y });
      }
    });
    return points;
  };

  const snapPoint = (worldPos, excludeId = null) => {
    if (!snapEnabled.value || snapDisabledByAlt.value) {
      snapHint.value = null;
      return worldPos;
    }
    const scale = stage?.scaleX() || 1;
    const threshold = SNAP_THRESHOLD / scale;

    let best = null;
    let bestDist = Infinity;

    collectSnapPoints(excludeId).forEach((point) => {
      const dx = point.x - worldPos.x;
      const dy = point.y - worldPos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < threshold && dist < bestDist) {
        best = point;
        bestDist = dist;
      }
    });

    if (best) {
      snapHint.value = { x: best.x, y: best.y, kind: 'vertex' };
      return { x: best.x, y: best.y };
    }

    const gx = Math.round(worldPos.x / GRID_SIZE) * GRID_SIZE;
    const gy = Math.round(worldPos.y / GRID_SIZE) * GRID_SIZE;
    if (Math.hypot(gx - worldPos.x, gy - worldPos.y) < threshold) {
      snapHint.value = { x: gx, y: gy, kind: 'grid' };
      return { x: gx, y: gy };
    }

    snapHint.value = null;
    return worldPos;
  };

  const renderSnapMarker = () => {
    if (!snapMarker) return;
    if (!snapHint.value || !isEngineer.value) {
      snapMarker.visible(false);
      snapLayer.batchDraw();
      return;
    }
    snapMarker.position({ x: snapHint.value.x, y: snapHint.value.y });
    snapMarker.stroke(snapHint.value.kind === 'vertex' ? '#c4f542' : '#5ec5ff');
    snapMarker.visible(true);
    snapLayer.batchDraw();
  };

  const resolveZoneFill = (shape) => {
    if (isEngineer.value) {
      return shape.fill || (shape.status === 'alarm' ? STATUS.alarm.color : STATUS.ok.color);
    }
    return shape.status === 'alarm' ? STATUS.alarm.color : STATUS.ok.color;
  };

  const resolveZoneOpacity = (shape) => {
    if (isEngineer.value) return shape.opacity ?? 0.35;
    return shape.status === 'alarm' ? 0.55 : 0.4;
  };

  const resolveZoneStroke = (shape) => {
    if (shape.stroke) return shape.stroke;
    return PERIMETER_COLOR;
  };

  const createSensorGroup = (shape, isTemp = false) => {
    const sensorDef =
      SENSOR_TYPES.find((s) => s.id === shape.sensorKind) || SENSOR_TYPES[0];
    const isAlarm = shape.status === 'alarm';
    const baseColor = isAlarm ? STATUS.alarm.color : sensorDef.color;
    const draggable = isEngineer.value && !isTemp && !shape.locked;

    const group = new Konva.Group({
      id: shape.id,
      x: shape.x,
      y: shape.y,
      draggable,
    });

    if (isAlarm) {
      group.add(
        new Konva.Circle({
          radius: 18,
          fill: STATUS.alarm.color,
          opacity: 0.25,
          listening: false,
        }),
      );
    }

    group.add(
      new Konva.Circle({
        radius: 10,
        fill: '#0a0e0d',
        stroke: baseColor,
        strokeWidth: 2,
      }),
    );

    group.add(
      new Konva.Text({
        text: sensorDef.symbol,
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        fontStyle: '700',
        fill: baseColor,
        offsetX: 3.5,
        offsetY: 5.5,
        listening: false,
      }),
    );

    return group;
  };

  const createNode = (shape) => {
    const isTemp = shape.id === '__temp__';
    const draggable = isEngineer.value && !isTemp && !shape.locked;

    if (shape.type === 'sensor') {
      return createSensorGroup(shape, isTemp);
    }

    let node = null;

    if (shape.type === 'rect') {
      node = new Konva.Rect({
        id: shape.id,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: shape.kind === 'zone' ? resolveZoneFill(shape) : shape.fill,
        opacity: shape.kind === 'zone' ? resolveZoneOpacity(shape) : shape.opacity ?? 0.5,
        stroke: shape.kind === 'zone' ? resolveZoneStroke(shape) : shape.stroke || PERIMETER_COLOR,
        strokeWidth: shape.strokeWidth || 2.5,
        cornerRadius: 2,
        dash: shape.locked ? [6, 4] : undefined,
        draggable,
      });
    } else if (shape.type === 'circle') {
      node = new Konva.Circle({
        id: shape.id,
        x: shape.x,
        y: shape.y,
        radius: shape.radius,
        fill: shape.kind === 'zone' ? resolveZoneFill(shape) : shape.fill,
        opacity: shape.kind === 'zone' ? resolveZoneOpacity(shape) : shape.opacity ?? 0.5,
        stroke: shape.kind === 'zone' ? resolveZoneStroke(shape) : shape.stroke || PERIMETER_COLOR,
        strokeWidth: shape.strokeWidth || 2.5,
        dash: shape.locked ? [6, 4] : undefined,
        draggable,
      });
    } else if (shape.type === 'line') {
      node = new Konva.Line({
        id: shape.id,
        points: shape.points,
        stroke: shape.stroke || PERIMETER_LIGHT,
        strokeWidth: shape.strokeWidth || 4,
        lineCap: 'round',
        dash: shape.locked ? [6, 4] : undefined,
        draggable,
      });
    } else if (shape.type === 'text') {
      node = new Konva.Text({
        id: shape.id,
        x: shape.x,
        y: shape.y,
        text: shape.text,
        fontSize: shape.fontSize || 14,
        fontFamily: 'Inter Tight, sans-serif',
        fontStyle: '700',
        fill: shape.fill || PERIMETER_LIGHT,
        opacity: shape.locked ? 0.7 : 1,
        draggable,
      });
    }

    if (!node || isTemp) return node;

    node.on('click tap', (event) => {
      if (event.evt?.button === 2) return;
      event.cancelBubble = true;
      handleShapeClick(shape);
    });

    if (!isEngineer.value) return node;

    node.on('dragstart', () => {
      snapHint.value = null;
    });

    node.on('dragmove', () => {
      if (shape.type === 'line') {
        snapHint.value = null;
        return;
      }
      const candidate = { x: node.x(), y: node.y() };
      const snapped = snapPoint(candidate, shape.id);
      node.position(snapped);
      renderSnapMarker();
    });

    node.on('dragend', () => {
      snapHint.value = null;
      renderSnapMarker();
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
          fontSize: Math.max(8, (shape.fontSize || 14) * scaleY),
        });
      }
    });

    return node;
  };

  const handleShapeClick = (shape) => {
    if (isEngineer.value) {
      if (!shape.locked) {
        selectedId.value = shape.id;
        renderShapes();
      }
      return;
    }
    if (isDuty.value && (shape.kind === 'zone' || shape.kind === 'sensor')) {
      const next = shape.status === 'alarm' ? 'ok' : 'alarm';
      updateShapeById(shape.id, { status: next });
      selectedId.value = shape.id;
      return;
    }
    if (shape.kind === 'zone' || shape.kind === 'sensor') {
      selectedId.value = shape.id;
    }
  };

  const renderTempShape = () => {
    if (!layer) return;
    const temp = layer.findOne('#__temp__');
    if (temp) temp.destroy();
    if (!drawingShape) {
      layer.batchDraw();
      return;
    }
    const node = createNode({ ...drawingShape, id: '__temp__' });
    if (node) {
      node.opacity?.(0.6);
      layer.add(node);
    }
    layer.batchDraw();
  };

  const renderShapes = () => {
    if (!layer) return;
    clearLayerShapes();

    shapes.value.forEach((shape) => {
      const node = createNode(shape);
      if (node) layer.add(node);
    });

    if (selectedId.value && isEngineer.value) {
      const shape = shapes.value.find((item) => item.id === selectedId.value);
      if (shape && !shape.locked && shape.type !== 'sensor' && shape.type !== 'line') {
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
    renderSnapMarker();
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
    snapLayer.batchDraw();
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
      } else if (shape.type === 'sensor') {
        minX = Math.min(minX, shape.x - 16);
        minY = Math.min(minY, shape.y - 16);
        maxX = Math.max(maxX, shape.x + 16);
        maxY = Math.max(maxY, shape.y + 16);
      } else if (shape.type === 'text') {
        minX = Math.min(minX, shape.x);
        minY = Math.min(minY, shape.y);
        maxX = Math.max(
          maxX,
          shape.x + (shape.text?.length || 5) * (shape.fontSize || 14) * 0.6,
        );
        maxY = Math.max(maxY, shape.y + (shape.fontSize || 14) * 1.2);
      } else if (shape.type === 'line') {
        for (let i = 0; i < shape.points.length; i += 2) {
          minX = Math.min(minX, shape.points[i]);
          maxX = Math.max(maxX, shape.points[i]);
          minY = Math.min(minY, shape.points[i + 1]);
          maxY = Math.max(maxY, shape.points[i + 1]);
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
    snapLayer.batchDraw();
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
    const offset = GRID_SIZE;
    copy.id = uid();
    copy.locked = false;
    if (copy.type === 'line') {
      copy.points = copy.points.map((point) => point + offset);
    } else {
      copy.x += offset;
      copy.y += offset;
    }
    if (copy.name) copy.name += ' (копия)';
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
    if (shape) clipboard.value = JSON.parse(JSON.stringify(shape));
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
    if (selectedId.value === id) selectedId.value = null;
    renderShapes();
  };

  const deleteSelected = () => {
    if (selectedId.value) deleteShape(selectedId.value);
  };

  const duplicateSelected = () => {
    if (selectedId.value) duplicateShape(selectedId.value);
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

  const setZoneStatus = (id, status) => {
    const shape = shapes.value.find((item) => item.id === id);
    if (!shape) return;
    if (shape.kind !== 'zone' && shape.kind !== 'sensor') return;
    updateShapeById(id, { status });
  };

  const toggleZoneStatus = (id) => {
    const shape = shapes.value.find((item) => item.id === id);
    if (!shape) return;
    setZoneStatus(id, shape.status === 'alarm' ? 'ok' : 'alarm');
  };

  const acknowledgeAll = () => {
    shapes.value = shapes.value.map((shape) =>
      (shape.kind === 'zone' || shape.kind === 'sensor') && shape.status === 'alarm'
        ? { ...shape, status: 'ok' }
        : shape,
    );
    renderShapes();
  };

  const selectShape = (id) => {
    if (!isEngineer.value && !isDuty.value) {
      selectedId.value = id;
      return;
    }
    const shape = shapes.value.find((item) => item.id === id);
    if (!shape) return;
    if (isEngineer.value && shape.locked) return;
    selectedId.value = id;
    renderShapes();
  };

  const setTool = (toolId) => {
    if (!isEngineer.value) return;
    activeTool.value = toolId;
    if (toolId !== 'select') selectedId.value = null;
    renderShapes();
  };

  const setSensorKind = (kind) => {
    activeSensorKind.value = kind;
  };

  const closeContextMenu = () => {
    ctxMenu.visible = false;
    ctxMenu.targetId = null;
    ctxMenu.targetShape = null;
  };

  const saveMap = () => {
    const data = JSON.stringify(shapes.value, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-f-map-${Date.now()}.json`;
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
    snapLayer.batchDraw();
    updateZoomDisplay();
  };

  const handleMouseDown = (event) => {
    if (event.evt?.button === 2) return;

    const isPanTrigger =
      event.evt?.button === 1 ||
      (event.evt?.button === 0 && (isSpaceDown.value || activeTool.value === 'pan'));

    if (isPanTrigger) {
      isPanning.value = true;
      stage.draggable(true);
      stage.startDrag();
      return;
    }

    if (!isEngineer.value) return;

    if (activeTool.value === 'select') {
      if (event.target === stage) {
        selectedId.value = null;
        transformer.nodes([]);
        layer.batchDraw();
      }
      return;
    }

    if (activeTool.value === 'pan') return;

    const rawPos = getWorldPos();
    if (!rawPos) return;
    const worldPos = snapPoint(rawPos);

    if (activeTool.value === 'text') {
      const text = window.prompt('Введите текст:', 'Метка');
      if (text) {
        shapes.value.push({
          id: uid(),
          kind: 'label',
          type: 'text',
          x: worldPos.x,
          y: worldPos.y,
          text,
          fontSize: 14,
          name: text.slice(0, 24),
        });
        renderShapes();
      }
      activeTool.value = 'select';
      return;
    }

    if (activeTool.value === 'sensor') {
      const sensorDef =
        SENSOR_TYPES.find((s) => s.id === activeSensorKind.value) || SENSOR_TYPES[0];
      const count = shapes.value.filter((s) => s.kind === 'sensor').length + 1;
      shapes.value.push({
        id: uid(),
        kind: 'sensor',
        type: 'sensor',
        x: worldPos.x,
        y: worldPos.y,
        sensorKind: sensorDef.id,
        status: 'ok',
        name: `${sensorDef.label.split(' ')[0].slice(0, 2).toUpperCase()}-${String(count).padStart(2, '0')}`,
      });
      selectedId.value = shapes.value.at(-1).id;
      renderShapes();
      return;
    }

    isDrawing = true;
    startPos = worldPos;

    if (activeTool.value === 'zone-rect') {
      drawingShape = {
        id: uid(),
        kind: 'zone',
        type: 'rect',
        x: worldPos.x,
        y: worldPos.y,
        width: 0,
        height: 0,
        status: 'ok',
        sensorKind: activeSensorKind.value,
      };
    } else if (activeTool.value === 'zone-circle') {
      drawingShape = {
        id: uid(),
        kind: 'zone',
        type: 'circle',
        x: worldPos.x,
        y: worldPos.y,
        radius: 0,
        status: 'ok',
        sensorKind: activeSensorKind.value,
      };
    } else if (activeTool.value === 'wall') {
      drawingShape = {
        id: uid(),
        kind: 'wall',
        type: 'line',
        points: [worldPos.x, worldPos.y, worldPos.x, worldPos.y],
        stroke: PERIMETER_LIGHT,
        strokeWidth: 4,
      };
    }
  };

  const handleMouseMove = () => {
    const rawPos = getWorldPos();
    if (!rawPos) return;

    if (isEngineer.value && (isEditableTool(activeTool.value) || isDrawing)) {
      const snapped = snapPoint(rawPos);
      mouseX.value = Math.round(snapped.x);
      mouseY.value = Math.round(snapped.y);
      renderSnapMarker();

      if (isDrawing && drawingShape) {
        if (drawingShape.type === 'rect') {
          drawingShape.width = snapped.x - startPos.x;
          drawingShape.height = snapped.y - startPos.y;
        } else if (drawingShape.type === 'circle') {
          const dx = snapped.x - startPos.x;
          const dy = snapped.y - startPos.y;
          drawingShape.radius = Math.sqrt(dx * dx + dy * dy);
        } else if (drawingShape.type === 'line') {
          drawingShape.points = [startPos.x, startPos.y, snapped.x, snapped.y];
        }
        renderTempShape();
      }
    } else {
      mouseX.value = Math.round(rawPos.x);
      mouseY.value = Math.round(rawPos.y);
    }
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
      if (drawingShape.width < 8 || drawingShape.height < 8) {
        drawingShape = null;
        renderShapes();
        return;
      }
    } else if (drawingShape.type === 'circle' && drawingShape.radius < 8) {
      drawingShape = null;
      renderShapes();
      return;
    } else if (drawingShape.type === 'line') {
      const [x1, y1, x2, y2] = drawingShape.points;
      if (Math.hypot(x2 - x1, y2 - y1) < 8) {
        drawingShape = null;
        renderShapes();
        return;
      }
    }

    shapes.value.push(drawingShape);
    selectedId.value = drawingShape.id;
    drawingShape = null;
    activeTool.value = 'select';
    snapHint.value = null;
    renderShapes();
  };

  const findShapeFromNode = (node) => {
    if (!node || node === stage) return null;
    if (node.getParent?.().className === 'Transformer') return null;
    let current = node;
    while (current && current !== stage) {
      const id = current.id?.();
      if (id) {
        const shape = shapes.value.find((s) => s.id === id);
        if (shape) return shape;
      }
      current = current.getParent?.();
    }
    return null;
  };

  const handleContextMenu = (event) => {
    event.evt.preventDefault();
    if (!isEngineer.value && !isDuty.value) return;
    const position = stage.getPointerPosition();
    const worldPos = getWorldPos();
    if (!position || !worldPos || !container.value) return;
    const rect = container.value.getBoundingClientRect();
    const screenX = rect.left + position.x;
    const screenY = rect.top + position.y;
    const targetShape = event.target !== stage ? findShapeFromNode(event.target) : null;

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
          if (name !== null) updateShapeById(shape.id, { name });
        }
        break;
      case 'toFront':
        if (shape) bringToFront(shape.id);
        break;
      case 'toBack':
        if (shape) sendToBack(shape.id);
        break;
      case 'lock':
        if (shape) {
          updateShapeById(shape.id, { locked: !shape.locked });
          if (!shape.locked) selectedId.value = null;
        }
        break;
      case 'paste':
        if (clipboard.value) pasteAt(worldX, worldY);
        break;
      case 'setOk':
        if (shape) setZoneStatus(shape.id, 'ok');
        break;
      case 'setAlarm':
        if (shape) setZoneStatus(shape.id, 'alarm');
        break;
      case 'addZoneRect':
        shapes.value.push({
          id: uid(),
          kind: 'zone',
          type: 'rect',
          x: worldX - 60,
          y: worldY - 40,
          width: 120,
          height: 80,
          status: 'ok',
          sensorKind: activeSensorKind.value,
        });
        selectedId.value = shapes.value.at(-1).id;
        renderShapes();
        break;
      case 'addZoneCircle':
        shapes.value.push({
          id: uid(),
          kind: 'zone',
          type: 'circle',
          x: worldX,
          y: worldY,
          radius: 48,
          status: 'ok',
          sensorKind: activeSensorKind.value,
        });
        selectedId.value = shapes.value.at(-1).id;
        renderShapes();
        break;
      case 'addSensor':
        shapes.value.push({
          id: uid(),
          kind: 'sensor',
          type: 'sensor',
          x: worldX,
          y: worldY,
          sensorKind: activeSensorKind.value,
          status: 'ok',
          name: `${activeSensorKind.value.slice(0, 2).toUpperCase()}-${String(shapes.value.length + 1).padStart(2, '0')}`,
        });
        selectedId.value = shapes.value.at(-1).id;
        renderShapes();
        break;
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

    if (event.altKey) snapDisabledByAlt.value = true;

    if (!isEngineer.value) {
      if (event.key === 'Escape') {
        selectedId.value = null;
        closeContextMenu();
        renderShapes();
      }
      return;
    }

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
      r: 'zone-rect',
      c: 'zone-circle',
      l: 'wall',
      d: 'sensor',
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
        if (name !== null) updateShape({ name });
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
    if (event.code === 'Space') isSpaceDown.value = false;
    if (!event.altKey) snapDisabledByAlt.value = false;
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
    snapLayer = new Konva.Layer({ listening: false });
    stage.add(layer);
    stage.add(snapLayer);

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

    snapMarker = new Konva.Circle({
      radius: 6,
      stroke: '#c4f542',
      strokeWidth: 2,
      fill: 'rgba(196, 245, 66, 0.15)',
      visible: false,
    });
    snapLayer.add(snapMarker);

    stage.on('mousedown touchstart', handleMouseDown);
    stage.on('mousemove touchmove', handleMouseMove);
    stage.on('mouseup touchend', handleMouseUp);
    stage.on('wheel', handleWheel);
    stage.on('contextmenu', handleContextMenu);

    resizeObserver = new ResizeObserver(() => {
      stage.width(element.offsetWidth);
      stage.height(element.offsetHeight);
      layer.batchDraw();
      snapLayer.batchDraw();
    });
    resizeObserver.observe(element);

    renderShapes();
  };

  onMounted(() => {
    restoreSession();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    tick();
    clockTimer = window.setInterval(tick, 1000);
    autoSaveTimer = window.setInterval(() => {
      autoSaveIn.value = autoSaveIn.value > 0 ? autoSaveIn.value - 1 : 30;
    }, 1000);
    window.setTimeout(() => {
      if (!shapes.value.length) loadDemo();
    }, 200);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.clearInterval(clockTimer);
    window.clearInterval(autoSaveTimer);
    resizeObserver?.disconnect();
    stage?.destroy();
  });

  watch(selectedId, () => renderShapes());
  watch(role, () => {
    activeTool.value = 'select';
    selectedId.value = null;
    closeContextMenu();
    nextTick(renderShapes);
  });

  return {
    activeSensorKind,
    activeTool,
    activeToolLabel,
    acknowledgeAll,
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
    isDuty,
    isEngineer,
    loadDemo,
    login,
    logout,
    mouseX,
    mouseY,
    palette: PALETTE,
    resetView,
    role,
    saveMap,
    selectShape,
    selectedId,
    selectedShape,
    sensorTypes: SENSOR_TYPES,
    session,
    setContainer,
    setSensorKind,
    setTool,
    setZoneStatus,
    shapes,
    shiftEnd: SHIFT_END,
    shiftStart: SHIFT_START,
    snapEnabled,
    stats,
    statusInfo: STATUS,
    toggleZoneStatus,
    tools: TOOLS,
    updateShape,
    zoomIn,
    zoomLevel,
    zoomOut,
  };
}
