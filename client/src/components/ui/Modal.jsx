import { FiX } from "react-icons/fi";
import { Button } from "./Primitives";

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-xl border border-night-600 bg-night-800 p-5 my-8 shadow-2xl [body.light_&]:bg-white [body.light_&]:border-mist-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-night-700 text-mist-400 [body.light_&]:hover:bg-mist-200"
          >
            <FiX size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = true, confirmLabel = "تأكيد" }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-mist-300 mb-5 [body.light_&]:text-night-600">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          إلغاء
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
