// Storage Web Worker - handles IndexedDB operations off main thread
const DB_NAME = 'markon-storage'
const DB_VERSION = 1
const STORE_NAME = 'content'
const STORAGE_KEY = 'markon-content'
const DEBOUNCE_MS = 600

let lastSavedContent = ''
let debounceTimer = null
let db = null

const openDB = () => {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onerror = () => reject(request.error)
		request.onsuccess = () => resolve(request.result)

		request.onupgradeneeded = event => {
			const db = event.target.result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}
	})
}

const saveToStorage = async content => {
	try {
		if (!db) db = await openDB()

		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)
		await new Promise((resolve, reject) => {
			const request = store.put(content, STORAGE_KEY)
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		})
		return true
	} catch (e) {
		console.warn('Failed to save to IndexedDB:', e)
		return false
	}
}

const loadFromStorage = async () => {
	try {
		if (!db) db = await openDB()

		const transaction = db.transaction([STORE_NAME], 'readonly')
		const store = transaction.objectStore(STORE_NAME)
		return await new Promise((resolve, reject) => {
			const request = store.get(STORAGE_KEY)
			request.onsuccess = () => resolve(request.result ?? null)
			request.onerror = () => reject(request.error)
		})
	} catch (e) {
		console.warn('Failed to load from IndexedDB:', e)
		return null
	}
}

const debouncedSave = content => {
	if (content === lastSavedContent) return

	clearTimeout(debounceTimer)
	debounceTimer = setTimeout(async () => {
		const success = await saveToStorage(content)
		if (success) {
			lastSavedContent = content
		}
	}, DEBOUNCE_MS)
}

// Handle messages from main thread
self.onmessage = async event => {
	const { type, content, close } = event.data

	switch (type) {
		case 'SAVE_CONTENT':
			debouncedSave(content)
			break

		case 'LOAD_CONTENT': {
			const storedContent = await loadFromStorage()
			if (storedContent !== null) lastSavedContent = storedContent
			postMessage({ type: 'CONTENT_LOADED', content: storedContent })
			break
		}

		case 'FLUSH_NOW':
			clearTimeout(debounceTimer)
			if (content !== lastSavedContent) {
				const success = await saveToStorage(content)
				if (success) lastSavedContent = content
			}
			if (close) postMessage({ type: 'FLUSHED' })
			break
	}
}
