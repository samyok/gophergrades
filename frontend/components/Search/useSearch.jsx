import { useCallback, useEffect, useRef, useState } from "react";
import debounce from "lodash/debounce";
import { useRouter } from "next/router";

export const useSearch = () => {
  const router = useRouter();
  const query = router.query?.q ?? "";
  const [search, setSearch] = useState(query ?? "");
  const [searchResults, setSearchResults] = useState(null);
  const [showPage, setShowPage] = useState(!query);

  const debouncedShowPage = useRef(
    debounce(() => {
      setShowPage(true);
    }, 750)
  ).current;

  const debouncedSearch = useRef(
    debounce((text) => {
      fetch(`/api/search?q=${text}`)
        .then((r) => r.json())
        .then((data) => setSearchResults(data));
    }, 500)
  ).current;

  const handleChange = (value) => {
    setSearch(value);
    setShowPage(false);
    if (value === "") {
      debouncedShowPage();
      debouncedSearch.cancel();
    } else if (value.trim() === "") {
      setSearchResults(null);
      debouncedShowPage.cancel();
      debouncedSearch.cancel();
    } else {
      setSearchResults(null);
      debouncedShowPage.cancel();
      debouncedSearch(value);
    }
  };

  useEffect(() => {
    if (query) {
      setSearch(query);
      setShowPage(false);
      debouncedSearch(query);
    }
  }, [query]);

  return {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  };
};
