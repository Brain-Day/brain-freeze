# Brain Day State Service
## Synopsis

An injectable service to provide a familiar and intuitive state container catered to Angular2.

## Code Example

```js
import { StoreService } from 'bdss';

  export class RenderTextComponent implements OnInit {
    private value: string;
    constructor(private store: StoreService) { }
    ngOnInit(): void {
        this.value = this.store.getState()['board'][this.id]
        this.store.subscribe(() => {
            this.value = this.store.getState()['board'][this.id]
        })
    }
}
```
## Motivation
  To simplify state management in angular2.

## Installation
  ```
  npm install bdss --save;
  ```
## API Reference
  deepClone(obj: Object, freeze: Boolean): Object: method on the store service to create a deep clone of the state. Returns a deep clone and optionally deep frozen copy of an object.

  
 deepCompare(obj1: Object, obj2: Object): Boolean:  Compares two objects at every level and returns boolean indicating if they are the same.

 getNestedValue(keyPath: String, obj: Object): any : Takes dot notation key path and returns bracket format key path.
   
 lockedKeysChanged(obj: Object): String[] :  Returns array of locked keys that mutation attempts were made against.

  saveHistory(type: string): void : Saves a history of state in the form of an array of deep cloned, deep frozen copies.  

  addReducer(reducer: Function): void :Adds reducers to be run on state on invokation of DISPATCH.  
  getState: method to get current state of application
  
  getState(): Object { return this.deepClone(this.state, false) }:     // Returns a deep clone of state.
  
  dispatch(action: Object): Object: Takes in action objects and checks for lock related commands before running state through reducers.
  
  subscribe(fn: Function): Function : Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.



  
## Tests

To Come ...
## Contributors
github.com/eviscerare
github.com/soleiluwedu
github.com/ryanbas21
## License
MIT
