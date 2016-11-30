import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object; // Can be mutated because this.history has deep copies, including current state.
    private stateLocked: Boolean = false; // When set to true (triggered by action.lock === true), state cannot be mutated until it is unlocked (triggered by action.unlock === true)
    private listeners: Function[] = []; // Can be mutated because this.history has deep copies, including current listeners array.
    private reducers: Function[] = []; // Array of functions that mutate state.
    private history: Object[] = []; // Should always contain deep copies of states and listeners arrays, including current status of each.

    deepClone(obj: Object): Object {
        if (typeof obj !== 'object') return obj
        const newObj = Array.isArray(obj) ? [] : {}
        for (let n in obj) newObj[n] = typeof obj[n] === 'object' ? this.deepClone(obj[n]) : obj[n]
        return newObj
    }

    deepCompare(obj1: Object, obj2: Object): Boolean {
        if (typeof obj1 !== typeof obj2) return false
        if ((typeof obj1 !== 'object') || (typeof obj2 !== 'object')) return obj1 === obj2
        if (Array.isArray(obj1) && ((!Array.isArray(obj2)) || (obj1.length !== obj2.length))) return false
        if (Array.isArray(obj2) && ((!Array.isArray(obj1)) || (obj1.length !== obj2.length))) return false
        for (let n in obj1) if (!this.deepCompare(obj1[n], obj2[n])) return false
        return true
    }

    saveHistory(type: string): void {
        this.history.push({
            change: type,
            state: this.deepClone(this.state),
            listeners: this.deepClone(this.listeners)
        })
    }

    addReducer(reducer: Function): void {
        this.reducers = this.reducers.concat(reducer);
        if (this.reducers.length === 1) {
            this.state = this.reducers[0](null, {})
            this.saveHistory('State')
            console.log("StoreService.DISPATCH: State History initialized to", this.history.filter(h => h['change'] === 'State'))
        }
    }

    getState(): Object { return this.state }

    dispatch(action: Object): Object {
        // Checking if state is locked
        if (this.stateLocked) {
            console.log("Cannot mutate state: State is locked.")
            return this.state
        }
        // Checking for lock command
        if (action['lock']) {
            this.stateLocked = true
            return this.state
        }

        // State not locked or was just unlocked. Continue.
        if (action['unlock']) this.stateLocked = false
        const newState = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.deepClone(this.state))

        // Return current state if reducers did not change state.
        if (this.deepCompare(this.state, newState)) {
            console.log("State unchanged by reducers: History not updated.")
            return this.state
        }

        // Mutate state, update history, and return new state if reducers changed state.
        this.state = newState
        this.saveHistory('State')

        // Execute all subscribed listeners and return mutated state.
        this.listeners.forEach(l => l()) //loop through the array of listeners
        console.log("StoreService.DISPATCH: State History is", this.history.filter(h => h['change'] === 'State'))
        return this.state
    }

    subscribe(fn: Function): Function {
        this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
        this.saveHistory('Listener')
        return () => {
            this.listeners = this.listeners.filter(func => func !== fn)
            this.saveHistory('Listener')
        }
    }
}
