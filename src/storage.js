// Web Worker-based storage - moves IndexedDB operations off main thread
const createStorageWorker = setMarkdown => {
	if (!window.Worker) {
		console.warn('Web Workers not supported, falling back to main thread storage')
		return null
	}

	try {
		const worker = new Worker(new URL('./worker.js', import.meta.url))

		worker.onmessage = event => {
			const { type, content } = event.data

			switch (type) {
				case 'CONTENT_LOADED':
					if (content !== null) setMarkdown(content)
					break
				case 'FLUSHED':
					worker.terminate()
					break
			}
		}

		worker.onerror = error => {
			console.error('Storage worker error:', error)
		}

		return worker
	} catch (error) {
		console.warn('Failed to create storage worker:', error)
		return null
	}
}

export const createStorage = ({ getMarkdown, onMarkdownUpdated, setMarkdown }) => {
	const worker = createStorageWorker(setMarkdown)

	const cleanup = () => {
		unsubscribe()
		window.removeEventListener('beforeunload', handleBeforeUnload)
		document.removeEventListener('visibilitychange', handleVisibilityChange)
		worker?.postMessage({ type: 'FLUSH_NOW', content: getMarkdown(), close: true })
	}

	const handleBeforeUnload = () => {
		worker?.postMessage({ type: 'FLUSH_NOW', content: getMarkdown() })
	}

	const handleVisibilityChange = () => {
		if (document.visibilityState !== 'hidden') return
		worker?.postMessage({ type: 'FLUSH_NOW', content: getMarkdown() })
	}

	const save = content => {
		if (worker) return worker.postMessage({ type: 'SAVE_CONTENT', content })
		console.warn('Storage worker not available, cannot save')
	}

	const unsubscribe = onMarkdownUpdated(save)
	window.addEventListener('beforeunload', handleBeforeUnload)
	document.addEventListener('visibilitychange', handleVisibilityChange)

	const load = () => worker?.postMessage({ type: 'LOAD_CONTENT' })
	return { load, cleanup }
}
