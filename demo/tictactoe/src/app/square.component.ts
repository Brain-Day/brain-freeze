import { Component, OnInit, Input } from '@angular/core';
import { StoreService } from './store.service';

@Component({
  selector: 'square',
  template: `
    <p>{{value}}</p>
  `
})
export class SquareComponent implements OnInit {
  @Input() id: number;
  private value: string;
  constructor(private store: StoreService) { }
  ngOnInit(): void {
      this.value = this.store.getState()['board'][this.id]
      this.store.subscribe(() => { this.value = this.store.getState()['board'][this.id] })
  }
}

// this.value === '-'
//               ? `<p>'-'</p>`
//               : this.value === 'X'
//                   ? `<img src="http://www.drodd.com/images15/letter-x14.jpg" >`
//                   : `<img src="http://images.clipartpanda.com/zero-clipart-clipart-0123_Vector_Clipart.png">`,