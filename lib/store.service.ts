import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only COMBINEREDUCERS, GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component.

@Injectable()
export class StoreService {

  // Set to 'dev' to save action objects, change objects, listener arrays, and staqte objects.
  // Set to 'devlite' to save change objects and action objects.
  // Set to anything else to save only action objects.
  private mode: string = 'dev'

  // Current state.  
  private state: Object

  // Flattened model of state. Keys are descriptive and map to specific keys in nested state object.
  private flatState: Object

  // When set to true (triggered by presence of 'lockState' property on action object), state cannot
  // be mutated until it is unlocked (triggered by presence of 'unlockState' property on action object).
  private stateLocked: boolean = false

  // Partial locking. Contains array of state properties (in dot notation, even for arrays) that should be locked.
  private lockedKeys: Object = {}

  // Array of listeners to be trigger on all state changes.
  private globalListeners: Function[] = []

  // Keys in this object are key paths. Values are array of listeners.
  private partialListeners: Object = {}

  // Object in the same shape of desired state object.
  private mainReducer: Object

  // Should contain deep copies of action objects (all modes), change objects (dev and devlite modes only),
  // state objects (dev mode only), and current listener arrays (dev mode only).
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
    for (let key in obj)
      newObj[key] = (this.typeOf(obj, 'object') || this.typeOf(obj, 'array')) ? this.deepClone(obj[key]) : obj[key]
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
      if (obj1 !== obj2) return { VALUE_BEFORE: obj1, VALUE_AFTER: this.deepClone(obj2, false) }
      return null
    }
    const allKeyPaths1 = this.getAllKeys(obj1)
    const allKeyPaths2 = this.getAllKeys(obj2)
    const changedKeyPaths = {}
    const needToCheck = {}
    // Separating key paths in obj1 into two groups: Found in obj2, and not found in obj2.
    for (let key in allKeyPaths1) {
      // Key path found in obj2. Saving it to deep compare later in this function.
      if (key in allKeyPaths2) needToCheck[key] = true
      // Key path not found in obj2. Record as changed to undefined.
      else changedKeyPaths[key] = { VALUE_BEFORE: this.deepClone(this.getNestedValue(obj1, key), false), VALUE_AFTER: undefined }
    }
    // Deep comparing keys that were found in obj2.
    for (let key in needToCheck) {
      const val1 = this.getNestedValue(obj1, key)
      const val2 = this.getNestedValue(obj2, key)
      // Values are the same.
      if (this.deepCompare(val1, val2)) {
        // If key path passes deep compare check, then all key paths part branching from this key path do not need to be checked.
        for (let lookKey in needToCheck) {
          const firstDotIndex = lookKey.indexOf('.')
          if (firstDotIndex !== -1 && lookKey.slice(0, firstDotIndex) === key) delete needToCheck[lookKey]
        }
      }
      // Values are not the same.
      else changedKeyPaths[key] = { VALUE_BEFORE: this.deepClone(val1, false), VALUE_AFTER: this.deepClone(val2, false) }
    }
    // Returning object describing changes. Keys are key paths that have changed. Values are objects with VALUE_AFTER and VALUE_BEFORE.
    return changedKeyPaths
  }

  // Saves a history of state in the form of an array of deep cloned, deep frozen copies.
  saveHistory(action: Object, changes: Object): void {
    const newHistoryObj = {}
    newHistoryObj['ACTION'] = this.deepClone(action, true)
    if (this.mode.indexOf('dev') === 0) {
      if (this.mode === 'dev') {
        newHistoryObj['CURRENT_LISTENERS'] = {
          GLOBAL: this.deepClone(this.globalListeners, true),
          PARTIAL: this.deepClone(this.partialListeners, true)
        }
        newHistoryObj['CURRENT_LOCKED_KEYS'] = this.deepClone(this.lockedKeys, true)
        newHistoryObj['STATE'] = this.deepClone(this.state, true)
      }
      newHistoryObj['ACTION'] = this.deepClone(action, true)
      newHistoryObj['CHANGES'] = this.deepClone(changes, true)
      console.groupCollapsed(`Store.SAVEHISTORY: ${changes['CHANGE_TYPE']}`)
      console.dir(this.history.filter(h => h['CHANGES']['CHANGE_TYPE'] === `${changes['CHANGE_TYPE']}`))
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
  getState(): Object { return this.deepClone(this.state, false) }

  // Takes in an action object. Checks for mode setting and locking/unlocking before passing action to reducers.
  dispatch(action: Object): Object {
    if (this.mode === 'dev' || this.mode === 'devlite') {
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
      if (action['mode'] === 'dev' || action['mode'] === 'devlite') console.groupEnd()
      return
    }

    // Locking specific keys.
    if (action['lockKeys'] !== undefined) {
      const newKeys = {}
      const alreadyLocked = {}
      for (let i in action['lockKeys']) {
        if (!(action['lockKeys'][i] in this.lockedKeys)) {
          this.lockedKeys[action['lockKeys'][i]] = true
          newKeys[action['lockKeys'][i]] = true
        }
        else alreadyLocked[action['lockKeys'][i]] = true
      }

      if (this.mode === 'dev' || this.mode === 'devlite') {
        if (Object.keys(newKeys).length) {
          console.groupCollapsed(`Keys locked:`)
          console.dir(newKeys)
          console.groupEnd()
        }
        if (Object.keys(alreadyLocked).length) {
          console.groupCollapsed(`Keys already locked:`)
          console.dir(alreadyLocked)
          console.groupEnd()
        }
        console.groupEnd()
        return
      }
    }

    // Unlocking specific keys.
    if (action['unlockKeys'] !== undefined) {
      const newKeys = {}
      const alreadyUnlocked = {}
      for (let i in action['unlockKeys']) {
        if ((action['unlockKeys'][i] in this.lockedKeys)) {
          delete this.lockedKeys[action['unlockKeys'][i]]
          newKeys[action['unlockKeys'][i]] = true
        }
        else alreadyUnlocked[action['unlockKeys'][i]] = true
      }

      if (this.mode === 'dev' || this.mode === 'devlite') {
        if (Object.keys(newKeys).length) {
          console.groupCollapsed(`Keys unlocked:`)
          console.dir(newKeys)
          console.groupEnd()
        }
        if (Object.keys(alreadyUnlocked).length) {
          console.groupCollapsed(`Keys already unlocked:`)
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
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log(`State locked.`)
        console.groupEnd()
      }
      return
    }

    // Checking for unlockState command.
    if (action['unlockState'] !== undefined) {
      this.stateLocked = false
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log(`State unlocked.`)
        console.groupEnd()
      }
      return
    }

    // Checking if entire state is locked.
    if (this.stateLocked) {
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log("State change operation rejected: State is locked.")
        console.groupEnd()
      }
      return
    }

    // Proceeding with reducers.
    const newState = this.deepClone(this.state, false)
    for (let key in this.mainReducer) newState[key] = this.mainReducer[key](newState[key], action)

    // Begin building object describing all state changes and their respective key paths.
    let changedKeyPaths = {}

    // If action object specifies what key paths may have changed, check only those key paths.
    if (action['KEYPATHS_TO_CHANGE'] !== undefined) {
      // KEYPATHS_TO_CHANGE should be an array or a string. Convert to array if just a string.
      const keyPathsToChange = typeof action['KEYPATHS_TO_CHANGE'] === 'string' ? [action['KEYPATHS_TO_CHANGE']] : action['KEYPATHS_TO_CHANGE']
      keyPathsToChange.forEach(keyPath => {
        const oldValue = this.getNestedValue(this.state, keyPath)
        const newValue = this.getNestedValue(newState, keyPath)
        if (!this.deepCompare(oldValue, newValue)) {
          changedKeyPaths[keyPath] = { VALUE_BEFORE: this.deepClone(oldValue, false), VALUE_AFTER: this.deepClone(newValue, false) }

          // Record key changes at every level of nesting BELOW the specified key paths that were changed (if any).
          if (typeof oldValue === 'object') {
            const subKeysChanged = this.keyPathsChanged(oldValue, newValue)
            for (let subKey in subKeysChanged) changedKeyPaths[`${keyPath}.${subKey}`] = subKeysChanged[subKey]
          }
        }
      })

      // Record key changes at every level of nesting ABOVE the specified key paths that were changed (if any).
      for (let keyPath in changedKeyPaths) {
        let nextDotIndex = keyPath.indexOf('.')
        let nextLevel = keyPath.slice(0, nextDotIndex)
        let remainingLevels = keyPath.slice(nextDotIndex + 1)
        while (nextDotIndex > -1) {
          const oldValue = this.deepClone(this.getNestedValue(this.state, nextLevel), false)
          const newValue = this.deepClone(this.getNestedValue(newState, nextLevel), false)
          if (!(nextLevel in changedKeyPaths)) changedKeyPaths[nextLevel] = { VALUE_BEFORE: oldValue, VALUE_AFTER: newValue }
          const testNextDotIndex = keyPath.slice(nextDotIndex + 1).indexOf('.')
          nextDotIndex = testNextDotIndex === -1 ? -1 : testNextDotIndex + nextDotIndex + 1
          nextLevel = keyPath.slice(0, nextDotIndex)
          remainingLevels = keyPath.slice(nextDotIndex + 1)
        }
      }
    }
    // If no key paths specified, check entire state object.
    else if (action['type'] !== undefined) changedKeyPaths = this.keyPathsChanged(this.state, newState)

    // If there were attempts to change locked keys, console log an array of the would-be affected
    // locked keys and return a deep clone of state.
    const changedLockedKeys = []
    for (let keyPath in this.lockedKeys) if (keyPath in changedKeyPaths) changedLockedKeys.push(keyPath)

    // If any locked keys were changed, exit DISPATCH function without updating state.
    if (changedLockedKeys.length) {
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log("State change operation rejected: Cannot change locked keys:", ...changedLockedKeys)
        console.groupEnd()
      }
      return
    }

    // If reducers did not change state.
    if (!Object.keys(changedKeyPaths).length) {
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log("State unchanged by reducers: History not updated.")
        console.groupEnd()
      }
      return
    }

    // Update state.
    this.state = newState

    // Ending console group if in 'dev' mode or 'devlite' mode in order to show more console logs.
    if (this.mode === 'dev' || this.mode === 'devlite') console.groupEnd()

    // Saves history. Note: SAVEHISTORY method behaves differently according to this.mode setting.
    this.saveHistory(action, { CHANGE_TYPE: 'STATE', KEYPATHS_CHANGED: changedKeyPaths })

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
      this.saveHistory({}, { CHANGE_TYPE: 'ADD_LISTENER', LISTENER_TYPE: 'PARTIAL', LISTENER: fn })

      // Return partial unsubscribe function.
      return () => {
        this.partialListeners[`${keyPath}`] = this.partialListeners[`${keyPath}`].filter(func => func !== fn)
        if (!this.partialListeners[`${keyPath}`].length) delete this.partialListeners[`${keyPath}`]
        this.saveHistory({}, { CHANGE_TYPE: 'DEL_LISTENER', LISTENER_TYPE: 'PARTIAL', LISTENER: fn })
      }
    }

    // Key path not passed in. Subscribe listener to entire state object.
    this.globalListeners = this.globalListeners.concat(fn)
    this.saveHistory({}, { CHANGE_TYPE: 'ADD_LISTENER', LISTENER_TYPE: 'GLOBAL', LISTENER: fn })

    // Return global unsubscribe function.
    return () => {
      this.globalListeners = this.globalListeners.filter(func => func !== fn)
      this.saveHistory({}, { CHANGE_TYPE: 'DEL_LISTENER', LISTENER_TYPE: 'GLOBAL', LISTENER: fn })
    }
  }
}
