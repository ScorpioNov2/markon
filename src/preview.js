import { marked } from 'marked'
import morphdom from 'morphdom'
import { enhanceCallouts } from './callouts.js'
import { highlightAll } from './syntax.js'

marked.setOptions({ gfm: true, breaks: true })

const tpl = document.createElement('template')

const blockCount = token => {
	if (token.type === 'space' || token.type === 'def') return 0
	if (token.type !== 'html') return 1
	tpl.innerHTML = token.raw
	return tpl.content.children.length
}

// Annotate top-level rendered blocks with their markdown source line
const annotateLines = (root, md) => {
	marked.lexer(md).reduce(
		([line, i], token) => {
			const next = Math.min(i + blockCount(token), root.children.length)
			for (let k = i; k < next; k++) root.children[k].dataset.line = line
			return [line + token.raw.split('\n').length - 1, next]
		},
		[1, 0],
	)
}

export const setupPreview = ({ getMarkdown, onMarkdownUpdated, onRendered, previewHtml }) => {
	let renderScheduled = false
	let debounceTimer = null
	let renderFrame = null
	let revision = 0
	let lastRenderedContent = ''

	const render = async version => {
		const md = getMarkdown()

		// Skip render if content hasn't changed
		if (md === lastRenderedContent) return

		// Create temporary container with new content
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = marked.parse(md)

		// Process callouts and highlighting on temp DOM
		enhanceCallouts(tempDiv)
		await highlightAll(tempDiv)
		if (version !== revision) return
		annotateLines(tempDiv, md)

		// Use morphdom to efficiently update only changed elements
		morphdom(previewHtml, tempDiv, {
			childrenOnly: true, // Only morph children, not the container itself
			onBeforeElUpdated: (fromEl, toEl) => {
				// Preserve images that are already loaded to prevent re-fetching
				if (fromEl.tagName === 'IMG' && toEl.tagName === 'IMG') {
					if (fromEl.src === toEl.src && fromEl.complete) {
						// Keep the existing loaded image
						return false
					}
				}
				return true
			},
		})

		// Update last rendered content
		lastRenderedContent = md
		onRendered?.()
	}

	const scheduleRender = () => {
		revision += 1
		if (renderScheduled) return
		renderScheduled = true

		// Clear any existing debounce timer
		clearTimeout(debounceTimer)

		// Debounce rapid changes
		debounceTimer = setTimeout(() => {
			renderFrame = requestAnimationFrame(async () => {
				renderScheduled = false
				await render(revision)
			})
		}, 50) // 50ms debounce for smooth typing
	}

	// Initial render
	scheduleRender()
	const unsubscribe = onMarkdownUpdated(scheduleRender)

	return () => {
		revision += 1
		clearTimeout(debounceTimer)
		cancelAnimationFrame(renderFrame)
		unsubscribe()
	}
}
