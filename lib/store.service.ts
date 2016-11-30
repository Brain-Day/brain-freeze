import { Injectable } from '@angular/core';

// Purpose of Store is to have one state container for the whole app.
// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class StoreService {
    constructor() { }
    private state: Object;
    private listeners: Function[];
    /**
      private stateHistory: Object[]; //holds previous states
      private listenerHistory: Function[][];
    */


    // Pass reducers into the addReducer function. Each reducer must take in a state and an action object, and then return a new state.
    // Example format: function reducer(state, action) {
    //             let newState = state;
    //             ... logic ...
    //             return newState;
    //         }
    private reducers: Function[];
    addReducer(reducer: Function) {
        this.reducers = this.reducers.concat(reducer);
    }

    getState() { return this.state }

    dispatch(action: Object) {
        // this.stateHistory.push(this.state);
        let newState = this.reducers.reduce((state, reducer) => { return reducer(state, action) }, this.state);
        this.listeners.forEach(l => l()) //loop through the array of listeners
        return newState;
    }

    subscribe(fn) {
        // this.listenerHistory.push(this.listeners);
        this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
        return () => {
            // this.listenerHistory.push(this.listeners);
            this.listeners = this.listeners.filter(func => func !== fn);
        }
    }
}
