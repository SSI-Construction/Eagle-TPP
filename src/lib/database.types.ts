// Hand-written mirror of the Supabase schema (supabase/migrations/0001_init.sql).
// Regenerate with `supabase gen types typescript` once the project is linked
// if you want a fully generated version.

export type UserRole = "admin" | "pm" | "site_supervisor" | "trade";
export type BookingStatus = "tentative" | "confirmed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          role: UserRole;
          trade_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      trade_categories: {
        Row: { id: string; name: string; sort_order: number };
        Insert: Partial<Database["public"]["Tables"]["trade_categories"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["trade_categories"]["Row"]>;
      };
      trades: {
        Row: {
          id: string;
          company_name: string;
          phone: string | null;
          email: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["trades"]["Row"]> & {
          company_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["trades"]["Row"]>;
      };
      trade_category_links: {
        Row: { trade_id: string; category_id: string };
        Insert: Database["public"]["Tables"]["trade_category_links"]["Row"];
        Update: Partial<Database["public"]["Tables"]["trade_category_links"]["Row"]>;
      };
      crews: {
        Row: {
          id: string;
          trade_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["crews"]["Row"]> & {
          trade_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["crews"]["Row"]>;
      };
      projects: {
        Row: {
          id: string;
          name: string;
          project_number: string | null;
          address: string | null;
          map_link: string | null;
          pm_id: string | null;
          site_supervisor_id: string | null;
          start_date: string | null;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["projects"]["Row"]> & {
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Row"]>;
      };
      bookings: {
        Row: {
          id: string;
          project_id: string;
          trade_id: string;
          crew_id: string | null;
          crew_count: number;
          start_date: string;
          end_date: string;
          status: BookingStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          confirmed_by: string | null;
          confirmed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["bookings"]["Row"]> & {
          project_id: string;
          trade_id: string;
          start_date: string;
          end_date: string;
        };
        Update: Partial<Database["public"]["Tables"]["bookings"]["Row"]>;
      };
      trade_external_commitments: {
        Row: {
          id: string;
          trade_id: string;
          crew_count: number;
          start_date: string;
          end_date: string;
          note: string | null;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["trade_external_commitments"]["Row"]
        > & { trade_id: string; start_date: string; end_date: string };
        Update: Partial<
          Database["public"]["Tables"]["trade_external_commitments"]["Row"]
        >;
      };
    };
  };
}
