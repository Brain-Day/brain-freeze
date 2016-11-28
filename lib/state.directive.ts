
class Store (reducer){

  constructor(private reducer: function){
    this.state = reducer(null,{})
    this.listeners = [];
    this.statehistory = []; //holds previous states in the form of a stack
    this.listenerHistory = [];
  }

  getState() {
    return this.state
  }
  /*
    * Takes in an action, which is a string (name of action), that gets passed into the reducer
   */
  dispatch(private action: Object){
    if (this.state) this.statehistory.push(this.state);
    this.state = reducer(state,action);
    this.listeners.forEach( item => item() ) //loop through the array of listeners
  }

  subscribe(fn){
    this.listenerHistory.push(this.listeners);
    this.listeners = this.listeners.concat(fn); // not altering the original listeners array.
    return () => this.listeners.filter( func => func !== fn)
  }


}
