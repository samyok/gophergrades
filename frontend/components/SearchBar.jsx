import React, { useState } from "react";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { Search2Icon } from "@chakra-ui/icons";

const SearchBar = ({ onChange }) => {
  const [search, setSearch] = useState("");

  const handleChange = (e) => {
    setSearch(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <InputGroup>
      <InputLeftElement pointerEvents={"none"}>
        <Search2Icon color={"black"} />
      </InputLeftElement>
      <Input
        type={"text"}
        value={search}
        onChange={handleChange}
        placeholder={"Search by Class Code, Instructor, or Department"}
        style={{
          boxShadow: "0px 0px 20px rgba(111, 19, 29, 0.2)",
          borderRadius: "9px",
          border: "none",
          background: "rgba(255,255,255,0.4)",
        }}
      />
    </InputGroup>
  );
};
export default SearchBar;
