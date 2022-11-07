import React, { useState } from "react";
import { Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { Search2Icon } from "@chakra-ui/icons";

const SearchBar = ({
  onChange,
  placeholder = "Search by Class Code, Instructor, or Department",
}) => {
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
        placeholder={placeholder}
        background={"rgba(255,255,255,0.3)"}
        boxShadow={"0px 0px 20px rgba(111, 19, 29, 0.1)"}
        style={{
          borderRadius: "9px",
          border: "none",
        }}
        _hover={{
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0px 0px 20px rgba(111, 19, 29, 0.1)",
        }}
        _focus={{
          boxShadow: "0px 0px 20px rgba(111, 19, 29, 0.35)",
          background: "rgba(255,255,255,0.9)",
        }}
      />
    </InputGroup>
  );
};
export default SearchBar;
