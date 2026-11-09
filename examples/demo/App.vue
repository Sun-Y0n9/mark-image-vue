<template>
  <div class="demo">
    <header class="demo-header">
      <h1>@mark-image/vue</h1>
      <div class="demo-config">
        <label>保存
          <select v-model="saveMode">
            <option value="json">JSON</option>
            <option value="image">图片</option>
          </select>
        </label>
        <label><input v-model="toolPen" type="checkbox" /> 铅笔</label>
        <label><input v-model="toolRect" type="checkbox" /> 方框</label>
        <label><input v-model="toolCircle" type="checkbox" /> 圆圈</label>
        <label><input v-model="width2" type="checkbox" /> 细2</label>
        <label><input v-model="width3" type="checkbox" /> 中3</label>
        <label><input v-model="width5" type="checkbox" /> 粗5</label>
        <label><input v-model="width8" type="checkbox" /> 极粗8</label>
        <label><input v-model="showUndoButton" type="checkbox" /> 撤销</label>
        <label><input v-model="showClearButton" type="checkbox" /> 清除</label>
        <label><input v-model="showRotateButtons" type="checkbox" /> 旋转</label>
        <label><input v-model="showSaveButton" type="checkbox" /> 保存按钮</label>
        <label><input v-model="zoomEnabled" type="checkbox" /> 缩放</label>
        <label>下限 <input v-model.number="zoomMinPercent" class="num" type="number" min="10" max="400" /></label>
        <label>上限 <input v-model.number="zoomMaxPercent" class="num" type="number" min="10" max="800" /></label>
        <label>失败重试 <input v-model.number="imageRetryCount" class="num" type="number" min="0" max="10" /></label>
        <label>占位图 <input v-model.trim="placeholderUrl" class="placeholder-input" type="text" placeholder="默认内置图，可填 URL 或 base64" /></label>
      </div>
      <div class="demo-actions">
        <button type="button" @click="exportPayload">获取标注 JSON</button>
        <button type="button" @click="loadDemoJson">加载标注 JSON</button>
        <button type="button" @click="exportImage">获取标注图片</button>
        <label class="file-btn">
          更换图片
          <input type="file" accept="image/*" @change="onFileChange" />
        </label>
      </div>
      <p v-if="hint" class="demo-hint">{{ hint }}</p>
      <pre v-if="exported" class="demo-json">{{ exported }}</pre>
    </header>
    <div class="demo-stage">
      <annotation-canvas
        ref="canvas"
        :image-url="imageUrl"
        canvas-id="demo-mark-image"
        page-label="演示影像"
        toolbar-position="bottom"
        :editable="true"
        :save-mode="saveMode"
        :colors="colors"
        :line-widths="lineWidths"
        :tools="tools"
        :show-undo-button="showUndoButton"
        :show-clear-button="showClearButton"
        :show-rotate-buttons="showRotateButtons"
        :show-save-button="showSaveButton"
        :zoom-enabled="zoomEnabled"
        :zoom-min-percent="zoomMinPercent"
        :zoom-max-percent="zoomMaxPercent"
        :image-retry-count="imageRetryCount"
        :placeholder-url="placeholderUrl"
        @save="onSave"
        @message="onMessage"
      />
    </div>
    <div v-if="toast" class="demo-toast" :class="'is-' + toast.type">{{ toast.text }}</div>
  </div>
</template>

<script>
import demoImage from './demp.jpg'
import demoMarkJson from './demoMarkJson.json'

const ALL_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#ffffff']

