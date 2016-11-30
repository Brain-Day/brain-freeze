import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { StoreService } from './store.service';

import { AppComponent } from './app.component';
import { BoardComponent } from './board.component';
import { SquareComponent } from './square.component';

@NgModule({
  declarations: [
    AppComponent,
    BoardComponent,
    SquareComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    StoreService
  ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
