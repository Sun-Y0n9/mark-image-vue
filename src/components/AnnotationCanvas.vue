<template>
  <div
    class="annotation-canvas"
    :class="{
      'layout-toolbar-top': layoutToolbarPosition === 'top',
      'layout-toolbar-bottom': layoutToolbarPosition === 'bottom'
    }"
  >
    <div v-if="showAnnotationToolbar" class="annotation-toolbar">
      <div v-if="enabledTools.length" class="tool-group">
        <button
          v-for="tool in enabledTools"
          :key="tool"
          type="button"
          class="tool-btn"
          :class="{ active: currentTool === tool }"
          :disabled="!editable"
          :title="toolMeta[tool].title"
          @click="setTool(tool)"
        >
          <svg v-if="tool === 'pen'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <svg v-else-if="tool === 'rect'" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9" />
          </svg>
          {{ toolMeta[tool].label }}
        </button>
      </div>

      <div v-if="enabledTools.length && colorOptions.length" class="divider" />

      <div v-if="colorOptions.length" class="color-group">
        <span class="color-label">颜色</span>
        <div
          v-for="color in colorOptions"
          :key="color"
          class="color-swatch"
          :class="{ selected: currentColor === color, 'is-white': color === '#ffffff' }"
          :style="{ background: color }"
          @click="setColor(color)"
        />
      </div>

      <div v-if="colorOptions.length && lineWidthOptions.length" class="divider" />

      <select
        v-if="lineWidthOptions.length"
        class="width-select"
        :value="currentLineWidth"
        :disabled="!editable"
        title="线宽"
        @change="setLineWidth($event.target.value)"
      >
        <option v-for="item in lineWidthOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </option>
      </select>

      <div v-if="showUndoButton || showClearButton" class="divider" />

      <button
        v-if="showUndoButton"
        type="button"
        class="tool-btn undo-btn"
        :disabled="!editable"
        title="撤销 Ctrl+Z"
        @click="undo"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </svg>
        撤销
      </button>
      <button
        v-if="showClearButton"
        type="button"
        class="tool-btn clear-btn"
        :disabled="!editable"
        title="清除所有标注"
        @click="clearAnnotations"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
        清除
      </button>

      <div v-if="showRotateButtons" class="divider" />

      <template v-if="showRotateButtons">
        <button type="button" class="tool-btn" title="向左旋转90°" @click="rotateCanvas(-90)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.95" />
          </svg>
          左转
        </button>
        <button type="button" class="tool-btn" title="向右旋转90°" @click="rotateCanvas(90)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-.49-4.95" />
          </svg>
          右转
        </button>
      </template>

      <button
        v-show="showSaveButton"
        type="button"
        class="tool-btn save-btn"
        :class="{ 'has-unsaved': hasUnsaved }"
        :disabled="!editable"
        :title="saveButtonTitle"
        @click="saveAnnotations"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
        </svg>
        保存
      </button>
      <div
        v-if="toolbarAnnotationBlocked"
        class="toolbar-block-overlay"
        title="无映像，不支持标注"
      />
    </div>
    <div
      v-else-if="reserveToolbarSpace"
      class="annotation-toolbar annotation-toolbar--placeholder"
      :style="toolbarPlaceholderStyle"
    />

    <div
      ref="wrapper"
      class="annotation-wrapper"
      :class="{
        'annotation-wrapper--view-only': !annotationEnabled,
        'is-panning': isPanning
      }"
    >
      <div ref="canvasScroll" class="canvas-scroll">
        <div ref="canvasHost" class="canvas-host">
          <canvas ref="canvasEl"></canvas>
        </div>
      </div>
      <div v-if="loading" class="canvas-loading">
        <div class="mark-image-spinner" />
        <div class="mark-image-spinner-text">影像加载中...</div>
      </div>
      <span v-if="pageLabel && !loading" class="page-badge">{{ pageLabel }}</span>
      <span v-if="!loading && zoomEnabled" class="zoom-badge">
        <button
          type="button"
          class="zoom-ctrl-btn"
          title="缩小 10%"
          :disabled="Math.round(zoomPercent) <= resolvedZoomMin"
          @click.stop="zoomByStep(-10)"
        >
          −
        </button>
        <span class="zoom-percent-text">{{ Math.round(zoomPercent) }}%</span>
        <button
          type="button"
          class="zoom-ctrl-btn"
          title="放大 10%"
          :disabled="Math.round(zoomPercent) >= resolvedZoomMax"
          @click.stop="zoomByStep(10)"
        >
          +
        </button>
        <button
          v-if="Math.round(zoomPercent) !== 100"
          type="button"
          class="zoom-ctrl-btn"
          title="重置缩放"
          @click.stop="setZoomPercent(100)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </button>
      </span>
    </div>
  </div>
</template>

