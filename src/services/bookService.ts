import type { BookSearchResult } from '../types';
import { searchBooks, validateBook as validateBookAPI } from './googleBooks';

export class BookService {
  private searchResults: BookSearchResult[] = [];

  getResults(): BookSearchResult[] {
    return this.searchResults;
  }

  async searchBooks(byTitle: string, author?: string): Promise<BookSearchResult[]> {
    const results = await searchBooks(byTitle, author);
    this.searchResults = results;
    return results;
  }

  async validateBook(title: string, author: string): Promise<boolean> {
    return validateBookAPI(title, author);
  }
}
