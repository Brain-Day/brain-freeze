import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component.

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object // Can be mutated because this.history has deep copies, including current state.
    private stateLocked: Boolean = false // When set to true (triggered by action.lock === true), state cannot be mutated until it is unlocked (triggered by action.unlock === true).
    private lockedKeys: String[] = [] // Partial locking. Contains array of state properties (in dot notation, even for arrays) that should be locked.
    private listeners: Function[] = [] // Can be mutated because this.history has deep copies, including current listeners array.
    private reducers: Function[] = [] // Array of functions that mutate state.
    private history: Object[] = [] // Should always contain deep copies of states and listeners arrays, including current status of each.

    // Styles object used to style console logs in the browser.
    private styles: Object = {
        stateHistory: 'color: #7733CC',
        cannotMutateState: 'color: white; background: #CC0099; border: 1px solid #990000',
        stateUnchangedByReducers: 'color: white; background: #00CC99; border: 1px solid #990000'
    }

    // Returns a deep clone and optionally deep frozen copy of an object.
    deepClone(obj: Object, freeze: Boolean): Object {
        if (typeof obj !== 'object') return obj
        const newObj = Array.isArray(obj) ? [] : {}
        for (let n in obj) newObj[n] = typeof obj[n] === 'object' ? this.deepClone(obj[n], freeze) : obj[n]
        if (freeze) Object.freeze(newObj)
        return newObj
    }

    // Compares two objects at every level and returns boolean indicating if they are the same.
    deepCompare(obj1: Object, obj2: Object): Boolean {
        if (typeof obj1 !== typeof obj2) return false
        if ((typeof obj1 !== 'object') || (typeof obj2 !== 'object')) return obj1 === obj2
        if (Array.isArray(obj1) && ((!Array.isArray(obj2)) || (obj1.length !== obj2.length))) return false
        if (Array.isArray(obj2) && ((!Array.isArray(obj1)) || (obj1.length !== obj2.length))) return false
        for (let n in obj1) if (!this.deepCompare(obj1[n], obj2[n])) return false
        return true
    }

    // Takes dot notation key path and returns bracket format key path.
    getNestedValue(obj: Object, keyPath: String): any { return eval(`obj${"['" + keyPath.split(".").join("']['") + "']"}`) }

    getAllKeys(obj: Object, keyPath: String = '') {
        let keys = []
        if (typeof obj !== 'object') return keys
        for (let n in obj) keys = keys.concat(n).concat(typeof obj[n] === 'object' ? this.getAllKeys(obj[n], n) : [])
        return keys.map(e => keyPath === '' ? e : `${keyPath}.${e}`)
    }

    // Returns array of keys from obj1 that are not the same in obj2
    keysChanged(obj1: Object, obj2: Object): String[] { return this.getAllKeys(obj1).filter(key => !this.deepCompare(this.getNestedValue(obj1, key), this.getNestedValue(obj2, key))) }

    // Saves a history of state in the form of an array of deep cloned, deep frozen copies.
    saveHistory(type: string, changedKeys: String[]): void {
        this.history.push({
            change: type, // String describing if state or listener was changed to prompt a new save in history.
            changedKeys: changedKeys, // Keys changed from previous state.
            state: this.deepClone(this.state, true), // Deep cloned and deep frozen copes of all past and present state objects.
            listeners: this.deepClone(this.listeners, true) // Deep cloned and deep frozen copes of all past and present listener arrays to match with state history.
        })
    }

    // Adds reducers to be run on state on invokation of DISPATCH.
    addReducer(reducer: Function): void {
        this.reducers = this.reducers.concat(reducer)

        // Automatically calls first reducer with empty action object to initialize state.
        if (this.reducers.length === 1) {
            this.state = this.reducers[0](null, {})
            this.saveHistory('State', [])
            console.log("%cState History initialized to", this.styles['stateHistory'], this.history.filter(h => h['change'] === 'State'))
        }
    }

    // Returns a deep clone of state.
    getState(): Object { return this.deepClone(this.state, false) }

    // Takes in action objects and checks for lock related commands before running state through reducers.
    dispatch(action: Object): Object {
        console.groupCollapsed('Store.DISPATCH')
        console.log(`Action object passed in:`)
        console.dir(action)
        // Locking specific keys.
        if (action['lockKeys']) {
            const newKeys = action['lockKeys'].filter(e => this.lockedKeys.indexOf(e) === -1)
            const alreadyLocked = action['lockKeys'].filter(e => this.lockedKeys.indexOf(e) > -1)
            this.lockedKeys = this.lockedKeys.concat(newKeys)
            console.log(`Keys locked:`)
            console.dir(newKeys)
            if (alreadyLocked.length) {
                console.log(`Keys already locked:`)
                console.dir(alreadyLocked)
            }
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Unlocking specific keys.
        if (action['unlockKeys']) {
            const newKeys = action['unlockKeys'].filter(e => this.lockedKeys.indexOf(e) > -1)
            const alreadyUnlocked = action['unlockKeys'].filter(e => this.lockedKeys.indexOf(e) === -1)
            this.lockedKeys = this.lockedKeys.filter(e => newKeys.indexOf(e) === -1)
            console.log(`Keys unlocked:`)
            console.dir(newKeys)
            if (alreadyUnlocked.length) {
                console.log(`Keys already unlocked:`)
                console.dir(alreadyUnlocked)
            }
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Checking for lockState command.
        if (action['lockState']) {
            this.stateLocked = true
            console.log(`State locked.`)
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Checking for unlockState command.
        if (action['unlockState']) {
            this.stateLocked = false
            console.log(`State unlocked.`)
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Checking if entire state is locked.
        if (this.stateLocked) {
            console.log("%cState change operation rejected: State is locked.", this.styles['cannotMutateState'])
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Proceeding with reducers.
        const newState = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.deepClone(this.state, false))

        // Getting changed keys.
        const changedKeys = this.keysChanged(this.state, newState)
        
        // If there were attempts to change locked keys, console log an array of the would-be affected locked keys and return a deep clone of state.
        const changedLockedKeys = changedKeys.filter(e => this.lockedKeys.indexOf(e) > -1)
        if (changedLockedKeys.length) {
            console.log("%cState change operation rejected: Cannot change keys:", this.styles['cannotMutateState'], ...changedLockedKeys)
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Return current state if reducers did not change state.
        if (this.deepCompare(this.state, newState)) {
            console.log("%cState unchanged by reducers: History not updated.", this.styles['stateUnchangedByReducers'])
            console.groupEnd()
            return this.deepClone(this.state, false)
        }

        // Mutate state, update history, and return new state if reducers changed state.
        this.state = newState
        this.saveHistory('State', changedKeys)

        // Execute all subscribed listeners and return mutated state.
        console.log("%cState History is", this.styles['stateHistory'], this.history.filter(h => h['change'] === 'State'))
        console.groupEnd()
        this.listeners.forEach(l => l()) //loop through the array of listeners.
        return this.deepClone(this.state, false)
    }

    // Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.
    subscribe(fn: Function): Function {
        this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
        this.saveHistory('Listener', [])
        return () => {
            this.listeners = this.listeners.filter(func => func !== fn)
            this.saveHistory('Listener', [])
        }
    }
}
