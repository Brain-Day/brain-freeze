import { Component, OnInit } from '@angular/core';
import { Injectable } from '@angular/core';

@Injectable()
export class Store implements OnInit {

	state;
	listeners = [];
	stateHistory = []; //holds previous states in the form of a stack
	listenerHistory = [];

	reducer(state: Object, action: Object) {

	}

	constructor() { }

	ngOnInit(): void {
		this.state = this.reducer(null, {})
	}

	getState() {
		return this.state
	}
	/*
	  * Takes in an action, which is a string (name of action), that gets passed into the reducer
	 */
	dispatch(action: Object) {
		if (this.state) this.stateHistory.push(this.state);
		this.state = this.reducer(this.state, action.type);
		this.listeners.forEach(l => l()) //loop through the array of listeners
	}

	subscribe(fn) {
		this.listenerHistory.push(this.listeners);
		this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
		return () => this.listeners.filter(func => func !== fn)
	}

}
