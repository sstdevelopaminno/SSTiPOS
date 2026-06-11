import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getPrimarySupabaseAnonKey, getPrimarySupabaseUrl } from "@/lib/server/db/primary";

export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = getPrimarySupabaseUrl();
  const anonKey = getPrimarySupabaseAnonKey();

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set(name, "", options);
        }
      }
    }
  );
}

