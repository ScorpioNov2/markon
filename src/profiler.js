const STORAGE_KEY = 'markon-profiler-visible'
const SAMPLE_MS = 500

class FpsProfiler {
	constructor() {
		this.overlay = null
		this.isVisible = localStorage.getItem(STORAGE_KEY) === 'true'
		this.fps = 0
		this.frames = 0
		this.sampleStart = 0
		this.rafId = null
		this.initOverlay()
	}

	tick = now => {
		this.frames++
		const elapsed = now - this.sampleStart
		if (elapsed >= SAMPLE_MS) {
			this.fps = Math.round((this.frames * 1000) / elapsed)
			this.updateOverlay()
			this.frames = 0
			this.sampleStart = now
		}
		this.rafId = requestAnimationFrame(this.tick)
	}

	updateOverlay() {
		if (!this.overlay) return

		this.overlay.textContent = `${this.fps}fps`

		// Color coding
		this.overlay.className = 'profiler-overlay'
		if (this.fps >= 50) this.overlay.classList.add('good')
		else if (this.fps >= 30) this.overlay.classList.add('ok')
		else this.overlay.classList.add('bad')
	}

	initOverlay() {
		this.overlay = document.createElement('div')
		this.overlay.className = 'profiler-overlay'
		this.overlay.textContent = '0fps'
		document.body.appendChild(this.overlay)

		this.toggle(this.isVisible)
	}

	toggle(force = null) {
		const shouldShow = force !== null ? force : !this.isVisible
		this.isVisible = shouldShow
		this.overlay.style.display = shouldShow ? 'block' : 'none'

		cancelAnimationFrame(this.rafId)
		if (shouldShow) {
			this.frames = 0
			this.sampleStart = performance.now()
			this.rafId = requestAnimationFrame(this.tick)
		}

		localStorage.setItem(STORAGE_KEY, String(shouldShow))
	}
}

export const createProfiler = () => new FpsProfiler()
