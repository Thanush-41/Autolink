type Props = {
  name: string;
  status: "online" | "idle" | "error";
  details: string;
};

const statusColors: Record<Props["status"], string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  error: "bg-red-500"
};

export function AgentStatusCard({ name, status, details }: Props) {
  return (
    <div className="panel p-4 reveal">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
      </div>
      <p className="text-sm text-slate-600">{details}</p>
    </div>
  );
}
