import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object; // Can be mutated because this.history has deep copies, including current state
    private stateEnded: Boolean = false; // Is set to true when the app has ended functionality
    private listeners: Function[] = []; // Can be mutated because this.history has deep copies, including current listeners array
    private reducers: Function[] = []; // Array of functions that mutate state
    private history: Object[] = []; // Should always contain deep copies of states and listeners arrays, including current of each

    deepClone(obj: Object) {
        const newObj = Array.isArray(obj) ? [] : {}
        for (let n in obj) newObj[n] = typeof obj[n] === 'object' ? this.deepClone(obj[n]) : obj[n]
        return newObj
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
            console.log("StoreService.DISPATCH: State History is", this.history.filter(h => h['change'] === 'State'))
        }
    }

    getState(): Object { return this.state }

    dispatch(action: Object): Object {
        if (this.stateEnded) return "State can no longer be mutated"
        this.state = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.deepClone(this.state));
        this.saveHistory('State')
        this.listeners.forEach(l => l()) //loop through the array of listeners
        console.log("StoreService.DISPATCH: State History is", this.history.filter(h => h['change'] === 'State'))
        return this.state;
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
