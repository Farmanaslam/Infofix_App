import { supabase } from "../lib/supabaseClient";

export async function exportCustomers() {
  if (!supabase) {
    console.error("Supabase client is not initialized");
    return;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("*");

  if (error) {
    console.error("Export failed:", error);
    return;
  }

  console.log(
    "COPY THIS JSON ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓"
  );
  console.log(JSON.stringify(data, null, 2));
}
