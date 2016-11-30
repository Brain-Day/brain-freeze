# Brain Day State Service
## Synopsis

At the top of the file there should be a short introduction and/ or overview that explains **what** the project is. This description should match descriptions added for package managers (Gemspec, package.json, etc.)

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

To Come...
## Tests

To Come ...
## Contributors
github.com/eviscerare
github.com/soleiluwedu
github.com/ryanbas21
## License
MIT
