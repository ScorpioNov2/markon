import { HOTKEYS } from './actions.js'

// Key event handler
export const createKeyHandler = runAction => e => {
	// Allow hotkeys to work even when editor is focused
	// Only skip if it's a regular input/textarea (not CodeMirror)
	if (e.target.matches('input:not([data-cm-editor]), textarea:not([data-cm-editor])')) return

	const key = e.key.toLowerCase()
	const hasCtrl = e.ctrlKey || e.metaKey
	const hasShift = e.shiftKey

	// Special keys handled by regular hotkey system

	// Build modifier string
	let modifierString = ''
	if (hasCtrl) modifierString += 'ctrl+'
	if (hasShift) modifierString += 'shift+'
	const fullKey = modifierString + key

	// Regular hotkeys
	const hotkey = HOTKEYS.find(([k]) => k === fullKey)
	if (hotkey) {
		e.preventDefault()
		const [, , targetId] = hotkey
		runAction(targetId)
	}
}

// Setup hotkeys
export const setupHotkeys = runAction => {
	const handler = createKeyHandler(runAction)
	window.addEventListener('keydown', handler, true)
	return () => window.removeEventListener('keydown', handler, true)
}