<script>
import { fabric } from 'fabric'
import { annotateListToFabricObjects } from '../utils/annotateList'
import { DEFAULT_PLACEHOLDER, resolvePlaceholderSource } from '../utils/placeholder'
import { dataURLToBlob, blobToFile } from '../utils/exportImage'
import {
  DEFAULT_COLORS,
  DEFAULT_LINE_WIDTH_OPTIONS,
  DEFAULT_TOOLS,
  TOOL_META,
  normalizeColors,
  normalizeLineWidths,
  normalizeTools,
  normalizeZoomRange
} from '../utils/config'

export default {
  name: 'AnnotationCanvas',
  props: {
    imageUrl: { type: String, required: true },
    storageKey: { type: String, required: true },
    initialAnnotateList: { type: Array, default: () => [] },
    /** 已提交标注（Fabric objects 结构，用于编辑回显） */
    initialStoredPayload: { type: Object, default: null },
    pageLabel: { type: String, default: '' },
    editable: { type: Boolean, default: true },
  /** 标注工具栏位置：bottom 图片下方（默认）、top 图片上方、'' 不显示工具栏 */
    toolbarPosition: {
      type: String,
      default: 'bottom',
      validator (value) {
        return ['top', 'bottom', ''].includes(value)
      }
    },
    /** 不显示工具栏时是否保留工具栏占位（用于左右比对面板垂直对齐） */
    reserveToolbarSpace: {
      type: Boolean,
      default: false
    },
    /** 占位高度（px），由父级根据对侧工具栏实测高度传入 */
    toolbarSpaceHeight: {
      type: Number,
      default: 0
    },
    /** 原图加载失败后的重新加载次数，用完后才显示占位图 */
    imageRetryCount: {
      type: Number,
      default: 1
    },
    /** 图片加载失败时的占位图。支持 URL、data URL 或纯 base64，空值使用内置图 */
    placeholderUrl: {
      type: String,
      default: DEFAULT_PLACEHOLDER
    },
    /** 保存方式：json 标注数据 / image 原图叠加上标注后的新图 */
    saveMode: {
      type: String,
      default: 'json',
      validator (value) {
        return ['json', 'image'].includes(value)
      }
    },
    /** 导出图片格式，仅 saveMode=image 时使用 */
    imageType: {
      type: String,
      default: 'png',
      validator (value) {
        return ['png', 'jpeg'].includes(value)
      }
    },
    imageQuality: {
      type: Number,
      default: 0.92
    },
    /** 画笔颜色，默认 6 色 */
    colors: {
      type: Array,
      default () {
        return DEFAULT_COLORS.slice()
      }
    },
    /** 线宽，仅允许 2/3/5/8 中的任意几个；可传数字或 { value, label } */
    lineWidths: {
      type: Array,
      default () {
        return DEFAULT_LINE_WIDTH_OPTIONS.slice()
      }
    },
    /** 工具：pen / rect / circle 中的一个或多个 */
    tools: {
      type: Array,
      default () {
        return DEFAULT_TOOLS.slice()
      }
    },
    showUndoButton: { type: Boolean, default: true },
    showClearButton: { type: Boolean, default: true },
    showRotateButtons: { type: Boolean, default: true },
    /** 是否展示保存按钮 */
    showSaveButton: {
      type: Boolean,
      default: false
    },
    zoomEnabled: { type: Boolean, default: true },
    zoomMinPercent: { type: Number, default: 30 },
    zoomMaxPercent: { type: Number, default: 400 },
    /** 自定义确认，返回 truthy / Promise。不传则用 window.confirm */
    confirmFn: {
      type: Function,
      default: null
    },
    /** 自定义提示 (type, text) */
    messageFn: {
      type: Function,
      default: null
    }
  },
  data () {
    return {
      canvas: null,
      currentTool: 'pen',
      currentColor: '#ef4444',
      currentLineWidth: 3,
      canvasRotation: 0,
      origW: 0,
      origH: 0,
      isDrawing: false,
      startPoint: null,
      activeShape: null,
      resizeObserver: null,
      loading: false,
      resolvedImageUrl: '',
      displayScale: 1,
      /** 当前侧缩放百分比，100 为适配窗口后的基准 */
      zoomPercent: 100,
      isPanning: false,
      panLastX: 0,
      panLastY: 0,
      fitRetryTimer: null,
      hasUnsaved: false,
      /** 加载完成后的标注基线，用于判断是否有未保存改动 */
      baselineObjects: null,
      toolMeta: TOOL_META,
      /** 无有效影像时为 true，工具栏显示遮罩并禁止标注 */
      imageUnavailable: false
    }
  },
  computed: {
    colorOptions () {
      return normalizeColors(this.colors)
    },
    lineWidthOptions () {
      return normalizeLineWidths(this.lineWidths)
    },
    enabledTools () {
      return normalizeTools(this.tools)
    },
    resolvedZoomMin () {
      return normalizeZoomRange(this.zoomMinPercent, this.zoomMaxPercent).zoomMin
    },
    resolvedZoomMax () {
      return normalizeZoomRange(this.zoomMinPercent, this.zoomMaxPercent).zoomMax
    },
    saveButtonTitle () {
      if (this.hasUnsaved) return '有未保存的标注'
      return this.saveMode === 'image' ? '保存为图片' : '保存标注 JSON'
    },
    showAnnotationToolbar () {
      return this.toolbarPosition === 'top' || this.toolbarPosition === 'bottom'
    },
    layoutToolbarPosition () {
      if (this.showAnnotationToolbar) {
        return this.toolbarPosition
      }
      if (this.reserveToolbarSpace) {
        return 'bottom'
      }
      return ''
    },
    toolbarPlaceholderStyle () {
      if (this.toolbarSpaceHeight > 0) {
        return {
          height: `${this.toolbarSpaceHeight}px`,
          minHeight: `${this.toolbarSpaceHeight}px`
        }
      }
      return null
    },
    toolbarAnnotationBlocked () {
      return this.imageUnavailable
    },
    annotationEnabled () {
      return this.editable && this.showAnnotationToolbar && !this.imageUnavailable
    },
    resolvedPlaceholder () {
      return resolvePlaceholderSource(this.placeholderUrl)
    },
    resolvedImageRetryCount () {
      const count = Number(this.imageRetryCount)
      if (!Number.isFinite(count) || count < 0) return 1
      return Math.floor(count)
    }
  },
  watch: {
    imageUrl () {
      this.reloadCanvas()
    },
    editable (val) {
      this.syncCanvasInteractionState()
    },
    toolbarPosition () {
      this.syncCanvasInteractionState()
    },
    toolbarSpaceHeight () {
      this.$nextTick(() => {
        this.fitCanvasToScreen()
      })
    },
    colors () {
      this.syncConfigState()
    },
    lineWidths () {
      this.syncConfigState()
    },
    tools () {
      this.syncConfigState()
    },
    zoomEnabled (val) {
      if (!val) {
        this.zoomPercent = 100
        this.fitCanvasToScreen()
        this.unbindWheelZoom()
      } else {
        this.$nextTick(() => this.bindWheelZoom())
      }
    },
    zoomMinPercent () {
      this.clampCurrentZoom()
    },
    zoomMaxPercent () {
      this.clampCurrentZoom()
    }
  },
  created () {
    this.syncConfigState()
  },
  mounted () {
    this.initCanvas()
    this.onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (!this.showUndoButton) return
        e.preventDefault()
        this.undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (!this.showSaveButton) return
        e.preventDefault()
        this.saveAnnotations()
      }
    }
    document.addEventListener('keydown', this.onKeyDown)
    this.$nextTick(() => {
      this.bindWheelZoom()
      this.bindPanEvents()
    })
    if (typeof ResizeObserver !== 'undefined' && this.$el) {
      this.resizeObserver = new ResizeObserver(() => {
        this.fitCanvasToScreen()
      })
      this.resizeObserver.observe(this.$el)
    } else {
      window.addEventListener('resize', this.fitCanvasToScreen)
    }
  },
  beforeDestroy () {
    document.removeEventListener('keydown', this.onKeyDown)
    this.unbindWheelZoom()
    this.unbindPanEvents()
    if (this.fitRetryTimer) {
      cancelAnimationFrame(this.fitRetryTimer)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    window.removeEventListener('resize', this.fitCanvasToScreen)
    this.destroyCanvas()
  },
  methods: {
    initCanvas () {
      this.destroyCanvas()
      this.imageLoadId = (this.imageLoadId || 0) + 1
      if (!this.imageUrl) {
        this.loading = false
        this.imageUnavailable = true
        return
      }

      this.imageUnavailable = false
      this.loading = true
      this.loadSourceImage(this.imageUrl, 0, this.imageLoadId)
    },
    loadSourceImage (url, attempt, loadId) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        if (loadId !== this.imageLoadId) return
        const isPlaceholder = url === this.resolvedPlaceholder
        this.imageUnavailable = isPlaceholder
        this.resolvedImageUrl = url
        this.origW = img.naturalWidth
        this.origH = img.naturalHeight

        fabric.Object.prototype.objectCaching = false

        this.canvas = new fabric.Canvas(this.$refs.canvasEl, {
          width: this.origW,
          height: this.origH,
          selection: false,
          preserveObjectStacking: true,
          enableRetinaScaling: false
        })

        this.canvas.skipTargetFind = true
        this.canvas.on('mouse:down', this.onMouseDown)
        this.canvas.on('mouse:move', this.onMouseMove)
        this.canvas.on('mouse:up', this.onMouseUp)
        this.canvas.on('object:added', this.syncUnsavedState)
        this.canvas.on('object:removed', this.syncUnsavedState)

        this.setTool(this.enabledTools[0])
        this.setupCanvasPointerOverride()
        this.syncCanvasInteractionState()
        this.loadAnnotations()
      }
      img.onerror = () => {
        if (loadId !== this.imageLoadId) return
        const placeholder = this.resolvedPlaceholder
        const isPlaceholder = url === placeholder
        if (!isPlaceholder && attempt < this.resolvedImageRetryCount) {
          this.loadSourceImage(url, attempt + 1, loadId)
          return
        }
        if (!isPlaceholder && placeholder && placeholder !== url) {
          this.loadSourceImage(placeholder, 0, loadId)
          return
        }
        this.loading = false
        this.imageUnavailable = true
        this.notify('error', '影像加载失败')
      }
      img.src = url
    },
    reloadCanvas () {
      this.canvasRotation = 0
      this.zoomPercent = 100
      this.$nextTick(() => {
        this.initCanvas()
      })
    },
    bindWheelZoom () {
      const el = this.$refs.wrapper
      if (!el || !this.zoomEnabled) return
      el.addEventListener('wheel', this.onWheelZoom, { passive: false })
    },
    unbindWheelZoom () {
      const el = this.$refs.wrapper
      if (!el) return
      el.removeEventListener('wheel', this.onWheelZoom)
    },
    onWheelZoom (e) {
      if (!this.zoomEnabled) return
      e.preventDefault()
      e.stopPropagation()
      if (this.loading || !this.canvas) return
      const step = e.deltaY < 0 ? 10 : -10
      this.setZoomPercent(this.zoomPercent + step, this.getZoomOriginFromEvent(e))
    },
    clampCurrentZoom () {
      if (!this.zoomEnabled) return
      this.setZoomPercent(this.zoomPercent)
    },
    zoomByStep (step) {
      this.setZoomPercent(this.zoomPercent + step, this.getViewportCenterOrigin())
    },
    getZoomOriginFromEvent (e) {
      const scroller = this.$refs.canvasScroll
      const host = this.$refs.canvasHost
      if (!scroller || !host || !e) return this.getViewportCenterOrigin()
      const scrollerRect = scroller.getBoundingClientRect()
      const hostRect = host.getBoundingClientRect()
      return {
        mouseX: e.clientX - scrollerRect.left,
        mouseY: e.clientY - scrollerRect.top,
        ratioX: hostRect.width ? (e.clientX - hostRect.left) / hostRect.width : 0.5,
        ratioY: hostRect.height ? (e.clientY - hostRect.top) / hostRect.height : 0.5
      }
    },
    getViewportCenterOrigin () {
      const scroller = this.$refs.canvasScroll
      const host = this.$refs.canvasHost
      if (!scroller || !host) return null
      const scrollerRect = scroller.getBoundingClientRect()
      const hostRect = host.getBoundingClientRect()
      const mouseX = scroller.clientWidth / 2
      const mouseY = scroller.clientHeight / 2
      return {
        mouseX,
        mouseY,
        ratioX: hostRect.width ? (scrollerRect.left + mouseX - hostRect.left) / hostRect.width : 0.5,
        ratioY: hostRect.height ? (scrollerRect.top + mouseY - hostRect.top) / hostRect.height : 0.5
      }
    },
    preserveZoomOrigin (origin) {
      const scroller = this.$refs.canvasScroll
      const host = this.$refs.canvasHost
      if (!origin || !scroller || !host) return
      const scrollerRect = scroller.getBoundingClientRect()
      const hostRect = host.getBoundingClientRect()
      const hostLeft = hostRect.left - scrollerRect.left + scroller.scrollLeft
      const hostTop = hostRect.top - scrollerRect.top + scroller.scrollTop
      scroller.scrollLeft = hostLeft + origin.ratioX * host.offsetWidth - origin.mouseX
      scroller.scrollTop = hostTop + origin.ratioY * host.offsetHeight - origin.mouseY
    },
    setZoomPercent (val, origin) {
      if (!this.zoomEnabled) {
        if (this.zoomPercent !== 100) {
          this.zoomPercent = 100
          this.fitCanvasToScreen()
        }
        return
      }
      const next = Math.round(Math.min(this.resolvedZoomMax, Math.max(this.resolvedZoomMin, val)))
      if (next === this.zoomPercent) return
      const zoomOrigin = origin || this.getViewportCenterOrigin()
      this.zoomPercent = next
      this.fitCanvasToScreen()
      this.$nextTick(() => {
        this.preserveZoomOrigin(zoomOrigin)
      })
    },
    bindPanEvents () {
      const el = this.$refs.canvasScroll
      if (!el) return
      el.addEventListener('mousedown', this.onPanMouseDown, true)
      el.addEventListener('contextmenu', this.onPanContextMenu)
    },
    unbindPanEvents () {
      const el = this.$refs.canvasScroll
      if (el) {
        el.removeEventListener('mousedown', this.onPanMouseDown, true)
        el.removeEventListener('contextmenu', this.onPanContextMenu)
      }
      this.stopPanning()
    },
    onPanContextMenu (e) {
      e.preventDefault()
    },
    onPanMouseDown (e) {
      if (e.button !== 2) return
      e.preventDefault()
      e.stopPropagation()
      const scroller = this.$refs.canvasScroll
      if (!scroller) return
      this.isPanning = true
      this.panLastX = e.clientX
      this.panLastY = e.clientY
      if (this.canvas) {
        this.canvas.isDrawingMode = false
      }
      this.applyPanCursor()
      document.addEventListener('mousemove', this.onPanMouseMove)
      document.addEventListener('mouseup', this.onPanMouseUp)
    },
    onPanMouseMove (e) {
      if (!this.isPanning) return
      const scroller = this.$refs.canvasScroll
      if (!scroller) return
      scroller.scrollLeft -= e.clientX - this.panLastX
      scroller.scrollTop -= e.clientY - this.panLastY
      this.panLastX = e.clientX
      this.panLastY = e.clientY
      this.applyPanCursor()
    },
    onPanMouseUp () {
      this.stopPanning()
    },
    stopPanning () {
      document.removeEventListener('mousemove', this.onPanMouseMove)
      document.removeEventListener('mouseup', this.onPanMouseUp)
      if (!this.isPanning) return
      this.isPanning = false
      this.clearPanCursor()
      this.syncCanvasInteractionState()
    },
    applyPanCursor () {
      const cursor = 'move'
      const els = [
        this.$refs.wrapper,
        this.$refs.canvasScroll,
        this.canvas && this.canvas.upperCanvasEl,
        this.canvas && this.canvas.lowerCanvasEl,
        this.canvas && this.canvas.wrapperEl
      ]
      els.forEach((el) => {
        if (el) el.style.setProperty('cursor', cursor, 'important')
      })
      if (!this.canvas) return
      this.canvas.defaultCursor = cursor
      this.canvas.hoverCursor = cursor
      this.canvas.freeDrawingCursor = cursor
    },
    clearPanCursor () {
      const els = [
        this.$refs.wrapper,
        this.$refs.canvasScroll,
        this.canvas && this.canvas.upperCanvasEl,
        this.canvas && this.canvas.lowerCanvasEl,
        this.canvas && this.canvas.wrapperEl
      ]
      els.forEach((el) => {
        if (el) el.style.removeProperty('cursor')
      })
    },
    destroyCanvas () {
      if (this.canvas) {
        this.canvas.dispose()
        this.canvas = null
      }
      this.hasUnsaved = false
      this.baselineObjects = null
      this.resolvedImageUrl = ''
      if (this.$refs.canvasHost) {
        this.$refs.canvasHost.style.width = ''
        this.$refs.canvasHost.style.height = ''
      }
    },
    fitCanvasToScreen (retry = 0) {
      if (!this.canvas || !this.$refs.canvasHost) return

      const toolbar = this.$el && this.$el.querySelector('.annotation-toolbar')
      const toolbarH = toolbar ? toolbar.offsetHeight : 0
      const maxW = this.$el.clientWidth - 8
      const maxH = this.$el.clientHeight - toolbarH - 8

      if (maxW < 80 || maxH < 80) {
        if (retry < 20) {
          this.fitRetryTimer = requestAnimationFrame(() => {
            this.fitCanvasToScreen(retry + 1)
          })
        }
        return
      }

      const isRotated = this.canvasRotation % 180 !== 0
      const displayW = isRotated ? this.origH : this.origW
      const displayH = isRotated ? this.origW : this.origH

      const fitScale = Math.min(1, maxW / displayW, maxH / displayH)
      this.displayScale = fitScale
      const scale = fitScale * (this.zoomPercent / 100)

      const host = this.$refs.canvasHost
      const container = this.canvas.wrapperEl

      host.style.width = `${displayW * scale}px`
      host.style.height = `${displayH * scale}px`
      host.style.position = 'relative'

      container.style.position = 'absolute'
      container.style.left = '50%'
      container.style.top = '50%'
      container.style.transformOrigin = 'center center'
      container.style.transform = `translate(-50%, -50%) rotate(${this.canvasRotation}deg) scale(${scale})`

      this.canvas.setWidth(this.origW)
      this.canvas.setHeight(this.origH)
      this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
      this.canvas.renderAll()
      this.syncCanvasInteractionState()
    },
    setupCanvasPointerOverride () {
      if (!this.canvas) return
      const self = this
      this.canvas.getPointer = function (e) {
        const event = (e && e.touches && e.touches[0]) ? e.touches[0] : e
        if (!event) return { x: 0, y: 0 }
        return self.getStandardPointer(event)
      }
    },
    rotateCanvas (delta) {
      this.canvasRotation = ((this.canvasRotation + delta) % 360 + 360) % 360
      this.fitCanvasToScreen()
      this.setupCanvasPointerOverride()
    },
    syncConfigState () {
      if (this.enabledTools.indexOf(this.currentTool) === -1) {
        this.currentTool = this.enabledTools[0] || 'pen'
      }
      if (this.colorOptions.indexOf(this.currentColor) === -1) {
        this.currentColor = this.colorOptions[0] || '#ef4444'
      }
      const widths = this.lineWidthOptions.map(item => item.value)
      if (widths.indexOf(this.currentLineWidth) === -1) {
        this.currentLineWidth = widths[0] || 3
      }
      if (this.canvas) {
        this.setTool(this.currentTool)
      }
    },
    setTool (tool) {
      if (!tool || this.enabledTools.indexOf(tool) === -1) {
        tool = this.enabledTools[0]
      }
      if (!this.canvas || !this.annotationEnabled) {
        this.currentTool = tool || this.currentTool
        this.syncCanvasInteractionState()
        return
      }
      this.currentTool = tool
      this.canvas.isDrawingMode = tool === 'pen'
      if (tool === 'pen') {
        this.canvas.freeDrawingBrush.color = this.currentColor
        this.canvas.freeDrawingBrush.width = this.currentLineWidth
      }
      this.canvas.selection = false
      this.syncCanvasInteractionState()
    },
    syncCanvasInteractionState () {
      if (!this.canvas) return
      if (this.isPanning) {
        this.canvas.isDrawingMode = false
        this.applyPanCursor()
        return
      }

      const enabled = this.annotationEnabled
      this.canvas.isDrawingMode = enabled && this.currentTool === 'pen'
      this.canvas.selection = false
      this.canvas.skipTargetFind = true

      const cursor = enabled ? 'crosshair' : 'default'
      this.canvas.defaultCursor = cursor
      this.canvas.hoverCursor = cursor
      this.canvas.freeDrawingCursor = cursor

      ;[this.canvas.upperCanvasEl, this.canvas.lowerCanvasEl].forEach((el) => {
        if (el) el.style.cursor = cursor
      })
    },
    setColor (color) {
      this.currentColor = color
      if (this.canvas && this.canvas.isDrawingMode) {
        this.canvas.freeDrawingBrush.color = color
      }
    },
    setLineWidth (val) {
      this.currentLineWidth = parseInt(val, 10)
      if (this.canvas && this.canvas.isDrawingMode) {
        this.canvas.freeDrawingBrush.width = this.currentLineWidth
      }
    },
    undo () {
      if (!this.canvas || !this.annotationEnabled) return
      const objs = this.canvas.getObjects()
      if (!objs.length) return
      this.canvas.remove(objs[objs.length - 1])
      this.canvas.renderAll()
      this.syncUnsavedState()
    },
    isRotated90or270 () {
      return this.canvasRotation % 180 !== 0
    },
    getStandardPointer (e) {
      const rect = this.canvas.upperCanvasEl.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const visualScale = this.isRotated90or270()
        ? rect.width / this.origH
        : rect.width / this.origW

      let x = (e.clientX - cx) / visualScale
      let y = (e.clientY - cy) / visualScale

      const rad = -this.canvasRotation * Math.PI / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      const lx = x * cos - y * sin + this.origW / 2
      const ly = x * sin + y * cos + this.origH / 2

      return {
        x: Math.max(0, Math.min(this.origW, lx)),
        y: Math.max(0, Math.min(this.origH, ly))
      }
    },
    onMouseDown (opt) {
      if ((opt.e && opt.e.button !== 0) || this.isPanning) return
      if (!this.annotationEnabled || this.currentTool === 'pen') return
      const p = this.getStandardPointer(opt.e)
      this.startPoint = p
      this.isDrawing = true

      const opts = {
        left: p.x,
        top: p.y,
        fill: 'transparent',
        stroke: this.currentColor,
        strokeWidth: this.currentLineWidth,
        selectable: false,
        evented: false,
        strokeUniform: true
      }

      if (this.currentTool === 'rect') {
        this.activeShape = new fabric.Rect({ ...opts, width: 0, height: 0 })
      } else if (this.currentTool === 'circle') {
        this.activeShape = new fabric.Ellipse({
          ...opts,
          rx: 0,
          ry: 0,
          originX: 'center',
          originY: 'center',
          left: p.x,
          top: p.y
        })
      }
      this.canvas.add(this.activeShape)
    },
    onMouseMove (opt) {
      if (!this.isDrawing || !this.activeShape) return
      const p = this.getStandardPointer(opt.e)

      if (this.currentTool === 'rect') {
        this.activeShape.set({
          left: Math.min(p.x, this.startPoint.x),
          top: Math.min(p.y, this.startPoint.y),
          width: Math.abs(p.x - this.startPoint.x),
          height: Math.abs(p.y - this.startPoint.y)
        })
      } else if (this.currentTool === 'circle') {
        const left = Math.min(p.x, this.startPoint.x)
        const top = Math.min(p.y, this.startPoint.y)
        const width = Math.abs(p.x - this.startPoint.x)
        const height = Math.abs(p.y - this.startPoint.y)
        this.activeShape.set({
          left: left + width / 2,
          top: top + height / 2,
          rx: width / 2,
          ry: height / 2
        })
      }
      this.canvas.renderAll()
    },
    onMouseUp () {
      if (this.activeShape) {
        const tooSmall =
          (this.currentTool === 'rect' && this.activeShape.width < 4 && this.activeShape.height < 4) ||
          (this.currentTool === 'circle' && this.activeShape.rx < 2 && this.activeShape.ry < 2)
        if (tooSmall) {
          this.canvas.remove(this.activeShape)
        }
      }
      this.isDrawing = false
      this.activeShape = null
    },
    setBackground (cb) {
      const finish = () => {
        this.loading = false
        this.syncUnsavedState()
        this.$emit('loaded', this.getAnnotationPayload())
        cb && cb()
      }
      fabric.Image.fromURL(this.resolvedImageUrl || this.imageUrl, (fImg) => {
        if (!fImg || !this.canvas) {
          finish()
          this.imageUnavailable = true
          this.notify('error', '影像加载失败')
          return
        }
        fImg.set({ selectable: false, evented: false })
        this.canvas.setBackgroundImage(fImg, () => {
          this.canvas.renderAll()
          this.fitCanvasToScreen()
          finish()
        }, {
          scaleX: this.origW / fImg.width,
          scaleY: this.origH / fImg.height
        })
      }, { crossOrigin: 'anonymous' })
    },
    loadAnnotations () {
      if (this.initialStoredPayload && this.initialStoredPayload.objects && this.initialStoredPayload.objects.length) {
        this.loadFabricObjects(this.initialStoredPayload.objects)
        return
      }

      const apiObjects = annotateListToFabricObjects(this.initialAnnotateList)
      if (apiObjects.length) {
        this.loadFabricObjects(apiObjects)
        return
      }

      this.baselineObjects = []
      this.setBackground()
    },
    captureBaseline () {
      if (!this.canvas) {
        this.baselineObjects = []
        return
      }
      this.baselineObjects = this.canvas.toJSON(['selectable', 'evented']).objects || []
    },
    loadFabricObjects (objects) {
      this.canvas.loadFromJSON({ objects }, () => {
        this.canvas.getObjects().forEach(o => {
          o.selectable = false
          o.evented = false
        })
        this.captureBaseline()
        this.setBackground()
      })
    },
    async saveAnnotations () {
      if (!this.canvas || !this.annotationEnabled) return
      if (this.saveMode === 'image') {
        const result = await this.getAnnotatedImage()
        if (!result) {
          this.notify('error', '导出图片失败')
          return
        }
        this.persistAnnotationPayload()
        this.notify('success', '标注图片已保存')
        this.$emit('save', result)
        this.syncUnsavedState()
        return
      }
      const json = this.persistAnnotationPayload()
      this.notify('success', '标注已保存')
      this.$emit('save', {
        mode: 'json',
        json
      })
      this.syncUnsavedState()
    },
    /** 获取标注 JSON */
    getAnnotationJson () {
      return this.getAnnotationPayload()
    },
    /** 获取标注后图片 dataURL */
    getAnnotatedImageDataURL (options = {}) {
      if (!this.canvas) return ''
      const format = options.type || this.imageType || 'png'
      const quality = options.quality != null ? options.quality : this.imageQuality
      return this.canvas.toDataURL({
        format,
        quality,
        multiplier: options.multiplier || 1,
        enableRetinaScaling: false
      })
    },
    /** 获取标注后图片 Blob */
    getAnnotatedImageBlob (options = {}) {
      const dataURL = this.getAnnotatedImageDataURL(options)
      return dataURLToBlob(dataURL)
    },
    /** 获取标注后图片 File */
    getAnnotatedImageFile (filename, options = {}) {
      const blob = this.getAnnotatedImageBlob(options)
      const ext = (options.type || this.imageType) === 'jpeg' ? 'jpg' : 'png'
      const name = filename || `annotation-${this.storageKey || 'image'}.${ext}`
      return blobToFile(blob, name)
    },
    /** 按当前 saveMode 导出：json 或图片 */
    async exportResult (options = {}) {
      if ((options.mode || this.saveMode) === 'image') {
        return this.getAnnotatedImage(options)
      }
      return {
        mode: 'json',
        json: this.getAnnotationPayload()
      }
    },
    async getAnnotatedImage (options = {}) {
      if (!this.canvas) return null
      const dataURL = this.getAnnotatedImageDataURL(options)
      if (!dataURL) return null
      const blob = dataURLToBlob(dataURL)
      const file = blobToFile(
        blob,
        options.filename || `annotation-${this.storageKey || 'image'}.${(options.type || this.imageType) === 'jpeg' ? 'jpg' : 'png'}`
      )
      return {
        mode: 'image',
        file,
        blob,
        dataURL,
        json: this.getAnnotationPayload()
      }
    },
    notify (type, text) {
      this.$emit('message', { type, text })
      if (typeof this.messageFn === 'function') {
        this.messageFn(type, text)
      }
    },
    requestConfirm (message) {
      if (typeof this.confirmFn === 'function') {
        return Promise.resolve(this.confirmFn(message))
      }
      return Promise.resolve(window.confirm(message))
    },
    /** 静默导出当前标注（提交时调用，不弹提示） */
    persistAnnotationPayload () {
      if (!this.canvas) return null
      const json = this.canvas.toJSON(['selectable', 'evented'])
      const payload = {
        objects: json.objects || [],
        origW: this.origW,
        origH: this.origH,
        savedAt: new Date().toISOString()
      }
      this.captureBaseline()
      return payload
    },
    /** 导出当前画布标注 */
    getAnnotationPayload () {
      if (!this.canvas) return null
      const json = this.canvas.toJSON(['selectable', 'evented'])
      return {
        objects: json.objects || [],
        origW: this.origW,
        origH: this.origH
      }
    },
    syncUnsavedState () {
      this.$nextTick(() => {
        this.hasUnsaved = this.hasUnsavedChanges()
      })
    },
    hasUnsavedChanges () {
      if (!this.canvas || this.loading) return false
      const current = this.canvas.toJSON(['selectable', 'evented']).objects || []
      const baseline = this.baselineObjects || []
      return JSON.stringify(current) !== JSON.stringify(baseline)
    },
    async clearAnnotations () {
      if (!this.canvas || !this.annotationEnabled || this.canvas.getObjects().length === 0) return
      const ok = await this.requestConfirm('确定清除所有标注吗？')
      if (!ok) return
      this.canvas.getObjects().slice().forEach(o => this.canvas.remove(o))
      this.canvas.renderAll()
      this.notify('success', '已清除标注')
      this.$emit('clear')
      this.syncUnsavedState()
    }
  }
}
</script>

