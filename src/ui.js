import { createButtons } from './actions.js'
import { createSettingsDialog } from './settings.js'
import { observeTheme } from './syntax.js'
import { setupHotkeys } from './hotkeys.js'
import { createPreviewManager, createResizeHandler } from './resize.js'
import createToolbar from './toolbar.js'
import { createTOC } from './toc.js'
import { createScrollSync } from './sync.js'
import { applyTheme, createPointerHandler, createToast, getPrefTheme } from './utils.js'

// Initialize UI components
export const initUI = async ({ getMarkdown, setMarkdown, scrollToLine, view }) => {
	// Setup toast
	const toast = document.getElementById('toast')
	const showToast = createToast(toast)

	// Setup theme
	const { theme, mode } = getPrefTheme()
	await applyTheme(theme, mode)

	// Setup settings system
	const settingsDialog = createSettingsDialog(showToast)

	// Setup all buttons (including settings)
	createButtons(showToast, settingsDialog)

	// Setup hotkeys
	setupHotkeys(settingsDialog)

	// Setup theme observer
	observeTheme()

	// Setup preview manager and toggle button
	const previewManager = createPreviewManager(document.getElementById('wrap'))

	// Setup resize functionality
	const split = document.getElementById('split')
	const resizeHandle = document.getElementById('resize-handle')
	const previewAside = document.getElementById('preview')
	const wrap = document.getElementById('wrap')
	createPointerHandler(split, createResizeHandler(split, previewAside, wrap, previewManager))
	createPointerHandler(resizeHandle, createResizeHandler(split, previewAside, wrap, previewManager))

	// Setup toolbar with auto-hide behavior
	createToolbar()

	// Setup TOC
	const previewHtml = document.getElementById('previewhtml')
	const previewContainer = document.getElementById('preview')
	if (previewHtml && previewContainer) {
		createTOC(previewHtml, previewContainer, { getMarkdown, scrollToLine })
	}

	// Setup editor sync
	let editorSync = null
	if (view && previewHtml) {
		editorSync = createScrollSync(view, previewHtml)
		const syncEnabled = localStorage.getItem('editor-sync-enabled') !== 'false'
		if (syncEnabled) {
			editorSync.enable()
		}
		const btn = document.getElementById('toggle-editor-sync')
		if (btn) {
			btn.setAttribute('aria-pressed', String(syncEnabled))
		}
	}

	// Expose markdown functions globally for button access
	window.getMarkdown = getMarkdown
	window.setMarkdown = setMarkdown
	window.previewManager = previewManager
	window.showToast = showToast
	window.editorSync = editorSync
	window.readClipboardSmart = async () => {
		const { readClipboardSmart } = await import('./utils.js')
		return readClipboardSmart()
	}

	// Return preview HTML element for preview module
	return { previewHtml: document.getElementById('previewhtml') }
}
