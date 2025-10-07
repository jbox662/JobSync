export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          owner_email: string
          invite_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_email: string
          invite_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_email?: string
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          email: string
          role: 'owner' | 'member'
          device_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          email: string
          role: 'owner' | 'member'
          device_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          email?: string
          role?: 'owner' | 'member'
          device_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          workspace_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          company: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      parts: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          unit_price: number
          stock: number
          sku: string | null
          category: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          unit_price: number
          stock: number
          sku?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          unit_price?: number
          stock?: number
          sku?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      labor_items: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          hourly_rate: number
          category: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          description?: string | null
          hourly_rate: number
          category?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          description?: string | null
          hourly_rate?: number
          category?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      jobs: {
        Row: {
          id: string
          workspace_id: string
          customer_id: string
          title: string
          description: string | null
          status: 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes: string | null
          start_date: string | null
          due_date: string | null
          completed_at: string | null
          estimated_hours: number | null
          actual_hours: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          customer_id: string
          title: string
          description?: string | null
          status: 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes?: string | null
          start_date?: string | null
          due_date?: string | null
          completed_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          customer_id?: string
          title?: string
          description?: string | null
          status?: 'active' | 'on-hold' | 'completed' | 'cancelled'
          notes?: string | null
          start_date?: string | null
          due_date?: string | null
          completed_at?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      quotes: {
        Row: {
          id: string
          workspace_id: string
          job_id: string
          customer_id: string
          quote_number: string
          title: string
          description: string | null
          status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
          items: Json
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          notes: string | null
          valid_until: string | null
          sent_at: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          // Enhanced quote fields for Smart AI import
          scope_of_work: string | null
          specifications: string | null
          payment_terms: string | null
          delivery_terms: string | null
          warranty: string | null
          additional_notes: string | null
          company_info: Json | null
        }
        Insert: {
          id?: string
          workspace_id: string
          job_id: string
          customer_id: string
          quote_number: string
          title: string
          description?: string | null
          status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
          items: Json
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          notes?: string | null
          valid_until?: string | null
          sent_at?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          // Enhanced quote fields for Smart AI import
          scope_of_work?: string | null
          specifications?: string | null
          payment_terms?: string | null
          delivery_terms?: string | null
          warranty?: string | null
          additional_notes?: string | null
          company_info?: Json | null
        }
        Update: {
          id?: string
          workspace_id?: string
          job_id?: string
          customer_id?: string
          quote_number?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
          items?: Json
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          notes?: string | null
          valid_until?: string | null
          sent_at?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          // Enhanced quote fields for Smart AI import
          scope_of_work?: string | null
          specifications?: string | null
          payment_terms?: string | null
          delivery_terms?: string | null
          warranty?: string | null
          additional_notes?: string | null
          company_info?: Json | null
        }
      }
      invoices: {
        Row: {
          id: string
          workspace_id: string
          job_id: string
          customer_id: string
          quote_id: string | null
          invoice_number: string
          title: string
          description: string | null
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          items: Json
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          notes: string | null
          due_date: string
          payment_terms: string | null
          sent_at: string | null
          paid_at: string | null
          paid_amount: number | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          workspace_id: string
          job_id: string
          customer_id: string
          quote_id?: string | null
          invoice_number: string
          title: string
          description?: string | null
          status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          items: Json
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          notes?: string | null
          due_date: string
          payment_terms?: string | null
          sent_at?: string | null
          paid_at?: string | null
          paid_amount?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          workspace_id?: string
          job_id?: string
          customer_id?: string
          quote_id?: string | null
          invoice_number?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
          items?: Json
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          notes?: string | null
          due_date?: string
          payment_terms?: string | null
          sent_at?: string | null
          paid_at?: string | null
          paid_amount?: number | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      sync_events: {
        Row: {
          id: string
          workspace_id: string
          device_id: string
          entity: string
          operation: 'create' | 'update' | 'delete'
          entity_id: string
          row_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          device_id: string
          entity: string
          operation: 'create' | 'update' | 'delete'
          entity_id: string
          row_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          device_id?: string
          entity?: string
          operation?: 'create' | 'update' | 'delete'
          entity_id?: string
          row_data?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}