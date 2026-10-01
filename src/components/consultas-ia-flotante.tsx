"use client";

import { claveGeminiLista } from "@/app/consultas-ia/actions";
import { ConsultasIaClient } from "@/app/consultas-ia/consultas-ia-client";
import { IconClose, IconSpark } from "@/components/ui/icons";
import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";

const CLAVE_TAMANO = "consultas-ia-panel";
const ANCHO_MIN = 360;
const ALTO_MIN = 320;

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function ConsultasIaFlotante({ puedeLeer }: { puedeLeer: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [tieneClave, setTieneClave] = useState(true);
  const [tamano, setTamano] = useState({ ancho: 440, alto: 640 });

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_TAMANO);
    if (!guardado) return;
    try {
      const parsed = JSON.parse(guardado) as { ancho?: number; alto?: number };
      if (!parsed.ancho || !parsed.alto) return;
      setTamano({
        ancho: limitar(parsed.ancho, ANCHO_MIN, window.innerWidth - 32),
        alto: limitar(parsed.alto, ALTO_MIN, window.innerHeight - 112),
      });
    } catch {
      /* el tamaño guardado no se usa */
    }
  }, []);

  function empezar(event: ReactPointerEvent, eje: "ancho" | "alto" | "ambos") {
    event.preventDefault();
    const inicioX = event.clientX;
    const inicioY = event.clientY;
    const ancho0 = tamano.ancho;
    const alto0 = tamano.alto;
    function mover(ev: PointerEvent) {
      setTamano({
        ancho:
          eje === "alto"
            ? ancho0
            : limitar(ancho0 + inicioX - ev.clientX, ANCHO_MIN, window.innerWidth - 32),
        alto:
          eje === "ancho"
            ? alto0
            : limitar(alto0 + inicioY - ev.clientY, ALTO_MIN, window.innerHeight - 112),
      });
    }
    function soltar() {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      setTamano((actual) => {
        localStorage.setItem(CLAVE_TAMANO, JSON.stringify(actual));
        return actual;
      });
    }
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
  }

  useEffect(() => {
    if (!abierto || !puedeLeer) return;
    let vigente = true;
    claveGeminiLista()
      .then((lista) => {
        if (vigente) setTieneClave(lista);
      })
      .catch(() => {
        if (vigente) setTieneClave(false);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, puedeLeer]);

  useEffect(() => {
    if (!abierto) return;
    function cerrar(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [abierto]);

  return (
    <>
      {abierto ? (
        <section
          id="panel-consultas-ia"
          className="g-card fixed right-4 bottom-20 z-30 flex flex-col overflow-hidden"
          style={{
            boxShadow: "var(--shadow-md)",
            width: tamano.ancho,
            height: tamano.alto,
            maxWidth: "calc(100vw - 2rem)",
            maxHeight: "calc(100dvh - 7rem)",
          }}
        >
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Alargar el panel"
            title="Arrastrá para alargar"
            className="absolute top-0 right-3 left-3 z-20 h-2 cursor-ns-resize"
            onPointerDown={(event) => empezar(event, "alto")}
          />
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Ensanchar el panel"
            title="Arrastrá para ensanchar"
            className="absolute top-3 bottom-3 left-0 z-20 w-2 cursor-ew-resize"
            onPointerDown={(event) => empezar(event, "ancho")}
          />
          <div
            role="separator"
            aria-label="Cambiar el tamaño del panel"
            title="Arrastrá para cambiar el tamaño"
            className="absolute top-0 left-0 z-30 h-4 w-4 cursor-nwse-resize"
            onPointerDown={(event) => empezar(event, "ambos")}
          >
            <span
              className="pointer-events-none absolute top-1.5 left-1.5 h-2.5 w-2.5 border-t-2 border-l-2"
              style={{ borderColor: "var(--color-border-strong)" }}
            />
          </div>
          <header
            className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">Consultas IA</p>
              <p className="text-[12px] text-[var(--color-text-muted)]">
                Stock, movimientos, producción, horas y solicitudes.
              </p>
            </div>
            <button
              type="button"
              className="g-btn g-btn-icon shrink-0"
              aria-label="Cerrar consultas"
              onClick={() => setAbierto(false)}
            >
              <IconClose className="h-[18px] w-[18px]" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {puedeLeer ? (
              <ConsultasIaClient tieneClave={tieneClave} enPanel />
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                No tenés permiso de lectura en este módulo.
              </p>
            )}
          </div>
        </section>
      ) : null}
      <button
        type="button"
        className="fixed right-4 bottom-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ background: "var(--color-primary)", boxShadow: "var(--shadow-md)" }}
        aria-expanded={abierto}
        aria-controls="panel-consultas-ia"
        title={abierto ? "Cerrar consultas" : "Consultas IA"}
        onClick={() => setAbierto((valor) => !valor)}
      >
        {abierto ? (
          <IconClose className="h-5 w-5" />
        ) : (
          <IconSpark className="h-5 w-5" />
        )}
      </button>
    </>
  );
}
