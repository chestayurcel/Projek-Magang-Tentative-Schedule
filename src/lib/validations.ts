import { z } from "zod";

export const CreateInternalScheduleSchema = z.object({
  target_user_id: z.number().int().optional(),
  start_time: z.coerce.date({ message: "Waktu mulai wajib diisi" }),
  end_time: z.coerce.date({ message: "Waktu selesai wajib diisi" }),
  visibility: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateGuestScheduleSchema = z.object({
  name: z.string().min(2, "Nama terlalu pendek"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().optional(),
  purpose: z.string().min(5, "Tolong sertakan tujuan kunjungan yang jelas"),
  target_user_id: z.number().int().optional(),
  start_time: z.coerce.date({ message: "Waktu mulai wajib diisi" }),
  end_time: z.coerce.date({ message: "Waktu selesai wajib diisi" }),
  notes: z.string().optional(),
});

export const RegisterUserSchema = z.object({
  nipp: z.string().min(5, "NIPP minimal 5 karakter"),
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  unit_id: z.coerce.number().int({ message: "Pilih unit terlebih dahulu" }),
});
