import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only COMBINEREDUCERS, GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component.

@Injectable()
export class StoreService {

  // Set to 'dev' to save action objects, listener arrays, locked key path arrays, and state objects.
  // Set to anything else to save only action objects.
  private mode: string = 'dev'

  // Current state.  
  private state: Object

  // When set to true (triggered by presence of 'lockState' property on action object), state cannot
  // be mutated until it is unlocked (triggered by presence of 'unlockState' property on action object).
  private stateLocked: boolean = false

  // Partial locking. Contains array of state properties (in dot notation, even for arrays) that should be locked.
  private lockedKeyPaths: Object = {}

  // Array of listeners to be trigger on all state changes.
  private globalListeners: Function[] = []

  // Keys in this object are key paths. Values are array of listeners.
  private partialListeners: Object = {}

  // Object in the same shape of desired state object.
  private mainReducer: Object

  // Should contain copies of action objects (all modes), listener arrays (dev mode only),
  // and locked key path arrays (dev mode only).
  private history: Object[] = []

  // Return either type of input or a Boolean of whether or not input matches a given type
  typeOf(input: any, check: string = null): string {
    const type = Object.prototype.toString.call(input).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
    return check ? type === check : type
  }

  // Returns a deep clone and optionally deep frozen copy of an object.
  deepClone(obj: Object, freeze: boolean = false): Object {
    if (!this.typeOf(obj, 'object') && !this.typeOf(obj, 'array')) return obj
    const newObj = this.typeOf(obj, 'array') ? [] : {}
    for (let key in obj) newObj[key] = (this.typeOf(obj, 'object') || this.typeOf(obj, 'array')) ? this.deepClone(obj[key]) : obj[key]
    return freeze ? Object.freeze(newObj) : newObj
  }

  // Compares two objects at every level and returns boolean indicating if they are the same.
  deepCompare(obj1: Object, obj2: Object): boolean {
    if (this.typeOf(obj1) !== this.typeOf(obj2)) return false
    if (this.typeOf(obj1, 'function')) return obj1.toString() === obj2.toString()
    if (!this.typeOf(obj1, 'object') && !this.typeOf(obj1, 'array')) return obj1 === obj2
    if (Object.keys(obj1).sort().toString() !== Object.keys(obj2).sort().toString()) return false
    for (let key in obj1) if (!this.deepCompare(obj1[key], obj2[key])) return false
    return true
  }

  // Takes dot notation key path and returns nested value
  getNestedValue(obj: Object, keyPath: string): any {
    return eval(`obj['${keyPath.replace(/\./g, "']['")}']`)
  }

  // Returns flattened object from nested object.
  getAllKeys(obj: Object, keyPath: string = null): Object {
    if (!this.typeOf(obj, 'object') && !this.typeOf(obj, 'array')) return {}
    const keyPaths = {}
    const prefix = keyPath === null ? '' : `${keyPath}.`
    for (let key in obj) {
      keyPaths[`${prefix}${key}`] = true
      if (this.typeOf(obj[key], 'object') || this.typeOf(obj[key], 'array')) {
        for (let nestKey in this.getAllKeys(obj[key], `${prefix}${key}`)) {
          keyPaths[nestKey] = true
        }
      }
    }
    return keyPaths
  }

