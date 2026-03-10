import PocketBase from "pocketbase";
import { PB_URL } from "./pocketbase.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: !import.meta.env.DEV,
};

export function createServerPb(cookieHeader = "") {
  const pb = new PocketBase(PB_URL);
  pb.autoCancellation(false);

  if (cookieHeader) {
    pb.authStore.loadFromCookie(cookieHeader);
  }

  return pb;
}

export function getErrorMessage(error, fallback) {
  if (error?.response?.data) {
    const firstFieldError = Object.values(error.response.data)[0];
    if (firstFieldError?.message) return firstFieldError.message;
  }

  if (error?.response?.message) return error.response.message;
  if (error?.message) return error.message;
  return fallback;
}

export function isSuperuserOnlyError(error) {
  const status = error?.status || error?.response?.status;
  const message = error?.response?.message || error?.message || "";
  return status === 403 && /superuser/i.test(message);
}

export function buildAuthResponse(pb, location) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Set-Cookie": pb.authStore.exportToCookie(cookieOptions),
    },
  });
}

export function buildLogoutResponse(location = "/login") {
  const securePart = cookieOptions.secure ? "; Secure" : "";

  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      "Set-Cookie": `pb_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`,
    },
  });
}

export async function getSessionUser(Astro) {
  const pb = createServerPb(Astro.request.headers.get("cookie") || "");

  if (!pb.authStore.isValid) {
    return { pb, user: null, setCookie: null };
  }

  try {
    await pb.collection("users").authRefresh();

    return {
      pb,
      user: pb.authStore.record,
      setCookie: pb.authStore.exportToCookie(cookieOptions),
    };
  } catch {
    return { pb, user: null, setCookie: null };
  }
}
