import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseYamlBody } from "@/lib/brain";

type CourseData = {
  level?: string;
  modules?: { title: string; lessons: string[] }[];
};

export default async function TrainingPage() {
  const courses = await db.brainFile.findMany({ where: { type: "course" } });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-text-faint">
          Company · Training
        </div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Courses</h1>
        <p className="mt-1 text-[0.88rem] text-text-dim">
          Real per-person lesson progress is Phase 4 — this lists what exists today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {courses.map((c) => {
          const data = (parseYamlBody(c) ?? {}) as CourseData;
          const lessonCount = (data.modules ?? []).reduce((n, m) => n + m.lessons.length, 0);
          const isPlaceholder = c.title.toLowerCase().includes("welcome");
          return (
            <Link key={c.slug} href={`/docs/${c.slug}`}>
              <Card className="h-full p-4 transition-colors hover:border-accent">
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-[0.9rem] font-bold">{c.title}</h3>
                  {isPlaceholder && <Badge variant="sample">placeholder</Badge>}
                </div>
                <p className="mb-3 text-[0.8rem] text-text-dim">
                  {data.level ?? "—"} · {(data.modules ?? []).length} modules · {lessonCount} lessons
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full w-0 bg-accent" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {courses.length === 0 && (
        <p className="text-[0.83rem] text-text-faint">No courses yet.</p>
      )}
    </div>
  );
}
