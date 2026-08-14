import '@fontsource/bungee'
import '@fontsource/monaspace-argon'
import '@fontsource/monaspace-argon/400-italic.css'
import '@fontsource/monaspace-argon/700.css'
import '@fontsource/monaspace-krypton'
import '@fontsource/monaspace-krypton/400-italic.css'
import '@fontsource/monaspace-krypton/700.css'
import 'iconify-icon'
import tablerIcons from '@iconify-json/tabler/icons.json' with { type: 'json' }
import './style.css'
import './components.css'
import './themes.css'
import { updatePWAUI } from './actions.js'
import { createEditor } from './core.js'
import { setupPreview } from './preview.js'
import { initUI } from './ui.js'
import { injectCustomThemesCSS } from './utils.js'

const boot = async () => {
	injectCustomThemesCSS()

	// Configure iconify to use local Tabler icons instead of API
	// Wait for iconify-icon to be ready, then add the collection
	const addTablerIcons = () => {
		if (window.Iconify?.addCollection) return window.Iconify.addCollection(tablerIcons)
		window.customElements?.get('iconify-icon')?.addCollection?.(tablerIcons)
	}

	// Try immediately and also when DOM is ready
	addTablerIcons()
	document.addEventListener('DOMContentLoaded', addTablerIcons)

	const {
		getMarkdown,
		setMarkdown,
		onMarkdownUpdated,
		cleanup: cleanupEditor,
		profiler,
		scrollToLine,
		view,
	} = await createEditor()
	const {
		cleanup: cleanupUI,
		onPreviewRendered,
		previewHtml,
	} = await initUI({
		getMarkdown,
		setMarkdown,
		scrollToLine,
		profiler,
		view,
	})
	const cleanupPreview = setupPreview({
		getMarkdown,
		onMarkdownUpdated,
		onRendered: onPreviewRendered,
		previewHtml,
	})
	const cleanup = () => {
		window.removeEventListener('pagehide', onPageHide)
		cleanupPreview()
		cleanupUI?.()
		cleanupEditor()
	}
	const onPageHide = event => {
		if (!event.persisted) cleanup()
	}
	window.addEventListener('pagehide', onPageHide)

	// Handle PWA install prompt - setup after UI is initialized
	window.addEventListener('beforeinstallprompt', event => {
		event.preventDefault()
		// If pwa-installed flag was set, app was uninstalled - clear flags
		if (localStorage.getItem('pwa-installed') === 'true') {
			localStorage.removeItem('pwa-installed')
			localStorage.removeItem('pwa-banner-dismissed')
		}
		window.deferredPrompt = event
		updatePWAUI()
	})

	// Clear install prompt after successful install
	window.addEventListener('appinstalled', () => {
		localStorage.setItem('pwa-installed', 'true')
		window.deferredPrompt = null
		updatePWAUI()
	})

	// Expose profiler globally for console inspection
	window.__MARKON_PERF__ = profiler
}

boot()
