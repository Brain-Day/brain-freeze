# Brain Freeze
## Synopsis

An injectable service to provide a familiar and intuitive state container catered to Angular 2.

## Code Example

```js
import { StoreService } from 'brain-freeze';

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
  To simplify state management in Angular 2.

## Installation
```js
npm i brain-freeze -S;
```
## API Reference
```js
  addReducer(reducer: Function): void :Adds reducers to be run on state on invokation of DISPATCH.  
  
  getState(): Object Returns a deep clone of state.
 
  dispatch(action: Object): Object: Takes in action objects and checks for lock related commands before running state through reducers.
  
  subscribe(fn: Function): Function : Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.
```

  
## Tests

To Come ...
## Contributors
github.com/eviscerare,
github.com/soleiluwedu,
github.com/ryanbas21
## License
MIT
