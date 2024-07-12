import { beforeEach, expect, test, vi } from 'vitest'

import { testConfigFile } from '../../../test'
import { Cache } from '../../cache/cache'
import { CachePolicy, PendingValue } from '../../lib'
import { setMockConfig } from '../../lib/config'
import { cachePolicy } from './cache'
import { createStore, fakeFetch } from './test'

/**
 * Testing the cache plugin
 */
const config = testConfigFile()
beforeEach(async () => {
	setMockConfig({})
})

test('NetworkOnly', async function () {
	const spy = vi.fn()

	const store = createStore({
		pipeline: [
			cachePolicy({
				serverSideFallback: false,
				enabled: true,
				setFetching: spy,
				cache: new Cache({ ...config, disabled: false }),
			}),
			fakeFetch({}),
		],
	})
	const ret1 = await store.send({ policy: CachePolicy.NetworkOnly })
	const ret2 = await store.send({ policy: CachePolicy.NetworkOnly })

	expect(spy).toHaveBeenCalledTimes(2)

	expect(ret1).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})

	expect(ret2).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})
})

test('CacheOrNetwork', async function () {
	const spy = vi.fn()

	const store = createStore({
		pipeline: [
			cachePolicy({
				serverSideFallback: false,
				enabled: true,
				setFetching: spy,
				cache: new Cache({ ...config, disabled: false }),
			}),
			fakeFetch({}),
		],
	})
	const ret1 = await store.send({ policy: CachePolicy.CacheOrNetwork })
	const ret2 = await store.send({ policy: CachePolicy.CacheOrNetwork })

	expect(spy).toHaveBeenCalledTimes(1)

	expect(ret1).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})

	expect(ret2).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'cache',
		partial: false,
		stale: false,
	})
})

test('CacheAndNetwork', async function () {
	const spy = vi.fn()

	const store = createStore({
		pipeline: [
			cachePolicy({
				enabled: true,
				setFetching: () => {},
				cache: new Cache(config),
				serverSideFallback: false,
			}),
			fakeFetch({}),
		],
	})
	store.subscribe(spy)
	await store.send({ policy: CachePolicy.CacheAndNetwork })
	await store.send({ policy: CachePolicy.CacheAndNetwork })

	expect(spy).toHaveBeenNthCalledWith(2, {
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})

	expect(spy).toHaveBeenNthCalledWith(3, {
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'cache',
		partial: false,
		stale: false,
	})
	expect(spy).toHaveBeenNthCalledWith(4, {
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})
})

test('CacheOnly', async function () {
	const spy = vi.fn()

	const store = createStore({
		pipeline: [
			cachePolicy({
				serverSideFallback: false,
				enabled: true,
				setFetching: spy,
				cache: new Cache({ ...config, disabled: false }),
			}),
			fakeFetch({}),
		],
	})
	const ret1 = await store.send({ policy: CachePolicy.CacheOnly })

	expect(spy).toHaveBeenCalledTimes(0)

	expect(ret1).toEqual({
		data: null,
		errors: null,
		fetching: false,
		variables: null,
		source: 'cache',
		partial: false,
		stale: false,
	})
	const ret2 = await store.send({ policy: CachePolicy.CacheOrNetwork })

	// we should have set loading to true along the way
	expect(spy).toHaveBeenCalledTimes(1)
	expect(ret2).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})
	const ret3 = await store.send({ policy: CachePolicy.CacheOnly })

	// doesn't update the fetch value
	expect(spy).toHaveBeenCalledTimes(1)
	expect(ret3).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'cache',
		partial: false,
		stale: false,
	})
})

