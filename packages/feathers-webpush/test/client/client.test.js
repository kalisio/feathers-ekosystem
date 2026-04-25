import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkPrerequisites,
  requestNotificationPermission,
  getPushSubscription,
  subscribePushNotifications,
  unsubscribePushNotifications,
  addSubscription,
  removeSubscription
} from '../../src/client'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('checkPrerequisites', () => {
  it('should throw NotificationsNotSupported if PushManager is not in window', async () => {
    delete window.PushManager
    delete window.Notification
    await expect(checkPrerequisites()).rejects.toMatchObject({
      name: 'NotificationsNotSupported'
    })
  })

  it('should throw NotificationsNotSupported if Notification is not in window', async () => {
    window.PushManager = {}
    delete window.Notification
    await expect(checkPrerequisites()).rejects.toMatchObject({
      name: 'NotificationsNotSupported'
    })
  })

  it('should resolve if both PushManager and Notification are supported', async () => {
    window.PushManager = {}
    window.Notification = {}
    await expect(checkPrerequisites()).resolves.toBeUndefined()
  })
})

describe('requestNotificationPermission', () => {
  it('should request permission if status is default', async () => {
    window.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted')
    }
    const result = await requestNotificationPermission()
    expect(result).toBe('granted')
    expect(window.Notification.requestPermission).toHaveBeenCalled()
  })

  it('should throw PermissionDeniedNotifications if requestPermission throws', async () => {
    window.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockRejectedValue(new Error('denied'))
    }
    await expect(requestNotificationPermission()).rejects.toMatchObject({
      name: 'PermissionDeniedNotifications'
    })
  })

  it('should throw PermissionDeniedNotifications if permission is denied', async () => {
    window.Notification = { permission: 'denied' }
    await expect(requestNotificationPermission()).rejects.toMatchObject({
      name: 'PermissionDeniedNotifications'
    })
  })

  it('should resolve without requesting if permission is already granted', async () => {
    window.Notification = { permission: 'granted' }
    await expect(requestNotificationPermission()).resolves.toBeUndefined()
  })
})

describe('getPushSubscription', () => {
  it('should throw ServiceWorkerNotRegistered if no registration', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { getRegistration: vi.fn().mockResolvedValue(null) },
      configurable: true
    })
    await expect(getPushSubscription()).rejects.toMatchObject({
      name: 'ServiceWorkerNotRegistered'
    })
  })

  it('should return the push subscription', async () => {
    const mockSubscription = { endpoint: 'https://example.com' }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSubscription)
          }
        })
      },
      configurable: true
    })
    const result = await getPushSubscription()
    expect(result).toEqual(mockSubscription)
  })

  it('should return null if no subscription', async () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null)
          }
        })
      },
      configurable: true
    })
    const result = await getPushSubscription()
    expect(result).toBe(null)
  })
})

describe('subscribePushNotifications', () => {
  it('should subscribe and return serialized subscription', async () => {
    const mockSubscription = {
      endpoint: 'https://example.com',
      toJSON: () => ({ endpoint: 'https://example.com' })
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            subscribe: vi.fn().mockResolvedValue(mockSubscription)
          }
        })
      },
      configurable: true
    })
    const result = await subscribePushNotifications('publicKey')
    expect(result).toEqual({ endpoint: 'https://example.com' })
  })

  it('should pass the correct options to subscribe', async () => {
    const subscribeMock = vi.fn().mockResolvedValue({
      endpoint: 'https://example.com',
      toJSON: () => ({ endpoint: 'https://example.com' })
    })
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { subscribe: subscribeMock }
        })
      },
      configurable: true
    })
    await subscribePushNotifications('myVapidKey')
    expect(subscribeMock).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: 'myVapidKey'
    })
  })
})

describe('unsubscribePushNotifications', () => {
  it('should unsubscribe and return the subscription', async () => {
    const mockSubscription = {
      endpoint: 'https://example.com',
      unsubscribe: vi.fn().mockResolvedValue(true)
    }
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(mockSubscription)
          }
        })
      },
      configurable: true
    })
    const result = await unsubscribePushNotifications()
    expect(mockSubscription.unsubscribe).toHaveBeenCalled()
    expect(result).toEqual(mockSubscription)
  })
})

describe('addSubscription', () => {
  it('should create a new array with the subscription if property does not exist', async () => {
    const subscription = {}
    const current = { endpoint: 'https://example.com' }
    const result = await addSubscription(subscription, current, 'subscriptions')
    expect(result).toEqual({ subscriptions: [current] })
  })

  it('should add the subscription if not already present', async () => {
    const existing = { endpoint: 'https://other.com' }
    const subscription = { subscriptions: [existing] }
    const current = { endpoint: 'https://example.com' }
    await addSubscription(subscription, current, 'subscriptions')
    expect(subscription.subscriptions).toHaveLength(2)
  })

  it('should not add a duplicate subscription', async () => {
    const current = { endpoint: 'https://example.com' }
    const subscription = { subscriptions: [current] }
    await addSubscription(subscription, current, 'subscriptions')
    expect(subscription.subscriptions).toHaveLength(1)
  })
})

describe('removeSubscription', () => {
  it('should remove the subscription with matching endpoint', async () => {
    const current = { endpoint: 'https://example.com' }
    const other = { endpoint: 'https://other.com' }
    const subscription = { subscriptions: [current, other] }
    const result = await removeSubscription(subscription, current, 'subscriptions')
    expect(result.subscriptions).toHaveLength(1)
    expect(result.subscriptions[0].endpoint).toBe('https://other.com')
  })

  it('should return an empty array if no subscriptions match', async () => {
    const current = { endpoint: 'https://example.com' }
    const subscription = { subscriptions: [current] }
    const result = await removeSubscription(subscription, current, 'subscriptions')
    expect(result.subscriptions).toHaveLength(0)
  })

  it('should handle missing subscription property gracefully', async () => {
    const subscription = {}
    const current = { endpoint: 'https://example.com' }
    const result = await removeSubscription(subscription, current, 'subscriptions')
    expect(result.subscriptions).toHaveLength(0)
  })
})
