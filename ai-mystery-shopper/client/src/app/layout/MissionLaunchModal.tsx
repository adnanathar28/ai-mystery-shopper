import { FormEvent, useState } from "react";
import { Loader2, X } from "lucide-react";
import { ShopRequest } from "../../types/api";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: ShopRequest) => Promise<void>;
};

export function MissionLaunchModal({ open, onClose, onSubmit }: Props) {
  const [url, setUrl] = useState("");
  const [goal, setGoal] = useState("");
  const [persona, setPersona] = useState("first_time_user");
  const [device, setDevice] = useState("mobile");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!url.trim()) {
      setError("Target URL is required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ url: url.trim(), goal: goal.trim(), persona, device });
      onClose();
      setUrl("");
      setGoal("");
    } catch (err) {
      setError("Mission launch failed. Check backend connectivity and API keys.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Run Mission</h2>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-slate-800">
            <X size={15} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-500">Target URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300"
              placeholder="https://example.com/signup"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-500">Goal (Optional)</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-300"
              placeholder="Complete onboarding"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-500">Persona</label>
              <select value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
                <option value="first_time_user">First-Time User</option>
                <option value="elderly_user">Elderly User</option>
                <option value="adversarial_tester">Adversarial Tester</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-[0.2em] text-slate-500">Device</label>
              <select value={device} onChange={(e) => setDevice(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
                <option value="mobile">iPhone 13</option>
                <option value="tablet">iPad Mini</option>
              </select>
            </div>
          </div>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
            {submitting ? "Running..." : "Run Mission"}
          </button>
        </div>
      </form>
    </div>
  );
}
