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
    getNestedValue(keyPath: String, obj: Object): any { return eval(`obj${"['" + keyPath.split(".").join("']['") + "']"}`) }

    // Returns array of locked keys that mutation attempts were made against.
    lockedKeysChanged(obj: Object): String[] { return this.lockedKeys.filter(key => !this.deepCompare(this.getNestedValue(key, obj), this.getNestedValue(key, this.state))) }

    // Saves a history of state in the form of an array of deep cloned, deep frozen copies.
    saveHistory(type: string): void {
        this.history.push({
            change: type, // String describing if state or listener was changed to prompt a new save in history.
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
            this.saveHistory('State')
            console.log("%cState History initialized to", this.styles['stateHistory'], this.history.filter(h => h['change'] === 'State'))
        }
    }

    // Returns a deep clone of state.
    getState(): Object { return this.deepClone(this.state, false) }

    // Takes in action objects and checks for lock related commands before running state through reducers.
    dispatch(action: Object): Object {
        // Locking specific keys.
        if (action['lockKeys']) this.lockedKeys = this.lockedKeys.concat(action['lockKeys'].filter(e => this.lockedKeys.indexOf(e) === -1))

        // Unlocking specific keys.
        if (action['unlockKeys']) this.lockedKeys = this.lockedKeys.filter(e => action['unlockKeys'].indexOf(e) === -1)

        // Checking for lockState command.
        if (action['lockState']) this.stateLocked = true

        // Checking for unlockState command.
        if (action['unlockState']) this.stateLocked = false

        // Checking if entire state is locked.
        if (this.stateLocked) {
            console.log("%cCannot mutate state: State is locked.", this.styles['cannotMutateState'])
            return this.deepClone(this.state, false)
        }

        // Proceeding with reducers.
        const newState = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.deepClone(this.state, false))

        // Return current state if reducers did not change state.
        if (this.deepCompare(this.state, newState)) {
            console.log("%cState unchanged by reducers: History not updated.", this.styles['stateUnchangedByReducers'])
            return this.deepClone(this.state, false)
        }

        // If there were attempts to change locked keys, console log an array of the would-be affected locked keys and return a deep clone of state.
        const changedLockedKeys = this.lockedKeysChanged(newState)
        if (changedLockedKeys.length) {
            console.log("%cCannot mutate state: Detected attempts to change these locked keys:", ...changedLockedKeys, this.styles['cannotMutateState'])
            return this.deepClone(this.state, false)
        }

        // Mutate state, update history, and return new state if reducers changed state.
        this.state = newState
        this.saveHistory('State')

        // Execute all subscribed listeners and return mutated state.
        this.listeners.forEach(l => l()) //loop through the array of listeners.
        console.log("%cState History is", this.styles['stateHistory'], this.history.filter(h => h['change'] === 'State'))
        return this.deepClone(this.state, false)
    }

    // Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.
    subscribe(fn: Function): Function {
        this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
        this.saveHistory('Listener')
        return () => {
            this.listeners = this.listeners.filter(func => func !== fn)
            this.saveHistory('Listener')
        }
    }
}
