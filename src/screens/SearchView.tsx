import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Tag, MapPin, Heart, Globe } from 'lucide-react';
import type { User } from '../types';
import { getAcceptedFriends, searchAllBooks, getAllBooks } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { haversineMiles, LANGUAGES } from '../types';

type SearchResult = import('../services/firestoreService').SearchResult;

export default function SearchView() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { info: toastInfo } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterZip, setFilterZip] = useState('');
  // Distance filter is off by default — no silent exclusion of books.
  const [maxDistance, setMaxDistance] = useState<number>(0);
  const [geoFailed, setGeoFailed] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [friendsFirst, setFriendsFirst] = useState(false);
  const [sortByName, setSortByName] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  const geocodeCache = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const geocodeZip = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
    const cached = geocodeCache.current.get(zip);
    if (cached) return cached;
    // Primary: zippopotam.us — purpose-built for zip -> coords, CORS-friendly.
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (res.ok) {
        const data = await res.json();
        const place = data.places?.[0];
        if (place?.latitude && place?.longitude) {
          const coords = { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
          geocodeCache.current.set(zip, coords);
          return coords;
        }
      }
    } catch (e) {
      console.warn('Zippopotam failed for', zip, e);
    }
    // Fallback: Nominatim (restricted to US postcodes for accuracy)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${zip}&countrycodes=us&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.current.set(zip, coords);
        return coords;
      }
    } catch (e) {
      console.warn('Geocode failed for', zip, e);
    }
    return null;
  };

  const currentUser = auth.user;

  // Search cache
  const searchCache = useRef<Record<string, SearchResult[]>>({});
  const lastNoResultsQuery = useRef<string>('');
  const noResultsCooldown = useRef<number>(0);

  // Get current user's zip code
  const [currentUserZip, setCurrentUserZip] = useState<string>('');
  useEffect(() => {
    if (!currentUser) { setCurrentUserZip(''); return; }
    import('../services/firestoreService')
      .then(mod => mod.getUserProfile(currentUser.uid))
      .then(profile => setCurrentUserZip(profile?.zipCode || ''))
      .catch(() => setCurrentUserZip(''));
  }, [currentUser?.uid]);
  const currentZip = currentUserZip;

  // Load friend IDs for proper "friends first" sorting
  useEffect(() => {
    if (!currentUser) { setFriendIds(new Set()); return; }
    getAcceptedFriends(currentUser.uid).then((friends) => {
      setFriendIds(new Set(friends.map((f) => f.id)));
    });
  }, [currentUser?.uid]);

  // Search or browse
  const doSearch = async (searchQuery: string) => {
    setLoading(true);
    try {
      let found: SearchResult[];
      const queryKey = searchQuery.trim().toLowerCase();
      if (searchQuery.trim()) {
        // Search mode: find books matching the query
        if (searchCache.current[queryKey]) {
          setResults(searchCache.current[queryKey]);
          setLoading(false);
          return;
        }
        found = await searchAllBooks(searchQuery.trim());
        searchCache.current[queryKey] = found;
      } else {
        // Browse mode: get ALL books
        found = await getAllBooks();
      }
      setResults(found);
      // Only show "no results" toast once every 5 seconds for different queries
      if (found.length === 0 && searchQuery.trim()) {
        const now = Date.now();
        if (now - noResultsCooldown.current > 5000 && lastNoResultsQuery.current !== queryKey) {
          toastInfo('No books found.');
          lastNoResultsQuery.current = queryKey;
          noResultsCooldown.current = now;
        }
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      const message = err?.message || err?.code || 'Search failed. Please try again.';
      toastInfo(typeof message === 'string' ? message : 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      doSearch(value);
    }, 300);
  };

  // Trigger browse (all books) when zip filter changes and no results exist yet
  const handleZipChange = (val: string) => {
    setFilterZip(val);
    // If user entered a zip but hasn't searched/browsed yet, auto-trigger browse
    if (val && !query && results.length === 0) {
      doSearch('');
    }
  };

  // Readers now live on the dedicated book page (/book/:ownerUid/:bookId).
  const openBookPage = (book: SearchResult) => {
    navigate(`/book/${book.addedBy}/${book.bookId}`);
  };

  // Filter and sort results (async - pre-geocodes all zip codes)
  useEffect(() => {
    const applyFilters = async () => {
      if (results.length === 0) {
        setFilteredResults([]);
        return;
      }

      // Collect all unique zip codes that need geocoding
      const zipsToGeocode = new Set<string>();
      results.forEach((book) => {
        if (book.addedByZipCode) zipsToGeocode.add(book.addedByZipCode);
      });
      if (currentZip) zipsToGeocode.add(currentZip);

      // Geocode all unique zips in parallel
      const geocodePromises = Array.from(zipsToGeocode).map(async (zip) => {
        return geocodeZip(zip).then((coords) => ({ zip, coords }));
      });
      await Promise.all(geocodePromises);

      // If we can't locate the user's own zip, the distance filter can't
      // run — say so instead of silently showing everything.
      setGeoFailed(!!(!filterZip && maxDistance > 0 && currentZip && !geocodeCache.current.get(currentZip)));

      // Now filter and sort synchronously using cached coords
      const result = results.filter((book) => {
        // Never show your own books — you can't borrow from yourself
        if (currentUser?.uid && book.addedBy === currentUser.uid) return false;
        // Zip code filter (exclusive with distance)
        if (filterZip && book.addedByZipCode !== filterZip) return false;
        // Distance filter
        if (!filterZip && maxDistance > 0 && currentZip) {
          const myC = geocodeCache.current.get(currentZip);
          const bookC = geocodeCache.current.get(book.addedByZipCode);
          if (myC && bookC) {
            const dist = haversineMiles(myC.lat, myC.lng, bookC.lat, bookC.lng);
            if (dist > maxDistance) return false;
          }
        }
        // Language filter
        if (languageFilter) {
          if (languageFilter === 'Other') {
            const knownLangs = ['English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi'];
            if (knownLangs.includes(book.language || '')) return false;
          } else {
            if (book.language !== languageFilter) return false;
          }
        }
        return true;
      }).sort((a, b) => {
        if (friendsFirst) {
          const aIsFriend = friendIds.has(a.addedBy);
          const bIsFriend = friendIds.has(b.addedBy);
          if (aIsFriend && !bIsFriend) return -1;
          if (!aIsFriend && bIsFriend) return 1;
        }
        if (sortByName) return (a.addedByUsername || a.addedByFullName).localeCompare(b.addedByUsername || b.addedByFullName);
        return 0;
      });
      setFilteredResults(result);
    };
    applyFilters();
  }, [results, currentZip, filterZip, maxDistance, languageFilter, friendsFirst, sortByName]);

  const isUsingZipFilter = !!filterZip;

  // When any result-shrinking filter is on, every matching book is already
  // shown (there's no pagination), so the "of N" total should reflect the
  // filtered set — otherwise it reads as if books are missing.
  const hasResultFilters =
    isUsingZipFilter ||
    (!filterZip && maxDistance > 0 && !!currentZip) ||
    !!languageFilter;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">Search Books</h1>
        <p className="text-sm text-gray-500 mt-0.5">Find books and discover readers in your area</p>
      </div>

      {/* Search form */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4 mb-4 shadow-sm">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                doSearch(query);
              }
            }}
            placeholder="Search for a book in your community..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white/80"
          />
        </div>
      </div>

      {/* Filters (always visible) */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Distance filter */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Within</span>
          <input
            type="number"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value) || 2000)}
            min="0"
            max="2000"
            disabled={isUsingZipFilter}
            className={`w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white/80 ${isUsingZipFilter ? 'opacity-40 cursor-not-allowed' : ''}`}
          />
          <span className="text-sm text-gray-500">mi</span>
          <input
            type="range"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            min="0"
            max="2000"
            step="10"
            disabled={isUsingZipFilter}
            className="w-24 accent-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-gray-400">({maxDistance === 0 ? 'All' : `${maxDistance} mi`})</span>
          {geoFailed && !isUsingZipFilter && (
            <span className="text-xs text-amber-600">Couldn't locate your zip — distance filter is off</span>
          )}
        </div>

        {/* Zip code filter (exclusive) */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Or by zip:</span>
          <input
            type="text"
            value={filterZip}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
              handleZipChange(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filterZip) {
                doSearch('');
              }
            }}
            placeholder="Zip code"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          {filterZip && <span className="text-xs text-amber-600">filters by zip only</span>}
        </div>

        {/* Friends first */}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={friendsFirst}
            onChange={(e) => setFriendsFirst(e.target.checked)}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <Heart className="w-3.5 h-3.5" />
          Friends first
        </label>

        {/* Sort by name */}
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={sortByName}
            onChange={(e) => setSortByName(e.target.checked)}
            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          Sort by owner name
        </label>

        {/* Language filter */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white/80 appearance-none cursor-pointer"
          >
            <option value="">All Languages</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 mt-2">{query ? 'Searching...' : 'Loading books...'}</p>
        </div>
      )}

      {/* Empty state (no query, no results) */}
      {!loading && !query && results.length === 0 && (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
          <SearchIcon className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">
            {query ? 'No matches' : 'Search for a book or browse all'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {query ? 'Try a different title' : 'Type a book title to search, or leave empty to browse all books in your area'}
          </p>
        </div>
      )}

      {/* Browse all books (no query, results exist) */}
      {!loading && !query && results.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {filteredResults.length} of {hasResultFilters ? filteredResults.length : results.length} books in your area
            {isUsingZipFilter ? ` (zip: ${filterZip})` : maxDistance > 0 ? ` (within ${maxDistance} mi)` : ''}
          </p>
          <div className="space-y-3">
            {filteredResults.map((book) => {
              let dist: number | null = null;
              if (currentZip) {
                const myC = geocodeCache.current.get(currentZip);
                const bC = geocodeCache.current.get(book.addedByZipCode);
                if (myC && bC) {
                  dist = haversineMiles(myC.lat, myC.lng, bC.lat, bC.lng);
                }
              }
              return (
                <button
                  key={`${book.addedBy}-${book.bookId}`}
                  onClick={() => openBookPage(book)}
                  className="w-full bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group text-left"
                >
                  <div className="flex">
                    <div className="w-16 h-24 bg-gradient-to-br from-amber-50 to-orange-50 flex-shrink-0 p-2 flex items-center justify-center">
                      {book.coverImageURL ? (
                        <img src={book.coverImageURL} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-amber-300" />
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      <h3 className="font-semibold text-gray-900 font-serif text-sm">{book.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
                      {book.language && <p className="text-xs text-gray-400 mt-0.5">{book.language}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-amber-600">@{book.addedByUsername || book.addedByFullName}</span>
                        {book.addedByCity && <span className="text-xs text-gray-400">{book.addedByCity}</span>}
                        {dist !== null && <span className="text-xs text-gray-400">· {dist} mi</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Search results */}
      {!loading && query && filteredResults.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{query}"
            {filteredResults.length !== results.length && (
              <span className="text-gray-400"> ({results.length} total, {filteredResults.length} in range)</span>
            )}
          </p>
          <div className="space-y-3">
            {filteredResults.map((book) => {
              let dist: number | null = null;
              if (currentZip) {
                const myC = geocodeCache.current.get(currentZip);
                const bC = geocodeCache.current.get(book.addedByZipCode);
                if (myC && bC) {
                  dist = haversineMiles(myC.lat, myC.lng, bC.lat, bC.lng);
                }
              }
              return (
                <button
                  key={`${book.addedBy}-${book.bookId}`}
                  onClick={() => openBookPage(book)}
                  className="w-full bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group text-left"
                >
                  <div className="flex">
                    <div className="w-16 h-24 bg-gradient-to-br from-amber-50 to-orange-50 flex-shrink-0 p-2 flex items-center justify-center">
                      {book.coverImageURL ? (
                        <img src={book.coverImageURL} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-amber-300" />
                      )}
                    </div>
                    <div className="flex-1 p-3">
                      <h3 className="font-semibold text-gray-900 font-serif text-sm">{book.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{book.author}</p>
                      {book.language && <p className="text-xs text-gray-400 mt-0.5">{book.language}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-amber-600">@{book.addedByUsername || book.addedByFullName}</span>
                        {book.addedByCity && <span className="text-xs text-gray-400">{book.addedByCity}</span>}
                        {dist !== null && <span className="text-xs text-gray-400">· {dist} mi</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Search no results */}
      {!loading && query && results.length === 0 && (
        <p className="text-gray-500 text-center py-4">No books match "{query}"</p>
      )}

      {/* No filtered results but unfiltered ones exist */}
      {!loading && results.length > 0 && filteredResults.length === 0 && (
        <p className="text-gray-500 text-center py-4">No books match your filters. Try widening the distance or removing filters.</p>
      )}
    </div>
  );
}
