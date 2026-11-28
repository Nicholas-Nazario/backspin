"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const storageKey = "backspin.collectionUsername";

const CollectionSourceContext = createContext<{
  username: string;
  setUsername: (username: string) => void;
} | null>(null);

export function CollectionSourceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [username, setSourceUsername] = useState("");

  useEffect(() => {
    setSourceUsername(sessionStorage.getItem(storageKey) ?? "");
  }, []);

  function setUsername(value: string) {
    setSourceUsername(value);
    if (value) sessionStorage.setItem(storageKey, value);
    else sessionStorage.removeItem(storageKey);
  }
  return (
    <CollectionSourceContext.Provider value={{ username, setUsername }}>
      {children}
    </CollectionSourceContext.Provider>
  );
}

export function useCollectionSource() {
  return useContext(CollectionSourceContext);
}
