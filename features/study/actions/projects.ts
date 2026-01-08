"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ProjectCategory, SourceType } from "@/shared/types";

const CreateProjectSchema = z.object({
  title: z.string().min(1, "제목을 입력하세요"),
  description: z.string().optional(),
  category: z.enum(["영어", "코딩", "자격증", "기타"]),
  source_type: z.enum(["prompt", "data_upload"]),
  source_data: z.record(z.unknown()).optional(),
});

export async function createProject(formData: FormData) {
  try {
    const rawData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      category: formData.get("category") as ProjectCategory,
      source_type: formData.get("source_type") as SourceType,
      source_data: JSON.parse((formData.get("source_data") as string) || "{}"),
    };

    const validatedData = CreateProjectSchema.parse(rawData);

    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: "로그인이 필요합니다" };
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        ...validatedData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Project creation error:", error);
      return { error: "프로젝트 생성에 실패했습니다" };
    }

    revalidatePath("/study");
    return { data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Create project error:", error);
    return { error: "프로젝트 생성 중 오류가 발생했습니다" };
  }
}

export async function getProjects() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get projects error:", error);
    return [];
  }

  return data || [];
}

export async function getProject(projectId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .is("deleted_at", null)
    .single();

  if (error) {
    console.error("Get project error:", error);
    return null;
  }

  return data;
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("projects")
    .update({ 
      deleted_at: now,
      is_active: false 
    })
    .eq("id", projectId);

  if (error) {
    console.error("Delete project error:", error);
    return { error: "프로젝트 삭제에 실패했습니다" };
  }

  revalidatePath("/study");
  return { success: true };
}

