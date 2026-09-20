import type { BookSearchResult } from '../types';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export async function searchBooks(
  title: string,
  author?: string
): Promise<BookSearchResult[]> {
  const params = new URLSearchParams();
  params.append('q', `intitle:${encodeURIComponent(title)}`);
  if (author) {
    params.append('q', `inauthor:${encodeURIComponent(author)}`);
  }
  params.append('maxResults', '20');

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params.toString()}`);
  const data = await response.json();

  if (!data.items) return [];

  return data.items.map((item: any) => {
    const volumeInfo = item.volumeInfo;
    const coverImage = volumeInfo.imageLinks?.thumbnail
      ? volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')
      : undefined;

    return {
      key: volumeInfo.infoLink || item.id,
      title: volumeInfo.title,
      author: volumeInfo.authors?.join(', ') || 'Unknown Author',
      coverImageURL: coverImage,
    };
  });
}

export async function validateBook(
  title: string,
  author: string
): Promise<boolean> {
  const results = await searchBooks(title, author);
  if (results.length === 0) return false;

  return results.some(
    (book) =>
      book.title.toLowerCase() === title.toLowerCase() &&
      book.author.toLowerCase().includes(author.toLowerCase())
  );
}

export async function fetchBookCover(isbn?: string): Promise<string | undefined> {
  if (!isbn) return undefined;
  const params = new URLSearchParams();
  params.append('q', `isbn:${isbn}`);
  params.append('maxResults', '1');

  const response = await fetch(`${GOOGLE_BOOKS_API}?${params.toString()}`);
  const data = await response.json();

  if (data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail) {
    return data.items[0].volumeInfo.imageLinks.thumbnail.replace('http:', 'https:');
  }
  return undefined;
}
