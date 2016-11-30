import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only ADDREDUCER, GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object; // Can be mutated because this.history has deep copy
    private stateEnded: Boolean = false; // Is set to true when the app has ended functionality
    private listeners: Function[] = []; // Can be mutated because this.history has deep copy
    private reducers: Function[] = []; // Array of functions that mutate state
    private history: Object[] = []; // Should always contain deep copy of most recent state and listeners array

    deepClone(obj: Object) {
        const newObj = Array.isArray(obj) ? [] : {}
        for (let n in obj) newObj[n] = typeof obj[n] === 'object' ? this.deepClone(obj[n]) : obj[n]
        return newObj
    }

    cloneListeners(array: Function[]) {
        const newArr = []
        for (let n in array) newArr[n] = array[n]
        return newArr
    }

    saveHistory(type: string): void { this.history.push({ change: type, state: this.deepClone(this.state), listeners: this.cloneListeners(this.listeners) }) }

    addReducer(reducer: Function) {
        this.reducers = this.reducers.concat(reducer);
        if (this.reducers.length === 1) {
            this.state = this.reducers[0](null, {})
            this.saveHistory('State')
        }
    }

    getState() { return this.state }

    dispatch(action: Object) {
        if (this.stateEnded) return "State can no longer be mutated"
        this.state = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.deepClone(this.state));
        this.saveHistory('State')
        this.listeners.forEach(l => l()) //loop through the array of listeners
        console.log("StoreService.DISPATCH: State History is", this.history.filter(h => h['change'] === 'State'))
        console.log("StoreService.DISPATCH: New State is", this.state)
        return this.state;
    }

    subscribe(fn) {
        this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
        this.saveHistory('Listeners')
        return () => {
            this.listeners = this.listeners.filter(func => func !== fn)
            this.saveHistory('Listeners')
        }
    }
}