  // Returns array of keys from obj1 that are not the same in obj2. Will not return keys from obj2 that are not in obj1.
  keyPathsChanged(obj1: Object, obj2: Object): Object {
    if (typeof obj1 !== 'object') {
      if (obj1 !== obj2) return { VALUE_BEFORE: obj1, VALUE_AFTER: obj2 }
      return null
    }
    const allKeyPaths1 = this.getAllKeys(obj1)
    const allKeyPaths2 = this.getAllKeys(obj2)
    const changedKeyPaths = {}
    const needToCheck = {}
    // Separating key paths in obj1 into two groups: Found in obj2, and not found in obj2.
    for (let keyPath in allKeyPaths1) {
      // Key path found in obj2. Saving it to deep compare later in this function.
      if (keyPath in allKeyPaths2) needToCheck[keyPath] = true
      // Key path not found in obj2. Record as changed to undefined.
      else changedKeyPaths[keyPath] = { VALUE_BEFORE: this.getNestedValue(obj1, keyPath), VALUE_AFTER: undefined }
    }
    // Deep comparing key paths in obj1 that were found in obj2.
    for (let keyPath in needToCheck) {
      const val1 = this.getNestedValue(obj1, keyPath)
      const val2 = this.getNestedValue(obj2, keyPath)
      // Values are the same.
      if (this.deepCompare(val1, val2)) {
        // If key path passes deep compare check, then all key paths part branching from this key path do not need to be checked.
        for (let lookKey in needToCheck) {
          const firstDotIndex = lookKey.indexOf('.')
          if (firstDotIndex !== -1 && lookKey.slice(0, firstDotIndex) === keyPath) delete needToCheck[lookKey]
        }
      }
      // Values are not the same.
      else changedKeyPaths[keyPath] = { VALUE_BEFORE: val1, VALUE_AFTER: val2 }
    }
    // Returning object describing changes. Keys are key paths that have changed. Values are objects with VALUE_AFTER and VALUE_BEFORE.
    return changedKeyPaths
  }

  // Saves a history of state in the form of an array of deep cloned, deep frozen copies.
  saveHistory(action: Object, changeType: string): void {
    const newHistoryObj = {}
    newHistoryObj['CHANGE_TYPE'] = changeType
    newHistoryObj['ACTION'] = action
    if (this.mode === 'dev') {
      newHistoryObj['CURRENT_LISTENERS'] = {
        GLOBAL: this.globalListeners,
        PARTIAL: this.partialListeners
      }
      newHistoryObj['CURRENT_LOCKED_KEYS'] = this.lockedKeyPaths
      newHistoryObj['STATE'] = this.state
      console.groupCollapsed(`Store.SAVEHISTORY: ${changeType}`)
      console.dir(newHistoryObj)
      console.groupEnd()
    }
    this.history.push(newHistoryObj)
  }

  // Takes in reducer object just like in Redux.
  combineReducers(reducerObj: Object): void {
    // Saving reducer.
    this.mainReducer = reducerObj

    // Initializing state.
    const newState = {}
    for (let key in this.mainReducer) newState[key] = this.mainReducer[key](null, {})
    this.state = newState
  }

  // Returns a deep clone of state.
  getState(): Object { return this.state }

