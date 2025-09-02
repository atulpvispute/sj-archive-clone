import { Component, signal } from '@angular/core';
import { Page } from './page/page';
import { Book } from './book/book';


@Component({
  selector: 'app-root',
  imports: [Book],//Page
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('assignment-1');
}