<style lang="less" scoped>
.annotation-canvas {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #1a1d23;
  border-radius: 0px;
  overflow: hidden;
}

.annotation-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 10px;
  background: #13151a;
  flex-shrink: 0;
  position: relative;
}

.toolbar-block-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(0, 0, 0, 0.55);
  cursor: not-allowed;
}

.annotation-toolbar--placeholder {
  padding: 0;
  background: transparent;
  border: none !important;
  min-height: 40px;
  box-sizing: border-box;
}

.layout-toolbar-top .annotation-toolbar {
  order: 1;
  border-bottom: 1px solid #2a2d35;
}

.layout-toolbar-top .annotation-wrapper {
  order: 2;
}

.layout-toolbar-bottom .annotation-toolbar {
  order: 2;
  border-top: 1px solid #2a2d35;
}

.layout-toolbar-bottom .annotation-wrapper {
  order: 1;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.divider {
  width: 1px;
  height: 24px;
  background: #2a2d35;
  margin: 0 6px;
  flex-shrink: 0;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #8b90a0;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  line-height: 1;
  outline: none;

  svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: #22262f;
    color: #c8cad4;
  }

  &.active {
    background: #1e3a5f;
    color: #5ba3f5;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &.save-btn {
    margin-left: auto;
    background: #1a4731;
    color: #4caf7d;

    &:hover:not(:disabled) {
      background: #1f5a3c;
      color: #5dc98e;
    }
    &.has-unsaved {
      color: #ef4444;
    }
    &.has-unsaved svg {
      color: #ef4444;
      stroke: #ef4444;
    }
  }

  &.clear-btn {
    color: #e05c5c;

    &:hover:not(:disabled) {
      background: #3a1a1a;
      color: #f07070;
    }
  }

  &.undo-btn {
    color: #8b90a0;
  }
}

