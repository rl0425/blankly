"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const SignupSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  nickname: z.string().min(2, "닉네임은 최소 2자 이상이어야 합니다"),
});

const LoginSchema = z.object({
  email: z.string().email("유효한 이메일을 입력하세요"),
  password: z.string().min(1, "비밀번호를 입력하세요"),
});

export async function signup(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      nickname: formData.get("nickname") as string,
    };

    const validatedData = SignupSchema.parse(rawData);

    const supabase = await createClient();
    
    // 1. 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (authError) {
      console.error("Signup error:", authError);
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: "회원가입에 실패했습니다" };
    }

    // 2. 프로필 생성
    const { error: profileError } = await supabase.from("user_profiles").insert({
      user_id: authData.user.id,
      nickname: validatedData.nickname,
    });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return { error: "프로필 생성에 실패했습니다" };
    }

    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    console.error("Signup error:", error);
    return { error: "회원가입 중 오류가 발생했습니다" };
  }
}

export async function login(formData: FormData) {
  try {
    const rawData = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const validatedData = LoginSchema.parse(rawData);

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    redirect("/");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0].message };
    }
    return { error: "로그인 중 오류가 발생했습니다" };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getUserProfile() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return profile;
}

