import type { Metadata } from "next";
import { QuestionnaireManager } from "@/components/admin/questionnaire-manager";
export const metadata: Metadata = { title: "Onboarding questionnaires | Admin" };
export default function QuestionnairesPage() { return <QuestionnaireManager />; }
