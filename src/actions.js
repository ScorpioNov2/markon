import {
	applySpell,
	applyTheme,
	copySmart,
	createClickHandler,
	createElement,
	downloadText,
	openFileText,
} from './utils.js'

export const setPressed = (id, pressed) => {
	for (const button of document.querySelectorAll(`[data-action="${id}"]`)) {
		button.setAttribute('aria-pressed', String(pressed))
	}
}

// Check if PWA is installed (running in standalone mode)
const isPWAInstalled = () => {
	if (window.matchMedia('(display-mode: standalone)').matches) return true
	if (window.navigator.standalone) return true
	if (localStorage.getItem('pwa-installed') === 'true') return true
	return false
}

// Update PWA install button visibility
export const updatePWAInstallButton = () => {
	const btn = document.getElementById('install-pwa')
	if (!btn) return
	const isInstalled = isPWAInstalled()
	const shouldShow = window.deferredPrompt && !isInstalled
	btn.style.display = shouldShow ? 'flex' : 'none'
}

// Update both PWA UI elements
export const updatePWAUI = runAction => {
	updatePWAInstallButton()
	updatePWAInstallBanner(runAction)
}

// Shared PWA install handler
const handlePWAInstall = async showToast => {
	if (!window.deferredPrompt) {
		if (showToast) showToast('not available', 1200, 'tabler:alert-circle')
		return
	}
	window.deferredPrompt.prompt()
	const { outcome } = await window.deferredPrompt.userChoice
	window.deferredPrompt = null
	updatePWAUI()
	if (showToast) {
		const messages = {
			accepted: { text: 'installed!', icon: 'tabler:check' },
			dismissed: { text: 'cancelled', icon: 'tabler:x' },
		}
		const { text, icon } = messages[outcome] || messages.dismissed
		showToast(text, 1200, icon)
	}
	return outcome
}

// Create PWA install banner
const createPWAInstallBanner = runAction => {
	const banner = createElement('div', {
		id: 'pwa-install-banner',
		hidden: true,
	})

	const message = createElement('span', {
		textContent: 'Add Markon to your home screen for offline notes',
		style: 'flex: 1;',
	})

	const installBtn = createElement('button', {
		textContent: 'Install',
		style:
			'padding: 8px 16px; border-radius: 8px; border: none; background: var(--accent); color: var(--bg); font-weight: 500; cursor: pointer;',
	})

	const dismissBtn = createElement('button', {
		style:
			'padding: 8px; border: none; background: transparent; color: var(--text); cursor: pointer; display: flex; align-items: center;',
	})
	const dismissIcon = createElement('iconify-icon', {
		icon: 'solar:close-circle-bold-duotone',
		width: '36',
		height: '36',
	})
	dismissBtn.appendChild(dismissIcon)

	banner.appendChild(message)
	banner.appendChild(installBtn)
	banner.appendChild(dismissBtn)

	createClickHandler(installBtn, () => runAction?.('install-pwa'))

	createClickHandler(dismissBtn, () => {
		localStorage.setItem('pwa-banner-dismissed', 'true')
		updatePWAInstallBanner()
	})

	document.body.appendChild(banner)
	return banner
}

// Update PWA install banner visibility
export const updatePWAInstallBanner = runAction => {
	let banner = document.getElementById('pwa-install-banner')
	if (!banner) {
		banner = createPWAInstallBanner(runAction)
	}

	const isInstalled = isPWAInstalled()
	const isDismissed = localStorage.getItem('pwa-banner-dismissed') === 'true'
	const shouldShow = window.deferredPrompt && !isInstalled && !isDismissed

	if (shouldShow) {
		banner.removeAttribute('hidden')
	} else {
		banner.setAttribute('hidden', '')
	}
}

