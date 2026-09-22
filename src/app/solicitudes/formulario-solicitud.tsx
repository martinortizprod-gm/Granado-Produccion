"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ProductoOpcion,
  SolicitudVista,
  nroVisible,
  sugerirPresentacion,
} from "@/lib/solicitudes/logic";
import {
  actualizarSolicitud,
  crearSolicitud,
} from "@/app/solicitudes/actions";

const PLACEHOLDER_PENDIENTE = "Pendiente";

type Props = {
  productos: ProductoOpcion[];
  solicitud?: SolicitudVista | null;
};

export function FormularioSolicitud({ productos, solicitud }: Props) {
  const router = useRouter();
  const editando = Boolean(solicitud?.id);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categorias = useMemo(() => {
    const set = new Set(
      productos.map((p) => p.categoria || "Sin categoría"),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [productos]);

  const productoInicial = productos.find((p) => p.id === solicitud?.id_producto);
  const [categoria, setCategoria] = useState(
    productoInicial?.categoria || categorias[0] || "",
  );
  const [idProducto, setIdProducto] = useState<number | "">(
    solicitud?.id_producto ?? "",
  );
  const [idVersion, setIdVersion] = useState<number | "">(
    solicitud?.id_version ?? "",
  );
  const [fechaRegistro, setFechaRegistro] = useState(
    solicitud?.fecha_registro || new Date().toISOString().slice(0, 10),
  );
  const [fechaEstimada, setFechaEstimada] = useState(
    solicitud?.fecha_estimada || new Date().toISOString().slice(0, 10),
  );
  const [ordenCompra, setOrdenCompra] = useState(
    solicitud?.orden_compra || PLACEHOLDER_PENDIENTE,
  );
  const [lote, setLote] = useState(solicitud?.lote || PLACEHOLDER_PENDIENTE);
  const [ordenProduccion, setOrdenProduccion] = useState(
    solicitud?.orden_produccion || "",
  );
  const [pallets, setPallets] = useState(
    String(solicitud?.pallets_solicitados || ""),
  );
  const [upp, setUpp] = useState(
    String(solicitud?.unidades_por_pallets || ""),
  );

  const productosFiltrados = productos.filter(
    (p) => (p.categoria || "Sin categoría") === categoria,
  );
  const producto =
    typeof idProducto === "number"
      ? productos.find((p) => p.id === idProducto)
      : undefined;

  const pesoUnitario = producto?.capacidad_kg || 0;
  const uppNum = Number(upp) || 0;
  const palletsNum = Number(pallets) || 0;
  const unidades = palletsNum > 0 && uppNum > 0 ? palletsNum * uppNum : 0;
  const kgTotales = unidades * pesoUnitario;

  function alCambiarProducto(id: number | "") {
    setIdProducto(id);
    setIdVersion("");
    if (typeof id !== "number") return;
    const p = productos.find((x) => x.id === id);
    if (!p) return;
    const sug = sugerirPresentacion(p.envase, p.capacidad_kg);
    if (!editando || !Number(upp)) setUpp(String(sug.upp || ""));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (typeof idProducto !== "number" || typeof idVersion !== "number") {
      setError("Seleccioná producto y versión.");
      return;
    }
    if (!producto?.id_envase) {
      setError("El producto no tiene envase asignado en el catálogo.");
      return;
    }

    if (editando && solicitud?.tiene_produccion) {
      const cambiosSensibles =
        lote !== solicitud.lote ||
        ordenCompra !== solicitud.orden_compra ||
        idProducto !== solicitud.id_producto ||
        idVersion !== solicitud.id_version ||
        palletsNum < solicitud.pallets_cargados;
      if (
        cambiosSensibles &&
        !confirm(
          "Esta solicitud tiene producción registrada. Los cambios sensibles (lote, OC, producto, versión o cantidad menor a lo cargado) pueden desalinearse con lo producido. ¿Continuar?",
        )
      ) {
        return;
      }
    }

    const payload = {
      orden_compra: ordenCompra,
      lote,
      orden_produccion: ordenProduccion,
      id_producto: idProducto,
      id_version: idVersion,
      id_envase: producto.id_envase,
      pallets: palletsNum,
      unidades_por_pallets: uppNum,
      peso_unitario: pesoUnitario,
      unidades,
      fecha_registro: fechaRegistro,
      fecha_estimada: fechaEstimada,
    };

    startTransition(async () => {
      try {
        if (editando && solicitud?.id != null) {
          await actualizarSolicitud(
            solicitud.id,
            payload,
            solicitud.pallets_cargados,
            solicitud.fecha_fin,
          );
        } else {
          await crearSolicitud(payload);
        }
        router.push("/solicitudes");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al guardar");
      }
    });
  }

  const input = "g-input mt-1";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/solicitudes"
            className="text-xs font-medium text-[var(--color-primary-muted)] hover:underline"
          >
            ← Volver a solicitudes
          </Link>
          <h1 className="g-page-title mt-1">
            {editando ? "Editar solicitud" : "Nueva solicitud"}
          </h1>
        </div>
      </div>

      {error ? <p className="g-alert g-alert-danger">{error}</p> : null}

      <section className="g-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Datos generales</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="g-label">Fecha de registro</span>
            <input
              type="date"
              className={input}
              value={fechaRegistro}
              onChange={(e) => setFechaRegistro(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="g-label">Fecha estimada de finalización</span>
            <input
              type="date"
              className={input}
              value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="g-label">Orden de compra / SAP</span>
            <input
              className={input}
              value={ordenCompra}
              onChange={(e) => setOrdenCompra(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="g-label">Lote</span>
            <input
              className={input}
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              required
            />
          </label>
          <label className="sm:col-span-2">
            <span className="g-label">Orden de producción</span>
            <input
              className={input}
              value={ordenProduccion}
              onChange={(e) => setOrdenProduccion(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="g-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Producto</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="g-label">Categoría</span>
            <select
              className={input}
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setIdProducto("");
                setIdVersion("");
              }}
            >
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="g-label">Producto</span>
            <select
              className={input}
              value={idProducto}
              onChange={(e) =>
                alCambiarProducto(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              required
            >
              <option value="">Elegí un producto</option>
              {productosFiltrados.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo ? `${p.codigo} — ${p.nombre}` : p.nombre}
                </option>
              ))}
            </select>
          </label>
          <Valor label="Código" valor={producto?.codigo || "—"} />
          <Valor label="Receta PLC" valor={producto?.receta_plc || "—"} />
          <label className="sm:col-span-2">
            <span className="g-label">Versión</span>
            <select
              className={input}
              value={idVersion}
              onChange={(e) =>
                setIdVersion(e.target.value ? Number(e.target.value) : "")
              }
              required
            >
              <option value="">Elegí versión</option>
              {(producto?.versiones || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.numero}
                  {v.estado ? ` (${v.estado})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="g-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Envase y etiqueta</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Valor label="Envase" valor={producto?.envase || "—"} />
          <Valor
            label="Capacidad (kg / unidad)"
            valor={
              producto?.capacidad_kg
                ? nroVisible(producto.capacidad_kg, 2)
                : "—"
            }
          />
          <Valor
            label="Etiqueta"
            valor={producto?.nombre_etiqueta || "—"}
          />
        </div>
      </section>

      <section className="g-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Cantidades</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="g-label">Pallets</span>
            <input
              type="number"
              min={0}
              step="any"
              className={input}
              value={pallets}
              onChange={(e) => setPallets(e.target.value)}
              required
            />
          </label>
          <label>
            <span className="g-label">Unidades por pallet</span>
            <input
              type="number"
              min={0}
              step="any"
              className={input}
              value={upp}
              onChange={(e) => setUpp(e.target.value)}
              required
            />
          </label>
          <Valor
            label="Cantidad solicitada"
            valor={`${nroVisible(unidades)} ${producto ? (producto.envase.toLowerCase().includes("bolsa") ? "Bolsas" : producto.envase.toLowerCase().includes("big") ? "Big Bags" : "unidades") : "unidades"}`}
          />
          <Valor
            label="Peso unitario (kg)"
            valor={pesoUnitario ? nroVisible(pesoUnitario, 2) : "—"}
          />
        </div>
        <div
          className="mt-4 rounded-[var(--radius-md)] px-4 py-3 text-white"
          style={{ background: "var(--color-primary)" }}
        >
          <p className="text-xs opacity-90">Kg totales</p>
          <p className="text-2xl font-semibold tabular-nums">
            {nroVisible(kgTotales, 1)} kg
          </p>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Link href="/solicitudes" className="g-btn g-btn-secondary">
          Cancelar
        </Link>
        <button type="submit" disabled={pending} className="g-btn g-btn-primary">
          {pending ? "Guardando…" : "Guardar solicitud"}
        </button>
      </div>
    </form>
  );
}

function Valor({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="g-label">{label}</p>
      <p className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-sm font-medium">
        {valor}
      </p>
    </div>
  );
}
