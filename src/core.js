import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import sampleMd from '../sample.md?raw'
import { createProfiler } from './profiler.js'
import { createStorage } from './storage.js'
import { editorThemeExtensions } from './style.js'

const readDefaultMarkdown = async () => sampleMd || '# markon\n\nStart typing...'

export const createEditor = async () => {
	let view = null
	const subscribers = []
	let storage = null
	const profiler = createProfiler()

	const mountIfNeeded = () => {
		const html = document.documentElement
		if (!html.classList.contains('ready')) html.classList.add('ready')
	}

	const notify = () => {
		if (!subscribers.length) return
		const value = view.state.doc.toString()
		for (const fn of subscribers) fn(value)
	}

	const make = defaultValue => {
		view?.destroy?.()
		const state = EditorState.create({
			doc: defaultValue,
			extensions: [
				markdown({ base: markdownLanguage, codeLanguages: languages }),
				keymap.of([indentWithTab, ...defaultKeymap]),
				EditorView.lineWrapping,
				EditorView.updateListener.of(v => {
					if (v.docChanged) notify()
				}),
				...editorThemeExtensions(),
			],
		})
		view = new EditorView({ state, parent: document.querySelector('#editor') })
		mountIfNeeded()
	}

	// Initialize storage and load content
	const initialContent = await readDefaultMarkdown()
	make(initialContent)

	const getMarkdown = () => view.state.doc.toString()
	const setMarkdown = markdown => {
		const doc = markdown ?? ''
		const tr = view.state.update({
			changes: { from: 0, to: view.state.doc.length, insert: doc },
		})
		view.update([tr])
	}
	const onMarkdownUpdated = fn => {
		subscribers.push(fn)
		return () => {
			const index = subscribers.indexOf(fn)
			if (index >= 0) subscribers.splice(index, 1)
		}
	}

	// Initialize storage AFTER editor is created to avoid triggering on initial load
	storage = createStorage({ getMarkdown, onMarkdownUpdated, setMarkdown })
	storage.load()

	const scrollToLine = lineNumber => {
		if (!view || lineNumber < 1) return
		const line = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines))
		view.dispatch({
			effects: EditorView.scrollIntoView(line.from, { y: 'start', yMargin: 20 }),
		})
	}

	// Expose storage cleanup and profiler
	const cleanup = () => storage?.cleanup()

	return { getMarkdown, setMarkdown, onMarkdownUpdated, cleanup, profiler, scrollToLine, view }
}
