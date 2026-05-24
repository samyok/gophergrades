import { useEffect } from "react";
import { useToast } from "@chakra-ui/react";

export const useSearchFocus = (inputRef, autofocus = false) => {
  const toast = useToast();
  useEffect(() => {
    if (autofocus) {
      inputRef.current?.focus();
    }
  }, [autofocus, inputRef]);

  useEffect(() => {
    let toastShown = false;
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);
      if (isTyping) return;

      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }

      const isAlphanumeric = e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key);
      if (isAlphanumeric && !toastShown) {
        toastShown = true;

        toast({
          title: 'Press "/" to search',
          status: "info",
          duration: 5000,
          variant: "subtle",
          isClosable: true,
          position: "bottom-right",
          containerStyle: {
            color: "#3182ce",
          },
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputRef, toast]);
}
