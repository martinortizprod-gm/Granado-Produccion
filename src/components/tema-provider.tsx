"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Tema = "claro" | "oscuro";

type TemaContextValue = {
  tema: Tema;
  setTema: (t: Tema) => void;
  toggleTema: () => void;
};

const TemaContext = createContext<TemaContextValue | null>(null);

const STORAGE_KEY = "granado-tema";

function aplicarTema(tema: Tema) {
  const root = document.documentElement;
  if (tema === "oscuro") {
    root.classList.add("oscuro");
  } else {
    root.classList.remove("oscuro");
  }
}

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTemaState] = useState<Tema>("claro");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const guardado = window.localStorage.getItem(STORAGE_KEY) as Tema | null;
    const inicial =
      guardado === "oscuro" || guardado === "claro" ? guardado : "claro";
    setTemaState(inicial);
    aplicarTema(inicial);
    setReady(true);
  }, []);

  const setTema = useCallback((t: Tema) => {
    setTemaState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
    aplicarTema(t);
  }, []);

  const toggleTema = useCallback(() => {
    setTema(tema === "claro" ? "oscuro" : "claro");
  }, [setTema, tema]);

  const value = useMemo(
    () => ({ tema, setTema, toggleTema }),
    [tema, setTema, toggleTema],
  );

  return (
    <TemaContext.Provider value={value}>
      <div className={ready ? undefined : "invisible"}>{children}</div>
    </TemaContext.Provider>
  );
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema debe usarse dentro de TemaProvider");
  return ctx;
}
