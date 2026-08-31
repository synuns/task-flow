import { Link } from "react-router-dom";

export type TaskCardProps = { id: string; title: string; memo: string };

export function TaskCard({ id, title, memo }: TaskCardProps) {
  return (
    <article>
      <Link to={`/task/${encodeURIComponent(id)}`}>
        <h2>{title}</h2>
        <p>{memo}</p>
      </Link>
    </article>
  );
}