test('stale', async function () {
	const setFetching = vi.fn()
	const fn = vi.fn()

	const cache = new Cache({ ...config, disabled: false })

	const store = createStore({
		pipeline: [
			cachePolicy({
				serverSideFallback: false,
				enabled: true,
				setFetching,
				cache,
			}),
			fakeFetch({}),
		],
	})

	store.subscribe(fn)

	const ret1 = await store.send({ policy: CachePolicy.CacheOrNetwork })

	// Final return
	expect(ret1).toEqual({
		data: {
			viewer: {
				__typename: 'User',
				firstName: 'bob',
				id: '1',
			},
		},
		errors: null,
		fetching: false,
		partial: false,
		source: 'network',
		stale: false,
		variables: null,
	})

	// intermediate returns
	expect(fn).toHaveBeenNthCalledWith(1, {
		// this doesn't have the loading state because `setFetching` doesn't actually
		//
		data: null,
		errors: null,
		fetching: true,
		partial: false,
		source: null,
		stale: false,
		variables: null,
	})

	//  mark stale
	cache.markTypeStale({ type: 'User' })

	const ret2 = await store.send({ policy: CachePolicy.CacheOrNetwork })

	// First final return with stale: true
	expect(ret2).toEqual({
		data: {
			viewer: {
				__typename: 'User',
				firstName: 'bob',
				id: '1',
			},
		},
		errors: null,
		fetching: false,
		partial: false,
		source: 'cache',
		stale: true,
		variables: null,
	})

	// intermediate returns
	expect(fn).toHaveBeenNthCalledWith(3, {
		data: {
			viewer: {
				__typename: 'User',
				firstName: 'bob',
				id: '1',
			},
		},
		errors: null,
		fetching: false,
		partial: false,
		source: 'cache',
		stale: true,
		variables: null,
	})

	// Doing a real network call in the end and returning the new data & stale false
	expect(fn).toHaveBeenNthCalledWith(4, {
		data: {
			viewer: {
				__typename: 'User',
				firstName: 'bob',
				id: '1',
			},
		},
		errors: null,
		fetching: false,
		partial: false,
		source: 'network',
		stale: false,
		variables: null,
	})
})

test('NoCache', async function () {
	const spy = vi.fn()

	const cache = new Cache({ ...config, disabled: false })

	const store = createStore({
		pipeline: [
			cachePolicy({
				serverSideFallback: false,
				enabled: true,
				setFetching: spy,
				cache,
			}),
			fakeFetch({}),
		],
	})
	const returned = await store.send({ policy: CachePolicy.NoCache })

	expect(spy).toHaveBeenCalledTimes(1)

	expect(returned).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})

	// make sure there isn't anything in the cache
	expect(Object.keys(cache._internal_unstable.storage.topLayer.fields)).toHaveLength(0)

	// test the cache policy again
	const second = await store.send({ policy: CachePolicy.NoCache })
	expect(spy).toHaveBeenCalledTimes(2)
	expect(second).toEqual({
		data: {
			viewer: {
				id: '1',
				firstName: 'bob',
				__typename: 'User',
			},
		},
		errors: null,
		fetching: false,
		variables: null,
		source: 'network',
		partial: false,
		stale: false,
	})

	// make sure there isn't anything in the cache
	expect(Object.keys(cache._internal_unstable.storage.topLayer.fields)).toHaveLength(0)
})

test('loading states when fetching is true', async function () {
	// create the store
	const store = createStore()

	// listen for changes in the store state
	const fn = vi.fn()
	store.subscribe(fn)

	// send the request
	await store.send({ policy: CachePolicy.CacheOrNetwork })

	// the first call to the spy is when we subscribe (skip call 1)

	// the first real update (call 2) should be the loading state (fetching is true)
	expect(fn).toHaveBeenNthCalledWith(2, {
		data: {
			viewer: {
				firstName: PendingValue,
			},
		},
		errors: null,
		fetching: true,
		partial: false,
		source: null,
		stale: false,
		variables: null,
	})

	// the second update will have the actual value
	expect(fn).toHaveBeenNthCalledWith(3, {
		data: {
			viewer: {
				__typename: 'User',
				firstName: 'bob',
				id: '1',
			},
		},
		errors: null,
		fetching: false,
		partial: false,
		source: 'network',
		stale: false,
		variables: null,
	})
})