.color-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-label {
  font-size: 12px;
  color: #555a6b;
}

.color-swatch {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s;
  flex-shrink: 0;

  &:hover {
    transform: scale(1.15);
  }

  &.selected {
    border-color: #fff;
  }

  &.is-white {
    border: 1px solid #444;
  }

  &.is-white.selected {
    border-color: #fff;
  }
}

.width-select {
  background: #22262f;
  border: 1px solid #2a2d35;
  border-radius: 6px;
  color: #c8cad4;
  font-size: 12px;
  padding: 4px 6px;
  cursor: pointer;
  outline: none;
  height: 28px;
}

.annotation-wrapper {
  flex: 1;
  width: 100%;
  min-height: 0;
  display: flex;
  position: relative;
  overflow: hidden;
  background: #1a1d23;

  &.is-panning {
    cursor: move !important;
    user-select: none;

    ::v-deep * {
      cursor: move !important;
    }
  }
}

.canvas-scroll {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  overflow: auto;
  padding: 4px;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1a1d23;
  }

  &::-webkit-scrollbar-corner {
    background: #1a1d23;
  }

  &::-webkit-scrollbar-thumb {
    background: #848985;
    border-radius: 4px;
  }
}

.annotation-wrapper--view-only {
  .canvas-host,
  ::v-deep .canvas-container,
  ::v-deep canvas {
    cursor: default !important;
  }
}

.canvas-host {
  position: relative;
  flex-shrink: 0;
  margin: auto;
}

.page-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  z-index: 2;
  padding: 2px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  pointer-events: none;
}

.zoom-badge {
  position: absolute;
  right: 12px;
  top: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
}

.zoom-percent-text {
  min-width: 42px;
  text-align: center;
}

.zoom-ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;

  &:hover:not(:disabled) {
    color: #69c0ff;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.canvas-loading {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 29, 35, 0.88);

  .mark-image-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #2a2d35;
    border-top-color: #5ba3f5;
    border-radius: 50%;
    animation: mark-image-spin 0.8s linear infinite;
  }

  .mark-image-spinner-text {
    color: #c8cad4;
    margin-top: 8px;
    font-size: 12px;
  }
}

@keyframes mark-image-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
