import { useRef, useState } from "react";
import debounce from "lodash/debounce";

export const useSearch = () => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [showPage, setShowPage] = useState(true);

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
    }, 750)
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

  return {
    search,
    searchResults,
    pageShown: [showPage, setShowPage],
    handleChange,
  };
};
