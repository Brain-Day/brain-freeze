import { Component, OnInit } from '@angular/core';
import { Injectable } from '@angular/core';

// Only GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component

@Injectable()
export class Store implements OnInit {

	private state;
	private listeners = [];
	private stateHistory = []; //holds previous states in the form of a stack
	private listenerHistory = [];

	private reducer(state: Object, action: Object) {
		let newState;
		// Add functionality for initiation and updating of state here.
		// After initialization, do NOT modify this.state. Modify newState and return that instead.
		// Previous version of this.state will be saved in this.stateHistory by the dispatch method.

		return newState;
	}

	private constructor() { }

	private ngOnInit(): void { this.state = this.reducer(null, {}) }

	getState() { return this.state }

	dispatch(action: Object) {
		this.stateHistory.push(this.state);
		this.state = this.reducer(this.state, action.type);
		this.listeners.forEach(l => l()) //loop through the array of listeners
	}

	subscribe(fn) {
		this.listenerHistory.push(this.listeners);
		this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
		return () => {
			this.listenerHistory.push(this.listeners);
			this.listeners = this.listeners.filter(func => func !== fn);
		}
	}
}