// Unified actions configuration - single source of truth
const ACTIONS_CONFIG = [
	// Toolbar actions (ordered from left to right, so rightmost appears last)
	{
		id: 'save-to-file',
		label: 'Save',
		icon: 'tabler:device-floppy',
		hotkey: 'ctrl+s',
		settingsLabel: 'Save',
		gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2))',
		showInToolbar: true,
		handler: async ({ getMarkdown, showToast }) => {
			const text = await getMarkdown()
			if (text) {
				const name = prompt('filename:', 'document.md') || 'document.md'
				downloadText(name, text)
				showToast('saved', 1200, 'tabler:check')
			}
		},
	},
	{
		id: 'load-from-file',
		label: 'Open',
		icon: 'tabler:folder-open',
		hotkey: 'ctrl+o',
		settingsLabel: 'Load',
		gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.2))',
		showInToolbar: true,
		handler: async ({ setMarkdown, showToast }) => {
			const text = await openFileText()
			if (text) {
				setMarkdown(text)
				showToast('opened', 1200, 'tabler:check')
			}
		},
	},
	{
		id: 'toggle-spell',
		label: 'Spell',
		icon: 'tabler:text-spellcheck',
		hotkey: 'ctrl+k',
		settingsLabel: 'Toggle',
		gradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(147, 51, 234, 0.2))',
		showInToolbar: false,
		handler: ({ showToast }) => {
			const enabled = document.querySelector('[data-action="toggle-spell"]')?.getAttribute('aria-pressed') !== 'true'
			setPressed('toggle-spell', enabled)
			applySpell(enabled)
			showToast(`spell: ${enabled ? 'on' : 'off'}`, 1200, 'tabler:file-text')
		},
		isToggle: true,
	},
	{
		id: 'install-pwa',
		label: 'Install',
		icon: 'tabler:square-rounded-chevrons-down',
		hotkey: '',
		showInSettings: false,
		gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2))',
		showInToolbar: true,
		handler: ({ showToast }) => handlePWAInstall(showToast),
	},
	{
		id: 'settings',
		label: 'Settings',
		icon: 'tabler:settings-2',
		hotkey: 'ctrl+/',
		settingsLabel: 'Run',
		gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(75, 85, 99, 0.2))',
		showInToolbar: true,
		handler: ({ settingsDialog }) => settingsDialog.show(),
	},
	{
		id: 'toggle-theme',
		label: 'Theme',
		icon: 'tabler:sun-electricity',
		hotkey: 'ctrl+m',
		settingsLabel: 'Toggle',
		gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2))',
		showInToolbar: true,
		handler: async ({ showToast }) => {
			const current = document.documentElement.getAttribute('data-mode') || 'dark'
			const next = current === 'light' ? 'dark' : 'light'
			const theme = document.documentElement.getAttribute('data-theme') || 'github'
			await applyTheme(theme, next)
			showToast(`theme: ${next}`, 1200, 'tabler:palette')
		},
		isToggle: true,
	},
	// Settings-only actions
	{
		id: 'copy-to-clipboard',
		label: 'Copy',
		icon: 'tabler:copy',
		hotkey: 'ctrl+shift+c',
		settingsLabel: 'Run',
		gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(16, 185, 129, 0.2))',
		showInToolbar: false,
		handler: async ({ getMarkdown, showToast }) => {
			const text = await getMarkdown()
			if (text) {
				await copySmart(text, showToast)
			}
		},
	},
	{
		id: 'load-from-clipboard',
		label: 'Paste',
		icon: 'tabler:clipboard-text-filled',
		hotkey: 'ctrl+shift+v',
		settingsLabel: 'Load',
		gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.2))',
		showInToolbar: false,
		handler: async ({ readClipboardSmart, setMarkdown, showToast }) => {
			const text = await readClipboardSmart()
			if (text) {
				const lines = text.split('\n')
				const minLines = 5
				const paddingLines = lines.length < minLines ? 3 : 0
				const paddedText = paddingLines > 0 ? '\n'.repeat(paddingLines) + text : text
				setMarkdown(paddedText)
				showToast('pasted', 1200, 'tabler:clipboard-check')
			} else {
				showToast('clipboard empty', 1200, 'tabler:alert-circle')
			}
		},
	},
	{
		id: 'toggle-editor-sync',
		label: 'Sync',
		icon: 'tabler:arrow-autofit-height-filled',
		hotkey: 'ctrl+b',
		settingsLabel: 'Toggle',
		gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
		showInToolbar: false,
		handler: ({ editorSync, showToast }) => {
			const currentState = localStorage.getItem('editor-sync-enabled') !== 'false'
			const enabled = !currentState
			localStorage.setItem('editor-sync-enabled', String(enabled))
			setPressed('toggle-editor-sync', enabled)
			enabled ? editorSync?.enable() : editorSync?.disable()
			showToast(`sync: ${enabled ? 'on' : 'off'}`, 1200, 'tabler:arrow-autofit-height-filled')
		},
		isToggle: true,
	},
	{
		id: 'toggle-profiler',
		label: 'Profiler',
		icon: 'tabler:gauge-filled',
		hotkey: '',
		hideSettingsLabel: true,
		settingsLabel: 'Toggle',
		gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
		showInToolbar: false,
		handler: ({ profiler, showToast }) => {
			if (!profiler) return
			profiler.toggle()
			setPressed('toggle-profiler', profiler.isVisible)
			showToast(`profiler: ${profiler.isVisible ? 'on' : 'off'}`, 1200, 'tabler:gauge')
		},
		isToggle: true,
	},
	{
		id: 'preview-toggle',
		label: 'Toggle preview',
		hotkey: 'ctrl+p',
		showInSettings: false,
		handler: ({ previewManager }) => previewManager.toggle(),
	},
	{
		id: 'github',
		label: 'GitHub',
		icon: 'tabler:brand-github-filled',
		hotkey: '',
		showInSettings: false,
		gradient: 'linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(75, 85, 99, 0.2))',
		showInToolbar: false,
		handler: () => {
			window.open('https://github.com/metaory/markon', '_blank')
		},
	},
]

// Button factory - functional approach with popover
const createButton = (config, runAction) => {
	const { id, label, icon, isToggle, hotkey } = config

	const btn = createElement('button', {
		id,
		...(isToggle && { 'aria-pressed': 'false' }),
		className: isToggle ? 'toggle' : '',
	})
	btn.dataset.action = id

	const iconEl = createElement('iconify-icon', { icon, width: '32' })
	btn.appendChild(iconEl)

	// Add popover span with label + hotkey (no title attribute)
	// For theme-mode and settings, show only hotkey
	const popoverText = id === 'toggle-theme' || id === 'settings' ? hotkey : hotkey ? `${label} • ${hotkey}` : label
	const span = createElement('span', { textContent: popoverText })
	btn.appendChild(span)

	createClickHandler(btn, () => runAction(id))

	return btn
}

// Derive arrays for different uses
export const SETTINGS_ACTIONS = ACTIONS_CONFIG
export const HOTKEYS = ACTIONS_CONFIG.filter(action => action.hotkey).map(action => [
	action.hotkey,
	action.label,
	action.id,
])

// Create all buttons
export const createButtons = runAction => {
	const actions = document.getElementById('actions')
	ACTIONS_CONFIG.filter(a => a.showInToolbar).forEach(config => {
		const btn = createButton(config, runAction)
		actions.appendChild(btn)
	})

	// Initialize PWA UI (always check, even if installed)
	updatePWAUI(runAction)
}

// Export action handlers for reuse in settings
const ACTIONS = Object.fromEntries(ACTIONS_CONFIG.map(action => [action.id, action]))

export const createActionRunner = context => id => ACTIONS[id]?.handler(context)
