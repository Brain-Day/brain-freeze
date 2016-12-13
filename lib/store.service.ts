import { Injectable } from '@angular/core';

// NOTE TO SELF: Scan reducers or expect devs to declare in reducers what keys the reducers will change?

// Purpose of Store is to have one state container for the whole app.
// Only COMBINEREDUCERS, GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component.

@Injectable()
export class StoreService {
  private compareCount: number = 0
  private mode: string = 'dev' // Set to 'dev' to save history of complete state objects, 'devlite' to save changing key-value pairs, and anything else to save only action objects.
  private state: Object // Current state.
  private flatState: Object // Flattened model of state mapping to nested state object.
  private stateLocked: boolean = false // When set to true (triggered by action.lock === true), state cannot be mutated until it is unlocked (triggered by action.unlock === true).
  private lockedKeys: Object = {} // Partial locking. Contains array of state properties (in dot notation, even for arrays) that should be locked.
  private globalListeners: Function[] = [] // Array of listeners to be trigger on any state change.
  private partialListeners: Object = {} // Keys in this object are key paths. Values are array of listeners.
  private mainReducer: Object // Object in the same shape of desired state object, with values being returned from small reducers.
  private history: Object[] = [] // Should always contain deep copies of states and listeners arrays, including current status of each.

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
    console.log(`Compare Count: ${this.compareCount++}`)
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

  // Populates a flattened object with values from a nested object.
  populateFlatObject(flatObj: Object, nestedObj: Object): Object {
    for (let keyPath in flatObj) {
      flatObj[keyPath] = this.deepClone(this.getNestedValue(nestedObj, keyPath), false)
    }
    return flatObj
  }

  // Returns array of keys from obj1 that are not the same in obj2. Will not return
  // keys from obj2 that are not in obj1.
  keyPathsChanged(obj1: Object, obj2: Object): Object {
    if (typeof obj1 !== 'object') {
      console.log(`Compare Count: ${this.compareCount++}`)
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
    switch (this.mode) {
      case 'dev':
        this.history.push({

          // Action object.
          ACTION: this.deepClone(action, true),

          // String describing if state or listener was changed to prompt a new save in history.
          CHANGES: this.deepClone(changes, true),

          // Object of deep cloned and deep frozen copies of all past and present listeners arrays.
          CURRENT_LISTENERS: {
            GLOBAL: this.deepClone(this.globalListeners, true),
            PARTIAL: this.deepClone(this.partialListeners, true)
          },

          // Keys locked.
          CURRENT_LOCKED_KEYS: this.deepClone(this.lockedKeys, true),

          // Deep cloned and deep frozen copes of all past and present state objects.
          STATE: this.deepClone(this.state, true)
        })
        // Log out history.
        console.groupCollapsed(`Store.SAVEHISTORY: ${changes['CHANGE_TYPE']}`)
        console.dir(this.history.filter(h => h['CHANGES']['CHANGE_TYPE'] === `${changes['CHANGE_TYPE']}`))
        console.groupEnd()
        break
      case 'devlite':
        this.history.push({ ACTION: this.deepClone(action, true), CHANGES: this.deepClone(changes, true) })
        console.groupCollapsed(`Store.SAVEHISTORY: ${changes['CHANGE_TYPE']}`)
        console.dir(this.history.filter(h => h['CHANGES']['CHANGE_TYPE'] === `${changes['CHANGE_TYPE']}`))
        console.groupEnd()
        break
      // Not in Dev Mode. Just action objects.
      default:
        this.history.push({ ACTION: this.deepClone(action, true) })
    }
  }

  // Takes in reducer object just like in Redux, but also a second object that maps
  // action.type strings to keyPaths that can be changed by that action.type string.
  // Keys in this object should be action.type strings. Values should be an array of
  // strings representing keyPaths that may be changed. If the value that may be changed
  // is an object or array, one keyPath to the object or array will suffice.
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
    if (action['lockKeys']) {
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
    if (action['unlockKeys']) {
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
    if (action['lockState']) {
      this.stateLocked = true
      if (this.mode === 'dev' || this.mode === 'devlite') {
        console.log(`State locked.`)
        console.groupEnd()
      }
      return
    }

    // Checking for unlockState command.
    if (action['unlockState']) {
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
    let newState = this.deepClone(this.state, false)
    for (let key in this.mainReducer) newState[key] = this.mainReducer[key](newState[key], action)

    // All key paths changed.
    let changedKeyPaths = {}

    // If action object specifies what key paths may have changed, check only those key paths.
    if (`KEYPATHS_TO_CHANGE` in action) {
      // KEYPATHS_TO_CHANGE should be an array or a string. Convert to array if just a string.
      const keyPathsToChange = typeof action['KEYPATHS_TO_CHANGE'] === 'string' ? [action['KEYPATHS_TO_CHANGE']] : action['KEYPATHS_TO_CHANGE']
      keyPathsToChange.forEach(keyPath => {
        const changeObject = this.keyPathsChanged(this.getNestedValue(this.state, keyPath), this.getNestedValue(newState, keyPath))
        if (changeObject) changedKeyPaths[keyPath] = changeObject
      })

      // Record key changes at every level of nesting above the specified key paths that were changed.
      for (let keyPath in changedKeyPaths) {
        let nextDotIndex = keyPath.indexOf('.')
        let nextLevel = keyPath.slice(0, nextDotIndex)
        let remainingLevels = keyPath.slice(nextDotIndex + 1)
        while (nextDotIndex > -1) {
          let oldValue = this.deepClone(this.getNestedValue(this.state, nextLevel), false)
          let newValue = this.deepClone(oldValue, false)
          if (!(nextLevel in changedKeyPaths)) changedKeyPaths[nextLevel] = { VALUE_BEFORE: oldValue, VALUE_AFTER: newValue }
          changedKeyPaths[nextLevel]['VALUE_AFTER'][remainingLevels] = this.deepClone(this.getNestedValue(newState, keyPath), false)
          nextDotIndex = keyPath.slice(nextDotIndex + 1).indexOf('.') + nextDotIndex + 1
          nextLevel = keyPath.slice(0, nextDotIndex)
          remainingLevels = keyPath.slice(nextDotIndex + 1)
        }
      }
    }
    // If no key paths specified, check entire state object.
    else changedKeyPaths = this.keyPathsChanged(this.state, newState)

    // If there were attempts to change locked keys, console log an array of the would-be affected locked keys and return a deep clone of state.
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

    // Return current state if reducers did not change state.
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
    for (var keyPath in changedKeyPaths) {
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
