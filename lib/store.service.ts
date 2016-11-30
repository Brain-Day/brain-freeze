import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object; // Can be mutated because this.stateHistory has deep copy
    private stateEnded: Boolean = false;
    private listeners: Function[] = [];
    private history: Object[] = []; // Should always contain deep copy of most recent state and listeners array

    // Pass reducers into the addReducer function. Each reducer must take in a state and an action object, and then return a new state.
    // Use deepClone (provided here) to copy state into newState
    // Example format: function reducer(state, action) {
    //             let newState = deepClone(state);
    //             ... logic ...
    //             return newState;
    //         }

    private reducers: Function[] = [];

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