export default {
  name: 'DemoApp',
  data () {
    return {
      imageUrl: demoImage,
      exported: '',
      hint: '',
      toast: null,
      saveMode: 'json',
      colors: ALL_COLORS.slice(),
      toolPen: true,
      toolRect: true,
      toolCircle: true,
      width2: true,
      width3: true,
      width5: true,
      width8: true,
      showUndoButton: true,
      showClearButton: true,
      showRotateButtons: true,
      showSaveButton: true,
      zoomEnabled: true,
      zoomMinPercent: 30,
      zoomMaxPercent: 400,
      imageRetryCount: 1,
      placeholderUrl: ''
    }
  },
  computed: {
    tools () {
      const list = []
      if (this.toolPen) list.push('pen')
      if (this.toolRect) list.push('rect')
      if (this.toolCircle) list.push('circle')
      return list.length ? list : ['pen']
    },
    lineWidths () {
      const list = []
      if (this.width2) list.push({ value: 2, label: '细 2px' })
      if (this.width3) list.push({ value: 3, label: '中 3px' })
      if (this.width5) list.push({ value: 5, label: '粗 5px' })
      if (this.width8) list.push({ value: 8, label: '极粗 8px' })
      return list.length ? list : [{ value: 3, label: '中 3px' }]
    }
  },
  methods: {
    exportPayload () {
      const json = this.$refs.canvas && this.$refs.canvas.getAnnotationJson()
      this.exported = JSON.stringify(json, null, 2)
      this.hint = '已获取标注 JSON'
    },
    loadDemoJson () {
      const canvas = this.$refs.canvas
      const ok = canvas && canvas.loadAnnotationJson(demoMarkJson)
      if (!ok) {
        this.showToast('加载标注 JSON 失败', 'error')
        return
      }
      this.exported = ''
      this.showToast('已加载标注 JSON')
    },
    showToast (text, type = 'success') {
      this.toast = { text, type }
      clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
        this.toast = null
      }, 1800)
    },
    exportImage () {
      const file = this.$refs.canvas && this.$refs.canvas.getAnnotatedImageFile('demo-annotated.png')
      if (!file) {
        this.hint = '导出图片失败'
        return
      }
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name || 'demo-annotated.png'
      link.click()
      URL.revokeObjectURL(url)
      this.hint = '已下载标注后的图片'
    },
    onSave (result) {
      if (result && result.mode === 'image' && result.file) {
        const url = URL.createObjectURL(result.file)
        const link = document.createElement('a')
        link.href = url
        link.download = result.file.name || 'annotation.png'
        link.click()
        URL.revokeObjectURL(url)
        this.hint = '已保存并下载标注图片'
        this.exported = JSON.stringify(result.json, null, 2)
        return
      }
      this.exported = JSON.stringify(result && result.json ? result.json : result, null, 2)
    },
    onMessage (msg) {
      this.hint = (msg && msg.text) || ''
    },
    onFileChange (e) {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.imageUrl)
      }
      this.imageUrl = URL.createObjectURL(file)
      this.exported = ''
    }
  },
  beforeDestroy () {
    clearTimeout(this.toastTimer)
  }
}
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}
</style>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f1115;
  color: #d7d9e0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

.demo-header {
  padding: 12px 20px 8px;
}

.demo-header h1 {
  margin: 0 0 8px;
  font-size: 18px;
}

.demo-config {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: #c8cad4;
}

.demo-config label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.demo-config .num {
  width: 56px;
  background: #16181d;
  border: 1px solid #2a2d35;
  color: #d7d9e0;
  border-radius: 4px;
  padding: 2px 4px;
}

.demo-config .placeholder-input {
  width: 220px;
  background: #16181d;
  border: 1px solid #2a2d35;
  color: #d7d9e0;
  border-radius: 4px;
  padding: 2px 6px;
}

.demo-config select {
  background: #16181d;
  border: 1px solid #2a2d35;
  color: #d7d9e0;
  border-radius: 4px;
  padding: 2px 6px;
}

.demo-hint {
  margin: 8px 0 0;
  color: #4caf7d;
  font-size: 13px;
}

.demo-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  z-index: 20;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 8px;
  background: #173528;
  color: #b7ebc6;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  pointer-events: none;
}

.demo-toast.is-error {
  background: #3a2224;
  color: #f5c2c0;
}

.demo-actions {
  display: flex;
  gap: 8px;
}

.demo-actions button,
.file-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: #1e3a5f;
  color: #9cc7f5;
  font-size: 13px;
  cursor: pointer;
}

.file-btn input {
  display: none;
}

.demo-json {
  max-height: 120px;
  overflow: auto;
  margin: 12px 0 0;
  padding: 8px;
  border-radius: 6px;
  background: #16181d;
  color: #9cc7f5;
  font-size: 12px;
}

.demo-stage {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
}
</style>
