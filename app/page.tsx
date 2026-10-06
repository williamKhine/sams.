"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Page() {
  const tasks = useQuery(api.tasks.get);
  console.log("tasks", tasks);
  return (
    <main className="">
      {tasks?.map(({ _id, text, isCompleted }) => (
        <div key={_id}>{text} - {isCompleted ? "✅" : "❌"}</div>
      ))}
    </main>
  );
}