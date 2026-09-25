"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_PERFILES,
  MAX_FOTO_BYTES,
  TIPOS_FOTO,
  rutasAvatar,
} from "@/lib/auth/foto-perfil";
import { filaDelUsuario } from "@/lib/auth/mi-perfil";
import { revalidatePath } from "next/cache";

async function sesion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("La sesión venció. Volvé a entrar.");
  return { supabase, user };
}

function refrescar() {
  revalidatePath("/", "layout");
}

export async function guardarMiPerfil(input: {
  nombre: string;
  apellido: string;
  mail: string;
  contacto: string;
}) {
  const { supabase, user } = await sesion();
  const fila = await filaDelUsuario(user.id, user.email!);
  if (!fila) {
    throw new Error(
      "Tu usuario no está vinculado en el sistema. Pedile a un administrador que revise el mail.",
    );
  }

  const nombre = input.nombre.trim();
  const apellido = input.apellido.trim();
  const mail = input.mail.trim().toLowerCase();
  const contacto = input.contacto.trim();
  if (!nombre) throw new Error("El nombre es obligatorio");
  if (!apellido) throw new Error("El apellido es obligatorio");
  if (!mail.includes("@") || !mail.includes(".")) {
    throw new Error("El mail no es válido");
  }

  const admin = createAdminClient();
  const { data: otro, error: errOtro } = await admin
    .from("usuarios")
    .select("id")
    .ilike("mail", mail)
    .neq("id", fila.id)
    .limit(1);
  if (errOtro) throw new Error(errOtro.message);
  if (otro?.length) throw new Error("Ese mail ya pertenece a otro usuario");

  const mailAuth = user.email!.trim().toLowerCase();
  if (mail !== mailAuth) {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      email: mail,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await admin
    .from("usuarios")
    .update({
      nombre,
      apellido,
      mail,
      contacto: contacto || null,
    })
    .eq("id", fila.id);
  if (error) {
    if (mail !== mailAuth) {
      await admin.auth.admin.updateUserById(user.id, {
        email: mailAuth,
        email_confirm: true,
      });
    }
    throw new Error(error.message);
  }

  if (mail !== mailAuth) {
    await supabase.auth.refreshSession();
  }
  refrescar();
}

export async function cambiarMiClave(input: {
  actual: string;
  nueva: string;
  repetir: string;
}) {
  const actual = input.actual;
  const nueva = input.nueva;
  if (!actual) throw new Error("Ingresá la contraseña actual");
  if (nueva.length < 6) {
    throw new Error("La contraseña nueva tiene que tener al menos 6 caracteres");
  }
  if (nueva !== input.repetir) {
    throw new Error("La contraseña nueva y la repetición no coinciden");
  }

  const { supabase, user } = await sesion();
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: actual,
  });
  if (loginError) throw new Error("La contraseña actual no es correcta");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: nueva,
  });
  if (error) throw new Error(error.message);

  const { error: reingreso } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: nueva,
  });
  if (reingreso) {
    return "La contraseña se cambió. Si te pide entrar de nuevo, usá la nueva.";
  }
  return null;
}

async function metadatosActuales(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(error?.message ?? "No se encontró el usuario");
  }
  return { ...(data.user.user_metadata ?? {}) } as Record<string, unknown>;
}

function mensajeFoto(message: string) {
  const m = message.toLowerCase();
  if (m.includes("bucket") || m.includes("not found")) {
    return "No se pudo guardar la imagen. Pedile a administración que habilite las fotos de perfil.";
  }
  return message;
}

export async function guardarMiFoto(formData: FormData) {
  const { user } = await sesion();
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Elegí una imagen");
  }
  const ext = TIPOS_FOTO[file.type];
  if (!ext) throw new Error("La imagen tiene que ser JPG, PNG o WEBP");
  if (file.size > MAX_FOTO_BYTES) throw new Error("La imagen supera 2 MB");

  const ruta = `${user.id}/avatar.${ext}`;
  const admin = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage.from(BUCKET_PERFILES).upload(ruta, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(mensajeFoto(error.message));

  const otras = rutasAvatar(user.id).filter((item) => item !== ruta);
  await admin.storage.from(BUCKET_PERFILES).remove(otras);

  const meta = await metadatosActuales(admin, user.id);
  meta.avatar_path = ruta;
  meta.avatar_v = String(Date.now());
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: meta,
  });
  if (metaError) throw new Error(metaError.message);
  refrescar();
}

export async function quitarMiFoto() {
  const { user } = await sesion();
  const admin = createAdminClient();
  await admin.storage.from(BUCKET_PERFILES).remove(rutasAvatar(user.id));
  const meta = await metadatosActuales(admin, user.id);
  delete meta.avatar_path;
  delete meta.avatar_v;
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: meta,
  });
  if (error) throw new Error(error.message);
  refrescar();
}
