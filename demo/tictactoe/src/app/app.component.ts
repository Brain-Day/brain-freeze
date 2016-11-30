import { Component, OnInit } from '@angular/core';
import { StoreService } from './store.service';

@Component({
    selector: 'app',
    template: `
    <board class="board"></board>
  `,
    styles: [`
    .board {
      margin: auto;
      display: block;
      left: 0;
      right: 0;
      width: 756px;
      height: 756px;
    }
  `]
})
export class AppComponent implements OnInit {
    constructor(private storeService: StoreService) { }
    ngOnInit(): void { }
}
