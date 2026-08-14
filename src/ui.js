import { createActionRunner, createButtons } from './actions.js'
import { setupHotkeys } from './hotkeys.js'
import { createPreviewManager, createResizeHandler } from './resize.js'
import { createSettingsDialog } from './settings.js'
import { createScrollSync } from './sync.js'
import { observeTheme } from './syntax.js'
import { createTOC } from './toc.js'
import createToolbar from './toolbar.js'
import { applyTheme, createPointerHandler, createToast, getPrefTheme, readClipboardSmart } from './utils.js'

// Initialize UI components
export const initUI = async ({ getMarkdown, setMarkdown, scrollToLine, profiler, view }) => {
	// Setup toast
	const toast = document.getElementById('toast')
	const showToast = createToast(toast)

	// Setup theme
	const { theme, mode } = getPrefTheme()
	await applyTheme(theme, mode)

	// Setup theme observer
	observeTheme()

	// Setup preview manager and toggle button
	const previewManager = createPreviewManager(document.getElementById('wrap'))

	// Setup resize functionality
	const split = document.getElementById('split')
	const resizeHandle = document.getElementById('resize-handle')
	const previewAside = document.getElementById('preview')
	const wrap = document.getElementById('wrap')
	const cleanupResize = [
		createPointerHandler(split, createResizeHandler(split, previewAside, wrap, previewManager)),
		createPointerHandler(resizeHandle, createResizeHandler(split, previewAside, wrap, previewManager)),
	]

	// Setup toolbar with auto-hide behavior
	createToolbar()

	// Setup TOC
	const previewHtml = document.getElementById('previewhtml')
	const previewContainer = document.getElementById('preview')
	const toc =
		previewHtml && previewContainer ? createTOC(previewHtml, previewContainer, { getMarkdown, scrollToLine }) : null

	// Setup editor sync
	let editorSync = null
	if (view && previewHtml) {
		editorSync = createScrollSync(view, previewHtml)
		if (localStorage.getItem('editor-sync-enabled') !== 'false') editorSync.enable()
	}

	// Bind every action to the same application context
	const settingsDialog = createSettingsDialog(id => runAction(id))
	const runAction = createActionRunner({
		editorSync,
		getMarkdown,
		previewManager,
		profiler,
		readClipboardSmart,
		setMarkdown,
		settingsDialog,
		showToast,
	})
	createButtons(runAction)
	const cleanupHotkeys = setupHotkeys(runAction)

	// Return preview hooks for explicit composition
	const cleanup = () => {
		cleanupHotkeys()
		editorSync?.disable()
		toc?.cleanup()
		for (const remove of cleanupResize) remove()
	}
	return { cleanup, onPreviewRendered: toc?.update, previewHtml }
}
