import pkg from '../package.json'
import { SETTINGS_ACTIONS, setPressed } from './actions.js'
import { applyTheme, createClickHandler, createElement, extractThemesFromCSS, getPrefTheme } from './utils.js'
import './settings.css'

export const createSettingsDialog = runAction => {
	const dialog = createElement('dialog', {
		id: 'settings-system',
		className: 'settings-dialog',
		closedby: 'any', // Allow dismissal by backdrop click, ESC key, or close button
	})

	const closeBtn = createElement('button', { className: 'settings-close' })
	closeBtn.innerHTML = '<iconify-icon width="32" height="32" icon="tabler:circle-x-filled"></iconify-icon>'

	const content = createElement('div', { className: 'settings-content' })

	const themesSection = createThemesSection()
	const actionsSection = createActionsSection(runAction)

	content.append(themesSection, actionsSection)

	const footer = createElement('div', { className: 'settings-footer' })
	const heart = createElement('span', {
		className: 'heart',
		textContent: '❤',
	})
	const text1 = document.createTextNode('Made with ')
	const text2 = document.createTextNode(' by ')
	const githubProfileLink = createElement('a', {
		href: 'https://github.com/metaory',
		target: '_blank',
		textContent: 'metaory',
	})
	const text3 = document.createTextNode('/')
	const githubRepoLink = createElement('a', {
		href: 'https://github.com/metaory/markon',
		target: '_blank',
		textContent: 'markon',
	})
	const text4 = document.createTextNode(' · ')
	const version = createElement('kbd', {
		textContent: `v${pkg.version}`,
		className: 'settings-version',
	})

	// Line break
	const br = createElement('br')

	// Footer - line 2: Issues link
	const issuesIcon = createElement('iconify-icon', {
		icon: 'tabler:brand-github',
		width: '16',
		style: 'vertical-align: middle; margin-right: 4px;',
	})
	const issuesLink = createElement('a', {
		href: 'https://github.com/metaory/markon/issues/new/choose',
		target: '_blank',
		textContent: 'Submit issues or feature requests',
		className: 'footer-issue',
	})
	issuesLink.prepend(issuesIcon)

	footer.append(text1, heart, text2, githubProfileLink, text3, githubRepoLink, text4, version, br, issuesLink)

	dialog.append(closeBtn, content, footer)

	const show = () => {
		// Only append if not already in DOM
		if (!dialog.parentNode) {
			document.body.appendChild(dialog)
		}
		if (!dialog.open) dialog.showModal()
		setPressed('toggle-editor-sync', localStorage.getItem('editor-sync-enabled') !== 'false')
		setPressed('toggle-profiler', localStorage.getItem('markon-profiler-visible') === 'true')
		// Highlight current theme after dialog is shown
		const themeGrid = dialog.querySelector('.settings-theme-grid')
		if (themeGrid) highlightCurrentTheme(themeGrid)
	}

	const hide = () => {
		// Move toast back to body if it's inside the dialog
		const toast = document.getElementById('toast')
		if (toast && dialog.contains(toast)) {
			document.body.appendChild(toast)
		}
		dialog.close()
		dialog.remove()
	}

	createClickHandler(closeBtn, hide)

	// Fallback for backdrop click (in case closedby attribute isn't fully supported)
	dialog.addEventListener('click', e => {
		if (e.target === dialog) {
			hide()
		}
	})

	// Move toast back to body when dialog closes (handles ESC key, etc.)
	dialog.addEventListener('close', () => {
		const toast = document.getElementById('toast')
		if (toast && dialog.contains(toast)) {
			document.body.appendChild(toast)
		}
	})

	return { show, hide }
}

// Create unified actions and shortcuts section
const createActionsSection = runAction => {
	const section = createElement('div', { className: 'settings-section' })

	const actionsGrid = createElement('div', {
		className: 'settings-shortcuts',
	})

	SETTINGS_ACTIONS.filter(action => action.showInSettings !== false).forEach(
		({ id, label, icon, hotkey, gradient, hideSettingsLabel, settingsLabel }) => {
			const item = createElement('div', { className: 'settings-item' })

			const labelSpan = createElement('span', {
				hidden: hideSettingsLabel,
				textContent: label,
				style: 'font-weight: 500;',
			})

			const btn = createElement('button', {
				className: 'settings-theme-control-btn',
				style: `background: ${gradient}; border: none;`,
			})
			btn.dataset.action = id
			const btnIcon = createElement('iconify-icon', {
				icon,
				width: '32',
				height: '32',
			})
			const btnText = createElement('span', {
				textContent: settingsLabel,
			})
			btn.append(btnIcon, btnText)

			// Add popover tooltip
			const popoverSpan = createElement('span', { textContent: label })
			btn.appendChild(popoverSpan)

			createClickHandler(btn, () => runAction(id))

			const hotkeyKbd = createElement('kbd', {
				className: 'settings-key',
				textContent: hotkey || label.toLowerCase(),
			})
			item.append(labelSpan, btn, hotkeyKbd)

			actionsGrid.appendChild(item)
		},
	)

	section.append(actionsGrid)
	return section
}

// Create themes section
const createThemesSection = () => {
	const section = createElement('div', { className: 'settings-section' })

	// Theme grid
	const themeGrid = createElement('div', { className: 'settings-theme-grid' })

	// Get themes dynamically from CSS
	const themes = extractThemesFromCSS()

	themes.forEach(theme => {
		const themeCard = createElement('div', {
			className: `settings-theme-card theme-${theme.id}`,
			'data-theme': theme.id,
		})

		const themeName = createElement('div', {
			className: 'settings-theme-name',
			textContent: theme.id,
		})

		// Color preview
		const colorPreview = createElement('div', {
			className: 'settings-theme-preview',
		})
		theme.colors.forEach(color => {
			const colorDot = createElement('div', {
				className: 'settings-theme-color',
				style: `background-color: ${color}`,
			})
			colorPreview.appendChild(colorDot)
		})

		themeCard.append(themeName, colorPreview)

		// Add click handler for theme selection
		themeCard.addEventListener('click', async () => {
			const currentMode = getPrefTheme().mode
			await applyTheme(theme.id, currentMode)
			highlightCurrentTheme(themeGrid)
		})

		themeGrid.appendChild(themeCard)
	})

	section.append(themeGrid)
	return section
}

// Highlight current theme in settings dialog
const highlightCurrentTheme = themeGrid => {
	const currentTheme = document.documentElement.getAttribute('data-theme')

	// Clear all selections and highlight current
	themeGrid.querySelectorAll('.settings-theme-card').forEach(card => {
		card.classList.toggle('selected', card.classList.contains(`theme-${currentTheme}`))
	})
}
