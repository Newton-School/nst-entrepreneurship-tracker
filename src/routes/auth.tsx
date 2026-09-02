import { createFileRoute } from "@tanstack/react-router";
import { SignInPage } from "./signin";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in · NST Entrepreneurship" }] }),
  component: SignInPage,
});
