const clamp01 = t => Math.min(1, Math.max(0, t))

const lerp = (a, b, t) => a + (b - a) * t

const progress = (v, a, b) => clamp01((v - a) / Math.max(b - a, 1e-9))

const topOf = (el, scroller) =>
	el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop

// Anchors map markdown source lines to preview scroll offsets,
// framed by virtual start/end anchors so interpolation covers the whole document
const anchorsOf = (previewHtml, scroller, doc) => [
	{ line: 1, top: 0 },
	...[...previewHtml.querySelectorAll(':scope > [data-line]')].map(el => ({
		line: Number(el.dataset.line),
		top: topOf(el, scroller),
	})),
	{ line: doc.lines + 1, top: scroller.scrollHeight },
]

const pairAt = (anchors, key, v) => {
	const i = Math.max(
		anchors.findLastIndex(x => x[key] <= v),
		0,
	)
	return [anchors[i], anchors[Math.min(i + 1, anchors.length - 1)]]
}

// Viewport top in document-relative coordinates (padding-agnostic)
const editorTop = view => view.scrollDOM.getBoundingClientRect().top - view.documentTop

// Fractional source line at the top of the editor viewport
const editorLine = view => {
	const top = editorTop(view)
	const block = view.lineBlockAtHeight(top)
	const line = view.state.doc.lineAt(block.from).number
	return line + clamp01((top - block.top) / Math.max(block.height, 1))
}

export const createScrollSync = (view, previewHtml) => {
	const state = { master: null }
	const scrollerOf = () =>
		previewHtml.scrollHeight > previewHtml.clientHeight ? previewHtml : previewHtml.parentElement

	const syncToPreview = () => {
		const scroller = scrollerOf()
		const anchors = anchorsOf(previewHtml, scroller, view.state.doc)
		const v = editorLine(view)
		const [a, b] = pairAt(anchors, 'line', v)
		scroller.scrollTop = lerp(a.top, b.top, progress(v, a.line, b.line))
	}

	const syncToEditor = () => {
		const scroller = scrollerOf()
		const anchors = anchorsOf(previewHtml, scroller, view.state.doc)
		const [a, b] = pairAt(anchors, 'top', scroller.scrollTop)
		const v = lerp(a.line, b.line, progress(scroller.scrollTop, a.top, b.top))
		const lineNo = Math.max(1, Math.min(Math.floor(v), view.state.doc.lines))
		const block = view.lineBlockAt(view.state.doc.line(lineNo).from)
		const target = block.top + clamp01(v - lineNo) * block.height
		view.scrollDOM.scrollTop += target - editorTop(view)
	}

	const claim = pane => () => {
		state.master = pane
	}
	const onEditorScroll = () => state.master === 'editor' && syncToPreview()
	const onPreviewScroll = () => state.master === 'preview' && syncToEditor()

	const preview = previewHtml.parentElement
	const bindings = [
		[view.scrollDOM, 'scroll', onEditorScroll],
		[preview, 'scroll', onPreviewScroll],
		[previewHtml, 'scroll', onPreviewScroll],
		[view.scrollDOM, 'pointerenter', claim('editor')],
		[view.scrollDOM, 'wheel', claim('editor')],
		[view.scrollDOM, 'touchstart', claim('editor')],
		[view.scrollDOM, 'keydown', claim('editor')],
		[preview, 'pointerenter', claim('preview')],
		[preview, 'wheel', claim('preview')],
		[preview, 'touchstart', claim('preview')],
	]

	const enable = () => bindings.map(([el, ev, fn]) => el.addEventListener(ev, fn, { passive: true }))
	const disable = () => bindings.map(([el, ev, fn]) => el.removeEventListener(ev, fn))

	return { enable, disable }
}