  // Takes in an action object. Checks for mode setting and locking/unlocking before passing action to reducers.
  dispatch(action: Object): Object {
    if (this.mode === 'dev') {
      console.groupCollapsed(`Store.DISPATCH: ${Object.keys(action).map(e => `${e}:${action[e]}`)}`)
      console.log(`Action object received:`)
      console.dir(action)
    }

    // Checking for Dev Mode command. If set to true, history is not saved and
    // console.groupEnd is never called, putting all console logs in one group.
    if ('mode' in action) {
      this.mode = action['mode']

      // Only close console grouping to show console logs if in Dev Mode.
      // Otherwise, don't close console grouping and collect console logs.
      if (action['mode'] === 'dev') console.groupEnd()
      return
    }

    // Locking specific key paths.
    if (action['lockKeyPaths'] !== undefined) {
      const newKeyPaths = {}
      const alreadyLocked = {}
      const keyPathsToLockArray = typeof action['lockKeyPaths'] === 'string' ? [action['lockKeyPaths']] : action['lockKeyPaths']
      keyPathsToLockArray.forEach(keyPath => {
        if (!(keyPath in this.lockedKeyPaths)) {
          this.lockedKeyPaths[keyPath] = true
          newKeyPaths[keyPath] = true
        }
        else alreadyLocked[keyPath] = true
      })

      if (this.mode === 'dev') {
        if (Object.keys(newKeyPaths).length) {
          console.groupCollapsed(`Key paths locked:`)
          console.dir(newKeyPaths)
          console.groupEnd()
        }
        if (Object.keys(alreadyLocked).length) {
          console.groupCollapsed(`Key paths already locked:`)
          console.dir(alreadyLocked)
          console.groupEnd()
        }
        console.groupEnd()
        return
      }
    }

    // Unlocking specific key paths.
    if (action['unlockKeyPaths'] !== undefined) {
      const newKeyPaths = {}
      const alreadyUnlocked = {}
      const keyPathsToUnlockArray = typeof action['unlockKeyPaths'] === 'string' ? [action['unlockKeyPaths']] : action['unlockKeyPaths']
      keyPathsToUnlockArray.forEach(keyPath => {
        if (keyPath in this.lockedKeyPaths) {
          delete this.lockedKeyPaths[keyPath]
          newKeyPaths[keyPath] = true
        }
        else alreadyUnlocked[keyPath] = true
      })

      if (this.mode === 'dev') {
        if (Object.keys(newKeyPaths).length) {
          console.groupCollapsed(`Key paths unlocked:`)
          console.dir(newKeyPaths)
          console.groupEnd()
        }
        if (Object.keys(alreadyUnlocked).length) {
          console.groupCollapsed(`Key paths already unlocked:`)
          console.dir(alreadyUnlocked)
          console.groupEnd()
        }
        console.groupEnd()
        return
      }
    }

    // Checking for lockState command.
    if (action['lockState'] !== undefined) {
      this.stateLocked = true
      if (this.mode === 'dev') {
        console.log(`State locked.`)
        console.groupEnd()
      }
      return
    }

    // Checking for unlockState command.
    if (action['unlockState'] !== undefined) {
      this.stateLocked = false
      if (this.mode === 'dev') {
        console.log(`State unlocked.`)
        console.groupEnd()
      }
      return
    }

    // Checking if entire state is locked.
    if (this.stateLocked) {
      if (this.mode === 'dev') {
        console.warn("State change operation rejected: State is locked.")
        console.groupEnd()
      }
      return
    }

    // Proceeding with reducers.
    const newState = this.deepClone(this.state, false)
    for (let key in this.mainReducer) newState[key] = this.mainReducer[key](newState[key], action)

    // Checking key paths for changes.
    const keyPathsToCheck = {}
    // If there were attempts to change locked keys, reject state change.
    const changedLockedKeys = []

    // If KEYPATHS_TO_CHANGE property is found on action object, only check the passed-in key paths that have listeners attached.
    if (action['KEYPATHS_TO_CHANGE'] !== undefined) {
      const keyPathsToChangeArray = typeof action['KEYPATHS_TO_CHANGE'] === 'string' ? [action['KEYPATHS_TO_CHANGE']] : action['KEYPATHS_TO_CHANGE']
      keyPathsToChangeArray.forEach(keyPath => {
        for (let lockedKeyPath in this.lockedKeyPaths) if (keyPath.indexOf(lockedKeyPath) === 0) changedLockedKeys.push(lockedKeyPath)
        if (keyPath in this.partialListeners) keyPathsToCheck[keyPath] = true
      })
      if (changedLockedKeys.length) {
        if (this.mode === 'dev') {
          console.warn("State change operation rejected: Cannot change locked keys:", ...changedLockedKeys)
          console.groupEnd()
        }
        return
      }
    }
    // If KEYPATHS_TO_CHANGE property is NOT found on action object, check all key paths that have listeners attached.
    else {
      for (let lockedKeyPath in this.lockedKeyPaths) {
        const oldValue = this.getNestedValue(this.state, lockedKeyPath)
        const newValue = this.getNestedValue(newState, lockedKeyPath)
        if (!this.deepCompare(oldValue, newValue)) changedLockedKeys.push(lockedKeyPath)
      }
      if (changedLockedKeys.length) {
        if (this.mode === 'dev') {
          console.warn("State change operation rejected: Cannot change locked keys:", ...changedLockedKeys)
          console.groupEnd()
        }
        return
      }
      for (let keyPath in this.partialListeners) keyPathsToCheck[keyPath] = true
    }

    // Recording changes.
    const changedKeyPaths = {}
    for (let keyPath in keyPathsToCheck) {
      const oldValue = this.getNestedValue(this.state, keyPath)
      const newValue = this.getNestedValue(newState, keyPath)
      if (!this.deepCompare(oldValue, newValue)) {
        changedKeyPaths[keyPath] = { VALUE_BEFORE: oldValue, VALUE_AFTER: newValue }
        // Record key changes at every level of nesting BELOW the specified key paths that were changed (if any).
        // this.keyPathsChanged will handle every level of nesting below `keyPath`, so no need to iterate.
        if (typeof oldValue === 'object') {
          const subKeysChanged = this.keyPathsChanged(oldValue, newValue)
          for (let subKeyPath in subKeysChanged) changedKeyPaths[`${keyPath}.${subKeyPath}`] = subKeysChanged[subKeyPath]
        }
      }
    }

    // Record key changes at every level of nesting ABOVE the specified key paths that were changed (if any).
    for (let keyPath in changedKeyPaths) {
      let nextDotIndex = keyPath.indexOf('.')
      let nextLevel = keyPath.slice(0, nextDotIndex)
      let remainingLevels = keyPath.slice(nextDotIndex + 1)
      while (nextDotIndex > -1) {
        const oldValue = this.getNestedValue(this.state, nextLevel)
        const newValue = this.getNestedValue(newState, nextLevel)
        if (!(nextLevel in changedKeyPaths)) changedKeyPaths[nextLevel] = { VALUE_BEFORE: oldValue, VALUE_AFTER: newValue }
        const testNextDotIndex = keyPath.slice(nextDotIndex + 1).indexOf('.')
        nextDotIndex = testNextDotIndex === -1 ? -1 : testNextDotIndex + nextDotIndex + 1
        nextLevel = keyPath.slice(0, nextDotIndex)
        remainingLevels = keyPath.slice(nextDotIndex + 1)
      }
    }

    // Update state.
    this.state = newState

    // Ending console group if in 'dev' mode in order to show more console logs.
    if (this.mode === 'dev') console.groupEnd()

    // Saves history. Note: SAVEHISTORY method behaves differently according to this.mode setting.
    this.saveHistory(action, 'STATE')

    // Loop through all arrays of partial listeners attached to changed key paths.
    for (let keyPath in changedKeyPaths) {
      if (keyPath in this.partialListeners) {
        // Invokes partial listener and passes in object describing change: { VALUE_AFTER: [value after change], VALUE_BEFORE: [value before change] }
        this.partialListeners[keyPath].forEach(listener => listener(changedKeyPaths[keyPath]))
      }
    }

    // Loop through the global array of listeners.
    this.globalListeners.forEach(listener => listener())
  }

  // Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.
  subscribe(fn: Function, keyPath: String = null): Function {

    // Key path is passed in. Subscribe listener to that specific key path only.
    if (keyPath !== null) {
      this.partialListeners[`${keyPath}`] = this.partialListeners[`${keyPath}`] ? this.partialListeners[`${keyPath}`].concat(fn) : [fn]
      this.saveHistory({}, 'ADD_PARTIAL_LISTENER')

      // Return partial unsubscribe function.
      return () => {
        this.partialListeners[`${keyPath}`] = this.partialListeners[`${keyPath}`].filter(func => func !== fn)
        if (!this.partialListeners[`${keyPath}`].length) delete this.partialListeners[`${keyPath}`]
        this.saveHistory({}, 'DEL_PARTIAL_LISTENER')
      }
    }

    // Key path not passed in. Subscribe listener to entire state object.
    this.globalListeners = this.globalListeners.concat(fn)
    this.saveHistory({}, 'ADD_GLOBAL_LISTENER')

    // Return global unsubscribe function.
    return () => {
      this.globalListeners = this.globalListeners.filter(func => func !== fn)
      this.saveHistory({}, 'DEL_GLOBAL_LISTENER')
    }
  }
}
