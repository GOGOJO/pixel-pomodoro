import { forwardRef, useState } from "react";
import { useTasks, type Task } from "../store/tasks";
import { useSettings } from "../store/settings";
import { audio } from "../lib/audio";
import { PixelIcon } from "./PixelIcon";

function Tomatoes({ done, estimate }: { done: number; estimate: number }) {
  const total = Math.max(done, estimate);
  if (total > 6) {
    return (
      <span className="flex items-center gap-1 text-[16px]" style={{ color: "var(--muted)" }}>
        <PixelIcon name="tomato" size={11} />
        {done}/{estimate}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-[2px]" aria-label={`${done} of ${estimate} pomodoros`}>
      {Array.from({ length: total }, (_, i) => (
        <PixelIcon
          key={i}
          name={i < done ? "tomato" : "tomatoEmpty"}
          size={11}
          className={i < done ? undefined : "opacity-50"}
        />
      ))}
    </span>
  );
}

function TaskRow({ task, current }: { task: Task; current: boolean }) {
  const { toggleDone, setCurrent, removeTask } = useTasks.getState();
  const sound = useSettings((s) => s.sound);
  return (
    <li
      className="group flex items-center gap-2 px-2 py-[5px] anim-fade"
      style={{
        background: current ? "var(--panel-3)" : "transparent",
        boxShadow: current ? "inset 3px 0 0 0 var(--focus)" : "none",
      }}
    >
      <button
        className="px-check border-0"
        aria-label={task.done ? "Mark as not done" : "Mark as done"}
        onClick={() => {
          if (!task.done && sound) audio.play("complete");
          toggleDone(task.id);
        }}
      >
        {task.done && <PixelIcon name="check" size={14} className="text-[var(--short)]" />}
      </button>
      <button
        className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-left"
        style={{
          color: task.done ? "var(--faint)" : "var(--text)",
          textDecoration: task.done ? "line-through" : "none",
        }}
        onClick={() => !task.done && setCurrent(current ? null : task.id)}
        title={task.done ? task.title : current ? "Current task (click to unset)" : "Work on this next"}
      >
        {task.title}
      </button>
      <Tomatoes done={task.pomodoros} estimate={task.estimate} />
      <button
        className="px-btn-ghost border-0 opacity-0 group-hover:opacity-70 hover:!opacity-100 focus-visible:opacity-100"
        aria-label={`Delete ${task.title}`}
        onClick={() => removeTask(task.id)}
      >
        <PixelIcon name="close" size={12} />
      </button>
    </li>
  );
}

export const TaskManager = forwardRef<HTMLInputElement>(function TaskManager(_props, inputRef) {
  const tasks = useTasks((s) => s.tasks);
  const currentId = useTasks((s) => s.currentTaskId);
  const sound = useSettings((s) => s.sound);
  const [title, setTitle] = useState("");
  const [estimate, setEstimate] = useState(1);
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const add = () => {
    if (useTasks.getState().addTask(title, estimate)) {
      if (sound) audio.play("add");
      setTitle("");
      setEstimate(1);
    }
  };

  return (
    <section className="flex min-h-0 flex-col gap-3" aria-label="Tasks">
      <header className="flex items-center justify-between">
        <h2 className="font-pixel m-0 text-[10px]" style={{ color: "var(--accent)" }}>
          QUEST LOG
        </h2>
        <span className="text-[16px]" style={{ color: "var(--muted)" }}>
          {open.length} open
        </span>
      </header>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          ref={inputRef}
          className="px-input"
          value={title}
          maxLength={120}
          placeholder="What are you working on?"
          onChange={(e) => setTitle(e.target.value)}
          aria-label="New task"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[16px]" style={{ color: "var(--muted)" }}>
            <span>Est.</span>
            <button
              type="button"
              className="px-btn-ghost border-0"
              onClick={() => setEstimate((n) => Math.max(1, n - 1))}
              aria-label="Fewer pomodoros"
            >
              <PixelIcon name="minus" size={12} />
            </button>
            <span className="flex w-10 items-center justify-center gap-1" style={{ color: "var(--text)" }}>
              <PixelIcon name="tomato" size={12} />
              {estimate}
            </span>
            <button
              type="button"
              className="px-btn-ghost border-0"
              onClick={() => setEstimate((n) => Math.min(12, n + 1))}
              aria-label="More pomodoros"
            >
              <PixelIcon name="plus" size={12} />
            </button>
          </div>
          <button type="submit" className="px-btn text-[18px]" disabled={!title.trim()} style={{ padding: "2px 10px" }}>
            <PixelIcon name="plus" size={12} /> Add
          </button>
        </div>
      </form>

      <ul className="scrollbar-px m-0 flex min-h-0 flex-1 list-none flex-col gap-[2px] overflow-y-auto p-0">
        {open.length === 0 && (
          <li className="px-2 py-3 text-center text-[17px]" style={{ color: "var(--faint)" }}>
            No quests yet. Add one above, then press Start.
          </li>
        )}
        {open.map((t) => (
          <TaskRow key={t.id} task={t} current={t.id === currentId} />
        ))}
        {done.length > 0 && (
          <li className="mt-2 flex items-center justify-between px-2 text-[16px]" style={{ color: "var(--muted)" }}>
            <button className="border-0 bg-transparent p-0" onClick={() => setShowDone((v) => !v)}>
              {showDone ? "▾" : "▸"} Completed ({done.length})
            </button>
            {showDone && (
              <button
                className="border-0 bg-transparent p-0 underline decoration-dotted"
                onClick={() => useTasks.getState().clearCompleted()}
              >
                clear
              </button>
            )}
          </li>
        )}
        {showDone && done.map((t) => <TaskRow key={t.id} task={t} current={false} />)}
      </ul>
    </section>
  );
});
